import assert from 'node:assert';
import { Factory } from 'fishery';
import { Maybe, Result, Unit } from 'true-myth';
import type { Just } from 'true-myth/maybe';
import { validateVersionNumber, type ValidateVersionNumberOptions } from './version-number.ts';

const validateVersionNumberOptionsFactory = Factory.define<ValidateVersionNumberOptions>(() => {
    return {
        unreleased: false,
        versionNumber: Maybe.just('1.2.3') as Just<string>
    };
});

const validateVersionNumberTestCases = [
    {
        testName: 'validateVersionNumber() returns a Result Ok when version is unreleased',
        optionsOverrides: {
            unreleased: true,
            versionNumber: Maybe.nothing<string>()
        },
        expectedResult: Result.ok(Unit)
    },
    {
        testName: 'validateVersionNumber() returns a Result Err when version number is an empty string',
        optionsOverrides: {
            unreleased: false,
            versionNumber: Maybe.just('') as Just<string>
        },
        expectedResult: Result.err(new TypeError('version-number not specified'))
    },
    {
        testName: 'validateVersionNumber() returns a Result Err when version number is not valid',
        optionsOverrides: {
            unreleased: false,
            versionNumber: Maybe.just('foo.bar') as Just<string>
        },
        expectedResult: Result.err(new Error('version-number is invalid'))
    },
    {
        testName: 'validateVersionNumber() returns a Result Ok when version number is valid',
        optionsOverrides: {
            unreleased: false,
            versionNumber: Maybe.just('1.2.3') as Just<string>
        },
        expectedResult: Result.ok(Unit)
    }
] as const;

for (const validateVersionNumberTestCase of validateVersionNumberTestCases) {
    test(validateVersionNumberTestCase.testName, () => {
        const options = validateVersionNumberOptionsFactory.build(validateVersionNumberTestCase.optionsOverrides);
        const actual = validateVersionNumber(options);

        assert.deepStrictEqual(actual, validateVersionNumberTestCase.expectedResult);
    });
}
