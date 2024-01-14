import { format as formatDate } from 'date-fns';
import { isPlainObject, isArray, isString } from '@sindresorhus/is';
import enLocale from 'date-fns/locale/en-US/index.js';
import type { Just, Nothing } from 'true-myth/maybe';
import type { PullRequest, PullRequestWithLabel } from './get-merged-pull-requests.js';

function formatLinkToPullRequest(pullRequestId: number, repo: string): string {
    return `[#${pullRequestId}](https://github.com/${repo}/pull/${pullRequestId})`;
}

function formatPullRequest(pullRequest: PullRequest, repo: string): string {
    return `* ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n`;
}

function formatListOfPullRequests(pullRequests: readonly PullRequest[], repo: string): string {
    return pullRequests
        .map((pr) => {
            return formatPullRequest(pr, repo);
        })
        .join('');
}

function formatSection(displayLabel: string, pullRequests: readonly PullRequest[], repo: string): string {
    return `### ${displayLabel}\n\n${formatListOfPullRequests(pullRequests, repo)}\n`;
}

export type CreateChangelog = (options: ChangelogOptions) => string;

type PackageInfo = Record<string, unknown>;

function getConfigValueFromPackageInfo(packageInfo: PackageInfo, fieldName: string, fallback: string): string {
    const prLogConfig = packageInfo['pr-log'];

    if (isPlainObject(prLogConfig)) {
        const field = prLogConfig[fieldName];
        if (isString(field)) {
            return field;
        }
    }

    return fallback;
}

function groupByLabel(pullRequests: readonly PullRequestWithLabel[]): Record<string, PullRequestWithLabel[]> {
    return pullRequests.reduce((groupedObject: Record<string, PullRequestWithLabel[]>, pullRequest) => {
        const { label } = pullRequest;
        const group = groupedObject[label];

        if (isArray(group)) {
            return {
                ...groupedObject,
                [label]: [...group, pullRequest]
            };
        }

        return {
            ...groupedObject,
            [label]: [pullRequest]
        };
    }, {});
}

type Dependencies = {
    readonly packageInfo: PackageInfo;
    getCurrentDate(): Readonly<Date>;
};

type ChangelogOptionsUnreleased = {
    readonly unreleased: true;
    readonly versionNumber: Nothing<string>;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly mergedPullRequests: readonly PullRequestWithLabel[];
    readonly githubRepo: string;
};

type ChangelogOptionsReleased = {
    readonly unreleased: false;
    readonly versionNumber: Just<string>;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly mergedPullRequests: readonly PullRequestWithLabel[];
    readonly githubRepo: string;
};

export type ChangelogOptions = ChangelogOptionsReleased | ChangelogOptionsUnreleased;

const defaultDateFormat = 'MMMM d, yyyy';

export function createChangelogFactory(dependencies: Dependencies): CreateChangelog {
    const { getCurrentDate, packageInfo } = dependencies;
    const dateFormat = getConfigValueFromPackageInfo(packageInfo, 'dateFormat', defaultDateFormat);

    function createChangelogTitle(options: ChangelogOptions): string {
        const { unreleased } = options;

        if (unreleased) {
            return '';
        }

        const date = formatDate(getCurrentDate(), dateFormat, { locale: enLocale });
        const title = `## ${options.versionNumber.value} (${date})`;

        return `${title}\n\n`;
    }

    return function createChangelog(options) {
        const { validLabels, mergedPullRequests, githubRepo } = options;
        const groupedPullRequests = groupByLabel(mergedPullRequests);

        let changelog = createChangelogTitle(options);

        for (const [label, displayLabel] of validLabels) {
            const pullRequests = groupedPullRequests[label];

            if (isArray(pullRequests)) {
                changelog += formatSection(displayLabel, pullRequests, githubRepo);
            }
        }

        return changelog;
    };
}
