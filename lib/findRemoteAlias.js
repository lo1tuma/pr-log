'use strict';

var git = require('git-promise'),
    normalizeGitUrl = require('normalize-git-url'),
    parseGitUrl = require('node-url-from-git'),
    url = require('url'),
    find = require('lodash/collection/find');

function isSameGitUrl(gitUrlA, gitUrlB) {
    var normalizedUrlA = 'git://' + parseGitUrl(normalizeGitUrl(gitUrlA).url),
        normalizedUrlB = 'git://' + parseGitUrl(normalizeGitUrl(gitUrlB).url),
        parsedUrlA = url.parse(normalizedUrlA),
        parsedUrlB = url.parse(normalizedUrlB),
        pathA = parsedUrlA.path.replace(/\.git$/, ''),
        pathB = parsedUrlB.path.replace(/\.git$/, '');

    return parsedUrlA.host === parsedUrlB.host && pathA === pathB;
}

function getGitUrl(githubRepo) {
    return normalizeGitUrl('git://github.com/' + githubRepo + '.git').url;
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
