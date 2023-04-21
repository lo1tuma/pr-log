import { format as formatDate } from 'date-fns';
import enLocale from 'date-fns/locale/en-US/index.js';
import { padAllLines } from './pad-all-lines';
import { Repo } from './repo';
import { PackageJson, PullRequest, SemverNumber } from './shared-types';

function formatLinkToPullRequest(pullRequestId: string | number, repo: Repo) {
    return `[#${pullRequestId}](https://github.com/${repo.path}/pull/${pullRequestId})`;
}

function formatPullRequest(pullRequest: PullRequest, repo: Repo, body?: string | null) {
    if (body)
        return `* ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n${padAllLines(body, 2)}\n`;
    return `* ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n`;
}

function doesPrContainImportantChanges(pr: PullRequest, validLabels: Map<string, string>) {
    return /^feat|fix(:\(\/)).+/i.test(pr.title) || (pr.labels && pr.labels?.some((label) => validLabels.has(label)));
}

type ChangelogGeneratorFactoryParams = {
    getCurrentDate: () => Date;
    packageInfo: PackageJson;
    prDescription: boolean;
};

export function createChangelogFactory({
    getCurrentDate,
    packageInfo,
    prDescription
}: ChangelogGeneratorFactoryParams) {
    const defaultDateFormat = 'MMMM d, yyyy';
    const { dateFormat = defaultDateFormat } = packageInfo['pr-log'] || {};

    return async function createChangelog(
        newVersionNumber: SemverNumber,
        validLabels: Map<string, string>,
        mergedPullRequests: PullRequest[],
        repo: Repo
    ) {
        const date = formatDate(getCurrentDate(), dateFormat, { locale: enLocale });
        const title = `## ${newVersionNumber} (${date})`;

        let changelog = `${title}\n\n`;

        for (const pr of mergedPullRequests) {
            if (doesPrContainImportantChanges(pr, validLabels)) {
                changelog += formatPullRequest(pr, repo, prDescription ? pr.body : null);
            }
        }

        return changelog;
    };
}
