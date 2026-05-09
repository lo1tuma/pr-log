import Maybe, { type Just, type Nothing } from 'true-myth/maybe';
import Result from 'true-myth/result';
import { isString } from '@sindresorhus/is';
import { InvalidArgumentError } from 'commander';

type CliRunOptionsUnreleased = {
    readonly unreleased: true;
    readonly autoVersion: false;
    readonly versionNumber: Nothing<string>;
    readonly changelogPath: string;
    readonly sloppy: boolean;
    readonly stdout: boolean;
};

type CliRunOptionsReleasedExplicit = {
    readonly unreleased: false;
    readonly autoVersion: false;
    readonly versionNumber: Just<string>;
    readonly changelogPath: string;
    readonly sloppy: boolean;
    readonly stdout: boolean;
};

type CliRunOptionsReleasedAuto = {
    readonly unreleased: false;
    readonly autoVersion: true;
    readonly versionNumber: Nothing<string>;
    readonly changelogPath: string;
    readonly sloppy: boolean;
    readonly stdout: boolean;
};

export type CliRunOptions = CliRunOptionsReleasedExplicit | CliRunOptionsReleasedAuto | CliRunOptionsUnreleased;

export type CreateCliRunOptions = {
    readonly versionNumber: string | undefined;
    readonly commandOptions: Record<string, unknown>;
    readonly changelogPath: string;
};

export function createCliRunOptions(options: CreateCliRunOptions): Result<CliRunOptions, InvalidArgumentError> {
    const { versionNumber, commandOptions, changelogPath } = options;
    const unreleased = commandOptions.unreleased === true;
    const autoVersion = commandOptions.autoVersion === true;

    const commonRunOptions = {
        sloppy: commandOptions.sloppy === true,
        changelogPath,
        stdout: commandOptions.stdout === true,
        unreleased,
        autoVersion
    };

    if (unreleased) {
        if (autoVersion) {
            return Result.err(new InvalidArgumentError('A version number must not be auto-derived when --unreleased was provided'));
        }

        if (isString(versionNumber)) {
            return Result.err(
                new InvalidArgumentError('A version number is not allowed when --unreleased was provided')
            );
        }

        return Result.ok({
            ...commonRunOptions,
            unreleased: true,
            autoVersion: false,
            versionNumber: Maybe.nothing()
        });
    }

    if (autoVersion) {
        if (isString(versionNumber)) {
            return Result.err(
                new InvalidArgumentError('A version number is not allowed when --auto-version was provided')
            );
        }

        return Result.ok({
            ...commonRunOptions,
            unreleased: false,
            autoVersion: true,
            versionNumber: Maybe.nothing()
        });
    }

    return Maybe.of(versionNumber).match<Result<CliRunOptions, InvalidArgumentError>>({
        Just(value) {
            return Result.ok({
                ...commonRunOptions,
                unreleased: false,
                autoVersion: false,
                versionNumber: Maybe.just(value) as Just<string>
            });
        },
        Nothing() {
            return Result.err(new InvalidArgumentError('Version number is missing'));
        }
    });
}
