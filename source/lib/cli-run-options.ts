import Maybe, { type Just, type Nothing } from 'true-myth/maybe';
import Result from 'true-myth/result';
import { isString } from '@sindresorhus/is';
import { InvalidArgumentError } from 'commander';

type CliRunOptionsUnreleased = {
    readonly unreleased: true;
    readonly versionNumber: Nothing<string>;
    readonly changelogPath: string;
    readonly sloppy: boolean;
    readonly stdout: boolean;
};

type CliRunOptionsReleased = {
    readonly unreleased: false;
    readonly versionNumber: Just<string>;
    readonly changelogPath: string;
    readonly sloppy: boolean;
    readonly stdout: boolean;
};

export type CliRunOptions = CliRunOptionsReleased | CliRunOptionsUnreleased;

export type CreateCliRunOptions = {
    readonly versionNumber: string | undefined;
    readonly commandOptions: Record<string, unknown>;
    readonly changelogPath: string;
};

export function createCliRunOptions(options: CreateCliRunOptions): Result<CliRunOptions, InvalidArgumentError> {
    const { versionNumber, commandOptions, changelogPath } = options;
    const unreleased = commandOptions.unreleased === true;

    const commonRunOptions = {
        sloppy: commandOptions.sloppy === true,
        changelogPath,
        stdout: commandOptions.stdout === true,
        unreleased
    };

    if (unreleased) {
        if (isString(versionNumber)) {
            return Result.err(
                new InvalidArgumentError('A version number is not allowed when --unreleased was provided')
            );
        }

        return Result.ok({
            ...commonRunOptions,
            unreleased: true,
            versionNumber: Maybe.nothing()
        });
    }

    return Maybe.of(versionNumber).match<Result<CliRunOptions, InvalidArgumentError>>({
        Just(value) {
            return Result.ok({
                ...commonRunOptions,
                unreleased: false,
                versionNumber: Maybe.just(value) as Just<string>
            });
        },
        Nothing() {
            return Result.err(new InvalidArgumentError('Version number is missing'));
        }
    });
}
