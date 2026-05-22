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

export type CliRunOptions = CliRunOptionsReleasedAuto | CliRunOptionsReleasedExplicit | CliRunOptionsUnreleased;

export type CreateCliRunOptions = {
    readonly versionNumber: string | undefined;
    readonly commandOptions: Record<string, unknown>;
    readonly changelogPath: string;
};

type CommonRunOptions = {
    readonly sloppy: boolean;
    readonly changelogPath: string;
    readonly stdout: boolean;
};

function getCommonRunOptions(options: CreateCliRunOptions): CommonRunOptions {
    const { commandOptions, changelogPath } = options;

    return {
        sloppy: commandOptions.sloppy === true,
        changelogPath,
        stdout: commandOptions.stdout === true
    };
}

function createUnreleasedRunOptions(
    commonRunOptions: CommonRunOptions,
    versionNumber: string | undefined,
    autoVersion: boolean
): Result<CliRunOptions, InvalidArgumentError> {
    if (autoVersion) {
        return Result.err(
            new InvalidArgumentError('A version number must not be auto-derived when --unreleased was provided')
        );
    }

    if (isString(versionNumber)) {
        return Result.err(new InvalidArgumentError('A version number is not allowed when --unreleased was provided'));
    }

    return Result.ok({
        ...commonRunOptions,
        unreleased: true,
        autoVersion: false,
        versionNumber: Maybe.nothing()
    });
}

function createAutoVersionRunOptions(
    commonRunOptions: CommonRunOptions,
    versionNumber: string | undefined
): Result<CliRunOptions, InvalidArgumentError> {
    if (isString(versionNumber)) {
        return Result.err(new InvalidArgumentError('A version number is not allowed when --auto-version was provided'));
    }

    return Result.ok({
        ...commonRunOptions,
        unreleased: false,
        autoVersion: true,
        versionNumber: Maybe.nothing()
    });
}

function createReleasedRunOptions(
    commonRunOptions: CommonRunOptions,
    versionNumber: string | undefined
): Result<CliRunOptions, InvalidArgumentError> {
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

export function createCliRunOptions(options: CreateCliRunOptions): Result<CliRunOptions, InvalidArgumentError> {
    const { versionNumber, commandOptions } = options;
    const commonRunOptions = getCommonRunOptions(options);
    const autoVersion = commandOptions.autoVersion === true;

    if (commandOptions.unreleased === true) {
        return createUnreleasedRunOptions(commonRunOptions, versionNumber, autoVersion);
    }

    if (autoVersion) {
        return createAutoVersionRunOptions(commonRunOptions, versionNumber);
    }

    return createReleasedRunOptions(commonRunOptions, versionNumber);
}
