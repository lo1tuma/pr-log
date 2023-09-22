#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';
import { createCommand } from 'commander';
import { Octokit } from '@octokit/rest';
import prependFile from 'prepend-file';
import { $ } from 'execa';
import config from '../../package.json';
import { createCliRunner, RunOptions } from '../lib/cli.js';
import { ensureCleanLocalGitStateFactory } from '../lib/ensure-clean-local-git-state.js';
import { getMergedPullRequestsFactory } from '../lib/get-merged-pull-requests.js';
import { createChangelogFactory } from '../lib/create-changelog.js';
import { findRemoteAliasFactory } from '../lib/find-remote-alias.js';
import { getPullRequestLabel } from '../lib/get-pull-request-label.js';

const program = createCommand(config.name);

let isTracingEnabled = false;

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

        isTracingEnabled = options.trace === true;
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
        const runOptions: RunOptions = { sloppy: options.sloppy === true, changelogPath };
        const findRemoteAlias = findRemoteAliasFactory({ execute: $ });
        const githubClient = new Octokit();
        if (GH_TOKEN) {
            await githubClient.auth({ type: 'token', token: GH_TOKEN });
        }
        const getMergedPullRequests = getMergedPullRequestsFactory({ githubClient, execute: $, getPullRequestLabel });
        const getCurrentDate = (): Date => new Date();
        const packageInfoAsText = await fs.readFile(path.join(process.cwd(), 'package.json'), { encoding: 'utf8' });
        const packageInfo = JSON.parse(packageInfoAsText);
        const dependencies = {
            githubClient,
            prependFile,
            packageInfo,
            ensureCleanLocalGitState: ensureCleanLocalGitStateFactory({ execute: $, findRemoteAlias }),
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
