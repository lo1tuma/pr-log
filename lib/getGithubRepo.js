'use strict';

var parseGithubUrl = require('parse-github-repo-url');

module.exports = function getGithubRepo(githubUrl) {
    var result = parseGithubUrl(githubUrl);

    if (!result) {
        throw new Error('Invalid GitHub URI ' + githubUrl);
    }

    return result[0] + '/' + result[1];
};
