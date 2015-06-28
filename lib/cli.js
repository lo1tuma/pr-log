'use strict';

var ensureCleanLocalGitState = require('./ensureCleanLocalGitState'),
    getMergedPullRequests = require('./getMergedPullRequests'),
    createChangelog = require('./createChangelog'),
    Promise = require('bluebird'),
    path = require('path'),
    prependFile = Promise.promisify(require('prepend')),
    getGithubRepo = require('./getGithubRepo'),
    _ = require('lodash');

function stripTrailingEmptyLine(text) {
    if (_.endsWith(text, '\n\n')) {
        return text.slice(0, -1);
    }

    return text;
}

module.exports = {
    run: function (newVersionNumber) {
        var packageConfig = require(path.join(process.cwd(), 'package.json')),
            githubRepo = getGithubRepo(packageConfig.repository.url),
            changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

        if (!newVersionNumber) {
            throw new Error('version-number not specified');
        }

        return Promise.try(ensureCleanLocalGitState.bind(null, githubRepo))
            .then(getMergedPullRequests.bind(null, githubRepo))
            .then(createChangelog.bind(null, newVersionNumber))
            .then(stripTrailingEmptyLine)
            .then(prependFile.bind(null, changelogPath));
    }
};
