import test from 'ava';
import { Factory, type DeepPartial } from 'fishery';
import { Maybe, Result, Unit } from 'true-myth';
import type { Just } from 'true-myth/maybe';
import { validateVersionNumber, type ValidateVersionNumberOptions } from './version-number.js';

const validateVersionNumberOptionsFactory = Factory.define<ValidateVersionNumberOptions>(() => {
    return {
        unreleased: false,
        versionNumber: Maybe.just('1.2.3') as Just<string>
    };
});

const testValidateVersionNumberMacro = test.macro(
    (t, optionsOverrides: DeepPartial<ValidateVersionNumberOptions>, expected: Result<Unit, Error>) => {
        const options = validateVersionNumberOptionsFactory.build(optionsOverrides);

        const actual = validateVersionNumber(options);

        t.deepEqual(actual, expected);
    }
);

test(
    'validateVersionNumber() returns a Result Ok when version is unreleased',
    testValidateVersionNumberMacro,
    {
        unreleased: true,
        versionNumber: Maybe.nothing<string>()
    },
    Result.ok(Unit)
);

test(
    'validateVersionNumber() returns a Result Err when version number is an empty string',
    testValidateVersionNumberMacro,
    {
        unreleased: false,
        versionNumber: Maybe.just('') as Just<string>
    },
    Result.err(new TypeError('version-number not specified'))
);

test(
    'validateVersionNumber() returns a Result Err when version number is not valid',
    testValidateVersionNumberMacro,
    {
        unreleased: false,
        versionNumber: Maybe.just('foo.bar') as Just<string>
    },
    Result.err(new Error('version-number is invalid'))
);

test(
    'validateVersionNumber() returns a Result Ok when version number is valid',
    testValidateVersionNumberMacro,
    {
        unreleased: false,
        versionNumber: Maybe.just('1.2.3') as Just<string>
    },
    Result.ok(Unit)
);
