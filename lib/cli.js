import path from 'path';
import prepend from 'prepend';
import Promise from 'bluebird';
import ensureCleanLocalGitState from './ensureCleanLocalGitState';
import getMergedPullRequests from './getMergedPullRequests';
import createChangelog from './createChangelog';
import getGithubRepo from './getGithubRepo';

const prependFile = Promise.promisify(prepend);

function stripTrailingEmptyLine(text) {
    if (text.lastIndexOf('\n\n') === text.length - 2) {
        return text.slice(0, -1);
    }

    return text;
}

export default {
    run: (newVersionNumber) => {
        const packageConfig = require(path.join(process.cwd(), 'package.json'));
        const githubRepo = getGithubRepo(packageConfig.repository.url);
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

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
