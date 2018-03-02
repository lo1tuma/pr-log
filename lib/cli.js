import path from 'path';
import prepend from 'prepend';
import BluebirdPromise from 'bluebird';
import ensureCleanLocalGitState from './ensureCleanLocalGitState';
import getMergedPullRequests from './getMergedPullRequests';
import createChangelog from './createChangelog';
import getGithubRepo from './getGithubRepo';
import defaultValidLabels from './validLabels';

const prependFile = BluebirdPromise.promisify(prepend);

function stripTrailingEmptyLine(text) {
    if (text.lastIndexOf('\n\n') === text.length - 2) {
        return text.slice(0, -1);
    }

    return text;
}

function getValidLabels(prLogConfig) {
    return prLogConfig && prLogConfig.validLabels || defaultValidLabels;
}
export default {
    run: (newVersionNumber, options) => {
        const packageConfig = require(path.join(process.cwd(), 'package.json'));
        const githubRepo = getGithubRepo(packageConfig.repository.url);
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
        const prLogConfig = packageConfig['pr-log'];
        const validLabels = getValidLabels(prLogConfig);

        if (!newVersionNumber) {
            throw new Error('version-number not specified');
        }

        const preconditions = options.sloppy ?
            BluebirdPromise.resolve(true) :
            BluebirdPromise.try(ensureCleanLocalGitState.bind(null, githubRepo));

        return preconditions
            .then(getMergedPullRequests.bind(null, githubRepo, validLabels))
            .then(createChangelog.bind(null, newVersionNumber, validLabels))
            .then(stripTrailingEmptyLine)
            .then(prependFile.bind(null, changelogPath));
    }
};
