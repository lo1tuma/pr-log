import moment from 'moment';
import R from 'ramda';

const COLLAPSE_COUNT = 5;

function formatCollapsed(heading, pullRequests, options) {
    let formatted = `#### ${heading}\n\n`;
    formatted += `<details>\n<summary>\n${pullRequests.length} PRs\n</summary>\n\n`;
    pullRequests.forEach((pullRequest) => {
        formatted += `- ${pullRequest.title} (https://github.com/storybooks/storybook/pulls/${pullRequest.id})\n`;
    });
    formatted += '\n</details>\n\n';
    return formatted;
}

function formatExpanded(heading, pullRequests, options) {
    let formatted = `#### ${heading}\n\n`;
    pullRequests.forEach((pullRequest) => {
        formatted += `- ${pullRequest.title} (#${pullRequest.id})\n`;
    });
    formatted += '\n';
    return formatted;
}

function createChangelog(newVersionNumber, formatOptions, mergedPullRequests) {
    const { validLabels, skipLabels } = formatOptions;
    const groupedPullRequests = R.groupBy(R.prop('label'), mergedPullRequests);
    const date = moment().locale('en').format('YYYY-MMMM-DD');

    let changelog = `# ${newVersionNumber}\n\n${date}\n\n`;

    Object.keys(validLabels).forEach(function (label) {
        const pullRequests = groupedPullRequests[label];
        if (pullRequests && !R.contains(label, skipLabels)) {
            const formatter = pullRequests.length > COLLAPSE_COUNT ?
                formatCollapsed : formatExpanded;
            changelog += formatter(validLabels[label], pullRequests, formatOptions);
        }
    });

    return changelog;
}

export default createChangelog;
