import type _prependFile from 'prepend-file';
import type { Logger } from 'loglevel';
import type { CliRunOptions } from './cli-run-options.ts';
import type { CreateChangelog } from './create-changelog.ts';
import type { GetMergedPullRequests } from './get-merged-pull-requests.ts';
import type { EnsureCleanLocalGitState } from './ensure-clean-local-git-state.ts';
import { getGithubRepoFromPackageInfo, getValidLabels } from './package-info.ts';
import { type GetLatestVersionTag, resolveReleasedVersionNumber } from './resolve-version-number.ts';
import { validateVersionNumber } from './version-number.ts';

function stripTrailingEmptyLine(text: string): string {
    if (text.endsWith('\n\n')) {
        return text.slice(0, -1);
    }

    return text;
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

type ReleasedCliRunOptions = Extract<CliRunOptions, { unreleased: false }>;
type UnreleasedCliRunOptions = Extract<CliRunOptions, { unreleased: true }>;

type GenerateChangelogContext = Pick<
    CliRunnerDependencies,
    'createChangelog' | 'ensureCleanLocalGitState' | 'getLatestVersionTag' | 'getMergedPullRequests' | 'packageInfo'
>;

type ChangelogData = {
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly mergedPullRequests: Awaited<ReturnType<GetMergedPullRequests>>;
};

type WriteChangelogContext = Pick<CliRunnerDependencies, 'logger' | 'prependFile'>;

async function ensureCleanState(
    ensureCleanLocalGitState: EnsureCleanLocalGitState,
    options: CliRunOptions,
    githubRepo: string
): Promise<void> {
    if (!options.sloppy) {
        await ensureCleanLocalGitState(githubRepo);
    }
}

function generateUnreleasedChangelog(
    createChangelog: CreateChangelog,
    options: UnreleasedCliRunOptions,
    changelogData: ChangelogData
): string {
    const { githubRepo, validLabels, mergedPullRequests } = changelogData;

    return stripTrailingEmptyLine(
        createChangelog({
            validLabels,
            mergedPullRequests,
            githubRepo,
            unreleased: true,
            versionNumber: options.versionNumber
        })
    );
}

async function generateReleasedChangelog(
    context: Pick<CliRunnerDependencies, 'createChangelog' | 'getLatestVersionTag' | 'packageInfo'>,
    options: ReleasedCliRunOptions,
    changelogData: ChangelogData
): Promise<string> {
    const { createChangelog, packageInfo, getLatestVersionTag } = context;
    const { githubRepo, validLabels, mergedPullRequests } = changelogData;
    const versionNumber = options.autoVersion
        ? await resolveReleasedVersionNumber(packageInfo, validLabels, getLatestVersionTag, mergedPullRequests)
        : options.versionNumber;

    return stripTrailingEmptyLine(
        createChangelog({
            validLabels,
            mergedPullRequests,
            githubRepo,
            unreleased: false,
            versionNumber
        })
    );
}

async function generateChangelog(
    dependencies: GenerateChangelogContext,
    options: CliRunOptions,
    githubRepo: string,
    validLabels: ReadonlyMap<string, string>
): Promise<string> {
    const { ensureCleanLocalGitState, getLatestVersionTag, getMergedPullRequests, createChangelog, packageInfo } =
        dependencies;

    await ensureCleanState(ensureCleanLocalGitState, options, githubRepo);

    const changelogData: ChangelogData = {
        githubRepo,
        validLabels,
        mergedPullRequests: await getMergedPullRequests(githubRepo, validLabels)
    };

    if (options.unreleased) {
        return generateUnreleasedChangelog(createChangelog, options, changelogData);
    }

    return generateReleasedChangelog({ createChangelog, packageInfo, getLatestVersionTag }, options, changelogData);
}

async function writeChangelog(
    context: WriteChangelogContext,
    changelog: string,
    options: CliRunOptions
): Promise<void> {
    const { prependFile, logger } = context;
    const trimmedChangelog = changelog.trim();

    if (options.stdout) {
        logger.log(trimmedChangelog);
    } else {
        await prependFile(options.changelogPath, `${trimmedChangelog}\n\n`);
    }
}

export function createCliRunner(dependencies: CliRunnerDependencies): CliRunner {
    const { packageInfo } = dependencies;

    return {
        async run(options: CliRunOptions) {
            const githubRepo = getGithubRepoFromPackageInfo(packageInfo);
            const validLabels = getValidLabels(packageInfo);

            validateVersionNumber(options).unwrapOrElse((error) => {
                throw error;
            });

            const changelog = await generateChangelog(dependencies, options, githubRepo, validLabels);

            await writeChangelog(dependencies, changelog, options);
        }
    };
}
