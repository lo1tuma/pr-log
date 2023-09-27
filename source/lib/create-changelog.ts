import { format as formatDate } from 'date-fns';
import enLocale from 'date-fns/locale/en-US/index.js';
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

export type CreateChangelog = (
    newVersionNumber: string,
    validLabels: ReadonlyMap<string, string>,
    mergedPullRequests: readonly PullRequestWithLabel[],
    repo: string
) => string;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

type PackageInfo = Record<string, unknown>;

function getConfigValueFromPackageInfo(packageInfo: PackageInfo, fieldName: string, fallback: string): string {
    const prLogConfig = packageInfo['pr-log'];

    if (isRecord(prLogConfig)) {
        const field = prLogConfig[fieldName];
        if (typeof field === 'string') {
            return field;
        }
    }

    return fallback;
}

function groupByLabel(pullRequests: readonly PullRequestWithLabel[]): Record<string, PullRequestWithLabel[]> {
    return pullRequests.reduce((groupedObject: Record<string, PullRequestWithLabel[]>, pullRequest) => {
        const { label } = pullRequest;
        const group = groupedObject[label];

        if (Array.isArray(group)) {
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

const defaultDateFormat = 'MMMM d, yyyy';

export function createChangelogFactory(dependencies: Dependencies): CreateChangelog {
    const { getCurrentDate, packageInfo } = dependencies;
    const dateFormat = getConfigValueFromPackageInfo(packageInfo, 'dateFormat', defaultDateFormat);

    return function createChangelog(newVersionNumber, validLabels, mergedPullRequests, repo) {
        const groupedPullRequests = groupByLabel(mergedPullRequests);
        const date = formatDate(getCurrentDate(), dateFormat, { locale: enLocale });
        const title = `## ${newVersionNumber} (${date})`;

        let changelog = `${title}\n\n`;

        for (const [label, displayLabel] of validLabels) {
            const pullRequests = groupedPullRequests[label];

            if (pullRequests !== undefined) {
                changelog += formatSection(displayLabel, pullRequests, repo);
            }
        }

        return changelog;
    };
}
