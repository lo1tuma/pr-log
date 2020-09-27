import { format as formatDate } from 'date-fns';
import { enLocale } from 'date-fns/locale/en-US';
import R from 'ramda';

function formatLinkToPullRequest(pullRequestId, repo) {
    return `[#${pullRequestId}](https://github.com/${repo}/pull/${pullRequestId})`;
}

function formatPullRequest(pullRequest, repo) {
    return `* ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n`;
}

function formatListOfPullRequests(pullRequests, repo) {
    return pullRequests.map((pr) => formatPullRequest(pr, repo)).join('');
}

function formatSection(displayLabel, pullRequests, repo) {
    return `### ${displayLabel}\n\n${formatListOfPullRequests(pullRequests, repo)}\n`;
}

export default function createModule({ getCurrentDate, packageInfo }) {
    const defaultDateFormat = 'MMMM d, yyyy';
    const { dateFormat = defaultDateFormat } = packageInfo['pr-log'] || {};

    return function createChangelog(newVersionNumber, validLabels, mergedPullRequests, repo) {
        const groupedPullRequests = R.groupBy(R.prop('label'), mergedPullRequests);
        const date = formatDate(getCurrentDate(), dateFormat, { locale: enLocale });
        const title = `## ${newVersionNumber} (${date})`;

        let changelog = `${title}\n\n`;

        for (const [label, displayLabel] of validLabels) {
            const pullRequests = groupedPullRequests[label];

            if (pullRequests) {
                changelog += formatSection(displayLabel, pullRequests, repo);
            }
        }

        return changelog;
    };
}
