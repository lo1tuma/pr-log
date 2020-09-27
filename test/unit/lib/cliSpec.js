import sinon from 'sinon';
import test from 'ava';
import createCliAgent from '../../../lib/cli';

function createCli(dependencies = {}) {
    const {
        ensureCleanLocalGitState = sinon.stub().resolves(),
        getMergedPullRequests = sinon.stub().resolves([]),
        createChangelog = sinon.stub().returns(''),
        prependFile = sinon.stub().resolves(),
        packageInfo = { repository: { url: 'https://github.com/foo/bar.git' } }
    } = dependencies;

    return createCliAgent({
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

    await t.throwsAsync(cli.run(), { message: 'version-number not specified' });
});

test('throws if an invalid version number was specified', async (t) => {
    const cli = createCli();

    await t.throwsAsync(cli.run('a.b.c'), { message: 'version-number is invalid' });
});

test('throws if the repository is dirty', async (t) => {
    const ensureCleanLocalGitState = sinon.stub().rejects(new Error('Local copy is not clean'));
    const cli = createCli({ ensureCleanLocalGitState });

    await t.throwsAsync(cli.run('1.0.0'), { message: 'Local copy is not clean' });
});

test('does not throw if the repository is dirty', async (t) => {
    const ensureCleanLocalGitState = sinon.stub().rejects(new Error('Local copy is not clean'));
    const createChangelog = sinon.stub().returns('sloppy changelog');
    const prependFile = sinon.stub().resolves();
    const cli = createCli({ prependFile, ensureCleanLocalGitState, createChangelog });

    await cli.run('1.0.0', { sloppy: true, changelogPath: '/foo/CHANGELOG.md' });

    t.is(prependFile.callCount, 1);
    t.deepEqual(prependFile.firstCall.args, [ '/foo/CHANGELOG.md', 'sloppy changelog' ]);
});

test('uses custom labels if they are provided in package.json', async (t) => {
    const packageInfo = {
        repository: { url: 'https://github.com/foo/bar.git' },
        'pr-log': { validLabels: [ [ 'foo', 'Foo' ], [ 'bar', 'Bar' ] ] }
    };
    const expectedLabels = new Map([ [ 'foo', 'Foo' ], [ 'bar', 'Bar' ] ]);
    const createChangelog = sinon.stub().returns('generated changelog');
    const getMergedPullRequests = sinon.stub().resolves();
    const cli = createCli({ packageInfo, createChangelog, getMergedPullRequests });

    await cli.run('1.0.0', options);

    t.is(getMergedPullRequests.callCount, 1);
    t.deepEqual(getMergedPullRequests.firstCall.args, [ 'foo/bar', expectedLabels ]);

    t.is(createChangelog.callCount, 1);
    t.deepEqual(createChangelog.firstCall.args, [ '1.0.0', expectedLabels, undefined, 'foo/bar' ]);
});

test('reports the generated changelog', async (t) => {
    const createChangelog = sinon.stub().returns('generated changelog');
    const getMergedPullRequests = sinon.stub().resolves();
    const ensureCleanLocalGitState = sinon.stub().resolves();
    const prependFile = sinon.stub().resolves();

    const cli = createCli({
        createChangelog, getMergedPullRequests, ensureCleanLocalGitState, prependFile
    });

    const expectedGithubRepo = 'foo/bar';

    await cli.run('1.0.0', options);

    t.is(ensureCleanLocalGitState.callCount, 1);
    t.deepEqual(ensureCleanLocalGitState.firstCall.args, [ expectedGithubRepo ]);

    t.is(getMergedPullRequests.callCount, 1);
    t.is(getMergedPullRequests.firstCall.args[0], expectedGithubRepo);

    t.is(createChangelog.callCount, 1);
    t.is(createChangelog.firstCall.args[0], '1.0.0');

    t.is(prependFile.callCount, 1);
    t.deepEqual(prependFile.firstCall.args, [ '/foo/CHANGELOG.md', 'generated changelog' ]);
});

test('strips trailing empty lines from the generated changelog', async (t) => {
    const createChangelog = sinon.stub().returns('generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n');
    const prependFile = sinon.stub().resolves();

    const cli = createCli({ createChangelog, prependFile });

    await cli.run('1.0.0', options);

    t.deepEqual(prependFile.firstCall.args, [
        '/foo/CHANGELOG.md',
        'generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n'
    ]);
});
