import { isArray, isPlainObject, isString } from '@sindresorhus/is';

export const versionBumpLevels = ['major', 'minor', 'patch'] as const;

export type VersionBumpLevel = (typeof versionBumpLevels)[number];

export type VersionBumpConfig = Readonly<Record<VersionBumpLevel, readonly string[]>>;

type PackageInfo = Record<string, unknown>;

function hasDuplicateLabels(labels: readonly string[]): boolean {
    return new Set(labels).size !== labels.length;
}

function getDefaultVersionBumpConfig(validLabels: ReadonlyMap<string, string>): VersionBumpConfig {
    const allLabels = Array.from(validLabels.keys());

    return {
        major: ['breaking'],
        minor: ['feature'],
        patch: allLabels.filter((label) => {
            return label !== 'breaking' && label !== 'feature';
        })
    };
}

function assertValidConfiguredLabels(
    versionBumps: Partial<Record<VersionBumpLevel, readonly string[]>>,
    validLabels: ReadonlyMap<string, string>
): void {
    const configuredLabels = Object.values(versionBumps).flat();

    for (const label of configuredLabels) {
        if (!validLabels.has(label)) {
            throw new TypeError(`Configured version bump label "${label}" is not a valid label`);
        }
    }

    if (hasDuplicateLabels(configuredLabels)) {
        throw new TypeError('Configured version bump labels must not appear in multiple bump levels');
    }
}

function parseVersionBumpLabels(
    versionBumps: Record<string, unknown>,
    level: VersionBumpLevel
): readonly string[] | undefined {
    if (!(level in versionBumps)) {
        return undefined;
    }

    const value = versionBumps[level];
    if (!isArray(value) || !value.every(isString)) {
        throw new TypeError(`Configured version bump "${level}" must be an array of labels`);
    }

    return value;
}

export function getVersionBumpConfig(
    packageInfo: PackageInfo,
    validLabels: ReadonlyMap<string, string>
): VersionBumpConfig {
    const prLogConfig = packageInfo['pr-log'];

    if (!isPlainObject(prLogConfig) || !('versionBumps' in prLogConfig)) {
        return getDefaultVersionBumpConfig(validLabels);
    }

    const versionBumps = prLogConfig.versionBumps;

    if (!isPlainObject(versionBumps)) {
        throw new TypeError('Configured version bumps must be an object');
    }

    for (const key of Object.keys(versionBumps)) {
        if (!versionBumpLevels.includes(key as VersionBumpLevel)) {
            throw new TypeError(`Configured version bump level "${key}" is not supported`);
        }
    }

    const parsedVersionBumps = {
        major: parseVersionBumpLabels(versionBumps, 'major') ?? [],
        minor: parseVersionBumpLabels(versionBumps, 'minor') ?? [],
        patch: parseVersionBumpLabels(versionBumps, 'patch') ?? []
    } satisfies VersionBumpConfig;

    assertValidConfiguredLabels(parsedVersionBumps, validLabels);

    return parsedVersionBumps;
}
