import { $ } from 'execa';
import semver from 'semver';
import type { Octokit } from '@octokit/rest';
import type { GetPullRequestLabel } from './get-pull-request-label.js';

export interface PullRequest {
    readonly id: number;
    readonly title: string;
}

export interface PullRequestWithLabel extends PullRequest {
    readonly label: string;
}

export interface GetMergedPullRequestsDependencies {
    readonly execute: typeof $;
    readonly getPullRequestLabel: GetPullRequestLabel;
    readonly githubClient: Octokit;
}

export type GetMergedPullRequests = (
    repo: string,
    validLabels: ReadonlyMap<string, string>
) => Promise<readonly PullRequestWithLabel[]>;

function isNotNull<T>(value: T): value is NonNullable<T> {
    return value !== null;
}

export function getMergedPullRequestsFactory(dependencies: GetMergedPullRequestsDependencies): GetMergedPullRequests {
    const { execute, getPullRequestLabel } = dependencies;

    async function getLatestVersionTag(): Promise<string> {
        const result = await execute`git tag --list`;
        const tags = result.stdout.split('\n');
        const versionTags = tags.filter((tag: string) => semver.valid(tag) && !semver.prerelease(tag));
        const orderedVersionTags = versionTags.sort(semver.compare);
        const latestTag = orderedVersionTags.at(-1);

        if (latestTag === undefined) {
            throw new TypeError('Failed to determine latest version number git tag');
        }

        return latestTag;
    }

    async function getPullRequests(fromTag: string): Promise<readonly PullRequest[]> {
        const result = await execute`git log --no-color --pretty=format:"%s (%b)" --merges ${fromTag}..HEAD`;
        const mergeCommits = result.stdout.replaceAll(/[\n\r]+\)/g, ')').split('\n');

        return mergeCommits
            .map((commit: string) => /^Merge pull request #(?<id>\d+) from .*? \((?<title>.*)\)$/u.exec(commit))
            .filter(isNotNull)
            .map((matches) => {
                if (matches.groups?.id === undefined || matches.groups.title === undefined) {
                    throw new TypeError('Failed to extract pull request information');
                }

                return { id: Number.parseInt(matches.groups.id, 10), title: matches.groups.title };
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
