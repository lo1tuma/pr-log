import moment from 'moment';
import R from 'ramda';
import validLabels from './validLabels';

function createChangelog(newVersionNumber, mergedPullRequests) {
    const groupedPullRequests = R.groupBy(R.prop('label'), mergedPullRequests);
    const date = moment().locale('en').format('MMMM D, YYYY');
    const title = `## ${newVersionNumber} (${date})`;

    let changelog = `${title}\n\n`;

    Object.keys(groupedPullRequests).forEach(function (label) {
        const pullRequests = groupedPullRequests[label];

        changelog += `### ${validLabels[label]}\n\n`;

        pullRequests.forEach(function (pullRequest) {
            changelog += `* ${pullRequest.title} (#${pullRequest.id})\n`;
        });

        changelog += '\n';
    });

    return changelog;
}

export default createChangelog;
