import type _prependFile from 'prepend-file';
import type { Logger } from 'loglevel';
import Maybe, { type Just } from 'true-myth/maybe';
import { isPlainObject, isString } from '@sindresorhus/is';
import type { CliRunOptions } from './cli-run-options.ts';
import type { CreateChangelog } from './create-changelog.ts';
import type { GetMergedPullRequests } from './get-merged-pull-requests.ts';
import type { EnsureCleanLocalGitState } from './ensure-clean-local-git-state.ts';
import { validateVersionNumber } from './version-number.ts';
import { getGithubRepo } from './get-github-repo.ts';
import { defaultValidLabels } from './valid-labels.ts';
import { getVersionBumpConfig } from './version-bump-config.ts';
import { proposeVersionNumber } from './propose-version-number.ts';

export type GetLatestVersionTag = () => Promise<string>;

function stripTrailingEmptyLine(text: string): string {
    if (text.endsWith('\n\n')) {
        return text.slice(0, -1);
    }

    return text;
}

function getValidLabels(packageInfo: Record<string, unknown>): ReadonlyMap<string, string> {
    const prLogConfig = packageInfo['pr-log'];
    if (isPlainObject(prLogConfig) && Array.isArray(prLogConfig.validLabels)) {
        return new Map(prLogConfig.validLabels);
    }

    return defaultValidLabels;
}

export type CliRunnerDependencies = {
    readonly ensureCleanLocalGitState: EnsureCleanLocalGitState;
    readonly getLatestVersionTag: GetLatestVersionTag;
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
    const {
        ensureCleanLocalGitState,
        getLatestVersionTag,
        getMergedPullRequests,
        createChangelog,
        packageInfo,
        prependFile,
        logger
    } = dependencies;

    async function ensureCleanState(options: CliRunOptions, githubRepo: string): Promise<void> {
        if (!options.sloppy) {
            await ensureCleanLocalGitState(githubRepo);
        }
    }

    async function generateChangelog(
        options: CliRunOptions,
        githubRepo: string,
        validLabels: ReadonlyMap<string, string>
    ): Promise<string> {
        await ensureCleanState(options, githubRepo);

        const mergedPullRequests = await getMergedPullRequests(githubRepo, validLabels);
        const commonChangelogOptions = { validLabels, mergedPullRequests, githubRepo };

        if (options.unreleased) {
            const changelog = createChangelog({
                ...commonChangelogOptions,
                unreleased: true,
                versionNumber: options.versionNumber
            });

            return stripTrailingEmptyLine(changelog);
        }

        const versionNumber = options.autoVersion
            ? (Maybe.just(
                  proposeVersionNumber(
                      await getLatestVersionTag(),
                      mergedPullRequests,
                      getVersionBumpConfig(packageInfo, validLabels)
                  )
              ) as Just<string>)
            : options.versionNumber;

        const changelogOptions = { ...commonChangelogOptions, unreleased: false, versionNumber } as const;
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
            if (!isPlainObject(repository)) {
                throw new Error('Repository information missing in package.json');
            }
            if (!isString(repository.url)) {
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
