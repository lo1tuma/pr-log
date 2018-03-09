import moment from 'moment';
import R from 'ramda';

function formatLinkToPullRequest(repo, pullRequestId) {
    return `[#${pullRequestId}](https://github.com/${repo}/pull/${pullRequestId})`;
}

export default ({ getCurrentDate }) => {
    return function createChangelog(newVersionNumber, validLabels, mergedPullRequests, repo) {
        const groupedPullRequests = R.groupBy(R.prop('label'), mergedPullRequests);
        const date = moment(getCurrentDate()).locale('en').format('MMMM D, YYYY');
        const title = `## ${newVersionNumber} (${date})`;

        let changelog = `${title}\n\n`;

        Object.keys(groupedPullRequests).forEach(function (label) {
            const pullRequests = groupedPullRequests[label];

            changelog += `### ${validLabels[label]}\n\n`;

            pullRequests.forEach(function (pullRequest) {
                changelog += `* ${pullRequest.title} (${formatLinkToPullRequest(repo, pullRequest.id)})\n`;
            });

            changelog += '\n';
        });

        return changelog;
    };
};
