#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';
import { createCommand, InvalidArgumentError } from 'commander';
import { Octokit } from '@octokit/rest';
import prependFile from 'prepend-file';
import { execaCommand } from 'execa';
import loglevel from 'loglevel';
import { createCliRunOptions } from '../lib/cli-run-options.js';
import { createCliRunner, type CliRunnerDependencies } from '../lib/cli.js';
import { ensureCleanLocalGitStateFactory } from '../lib/ensure-clean-local-git-state.js';
import { getMergedPullRequestsFactory } from '../lib/get-merged-pull-requests.js';
import { createChangelogFactory } from '../lib/create-changelog.js';
import { findRemoteAliasFactory } from '../lib/find-remote-alias.js';
import { getPullRequestLabel } from '../lib/get-pull-request-label.js';
import { createGitCommandRunner } from '../lib/git-command-runner.js';

loglevel.enableAll();

async function readJson(filePath: string): Promise<unknown> {
    const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(fileContent) as unknown;
}

const prLogPackageJsonURL = new URL('../../../../package.json', import.meta.url);
const config = (await readJson(prLogPackageJsonURL.pathname)) as Record<string, string>;

const { GH_TOKEN } = process.env;
const githubClient = new Octokit({ auth: GH_TOKEN });

let isTracingEnabled = false;

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const gitCommandRunner = createGitCommandRunner({ execute: execaCommand });
const findRemoteAlias = findRemoteAliasFactory({ gitCommandRunner });
const getMergedPullRequests = getMergedPullRequestsFactory({
    githubClient,
    gitCommandRunner,
    getPullRequestLabel
});
const getCurrentDate = (): Readonly<Date> => {
    return new Date();
};

const program = createCommand(config.name ?? '');
program
    .storeOptionsAsProperties(false)
    .description(config.description ?? '')
    .version(config.version ?? '')
    .argument('[version-number]', 'Desired version number. Optional when --unreleased was provided')
    .option('--sloppy', 'skip ensuring clean local git state', false)
    .option('--trace', 'show stack traces for any error', false)
    .option('--default-branch <name>', 'set custom default branch', 'main')
    .option('--stdout', 'output the changelog to stdout instead of writing to CHANGELOG.md', false)
    .option('--unreleased', 'include section for unreleased changes', false)
    .hook('preAction', (thisCommand) => {
        const { unreleased } = thisCommand.opts<Record<string, unknown>>();
        const hasArguments = thisCommand.args.length > 0;

        if (unreleased === true && hasArguments) {
            throw new InvalidArgumentError('A version number is not allowed when --unreleased was provided');
        }
    })
    .action(async (versionNumber: string | undefined, options: Record<string, unknown>) => {
        isTracingEnabled = options.trace === true;
        const defaultBranch = options.defaultBranch as string;
        if (GH_TOKEN !== undefined) {
            await githubClient.auth();
        }
        const packageInfo = (await readJson(path.join(process.cwd(), 'package.json'))) as Record<string, unknown>;
        const dependencies: CliRunnerDependencies = {
            prependFile,
            packageInfo,
            logger: loglevel,
            ensureCleanLocalGitState: ensureCleanLocalGitStateFactory(
                { gitCommandRunner, findRemoteAlias },
                { defaultBranch }
            ),
            getMergedPullRequests,
            createChangelog: createChangelogFactory({ getCurrentDate, packageInfo })
        };
        const cliRunner = createCliRunner(dependencies);
        const runOptionsResult = createCliRunOptions({ versionNumber, changelogPath, commandOptions: options });

        await runOptionsResult.match({
            async Ok(runOptions) {
                await cliRunner.run(runOptions);
            },
            Err(error) {
                throw error;
            }
        });
    });

function crash(error: Readonly<Error>): void {
    let message: string | undefined = `Error: ${error.message}`;

    if (isTracingEnabled) {
        message = error.stack;
    }

    console.error(message);
    process.exitCode = 1;
}

program.parseAsync(process.argv).catch(crash);
