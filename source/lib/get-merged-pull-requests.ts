import type { Octokit } from '@octokit/rest';
import { isUndefined } from '@sindresorhus/is';
import type { GetPullRequestLabel } from './get-pull-request-label.ts';
import type { GitCommandRunner } from './git-command-runner.ts';
import { determineLatestVersionTag } from './latest-version-tag.ts';

export type PullRequest = {
    readonly id: number;
    readonly title: string;
};

export type PullRequestWithLabel = PullRequest & {
    readonly label: string;
};

export type GetMergedPullRequestsDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
    readonly getPullRequestLabel: GetPullRequestLabel;
    readonly githubClient: Octokit;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly labelLookupIntervalMilliseconds: number;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly maximumRateLimitRetryCount: number;
};

export type GetMergedPullRequests = (
    repo: string,
    validLabels: ReadonlyMap<string, string>
) => Promise<readonly PullRequestWithLabel[]>;

type PullRequestData = Readonly<Awaited<ReturnType<Octokit['pulls']['get']>>['data']>;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [owner, repo] = githubRepo.split('/');

    if (owner === undefined || repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [owner, repo];
}

function extractPullRequestId(subject: string): number {
    const matches = /^Merge pull request #(?<id>\d+) from .*$/u.exec(subject);
    const pullRequestIdentifier = matches?.groups?.id;

    if (isUndefined(pullRequestIdentifier)) {
        throw new TypeError('Failed to extract pull request id from merge commit log');
    }

    return Number.parseInt(pullRequestIdentifier, 10);
}

async function fetchPullRequestTitle(
    githubClient: Readonly<Octokit>,
    githubRepo: string,
    pullRequestId: number
): Promise<string> {
    const [owner, repo] = determineRepoDetails(githubRepo);
    const { data: pullRequest } = await githubClient.pulls.get({
        owner,
        repo,
        pull_number: pullRequestId
    });

    return (pullRequest as PullRequestData).title;
}

async function createPullRequest(
    githubClient: Readonly<Octokit>,
    githubRepo: string,
    mergeCommitLog: { readonly subject: string; readonly body: string | undefined }
): Promise<PullRequest> {
    const pullRequestId = extractPullRequestId(mergeCommitLog.subject);
    const title = mergeCommitLog.body ?? (await fetchPullRequestTitle(githubClient, githubRepo, pullRequestId));

    return { id: pullRequestId, title };
}

export function getMergedPullRequestsFactory(dependencies: GetMergedPullRequestsDependencies): GetMergedPullRequests {
    const {
        gitCommandRunner,
        getPullRequestLabel,
        githubClient,
        waitForMilliseconds,
        labelLookupIntervalMilliseconds
    } = dependencies;

    async function getLatestVersionTag(): Promise<string> {
        const tags = await gitCommandRunner.listTags();
        return determineLatestVersionTag(tags);
    }

    async function getPullRequests(fromTag: string, githubRepo: string): Promise<readonly PullRequest[]> {
        const mergeCommits = await gitCommandRunner.getMergeCommitLogs(fromTag);

        return Promise.all(
            mergeCommits.map(async (log) => {
                return createPullRequest(githubClient, githubRepo, log);
            })
        );
    }

    async function extendWithLabel(
        githubRepo: string,
        validLabels: ReadonlyMap<string, string>,
        pullRequests: readonly PullRequest[]
    ): Promise<readonly PullRequestWithLabel[]> {
        const pullRequestsWithLabels: PullRequestWithLabel[] = [];

        for (const [pullRequestIndex, pullRequest] of pullRequests.entries()) {
            if (pullRequestIndex > 0 && labelLookupIntervalMilliseconds > 0) {
                await waitForMilliseconds(labelLookupIntervalMilliseconds);
            }

            const label = await getPullRequestLabel(githubRepo, validLabels, pullRequest.id, dependencies);

            pullRequestsWithLabels.push({
                id: pullRequest.id,
                title: pullRequest.title,
                label
            });
        }

        return pullRequestsWithLabels;
    }

    return async function getMergedPullRequests(githubRepo: string, validLabels: ReadonlyMap<string, string>) {
        const latestVersionTag = await getLatestVersionTag();
        const pullRequests = await getPullRequests(latestVersionTag, githubRepo);
        const pullRequestsWithLabels = await extendWithLabel(githubRepo, validLabels, pullRequests);

        return pullRequestsWithLabels;
    };
}
