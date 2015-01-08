#!/usr/bin/env node

'use strict';

var program = require('commander'),
    config = require('../package.json'),
    cli = require('../lib/cli');

program
    .version(config.version)
    .usage('<version-number>')
    .parse(process.argv);

cli.run(program.args[0], program.args[1]).done();
