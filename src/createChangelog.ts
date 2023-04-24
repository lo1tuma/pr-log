import { format as formatDate } from 'date-fns';
import enLocale from 'date-fns/locale/en-US/index.js';
import { ConfigFacade } from './config';
import { PullRequest, SemverNumber } from './shared-types';
import { capitalize } from './utils/capitalize';
import { padAllLines } from './utils/pad-all-lines';
import { Repo } from './utils/repo';
import { DefaultValidLabels } from './validLabels';

type ParsedPR = {
    id: number;
    title: string;
    mergedAt: Date;
    body?: string;
    label?: string;
    matcher?: string;
};

function formatLinkToPullRequest(pullRequestId: string | number, repo: Repo) {
    return `[#${pullRequestId}](https://github.com/${repo.path}/pull/${pullRequestId})`;
}

function formatPullRequest(pullRequest: ParsedPR, repo: Repo, body?: string | null) {
    if (body)
        return `- #### ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n\n${padAllLines(
            body,
            2
        )}\n\n`;
    return `- #### ${pullRequest.title} (${formatLinkToPullRequest(pullRequest.id, repo)})\n\n`;
}

function getPrLabelsAndMatchers(pr: PullRequest, config: ConfigFacade) {
    const validLabels = config.get('validLabels', DefaultValidLabels);

    const matchingLabels = validLabels.filter((label) => pr.labels?.includes(label));

    const regexp = config.get('prTitleMatcher', [
        {
            label: 'Features',
            regexp: '^(feat|feature)[:\\/\\(].+',
            flags: 'i'
        },
        {
            label: 'Bug Fixes',
            regexp: '^(fix|bugfix)[:\\/\\(].+',
            flags: 'i'
        }
    ]);

    const allRegexps = (Array.isArray(regexp) ? regexp : [regexp]).map((r) => {
        let regexp: RegExp;
        let label: string | undefined = undefined;

        if (typeof r === 'string') {
            regexp = new RegExp(r);
        } else {
            regexp = new RegExp(r.regexp, r.flags);
            label = r.label;
        }

        return {
            label,
            test(str: string) {
                return regexp.test(str);
            }
        };
    });

    const matchingRegex = allRegexps.find((r) => r.test(pr.title));

    return {
        label: matchingLabels[0],
        matcher: matchingRegex?.label,
        isMatched: matchingRegex != null || matchingLabels.length > 0
    };
}

function mapToParsed(pullRequests: PullRequest[], config: ConfigFacade) {
    const parsed: ParsedPR[] = [];

    for (const pr of pullRequests) {
        const { label, matcher, isMatched } = getPrLabelsAndMatchers(pr, config);

        if (isMatched) {
            parsed.push({
                id: pr.id,
                title: pr.title,
                body: pr.body,
                mergedAt: pr.mergedAt,
                label,
                matcher
            });
        }
    }

    return parsed;
}

type PrGroup = {
    groupName?: string;
    pullRequests: ParsedPR[];
};

function applyGrouping(pullRequests: ParsedPR[], config: ConfigFacade) {
    pullRequests = pullRequests.slice();

    const groupByLabels = config.get('groupByLabels', false);
    const groupByMatchers = config.get('groupByMatchers', true);
    const validaLabels = config.get('validLabels', DefaultValidLabels);

    const labelGroups: Array<PrGroup> = [];

    const matcherGroups: Array<PrGroup> = [];

    const getLabelGroup = (name: string) => {
        let g = labelGroups.find((r) => r.groupName === name);

        if (!g) {
            g = {
                groupName: name,
                pullRequests: []
            };

            labelGroups.push(g);
        }

        return g;
    };

    const getMatcherGroup = (name: string) => {
        let g = matcherGroups.find((r) => r.groupName === name);

        if (!g) {
            g = {
                groupName: name,
                pullRequests: []
            };

            matcherGroups.push(g);
        }

        return g;
    };

    if (groupByLabels) {
        let offset = 0;
        for (const [index, pr] of pullRequests.slice().entries()) {
            if (pr.label) {
                const group = getLabelGroup(pr.label);
                group.pullRequests.push(pr);
                pullRequests.splice(index - offset++, 1);
            }
        }
    }

    if (groupByMatchers) {
        let offset = 0;
        for (const [index, pr] of pullRequests.slice().entries()) {
            if (pr.matcher) {
                const group = getMatcherGroup(pr.matcher);
                group.pullRequests.push(pr);
                pullRequests.splice(index - offset++, 1);
            }
        }
    }

    const hasGroups = labelGroups.length > 0 || matcherGroups.length > 0;

    let otherGroup: PrGroup | undefined = undefined;

    if (hasGroups) {
        otherGroup = {
            groupName: 'Other',
            pullRequests: []
        };

        for (const pr of pullRequests) {
            otherGroup.pullRequests.push(pr);
        }
    } else {
        otherGroup = {
            pullRequests: pullRequests
        };
    }

    labelGroups.sort((a, b) => {
        const aIndex = validaLabels.indexOf(a.groupName!);
        const bIndex = validaLabels.indexOf(b.groupName!);
        return aIndex < bIndex ? -1 : 1;
    });

    const result = labelGroups
        .map((g): PrGroup => {
            return {
                pullRequests: g.pullRequests,
                groupName: capitalize(g.groupName!)
            };
        })
        .concat(matcherGroups);

    if (otherGroup) {
        result.push(otherGroup);
    }

    for (const group of result) {
        group.pullRequests.sort((a, b) => (a.mergedAt > b.mergedAt ? -1 : 1));
    }

    return result;
}

type ChangelogGeneratorFactoryParams = {
    getCurrentDate: () => Date;
    config: ConfigFacade;
};

export function createChangelogFactory({ getCurrentDate, config }: ChangelogGeneratorFactoryParams) {
    const dateFormat = config.get('dateFormat', 'MMMM d, yyyy');

    return async function createChangelog(
        newVersionNumber: SemverNumber,
        mergedPullRequests: PullRequest[],
        repo: Repo
    ) {
        const date = formatDate(getCurrentDate(), dateFormat, { locale: enLocale });
        const title = `## ${newVersionNumber} (${date})`;

        let changelog = `${title}\n\n`;

        const groups = applyGrouping(mapToParsed(mergedPullRequests, config), config);

        for (const prGroup of groups) {
            if (prGroup.groupName && prGroup.pullRequests.length > 0) {
                changelog += `### ${prGroup.groupName}\n\n`;
            }

            for (const pr of prGroup.pullRequests) {
                changelog += formatPullRequest(pr, repo, config.get('includePrBody', true) ? pr.body : null);
            }
        }

        return changelog;
    };
}
