'use strict';

var git = require('git-promise'),
    parseGitUrl = require('git-url-parse'),
    find = require('lodash/collection/find');

function isSameGitUrl(gitUrlA, gitUrlB) {
    var parsedUrlA = parseGitUrl(gitUrlA),
        parsedUrlB = parseGitUrl(gitUrlB),
        pathA = parsedUrlA.pathname.replace(/\.git$/, ''),
        pathB = parsedUrlB.pathname.replace(/\.git$/, '');

    return parsedUrlA.resource === parsedUrlB.resource && pathA === pathB;
}

function getGitUrl(githubRepo) {
    return 'git://github.com/' + githubRepo + '.git';
}

module.exports = function findRemoteAlias(githubRepo) {
    var gitRemote = getGitUrl(githubRepo);

    return git('remote -v')
        .then(function (output) {
            var remotes = output
                    .split('\n')
                    .map(function (remote) {
                        var tokens = remote.split(/\s/);

                        return {
                            alias: tokens[0],
                            url: tokens[1]
                        };
                    }),
                matchedRemote;

            matchedRemote = find(remotes, function (remote) {
                return remote.url && isSameGitUrl(gitRemote, remote.url);
            });

            if (!matchedRemote) {
                throw new Error('This local git repository doesn’t have a remote pointing to ' + gitRemote);
            }

            return matchedRemote.alias;
        });
};
