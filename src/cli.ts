import path from 'path';
import semver from 'semver';
import { ConfigFacade } from './config';
import { getGithubRepo } from './getGithubRepo';
import { Repo } from './repo';
import { GithubClient, PackageJson, PullRequest, SemverNumber } from './shared-types';

function stripTrailingEmptyLine(text: string) {
    if (text.lastIndexOf('\n\n') === text.length - 2) {
        return text.slice(0, -1);
    }

    return text;
}

function validateVersionnumber(versionNumber?: SemverNumber) {
    if (!versionNumber) {
        throw new Error('version-number not specified');
    }
    if (semver.valid(versionNumber) === null) {
        throw new Error('version-number is invalid');
    }
}

function getOutputPath(config: ConfigFacade) {
    const o = config.get('outputFile');

    if (o) {
        return path.resolve(process.cwd(), o);
    }

    return path.resolve(process.cwd(), 'CHANGELOG.md');
}

export type CliAgentParams = {
    githubClient: GithubClient;
    ensureCleanLocalGitState: (githubRepo: Repo) => Promise<void>;
    getMergedPullRequests: (githubRepo: Repo) => Promise<Array<PullRequest>>;
    createChangelog: (
        newVersionNumber: SemverNumber,
        pullRequests: Array<PullRequest>,
        githubRepo: Repo
    ) => Promise<string>;
    packageInfo: PackageJson;
    prependFile: (filePath: string, content: string) => Promise<void>;
};

export function createCliAgent(dependencies: CliAgentParams) {
    const { ensureCleanLocalGitState, getMergedPullRequests, createChangelog, packageInfo, prependFile } = dependencies;

    async function generateChangelog(config: ConfigFacade, githubRepo: Repo, newVersionNumber: SemverNumber) {
        if (!config.get('sloppy', false)) {
            await ensureCleanLocalGitState(githubRepo);
        }

        const pullRequests = await getMergedPullRequests(githubRepo);
        const changelog = await createChangelog(newVersionNumber, pullRequests, githubRepo);

        return stripTrailingEmptyLine(changelog);
    }

    return {
        run: async (newVersionNumber: SemverNumber, config: ConfigFacade) => {
            if (!packageInfo.repository?.url) {
                throw new Error('No repository url specified in package.json');
            }

            const githubRepo = getGithubRepo(packageInfo.repository?.url);

            validateVersionnumber(newVersionNumber);

            const changelog = await generateChangelog(config, githubRepo, newVersionNumber);

            const changelogPath = getOutputPath(config);

            await prependFile(changelogPath, changelog);
        }
    };
}
