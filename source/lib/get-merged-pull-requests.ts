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

export function getMergedPullRequestsFactory(dependencies: GetMergedPullRequestsDependencies): GetMergedPullRequests {
    const { gitCommandRunner, getPullRequestLabel, waitForMilliseconds, labelLookupIntervalMilliseconds } =
        dependencies;

    async function getLatestVersionTag(): Promise<string> {
        const tags = await gitCommandRunner.listTags();
        return determineLatestVersionTag(tags);
    }

    async function getPullRequests(fromTag: string): Promise<readonly PullRequest[]> {
        const mergeCommits = await gitCommandRunner.getMergeCommitLogs(fromTag);

        return mergeCommits.map((log) => {
            const matches = /^Merge pull request #(?<id>\d+) from .*$/u.exec(log.subject);
            if (isUndefined(matches?.groups?.id)) {
                throw new TypeError('Failed to extract pull request id from merge commit log');
            }

            if (isUndefined(log.body)) {
                throw new TypeError('Failed to extract pull request title from merge commit log');
            }

            return { id: Number.parseInt(matches.groups.id, 10), title: log.body };
        });
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
        const pullRequests = await getPullRequests(latestVersionTag);
        const pullRequestsWithLabels = await extendWithLabel(githubRepo, validLabels, pullRequests);

        return pullRequestsWithLabels;
    };
}
