#!/usr/bin/env node

import program from 'commander';
import config from '../../package.json';
import cli from '../cli';

program
    .version(config.version)
    .option('--sloppy', 'Skip ensuring clean local git state.')
    .option('--cherry-pick', 'Use cherry-picks instead of PR merges.')
    .usage('<version-number>')
    .parse(process.argv);

const options = { sloppy: program.sloppy, cherryPick: program.cherryPick };
cli.run(program.args[0], options).done();
