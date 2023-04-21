import path from 'path';
import semver from 'semver';
import { getGithubRepo } from './getGithubRepo';
import { Repo } from './repo';
import { GenerateChangelogOptions, GithubClient, PackageJson, PullRequest, SemverNumber } from './shared-types';
import defaultValidLabels from './validLabels';

function stripTrailingEmptyLine(text: string) {
    if (text.lastIndexOf('\n\n') === text.length - 2) {
        return text.slice(0, -1);
    }

    return text;
}

function getValidLabels(prLogConfig?: { validLabels?: Array<[string, string]> }): Map<string, string> {
    if (prLogConfig && prLogConfig.validLabels) {
        return new Map(prLogConfig.validLabels);
    }

    return defaultValidLabels;
}

function validateVersionnumber(versionNumber?: SemverNumber) {
    if (!versionNumber) {
        throw new Error('version-number not specified');
    }
    if (semver.valid(versionNumber) === null) {
        throw new Error('version-number is invalid');
    }
}

export type CliAgentParams = {
    githubClient: GithubClient;
    ensureCleanLocalGitState: (githubRepo: Repo) => Promise<void>;
    getMergedPullRequests: (githubRepo: Repo, validLabels: Map<string, string>) => Promise<Array<PullRequest>>;
    createChangelog: (
        newVersionNumber: SemverNumber,
        validLabels: Map<string, string>,
        pullRequests: Array<PullRequest>,
        githubRepo: Repo
    ) => Promise<string>;
    packageInfo: PackageJson;
    prependFile: (filePath: string, content: string) => Promise<void>;
};

export function createCliAgent(dependencies: CliAgentParams) {
    const { ensureCleanLocalGitState, getMergedPullRequests, createChangelog, packageInfo, prependFile } = dependencies;

    async function generateChangelog(
        options: GenerateChangelogOptions,
        githubRepo: Repo,
        validLabels: Map<string, string>,
        newVersionNumber: SemverNumber
    ) {
        if (!options.sloppy) {
            await ensureCleanLocalGitState(githubRepo);
        }

        const pullRequests = await getMergedPullRequests(githubRepo, validLabels);
        const changelog = await createChangelog(newVersionNumber, validLabels, pullRequests, githubRepo);

        return stripTrailingEmptyLine(changelog);
    }

    return {
        run: async (newVersionNumber: SemverNumber, options: GenerateChangelogOptions = {}) => {
            if (!packageInfo.repository?.url) {
                throw new Error('No repository url specified in package.json');
            }

            const githubRepo = getGithubRepo(packageInfo.repository?.url);
            const prLogConfig = packageInfo['pr-log'];
            const validLabels = getValidLabels(prLogConfig);

            validateVersionnumber(newVersionNumber);

            const changelog = await generateChangelog(options, githubRepo, validLabels, newVersionNumber);

            const changelogPath = options.changelogPath || path.resolve(process.cwd(), 'CHANGELOG.md');

            await prependFile(changelogPath, changelog);
        }
    };
}
