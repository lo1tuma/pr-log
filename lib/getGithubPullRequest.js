import rest from 'restling';

const accessToken = process.env.GH_TOKEN; // eslint-disable-line
const header = accessToken ? { accessToken } : {};

function getLabel(labels, validLabels) {
    const validLabelNames = Object.keys(validLabels);
    const listOfLabels = validLabelNames.join(', ');
    const filteredLabels = labels.filter((label) => {
        return validLabelNames.indexOf(label.name) !== -1;
    });
    return (filteredLabels.length === 0) ? 'other' : filteredLabels[0].name;
}

function getPullRequestLabel(githubRepo, validLabels, pullRequestId) {
    const url = `https://api.github.com/repos/${githubRepo}/issues/${pullRequestId}`;
    return rest.get(url, header)
        .get('data')
        .then((pr) => {
            const { title, labels } = pr;
            const label = getLabel(labels, validLabels);
            return { id: pullRequestId, title, label };
        });
}

export default getPullRequestLabel;
