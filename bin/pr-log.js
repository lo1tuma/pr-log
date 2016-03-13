#!/usr/bin/env node

import program from 'commander';
import config from '../../package.json';
import cli from '../cli';

program
    .version(config.version)
    .usage('<version-number>')
    .parse(process.argv);

cli.run(program.args[0], program.args[1]).done();
