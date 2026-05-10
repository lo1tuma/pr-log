import assert from 'node:assert';
import { Maybe, Result, Unit } from 'true-myth';
import { validateVersionNumber, type ValidateVersionNumberOptions } from './version-number.ts';

const validateVersionNumberTestCases = [
    {
        testName: 'validateVersionNumber() returns a Result Ok when version is unreleased',
        options: {
            unreleased: true,
            autoVersion: false,
            versionNumber: Maybe.nothing<string>()
        },
        expectedResult: Result.ok(Unit)
    },
    {
        testName: 'validateVersionNumber() returns a Result Ok when version is auto-derived',
        options: {
            unreleased: false,
            autoVersion: true,
            versionNumber: Maybe.nothing<string>()
        },
        expectedResult: Result.ok(Unit)
    },
    {
        testName: 'validateVersionNumber() returns a Result Err when version number is an empty string',
        options: {
            unreleased: false,
            autoVersion: false,
            versionNumber: Maybe.just('')
        },
        expectedResult: Result.err(new TypeError('version-number not specified'))
    },
    {
        testName: 'validateVersionNumber() returns a Result Err when version number is not valid',
        options: {
            unreleased: false,
            autoVersion: false,
            versionNumber: Maybe.just('foo.bar')
        },
        expectedResult: Result.err(new Error('version-number is invalid'))
    },
    {
        testName: 'validateVersionNumber() returns a Result Ok when version number is valid',
        options: {
            unreleased: false,
            autoVersion: false,
            versionNumber: Maybe.just('1.2.3')
        },
        expectedResult: Result.ok(Unit)
    }
] as const;

for (const validateVersionNumberTestCase of validateVersionNumberTestCases) {
    test(validateVersionNumberTestCase.testName, () => {
        const actual = validateVersionNumber(validateVersionNumberTestCase.options as ValidateVersionNumberOptions);

        assert.deepStrictEqual(actual, validateVersionNumberTestCase.expectedResult);
    });
}
