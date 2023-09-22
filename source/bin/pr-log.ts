#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';
import { createCommand } from 'commander';
import { Octokit } from '@octokit/rest';
import prependFile from 'prepend-file';
import { execaCommand } from 'execa';
import config from '../../package.json';
import { createCliRunner, RunOptions } from '../lib/cli.js';
import { ensureCleanLocalGitStateFactory } from '../lib/ensure-clean-local-git-state.js';
import { getMergedPullRequestsFactory } from '../lib/get-merged-pull-requests.js';
import { createChangelogFactory } from '../lib/create-changelog.js';
import { findRemoteAliasFactory } from '../lib/find-remote-alias.js';
import { getPullRequestLabel } from '../lib/get-pull-request-label.js';

let isTracingEnabled = false;

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const findRemoteAlias = findRemoteAliasFactory({ execute: execaCommand });
const githubClient = new Octokit();
const getMergedPullRequests = getMergedPullRequestsFactory({
    githubClient,
    execute: execaCommand,
    getPullRequestLabel
});
const getCurrentDate = (): Date => new Date();

const program = createCommand(config.name);
program
    .storeOptionsAsProperties(false)
    .description(config.description)
    .version(config.version)
    .arguments('<version-number>')
    .option('--sloppy', 'Skip ensuring clean local git state.')
    .option('--trace', 'Show stack traces for any error.')
    .action(async (versionNumber: string, options: Record<string, unknown>) => {
        // eslint-disable-next-line node/no-process-env
        const { GH_TOKEN } = process.env;

        const runOptions: RunOptions = { sloppy: options.sloppy === true, changelogPath };
        isTracingEnabled = options.trace === true;
        if (GH_TOKEN) {
            await githubClient.auth({ type: 'token', token: GH_TOKEN });
        }
        const packageInfoAsText = await fs.readFile(path.join(process.cwd(), 'package.json'), { encoding: 'utf8' });
        const packageInfo = JSON.parse(packageInfoAsText);
        const dependencies = {
            githubClient,
            prependFile,
            packageInfo,
            ensureCleanLocalGitState: ensureCleanLocalGitStateFactory({ execute: execaCommand, findRemoteAlias }),
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
