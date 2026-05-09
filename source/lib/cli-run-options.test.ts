import assert from 'node:assert';
import { Factory } from 'fishery';
import Result from 'true-myth/result';
import { InvalidArgumentError } from 'commander';
import Maybe, { type Just } from 'true-myth/maybe';
import { createCliRunOptions, type CliRunOptions, type CreateCliRunOptions } from './cli-run-options.ts';

const createCliRunOptionsFactory = Factory.define<CreateCliRunOptions>(() => {
    return {
        versionNumber: undefined,
        commandOptions: {},
        changelogPath: ''
    };
});

const createCliRunOptionsTestCases = [
    {
        testName:
            'createCliRunOptions() returns a Result Error when "unreleased" command option exists and a version number was provided',
        optionsOverrides: { commandOptions: { unreleased: true }, versionNumber: '1.2.3' },
        expectedResult: Result.err<CliRunOptions, InvalidArgumentError>(
            new InvalidArgumentError('A version number is not allowed when --unreleased was provided')
        )
    },
    {
        testName:
            'createCliRunOptions() returns a Result Ok when "unreleased" command option exists and no version number was provided',
        optionsOverrides: { commandOptions: { unreleased: true }, versionNumber: undefined },
        expectedResult: Result.ok<CliRunOptions, InvalidArgumentError>({
            unreleased: true,
            autoVersion: false,
            versionNumber: Maybe.nothing<string>(),
            sloppy: false,
            changelogPath: '',
            stdout: false
        })
    },
    {
        testName:
            'createCliRunOptions() returns a Result Error when "unreleased" command option does not exists and no version number was provided',
        optionsOverrides: { commandOptions: { unreleased: undefined }, versionNumber: undefined },
        expectedResult: Result.err<CliRunOptions, InvalidArgumentError>(
            new InvalidArgumentError('Version number is missing')
        )
    },
    {
        testName:
            'createCliRunOptions() returns a Result Error when "unreleased" command option is false and no version number was provided',
        optionsOverrides: { commandOptions: { unreleased: false }, versionNumber: undefined },
        expectedResult: Result.err<CliRunOptions, InvalidArgumentError>(
            new InvalidArgumentError('Version number is missing')
        )
    },
    {
        testName:
            'createCliRunOptions() returns a Result Ok when "unreleased" command option is false and a version number was provided',
        optionsOverrides: { commandOptions: { unreleased: false }, versionNumber: '1.2.3' },
        expectedResult: Result.ok<CliRunOptions, InvalidArgumentError>({
            unreleased: false,
            autoVersion: false,
            versionNumber: Maybe.just('1.2.3') as Just<string>,
            sloppy: false,
            changelogPath: '',
            stdout: false
        })
    },
    {
        testName:
            'createCliRunOptions() returns a Result Ok and sets sloppy to true when command option sloppy was also set to true',
        optionsOverrides: { commandOptions: { unreleased: false, sloppy: true }, versionNumber: '1.2.3' },
        expectedResult: Result.ok<CliRunOptions, InvalidArgumentError>({
            unreleased: false,
            autoVersion: false,
            versionNumber: Maybe.just('1.2.3') as Just<string>,
            sloppy: true,
            changelogPath: '',
            stdout: false
        })
    },
    {
        testName:
            'createCliRunOptions() returns a Result Ok and sets stdout to true when command option stdout was also set to true',
        optionsOverrides: { commandOptions: { unreleased: false, stdout: true }, versionNumber: '1.2.3' },
        expectedResult: Result.ok<CliRunOptions, InvalidArgumentError>({
            unreleased: false,
            autoVersion: false,
            versionNumber: Maybe.just('1.2.3') as Just<string>,
            sloppy: false,
            changelogPath: '',
            stdout: true
        })
    },
    {
        testName:
            'createCliRunOptions() returns a Result Ok when "autoVersion" command option is true and no version number was provided',
        optionsOverrides: { commandOptions: { autoVersion: true }, versionNumber: undefined },
        expectedResult: Result.ok<CliRunOptions, InvalidArgumentError>({
            unreleased: false,
            autoVersion: true,
            versionNumber: Maybe.nothing<string>(),
            sloppy: false,
            changelogPath: '',
            stdout: false
        })
    },
    {
        testName:
            'createCliRunOptions() returns a Result Error when "autoVersion" command option is true and a version number was provided',
        optionsOverrides: { commandOptions: { autoVersion: true }, versionNumber: '1.2.3' },
        expectedResult: Result.err<CliRunOptions, InvalidArgumentError>(
            new InvalidArgumentError('A version number is not allowed when --auto-version was provided')
        )
    },
    {
        testName:
            'createCliRunOptions() returns a Result Error when "autoVersion" and "unreleased" command options are both true',
        optionsOverrides: { commandOptions: { autoVersion: true, unreleased: true }, versionNumber: undefined },
        expectedResult: Result.err<CliRunOptions, InvalidArgumentError>(
            new InvalidArgumentError('A version number must not be auto-derived when --unreleased was provided')
        )
    }
] as const;

for (const createCliRunOptionsTestCase of createCliRunOptionsTestCases) {
    test(createCliRunOptionsTestCase.testName, () => {
        const options = createCliRunOptionsFactory.build(createCliRunOptionsTestCase.optionsOverrides);
        const actual = createCliRunOptions(options);

        assert.deepStrictEqual(actual, createCliRunOptionsTestCase.expectedResult);
    });
}
