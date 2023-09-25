#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';
import { createCommand } from 'commander';
import { Octokit } from '@octokit/rest';
import prependFile from 'prepend-file';
import { execaCommand } from 'execa';
import { createCliRunner, RunOptions } from '../lib/cli.js';
import { ensureCleanLocalGitStateFactory } from '../lib/ensure-clean-local-git-state.js';
import { getMergedPullRequestsFactory } from '../lib/get-merged-pull-requests.js';
import { createChangelogFactory } from '../lib/create-changelog.js';
import { findRemoteAliasFactory } from '../lib/find-remote-alias.js';
import { getPullRequestLabel } from '../lib/get-pull-request-label.js';
import { createGitCommandRunner } from '../lib/git-command-runner.js';

async function readJson(filePath: string): Promise<unknown> {
    const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(fileContent);
}

const prLogPackageJsonURL = new URL('../../../../package.json', import.meta.url);
const config = (await readJson(prLogPackageJsonURL.pathname)) as Record<string, string>;

// eslint-disable-next-line node/no-process-env
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
const getCurrentDate = (): Date => new Date();

const program = createCommand(config.name ?? '');
program
    .storeOptionsAsProperties(false)
    .description(config.description ?? '')
    .version(config.version ?? '')
    .arguments('<version-number>')
    .option('--sloppy', 'skip ensuring clean local git state')
    .option('--trace', 'show stack traces for any error')
    .action(async (versionNumber: string, options: Record<string, unknown>) => {
        const runOptions: RunOptions = { sloppy: options.sloppy === true, changelogPath };
        isTracingEnabled = options.trace === true;
        if (GH_TOKEN) {
            await githubClient.auth();
        }
        const packageInfo = (await readJson(path.join(process.cwd(), 'package.json'))) as Record<string, unknown>;
        const dependencies = {
            githubClient,
            prependFile,
            packageInfo,
            ensureCleanLocalGitState: ensureCleanLocalGitStateFactory({ gitCommandRunner, findRemoteAlias }),
            getMergedPullRequests,
            createChangelog: createChangelogFactory({ getCurrentDate, packageInfo })
        };
        const cliRunner = createCliRunner(dependencies);

        await cliRunner.run(versionNumber, runOptions);
    });

function crash(error: Readonly<Error>): void {
    let message: string | undefined = `Error: ${error.message}`;

    if (isTracingEnabled) {
        message = error.stack;
    }

    // eslint-disable-next-line no-console
    console.error(message);
    process.exitCode = 1;
}

program.parseAsync(process.argv).catch(crash);
