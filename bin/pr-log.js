#!/usr/bin/env node

import program from 'commander';
import createGithubClient from '@octokit/rest';
import config from '../../package.json';
import createCliAgent from '../cli';
import path from 'path';
import prepend from 'prepend';
import promisify from 'util.promisify';
import ensureCleanLocalGitState from '../ensureCleanLocalGitState';
import getMergedPullRequests from '../getMergedPullRequests';
import createChangelog from '../createChangelog';
import findRemoteAliasFactory from '../findRemoteAlias';
import git from '../git-promise';

program
    .version(config.version)
    .option('--sloppy', 'Skip ensuring clean local git state.')
    .usage('<version-number>')
    .parse(process.argv);

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const options = { sloppy: program.sloppy, changelogPath };
const findRemoteAlias = findRemoteAliasFactory({ git });
const dependencies = {
    githubClient: createGithubClient(),
    prependFile: promisify(prepend),
    packageInfo: require(path.join(process.cwd(), 'package.json')),
    ensureCleanLocalGitState: ensureCleanLocalGitState({ git, findRemoteAlias }),
    getMergedPullRequests,
    createChangelog
};
const cliAgent = createCliAgent(dependencies);

cliAgent
    .run(program.args[0], options, dependencies)
    .catch((error) => {
        // eslint-disable-next-line no-console, no-warning-comments
        console.error(error);
        process.exitCode = 1;
    });
