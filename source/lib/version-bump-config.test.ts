import assert from 'node:assert';
import { defaultValidLabels } from './valid-labels.ts';
import { getVersionBumpConfig } from './version-bump-config.ts';

test('uses the default version bump config when none is provided', () => {
    const actual = getVersionBumpConfig({}, defaultValidLabels);

    assert.deepStrictEqual(actual, {
        major: ['breaking'],
        minor: ['feature'],
        patch: ['bug', 'enhancement', 'documentation', 'upgrade', 'refactor', 'build']
    });
});

test('uses the configured version bump config', () => {
    const packageInfo = {
        'pr-log': {
            versionBumps: {
                major: ['breaking'],
                patch: ['documentation']
            }
        }
    };

    const actual = getVersionBumpConfig(packageInfo, defaultValidLabels);

    assert.deepStrictEqual(actual, {
        major: ['breaking'],
        minor: [],
        patch: ['documentation']
    });
});

test('falls back to empty arrays for omitted configured bump levels', () => {
    const packageInfo = {
        'pr-log': {
            versionBumps: {
                major: ['breaking'],
                minor: ['feature']
            }
        }
    };

    const actual = getVersionBumpConfig(packageInfo, defaultValidLabels);

    assert.deepStrictEqual(actual, {
        major: ['breaking'],
        minor: ['feature'],
        patch: []
    });
});

test('throws when configured version bumps is not an object', () => {
    assert.throws(
        () => {
            getVersionBumpConfig({ 'pr-log': { versionBumps: 'foo' } }, defaultValidLabels);
        },
        { message: 'Configured version bumps must be an object' }
    );
});

test('throws when an unsupported version bump level is configured', () => {
    assert.throws(
        () => {
            getVersionBumpConfig({ 'pr-log': { versionBumps: { foo: ['bug'] } } }, defaultValidLabels);
        },
        { message: 'Configured version bump level "foo" is not supported' }
    );
});

test('throws when a version bump level is not configured as an array of labels', () => {
    assert.throws(
        () => {
            getVersionBumpConfig({ 'pr-log': { versionBumps: { major: 'breaking' } } }, defaultValidLabels);
        },
        { message: 'Configured version bump "major" must be an array of labels' }
    );
});

test('throws when a configured version bump label is not valid', () => {
    assert.throws(
        () => {
            getVersionBumpConfig({ 'pr-log': { versionBumps: { patch: ['unknown'] } } }, defaultValidLabels);
        },
        { message: 'Configured version bump label "unknown" is not a valid label' }
    );
});

test('throws when a configured version bump label is duplicated across levels', () => {
    assert.throws(
        () => {
            getVersionBumpConfig(
                { 'pr-log': { versionBumps: { major: ['breaking'], patch: ['breaking'] } } },
                defaultValidLabels
            );
        },
        { message: 'Configured version bump labels must not appear in multiple bump levels' }
    );
});
