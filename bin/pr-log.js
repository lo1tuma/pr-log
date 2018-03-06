#!/usr/bin/env node

import program from 'commander';
import config from '../../package.json';
import cli from '../cli';

program
    .version(config.version)
    .option('--sloppy', 'Skip ensuring clean local git state.')
    .usage('<version-number>')
    .parse(process.argv);

const options = { sloppy: program.sloppy };
cli
    .run(program.args[0], options)
    .catch((error) => {
        // eslint-disable-next-line no-console, no-warning-comments
        console.error(error);
        process.exitCode = 1;
    });
