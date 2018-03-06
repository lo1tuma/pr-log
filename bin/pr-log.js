#!/usr/bin/env node

import program from 'commander';
import createGithubClient from '@octokit/rest';
import config from '../../package.json';
import createCliAgent from '../cli';

program
    .version(config.version)
    .option('--sloppy', 'Skip ensuring clean local git state.')
    .usage('<version-number>')
    .parse(process.argv);

const options = { sloppy: program.sloppy };
const dependencies = {
    githubClient: createGithubClient()
};
const cliAgent = createCliAgent(dependencies);

cliAgent
    .run(program.args[0], options, dependencies)
    .catch((error) => {
        // eslint-disable-next-line no-console, no-warning-comments
        console.error(error);
        process.exitCode = 1;
    });
