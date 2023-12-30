import semver from 'semver';
import type { Octokit } from '@octokit/rest';
import { isUndefined } from '@sindresorhus/is';
import type { GetPullRequestLabel } from './get-pull-request-label.js';
import type { GitCommandRunner } from './git-command-runner.js';

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
};

export type GetMergedPullRequests = (
    repo: string,
    validLabels: ReadonlyMap<string, string>
) => Promise<readonly PullRequestWithLabel[]>;

export function getMergedPullRequestsFactory(dependencies: GetMergedPullRequestsDependencies): GetMergedPullRequests {
    const { gitCommandRunner, getPullRequestLabel } = dependencies;

    async function getLatestVersionTag(): Promise<string> {
        const tags = await gitCommandRunner.listTags();
        const versionTags = tags.filter((tag: string) => {
            return semver.valid(tag) !== null && semver.prerelease(tag) === null;
        });
        const orderedVersionTags = versionTags.sort(semver.compare);
        const latestTag = orderedVersionTags.at(-1);

        if (isUndefined(latestTag)) {
            throw new TypeError('Failed to determine latest version number git tag');
        }

        return latestTag;
    }

    async function getPullRequests(fromTag: string): Promise<readonly PullRequest[]> {
        const mergeCommits = await gitCommandRunner.getMergeCommitLogs(fromTag);

        return mergeCommits.map((log) => {
            const matches = /^Merge pull request #(?<id>\d+) from .*?$/u.exec(log.subject);
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
        const promises = pullRequests.map(async (pullRequest): Promise<PullRequestWithLabel> => {
            const label = await getPullRequestLabel(githubRepo, validLabels, pullRequest.id, dependencies);

            return {
                id: pullRequest.id,
                title: pullRequest.title,
                label
            };
        });

        return Promise.all(promises);
    }

    return async function getMergedPullRequests(githubRepo: string, validLabels: ReadonlyMap<string, string>) {
        const latestVersionTag = await getLatestVersionTag();
        const pullRequests = await getPullRequests(latestVersionTag);
        const pullRequestsWithLabels = await extendWithLabel(githubRepo, validLabels, pullRequests);

        return pullRequestsWithLabels;
    };
}
