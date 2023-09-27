import type { Octokit } from '@octokit/rest';
import { splitByString } from './split.js';

type Dependencies = {
    readonly githubClient: Octokit;
};

export type GetPullRequestLabel = typeof getPullRequestLabel;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [owner, repo] = splitByString(githubRepo, '/');

    if (repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [owner, repo];
}

type Label = Readonly<Awaited<ReturnType<Octokit['issues']['listLabelsOnIssue']>>['data'][number]>;

async function fetchLabels(
    githubClient: Readonly<Octokit>,
    githubRepo: string,
    pullRequestId: number
): Promise<Label[]> {
    const [owner, repo] = determineRepoDetails(githubRepo);
    const params = { owner, repo, issue_number: pullRequestId };
    const { data: labels } = await githubClient.issues.listLabelsOnIssue(params);

    return labels;
}

export async function getPullRequestLabel(
    githubRepo: string,
    validLabels: ReadonlyMap<string, string>,
    pullRequestId: number,
    dependencies: Dependencies
): Promise<string> {
    const { githubClient } = dependencies;
    const validLabelNames = Array.from(validLabels.keys());

    const labels = await fetchLabels(githubClient, githubRepo, pullRequestId);

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
