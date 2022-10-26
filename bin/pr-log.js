#!/usr/bin/env node

import path from 'node:path';
import { promisify } from 'node:util';
import program from 'commander';
import { Octokit } from '@octokit/rest';
import prepend from 'prepend';
import git from 'git-promise';
import config from '../../package.json'; // eslint-disable-line import/no-unresolved
import createCliAgent from '../cli'; // eslint-disable-line import/no-unresolved

import ensureCleanLocalGitState from '../ensureCleanLocalGitState'; // eslint-disable-line import/no-unresolved

import getMergedPullRequestsFactory from '../getMergedPullRequests'; // eslint-disable-line import/no-unresolved

import createChangelogFactory from '../createChangelog'; // eslint-disable-line import/no-unresolved

import findRemoteAliasFactory from '../findRemoteAlias'; // eslint-disable-line import/no-unresolved

import getPullRequestLabel from '../getPullRequestLabel'; // eslint-disable-line import/no-unresolved

program
    .version(config.version)
    .option('--sloppy', 'Skip ensuring clean local git state.')
    .option('--trace', 'Show stack traces for any error.')
    .usage('<version-number>')
    .parse(process.argv);

// eslint-disable-next-line node/no-process-env
const { GH_TOKEN } = process.env;

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const options = { sloppy: program.sloppy, changelogPath };
const findRemoteAlias = findRemoteAliasFactory({ git });
const githubClient = new Octokit();
if (GH_TOKEN) {
    githubClient.auth({ type: 'token', token: GH_TOKEN });
}
const getMergedPullRequests = getMergedPullRequestsFactory({ githubClient, git, getPullRequestLabel });
const getCurrentDate = () => new Date();
const packageInfo = require(path.join(process.cwd(), 'package.json'));
const dependencies = {
    githubClient,
    prependFile: promisify(prepend),
    packageInfo,
    ensureCleanLocalGitState: ensureCleanLocalGitState({ git, findRemoteAlias }),
    getMergedPullRequests,
    createChangelog: createChangelogFactory({ getCurrentDate, packageInfo })
};
const cliAgent = createCliAgent(dependencies);

cliAgent.run(program.args[0], options, dependencies).catch((error) => {
    let message = `Error: ${error.message}`;

    if (program.trace) {
        message = error.stack;
    }

    // eslint-disable-next-line no-console
    console.error(message);
    process.exitCode = 1;
});
