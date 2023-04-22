import { format as formatDate } from 'date-fns';
import enLocale from 'date-fns/locale/en-US/index.js';
import { ConfigFacade } from './config';
import { padAllLines } from './pad-all-lines';
import { Repo } from './repo';
import { PullRequest, SemverNumber } from './shared-types';

function formatLinkToPullRequest(pullRequestId: string | number, repo: Repo) {
    return `[#${pullRequestId}](https://github.com/${repo.path}/pull/${pullRequestId})`;
}

function formatPullRequest(pullRequest: PullRequest, repo: Repo, body?: string | null) {
    if (body)
        return `* ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n\n${padAllLines(body, 2)}\n`;
    return `* ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n`;
}

function doesPrContainImportantChanges(pr: PullRequest, config: ConfigFacade): boolean {
    const validLabels = new Set(config.get('validLabels', []));

    if (pr.labels && pr.labels?.some((label) => validLabels.has(label))) {
        return true;
    }

    const regexp = config.get('prTitleMatcher');

    if (regexp) {
        const allRegexps = (Array.isArray(regexp) ? regexp : [regexp]).map((r) => {
            if (typeof r === 'string') {
                return new RegExp(r);
            }

            return new RegExp(r.regexp, r.flags);
        });

        return allRegexps.some((r) => r.test(pr.title));
    }

    return /^feat|fix[:\/\(].+/i.test(pr.title);
}

type ChangelogGeneratorFactoryParams = {
    getCurrentDate: () => Date;
    config: ConfigFacade;
    prDescription: boolean;
};

export function createChangelogFactory({ getCurrentDate, config, prDescription }: ChangelogGeneratorFactoryParams) {
    const dateFormat = config.get('dateFormat', 'MMMM d, yyyy');

    return async function createChangelog(
        newVersionNumber: SemverNumber,
        mergedPullRequests: PullRequest[],
        repo: Repo
    ) {
        const date = formatDate(getCurrentDate(), dateFormat, { locale: enLocale });
        const title = `## ${newVersionNumber} (${date})`;

        let changelog = `${title}\n\n`;

        for (const pr of mergedPullRequests) {
            if (doesPrContainImportantChanges(pr, config)) {
                changelog += formatPullRequest(pr, repo, prDescription ? pr.body : null);
            }
        }

        return changelog;
    };
}
