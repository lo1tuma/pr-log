'use strict';

var git = require('git-promise'),
    findRemoteAlias = require('./findRemoteAlias'),
    Promise = require('bluebird'),
    util = require('util');

function ensureCleanLocalCopy() {
    return git('status -s')
        .then(function (status) {
            if (status.trim() !== '') {
                throw new Error('Local copy is not clean')
            }
        });
}

function ensureMasterBranch() {
    return git('rev-parse --abbrev-ref HEAD')
        .then(function (branchName) {
            if (branchName.trim() !== 'master') {
                throw new Error('Not on master branch');
            }
        });
}

function fetchRemote(remoteAlias) {
    return git('fetch ' + remoteAlias);
}

function ensureLocalIsEqualToRemote(remoteAlias) {
    var remoteBranch = remoteAlias + '/master';

    return git('rev-list --left-right master...' + remoteBranch)
        .then(function (result) {
            var commits = result.split('\n'),
                commitsAhead = 0,
                commitsBehind = 0,
                errorMessage = 'Local git master branch is %d commits ahead and %d commits behind of %s';

            commits.forEach(function (commit) {
                if (commit.trim().length > 0) {
                    if (commit.indexOf('>') === 0) {
                        commitsBehind += 1;
                    } else {
                        commitsAhead += 1;
                    }
                }
            });

            if (commitsAhead > 0 || commitsBehind > 0) {
                throw new Error(util.format(errorMessage, commitsAhead, commitsBehind, remoteBranch));
            }
        });
}

module.exports = function ensureCleanLocalGitState(githubRepo) {
    return Promise.try(ensureCleanLocalCopy)
        .then(ensureMasterBranch)
        .then(findRemoteAlias.bind(null, githubRepo))
        .tap(fetchRemote)
        .then(ensureLocalIsEqualToRemote);
};
