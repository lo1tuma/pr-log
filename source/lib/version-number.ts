import semver from 'semver';
import type { Just, Nothing } from 'true-myth/maybe';
import Result from 'true-myth/result';
import Unit from 'true-myth/unit';

type ValidateVersionNumberOptionsUnreleased = {
    readonly unreleased: true;
    readonly autoVersion: false;
    readonly versionNumber: Nothing<string>;
};

type ValidateVersionNumberOptionsAuto = {
    readonly unreleased: false;
    readonly autoVersion: true;
    readonly versionNumber: Nothing<string>;
};

type ValidateVersionNumberOptionsReleased = {
    readonly unreleased: false;
    readonly autoVersion: false;
    readonly versionNumber: Just<string>;
};

export type ValidateVersionNumberOptions =
    | ValidateVersionNumberOptionsReleased
    | ValidateVersionNumberOptionsAuto
    | ValidateVersionNumberOptionsUnreleased;

export function validateVersionNumber(options: ValidateVersionNumberOptions): Result<Unit, Error> {
    if (options.unreleased || options.autoVersion) {
        return Result.ok(Unit);
    }

    const versionNumber = options.versionNumber.value;

    if (versionNumber.length === 0) {
        return Result.err(new TypeError('version-number not specified'));
    }

    if (semver.valid(versionNumber) === null) {
        return Result.err(new Error('version-number is invalid'));
    }

    return Result.ok(Unit);
}
