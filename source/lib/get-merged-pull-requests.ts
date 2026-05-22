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
type FirstParentCommitLogEntry = Awaited<ReturnType<GitCommandRunner['getFirstParentCommitLogs']>>[number];

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [owner, repo] = githubRepo.split('/');

    if (owner === undefined || repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [owner, repo];
}

function extractPullRequestId(commitSubject: string): number | undefined {
    const matches = /^Merge pull request #(?<id>\d+) from .*$/u.exec(commitSubject);
    const pullRequestIdentifier = matches?.groups?.id;

    if (isUndefined(pullRequestIdentifier)) {
        if (commitSubject.startsWith('Merge pull request ')) {
            throw new TypeError('Failed to extract pull request id from merge commit log');
        }

        return undefined;
    }

    return Number.parseInt(pullRequestIdentifier, 10);
}

function extractRevertedCommitHash(commitBody: string | undefined): string | undefined {
    const matches = /^This reverts commit (?<hash>[0-9a-f]+)\./mu.exec(commitBody ?? '');
    return matches?.groups?.hash;
}

function isRevertedCommit(
    revertedCommitHashes: ReadonlySet<string>,
    firstParentCommitLogEntry: FirstParentCommitLogEntry
): boolean {
    return revertedCommitHashes.has(firstParentCommitLogEntry.hash);
}

function getRevertedCommitHash(firstParentCommitLogEntry: FirstParentCommitLogEntry): string | undefined {
    return extractRevertedCommitHash(firstParentCommitLogEntry.body);
}

function collectActiveFirstParentCommitLogs(
    firstParentCommitLogs: readonly FirstParentCommitLogEntry[]
): readonly FirstParentCommitLogEntry[] {
    const revertedCommitHashes = new Set<string>();

    return firstParentCommitLogs.reduce<readonly FirstParentCommitLogEntry[]>(
        (activeCommitLogs, firstParentCommitLog) => {
            if (isRevertedCommit(revertedCommitHashes, firstParentCommitLog)) {
                return activeCommitLogs;
            }

            const revertedCommitHash = getRevertedCommitHash(firstParentCommitLog);
            if (!isUndefined(revertedCommitHash)) {
                revertedCommitHashes.add(revertedCommitHash);
                return activeCommitLogs;
            }

            return [...activeCommitLogs, firstParentCommitLog];
        },
        []
    );
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
    firstParentCommitLogEntry: FirstParentCommitLogEntry
): Promise<PullRequest | undefined> {
    const pullRequestIdentifier = extractPullRequestId(firstParentCommitLogEntry.subject);
    if (isUndefined(pullRequestIdentifier)) {
        return undefined;
    }

    const title =
        firstParentCommitLogEntry.body ??
        (await fetchPullRequestTitle(githubClient, githubRepo, pullRequestIdentifier));

    return { id: pullRequestIdentifier, title };
}

function isPullRequest(pullRequest: PullRequest | undefined): pullRequest is PullRequest {
    return !isUndefined(pullRequest);
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
        const firstParentCommitLogs = await gitCommandRunner.getFirstParentCommitLogs(fromTag);
        const activeFirstParentCommitLogs = collectActiveFirstParentCommitLogs(firstParentCommitLogs);
        const pullRequests = await Promise.all(
            activeFirstParentCommitLogs.map(async (firstParentCommitLogEntry) => {
                return createPullRequest(githubClient, githubRepo, firstParentCommitLogEntry);
            })
        );

        return pullRequests.filter(isPullRequest);
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
