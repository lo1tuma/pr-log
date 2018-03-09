import semver from 'semver';
import getGithubRepo from './getGithubRepo';
import defaultValidLabels from './validLabels';

function stripTrailingEmptyLine(text) {
    if (text.lastIndexOf('\n\n') === text.length - 2) {
        return text.slice(0, -1);
    }

    return text;
}

function getValidLabels(prLogConfig) {
    return prLogConfig && prLogConfig.validLabels || defaultValidLabels;
}

function validateVersionnumber(versionNumber) {
    if (!versionNumber) {
        throw new Error('version-number not specified');
    }
    if (semver.valid(versionNumber) === null) {
        throw new Error('version-number is invalid');
    }
}

export default function createCliAgent(dependencies) {
    const {
        ensureCleanLocalGitState,
        getMergedPullRequests,
        createChangelog,
        packageInfo,
        prependFile
    } = dependencies;

    async function generateChangelog(options, githubRepo, validLabels, newVersionNumber) {
        if (!options.sloppy) {
            await ensureCleanLocalGitState(githubRepo);
        }

        const pullRequests = await getMergedPullRequests(githubRepo, validLabels);
        const changelog = createChangelog(newVersionNumber, validLabels, pullRequests, githubRepo);

        return stripTrailingEmptyLine(changelog);
    }

    return {
        run: async (newVersionNumber, options = {}) => {
            const githubRepo = getGithubRepo(packageInfo.repository.url);
            const prLogConfig = packageInfo['pr-log'];
            const validLabels = getValidLabels(prLogConfig);

            validateVersionnumber(newVersionNumber);

            const changelog = await generateChangelog(options, githubRepo, validLabels, newVersionNumber);
            await prependFile(options.changelogPath, changelog);
        }
    };
}
