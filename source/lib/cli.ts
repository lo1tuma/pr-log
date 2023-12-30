import type _prependFile from 'prepend-file';
import type { Logger } from 'loglevel';
import type { CliRunOptions } from './cli-run-options.js';
import type { CreateChangelog } from './create-changelog.js';
import type { GetMergedPullRequests } from './get-merged-pull-requests.js';
import type { EnsureCleanLocalGitState } from './ensure-clean-local-git-state.js';
import { validateVersionNumber } from './version-number.js';
import { getGithubRepo } from './get-github-repo.js';
import { defaultValidLabels } from './valid-labels.js';

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

export type CliRunnerDependencies = {
    readonly ensureCleanLocalGitState: EnsureCleanLocalGitState;
    readonly getMergedPullRequests: GetMergedPullRequests;
    readonly createChangelog: CreateChangelog;
    readonly packageInfo: Record<string, unknown>;
    readonly prependFile: typeof _prependFile;
    readonly logger: Logger;
};

export type CliRunner = {
    run(options: CliRunOptions): Promise<void>;
};

export function createCliRunner(dependencies: CliRunnerDependencies): CliRunner {
    const { ensureCleanLocalGitState, getMergedPullRequests, createChangelog, packageInfo, prependFile, logger } =
        dependencies;

    async function generateChangelog(
        options: CliRunOptions,
        githubRepo: string,
        validLabels: ReadonlyMap<string, string>
    ): Promise<string> {
        if (!options.sloppy) {
            await ensureCleanLocalGitState(githubRepo);
        }

        const mergedPullRequests = await getMergedPullRequests(githubRepo, validLabels);
        const commonChangelogOptions = { validLabels, mergedPullRequests, githubRepo };
        const changelogOptions = options.unreleased
            ? ({ ...commonChangelogOptions, unreleased: true, versionNumber: options.versionNumber } as const)
            : ({ ...commonChangelogOptions, unreleased: false, versionNumber: options.versionNumber } as const);
        const changelog = createChangelog(changelogOptions);

        return stripTrailingEmptyLine(changelog);
    }

    async function writeChangelog(changelog: string, options: CliRunOptions): Promise<void> {
        const trimmedChangelog = changelog.trim();

        if (options.stdout) {
            logger.log(trimmedChangelog);
        } else {
            await prependFile(options.changelogPath, `${trimmedChangelog}\n\n`);
        }
    }

    return {
        async run(options: CliRunOptions) {
            const { repository } = packageInfo;
            if (!isRecord(repository)) {
                throw new Error('Repository information missing in package.json');
            }
            if (typeof repository.url !== 'string') {
                throw new TypeError('Repository url is not a string in package.json');
            }
            const githubRepo = getGithubRepo(repository.url);
            const validLabels = getValidLabels(packageInfo);

            validateVersionNumber(options).unwrapOrElse((error) => {
                throw error;
            });

            const changelog = await generateChangelog(options, githubRepo, validLabels);

            await writeChangelog(changelog, options);
        }
    };
}
