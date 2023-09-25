import { stub } from 'sinon';
import test from 'ava';
import _prependFile from 'prepend-file';
import type { CliRunner, CliRunnerDependencies } from './cli.js';
import { createCliRunner } from './cli.js';

function createCli(dependencies: Partial<CliRunnerDependencies> = {}): CliRunner {
    const {
        ensureCleanLocalGitState = stub().resolves(),
        getMergedPullRequests = stub().resolves([]),
        createChangelog = stub().returns(''),
        prependFile = stub().resolves() as unknown as typeof _prependFile,
        packageInfo = { repository: { url: 'https://github.com/foo/bar.git' } }
    } = dependencies;

    return createCliRunner({
        ensureCleanLocalGitState,
        getMergedPullRequests,
        createChangelog,
        prependFile,
        packageInfo
    });
}

const options = { sloppy: false, changelogPath: '/foo/CHANGELOG.md' };

test('throws if no version number was specified', async (t) => {
    const cli = createCli();

    await t.throwsAsync(cli.run('', options), { message: 'version-number not specified' });
});

test('throws if an invalid version number was specified', async (t) => {
    const cli = createCli();

    await t.throwsAsync(cli.run('a.b.c', options), { message: 'version-number is invalid' });
});

test('throws when the repository entry in the given packageInfo is missing', async (t) => {
    const cli = createCli({ packageInfo: {} });

    await t.throwsAsync(cli.run('', options), { message: 'Repository information missing in package.json' });
});

test('throws when the repository entry in the given packageInfo is not an object', async (t) => {
    const cli = createCli({ packageInfo: { repository: 'foo' } });

    await t.throwsAsync(cli.run('', options), { message: 'Repository information missing in package.json' });
});

test('throws when the repository.url entry in the given packageInfo is missing', async (t) => {
    const cli = createCli({ packageInfo: { repository: {} } });

    await t.throwsAsync(cli.run('', options), { message: 'Repository url is not a string in package.json' });
});

test('throws when the repository.url entry in the given packageInfo is not a string', async (t) => {
    const cli = createCli({ packageInfo: { repository: { url: 42 } } });

    await t.throwsAsync(cli.run('', options), { message: 'Repository url is not a string in package.json' });
});

test('throws if the repository is dirty', async (t) => {
    const ensureCleanLocalGitState = stub().rejects(new Error('Local copy is not clean'));
    const cli = createCli({ ensureCleanLocalGitState });

    await t.throwsAsync(cli.run('1.0.0', options), { message: 'Local copy is not clean' });
});

test('does not throw if the repository is dirty', async (t) => {
    const ensureCleanLocalGitState = stub().rejects(new Error('Local copy is not clean'));
    const createChangelog = stub().returns('sloppy changelog');
    const prependFile = stub().resolves();
    const cli = createCli({
        prependFile: prependFile as unknown as typeof _prependFile,
        ensureCleanLocalGitState,
        createChangelog
    });

    await cli.run('1.0.0', { sloppy: true, changelogPath: '/foo/CHANGELOG.md' });

    t.is(prependFile.callCount, 1);
    t.deepEqual(prependFile.firstCall.args, ['/foo/CHANGELOG.md', 'sloppy changelog']);
});

test('uses custom labels if they are provided in package.json', async (t) => {
    const packageInfo = {
        repository: { url: 'https://github.com/foo/bar.git' },
        'pr-log': {
            validLabels: [
                ['foo', 'Foo'],
                ['bar', 'Bar']
            ]
        }
    };
    const expectedLabels = new Map([
        ['foo', 'Foo'],
        ['bar', 'Bar']
    ]);
    const createChangelog = stub().returns('generated changelog');
    const getMergedPullRequests = stub().resolves();
    const cli = createCli({ packageInfo, createChangelog, getMergedPullRequests });

    await cli.run('1.0.0', options);

    t.is(getMergedPullRequests.callCount, 1);
    t.deepEqual(getMergedPullRequests.firstCall.args, ['foo/bar', expectedLabels]);

    t.is(createChangelog.callCount, 1);
    t.deepEqual(createChangelog.firstCall.args, ['1.0.0', expectedLabels, undefined, 'foo/bar']);
});

test('reports the generated changelog', async (t) => {
    const createChangelog = stub().returns('generated changelog');
    const getMergedPullRequests = stub().resolves();
    const ensureCleanLocalGitState = stub().resolves();
    const prependFile = stub().resolves();

    const cli = createCli({
        createChangelog,
        getMergedPullRequests,
        ensureCleanLocalGitState,
        prependFile: prependFile as unknown as typeof _prependFile
    });

    const expectedGithubRepo = 'foo/bar';

    await cli.run('1.0.0', options);

    t.is(ensureCleanLocalGitState.callCount, 1);
    t.deepEqual(ensureCleanLocalGitState.firstCall.args, [expectedGithubRepo]);

    t.is(getMergedPullRequests.callCount, 1);
    t.is(getMergedPullRequests.firstCall.args[0], expectedGithubRepo);

    t.is(createChangelog.callCount, 1);
    t.is(createChangelog.firstCall.args[0], '1.0.0');

    t.is(prependFile.callCount, 1);
    t.deepEqual(prependFile.firstCall.args, ['/foo/CHANGELOG.md', 'generated changelog']);
});

test('strips trailing empty lines from the generated changelog', async (t) => {
    const createChangelog = stub().returns('generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n');
    const prependFile = stub().resolves();

    const cli = createCli({ createChangelog, prependFile: prependFile as unknown as typeof _prependFile });

    await cli.run('1.0.0', options);

    t.deepEqual(prependFile.firstCall.args, [
        '/foo/CHANGELOG.md',
        'generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n'
    ]);
});
