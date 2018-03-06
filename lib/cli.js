import path from 'path';
import prepend from 'prepend';
import promisify from 'util.promisify';
import ensureCleanLocalGitState from './ensureCleanLocalGitState';
import getMergedPullRequests from './getMergedPullRequests';
import createChangelog from './createChangelog';
import getGithubRepo from './getGithubRepo';
import defaultValidLabels from './validLabels';

const prependFile = promisify(prepend);

function stripTrailingEmptyLine(text) {
    if (text.lastIndexOf('\n\n') === text.length - 2) {
        return text.slice(0, -1);
    }

    return text;
}

async function generateChangelog(options, githubRepo, validLabels, newVersionNumber) {
    const preconditions = options.sloppy ? true : await ensureCleanLocalGitState(githubRepo);

    const pullRequests = await getMergedPullRequests(githubRepo, validLabels, preconditions);
    const changelog = await createChangelog(newVersionNumber, validLabels, pullRequests);

    return stripTrailingEmptyLine(changelog);
}

function getValidLabels(prLogConfig) {
    return prLogConfig && prLogConfig.validLabels || defaultValidLabels;
}
export default {
    run: async (newVersionNumber, options) => {
        const packageConfig = require(path.join(process.cwd(), 'package.json'));
        const githubRepo = getGithubRepo(packageConfig.repository.url);
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
        const prLogConfig = packageConfig['pr-log'];
        const validLabels = getValidLabels(prLogConfig);

        if (!newVersionNumber) {
            throw new Error('version-number not specified');
        }

        const changelog = await generateChangelog(options, githubRepo, validLabels, newVersionNumber);
        await prependFile(changelogPath, changelog);
    }
};
