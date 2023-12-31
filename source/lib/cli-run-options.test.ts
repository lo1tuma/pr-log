import test from 'ava';
import { Factory, type DeepPartial } from 'fishery';
import Result from 'true-myth/result';
import { InvalidArgumentError } from 'commander';
import Maybe, { type Just } from 'true-myth/maybe';
import { createCliRunOptions, type CliRunOptions, type CreateCliRunOptions } from './cli-run-options.js';

const createCliRunOptionsFactory = Factory.define<CreateCliRunOptions>(() => {
    return {
        versionNumber: undefined,
        commandOptions: {},
        changelogPath: ''
    };
});

const testCreateCliRunOptionsMacro = test.macro(
    (t, optionsOverrides: DeepPartial<CreateCliRunOptions>, expected: Result<CliRunOptions, InvalidArgumentError>) => {
        const options = createCliRunOptionsFactory.build(optionsOverrides);

        const actual = createCliRunOptions(options);

        t.deepEqual(actual, expected);
    }
);

test(
    'createCliRunOptions() returns a Result Error when "unreleased" command option exists and a version number was provided',
    testCreateCliRunOptionsMacro,
    {
        commandOptions: {
            unreleased: true
        },
        versionNumber: '1.2.3'
    },
    Result.err<CliRunOptions, InvalidArgumentError>(
        new InvalidArgumentError('A version number is not allowed when --unreleased was provided')
    )
);

test(
    'createCliRunOptions() returns a Result Ok when "unreleased" command option exists and no version number was provided',
    testCreateCliRunOptionsMacro,
    {
        commandOptions: {
            unreleased: true
        },
        versionNumber: undefined
    },
    Result.ok<CliRunOptions, InvalidArgumentError>({
        unreleased: true,
        versionNumber: Maybe.nothing<string>(),
        sloppy: false,
        changelogPath: '',
        stdout: false
    })
);

test(
    'createCliRunOptions() returns a Result Error when "unreleased" command option does not exists and no version number was provided',
    testCreateCliRunOptionsMacro,
    {
        commandOptions: {
            unreleased: undefined
        },
        versionNumber: undefined
    },
    Result.err<CliRunOptions, InvalidArgumentError>(new InvalidArgumentError('Version number is missing'))
);

test(
    'createCliRunOptions() returns a Result Error when "unreleased" command option is false and no version number was provided',
    testCreateCliRunOptionsMacro,
    {
        commandOptions: {
            unreleased: false
        },
        versionNumber: undefined
    },
    Result.err<CliRunOptions, InvalidArgumentError>(new InvalidArgumentError('Version number is missing'))
);

test(
    'createCliRunOptions() returns a Result Ok when "unreleased" command option is false and a version number was provided',
    testCreateCliRunOptionsMacro,
    {
        commandOptions: {
            unreleased: false
        },
        versionNumber: '1.2.3'
    },
    Result.ok<CliRunOptions, InvalidArgumentError>({
        unreleased: false,
        versionNumber: Maybe.just('1.2.3') as Just<string>,
        sloppy: false,
        changelogPath: '',
        stdout: false
    })
);

test(
    'createCliRunOptions() returns a Result Ok and sets sloppy to true when command option sloppy was also set to true',
    testCreateCliRunOptionsMacro,
    {
        commandOptions: {
            unreleased: false,
            sloppy: true
        },
        versionNumber: '1.2.3'
    },
    Result.ok<CliRunOptions, InvalidArgumentError>({
        unreleased: false,
        versionNumber: Maybe.just('1.2.3') as Just<string>,
        sloppy: true,
        changelogPath: '',
        stdout: false
    })
);

test(
    'createCliRunOptions() returns a Result Ok and sets stdout to true when command option stdout was also set to true',
    testCreateCliRunOptionsMacro,
    {
        commandOptions: {
            unreleased: false,
            stdout: true
        },
        versionNumber: '1.2.3'
    },
    Result.ok<CliRunOptions, InvalidArgumentError>({
        unreleased: false,
        versionNumber: Maybe.just('1.2.3') as Just<string>,
        sloppy: false,
        changelogPath: '',
        stdout: true
    })
);
