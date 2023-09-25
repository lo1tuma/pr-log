import type { Octokit } from '@octokit/rest';
import { splitByString } from './split.js';

interface Dependencies {
    readonly githubClient: Octokit;
}

export type GetPullRequestLabel = typeof getPullRequestLabel;

export async function getPullRequestLabel(
    githubRepo: string,
    validLabels: ReadonlyMap<string, string>,
    pullRequestId: number,
    dependencies: Dependencies
): Promise<string> {
    const { githubClient } = dependencies;
    const validLabelNames = Array.from(validLabels.keys());

    const [owner, repo] = splitByString(githubRepo, '/');

    if (repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    const params = { owner, repo, issue_number: pullRequestId };
    const { data: labels } = await githubClient.issues.listLabelsOnIssue(params);

    const listOfLabels = validLabelNames.join(', ');
    const filteredLabels = labels.filter((label) => {
        return validLabelNames.includes(label.name);
    });
    const [firstLabel] = filteredLabels;

    if (filteredLabels.length > 1) {
        throw new Error(`Pull Request #${pullRequestId} has multiple labels of ${listOfLabels}`);
    } else if (firstLabel === undefined) {
        throw new TypeError(`Pull Request #${pullRequestId} has no label of ${listOfLabels}`);
    }

    return firstLabel.name;
}
