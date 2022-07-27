import path from 'path';
import fs from 'fs';
import prepend from 'prepend';
import bluebird from 'bluebird';
import ensureCleanLocalGitState from './ensureCleanLocalGitState';
import getMergedPullRequests from './getMergedPullRequests';
import expandDependencyUpgrades from './expandDependencyUpgrades';
import createChangelog from './createChangelog';
import getGithubRepo from './getGithubRepo';
import defaultValidLabels from './validLabels';

const prependFile = bluebird.promisify(prepend);

function stripTrailingEmptyLine(text) {
    if (text.lastIndexOf('\n\n') === text.length - 2) {
        return text.slice(0, -1);
    }

    return text;
}

function getChangelogPath() {
    const changelog = ['./CHANGELOG.md', '../CHANGELOG.md'].find(p => fs.existsSync(p))
    return changelog || './CHANGELOG.md';
}

export default {
    run: (newVersionNumber, options) => {
        const packageConfig = require(path.join(process.cwd(), 'package.json'));
        const githubRepo = getGithubRepo(packageConfig.repository.url);
        const changelogPath = getChangelogPath();
        const prLogConfig = packageConfig['pr-log'];
        const validLabels = Object.assign({}, prLogConfig && Object.fromEntries(prLogConfig.validLabels) || defaultValidLabels);
        const skipLabels = prLogConfig && prLogConfig.skipLabels || [];
        skipLabels.forEach((label) => validLabels[label] = label);

        if (!newVersionNumber) {
            throw new Error('version-number not specified');
        }

        const preconditions = options.sloppy ?
            bluebird.resolve(true) :
            bluebird.try(ensureCleanLocalGitState.bind(null, githubRepo));

        const formatOptions = { validLabels, skipLabels };

        return preconditions
            .then(getMergedPullRequests.bind(null, githubRepo, validLabels, options.cherryPick))
            .then(expandDependencyUpgrades)
            .then(createChangelog.bind(null, newVersionNumber, formatOptions))
            .then(stripTrailingEmptyLine)
            .then(prependFile.bind(null, changelogPath));
    }
};
