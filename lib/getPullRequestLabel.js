'use strict';

var superagent = require('superagent-promise'),
    util = require('util'),
    validLabels = require('./validLabels'),
    validLabelNames = Object.keys(validLabels);

module.exports = function getPullRequestLabel(githubRepo, pullRequestId) {
    var baseUrl = 'https://api.github.com/repos/%s/issues/%s/labels',
        url = util.format(baseUrl, githubRepo, pullRequestId);

    return superagent
        .get(url)
        .end()
        .then(function (response) {
            var labels = response.body,
                listOfLabels = validLabelNames.join(', ');

            labels = labels.filter(function (label) {
                return validLabelNames.indexOf(label.name) !== -1;
            });

            if (labels.length > 1) {
                throw new Error('Pull Request #' + pullRequestId + ' has multiple labels of ' + listOfLabels);
            } else if (labels.length === 0) {
                throw new Error('Pull Request #' + pullRequestId + ' has no label of ' + listOfLabels);
            }

            return labels[0].name;
        });
};
