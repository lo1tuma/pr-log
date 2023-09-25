import semver from 'semver';
import _prependFile from 'prepend-file';
import { CreateChangelog } from './create-changelog.js';
import { getGithubRepo } from './get-github-repo.js';
import { defaultValidLabels } from './valid-labels.js';
import { GetMergedPullRequests } from './get-merged-pull-requests.js';
import { EnsureCleanLocalGitState } from './ensure-clean-local-git-state.js';

function stripTrailingEmptyLine(text: string): string {
    if (text.endsWith('\n\n')) {
        return text.slice(0, -1);
    }

    return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getValidLabels(packageInfo: Record<string, unknown>): ReadonlyMap<string, string> {
    const prLogConfig = packageInfo['pr-log'];
    if (isRecord(prLogConfig) && Array.isArray(prLogConfig.validLabels)) {
        return new Map(prLogConfig.validLabels);
    }

    return defaultValidLabels;
}

function validateVersionNumber(versionNumber?: string): void {
    if (!versionNumber) {
        throw new Error('version-number not specified');
    }
    if (semver.valid(versionNumber) === null) {
        throw new Error('version-number is invalid');
    }
}

export interface RunOptions {
    readonly changelogPath: string;
    readonly sloppy: boolean;
}

export interface CliRunnerDependencies {
    readonly ensureCleanLocalGitState: EnsureCleanLocalGitState;
    readonly getMergedPullRequests: GetMergedPullRequests;
    readonly createChangelog: CreateChangelog;
    readonly packageInfo: Record<string, unknown>;
    readonly prependFile: typeof _prependFile;
}

export interface CliRunner {
    run(newVersionNumber: string, options: RunOptions): Promise<void>;
}

export function createCliRunner(dependencies: CliRunnerDependencies): CliRunner {
    const { ensureCleanLocalGitState, getMergedPullRequests, createChangelog, packageInfo, prependFile } = dependencies;

    async function generateChangelog(
        options: RunOptions,
        githubRepo: string,
        validLabels: ReadonlyMap<string, string>,
        newVersionNumber: string
    ): Promise<string> {
        if (!options.sloppy) {
            await ensureCleanLocalGitState(githubRepo);
        }

        const pullRequests = await getMergedPullRequests(githubRepo, validLabels);
        const changelog = createChangelog(newVersionNumber, validLabels, pullRequests, githubRepo);

        return stripTrailingEmptyLine(changelog);
    }

    return {
        run: async (newVersionNumber: string, options: RunOptions) => {
            const { repository } = packageInfo;
            if (!isRecord(repository)) {
                throw new Error('Repository information missing in package.json');
            }
            if (typeof repository.url !== 'string') {
                throw new TypeError('Repository url is not a string in package.json');
            }
            const githubRepo = getGithubRepo(repository.url);
            const validLabels = getValidLabels(packageInfo);

            validateVersionNumber(newVersionNumber);

            const changelog = await generateChangelog(options, githubRepo, validLabels, newVersionNumber);
            await prependFile(options.changelogPath, `${changelog.trim()}\n\n`);
        }
    };
}
