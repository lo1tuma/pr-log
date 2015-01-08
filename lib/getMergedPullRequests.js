'use strict';

var git = require('git-promise'),
    semver = require('semver'),
    Promise = require('bluebird'),
    getPullRequestLabel = require('./getPullRequestLabel');

function getLatestVersionTag() {
    return git('tag --list')
        .then(function (result) {
            var tags = result.split('\n'),
                versionTags = tags.filter(semver.valid),
                orderedVersionTags = versionTags.sort(semver.compare);

            return orderedVersionTags[orderedVersionTags.length - 1];
        });
}

function getPullRequests(fromTag) {
    return git('log --no-color --pretty=format:"%s (%b)" --merges ' + fromTag + '..HEAD')
        .then(function (result) {
            var mergeCommits = result.split('\n');

            return mergeCommits
                .filter(function (commit) {
                    return commit.indexOf('Merge pull request') === 0;
                })
                .map(function (pullRequest) {
                    var pattern = /^Merge pull request #(\d+) from (.*) \((.*)\)/,
                        matches = pullRequest.match(pattern);

                    return {
                        id: matches[1],
                        title: matches[3]
                    };
                });
        });
}

function extendWithLabel(githubRepo, pullRequests) {
    var promises = pullRequests.map(function (pullRequest) {
        return getPullRequestLabel(githubRepo, pullRequest.id)
            .then(function (label) {
                return {
                    id: pullRequest.id,
                    title: pullRequest.title,
                    label: label
                };
            });
    });

    return Promise.all(promises);
}

module.exports = function getMergedPullRequests(githubRepo) {
    return getLatestVersionTag()
        .then(getPullRequests)
        .then(extendWithLabel.bind(null, githubRepo));
};
