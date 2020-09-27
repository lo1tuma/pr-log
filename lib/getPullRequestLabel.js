async function getPullRequestLabel(githubRepo, validLabels, pullRequestId, { githubClient }) {
    const validLabelNames = Array.from(validLabels.keys());

    const [owner, repo] = githubRepo.split('/');
    const params = { owner, repo, issue_number: pullRequestId };
    const { data: labels } = await githubClient.issues.listLabelsOnIssue(params);

    const listOfLabels = validLabelNames.join(', ');
    const filteredLabels = labels.filter((label) => {
        return validLabelNames.includes(label.name);
    });

    if (filteredLabels.length > 1) {
        throw new Error(`Pull Request #${pullRequestId} has multiple labels of ${listOfLabels}`);
    } else if (filteredLabels.length === 0) {
        throw new Error(`Pull Request #${pullRequestId} has no label of ${listOfLabels}`);
    }

    return filteredLabels[0].name;
}

export default getPullRequestLabel;
