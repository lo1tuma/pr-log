'use strict';

var validLabels = require('./validLabels'),
    groupBy = require('lodash.groupby'),
    util = require('util'),
    moment = require('moment');

module.exports = function createChangelog(newVersionNumber, mergedPullRequests) {
    var changelog,
        groupedPullRequests = groupBy(mergedPullRequests, 'label'),
        date = moment().locale('en').format('MMMM D, YYYY'),
        title = util.format('## %s (%s)', newVersionNumber, date);

    changelog = title + '\n\n';

    Object.keys(groupedPullRequests).forEach(function (label) {
        var pullRequests = groupedPullRequests[label];

        changelog += '### ' + validLabels[label] + '\n\n';

        pullRequests.forEach(function (pullRequest) {
            changelog += '* ' + pullRequest.title + ' (#' + pullRequest.id + ')\n';
        });

        changelog += '\n';
    });

    return changelog;
};
