import { stub } from 'sinon';
import test from 'ava';
import type _prependFile from 'prepend-file';
import type { Logger } from 'loglevel';
import { Factory, type DeepPartial } from 'fishery';
import Maybe, { type Just } from 'true-myth/maybe';
import { createCliRunner, type CliRunner, type CliRunnerDependencies } from './cli.js';
import type { CliRunOptions } from './cli-run-options.js';
import { defaultValidLabels } from './valid-labels.js';

const cliRunOptionsFactory = Factory.define<CliRunOptions>(() => {
    return {
        unreleased: false,
        versionNumber: Maybe.just('1.2.3') as Just<string>,
        changelogPath: '/foo/CHANGELOG.md',
        sloppy: false,
        stdout: false
    };
});

function createCli(dependencies: Partial<CliRunnerDependencies> = {}): CliRunner {
    const {
        ensureCleanLocalGitState = stub().resolves(),
        getMergedPullRequests = stub().resolves([]),
        createChangelog = stub().returns(''),
        prependFile = stub().resolves() as unknown as typeof _prependFile,
        packageInfo = { repository: { url: 'https://github.com/foo/bar.git' } },
        logger = { log: stub() } as unknown as Logger
    } = dependencies;

    return createCliRunner({
        ensureCleanLocalGitState,
        getMergedPullRequests,
        createChangelog,
        prependFile,
        packageInfo,
        logger
    });
}

type TestThrowsTestCase = {
    readonly cliRunOptionsOverrides: DeepPartial<CliRunOptions>;
    readonly dependenciesOverrides: Partial<CliRunnerDependencies>;
    readonly expectedErrorMessage: string;
};

const testThrowsMacro = test.macro(async (t, testCase: TestThrowsTestCase) => {
    const { cliRunOptionsOverrides, dependenciesOverrides, expectedErrorMessage } = testCase;
    const cli = createCli(dependenciesOverrides);
    const options = cliRunOptionsFactory.build(cliRunOptionsOverrides);

    await t.throwsAsync(cli.run(options), { message: expectedErrorMessage });
});

test('throws if the version was released but no version number was specified', testThrowsMacro, {
    cliRunOptionsOverrides: {
        unreleased: false,
        versionNumber: Maybe.just('') as Just<string>
    },
    dependenciesOverrides: {},
    expectedErrorMessage: 'version-number not specified'
});

test('throws if the version was released and an invalid version number was specified', testThrowsMacro, {
    cliRunOptionsOverrides: {
        unreleased: false,
        versionNumber: Maybe.just('a.b.c') as Just<string>
    },
    dependenciesOverrides: {},
    expectedErrorMessage: 'version-number is invalid'
});

test('throws when the repository entry in the given packageInfo is missing', testThrowsMacro, {
    cliRunOptionsOverrides: {},
    dependenciesOverrides: {
        packageInfo: {}
    },
    expectedErrorMessage: 'Repository information missing in package.json'
});

test('throws when the repository entry in the given packageInfo is not an object', testThrowsMacro, {
    cliRunOptionsOverrides: {},
    dependenciesOverrides: {
        packageInfo: { repository: 'foo' }
    },
    expectedErrorMessage: 'Repository information missing in package.json'
});

test('throws when the repository.url entry in the given packageInfo is missing', testThrowsMacro, {
    cliRunOptionsOverrides: {},
    dependenciesOverrides: {
        packageInfo: { repository: {} }
    },
    expectedErrorMessage: 'Repository url is not a string in package.json'
});

test('throws when the repository.url entry in the given packageInfo is not a string', testThrowsMacro, {
    cliRunOptionsOverrides: {},
    dependenciesOverrides: {
        packageInfo: { repository: { url: 42 } }
    },
    expectedErrorMessage: 'Repository url is not a string in package.json'
});

test('throws if the repository is dirty', testThrowsMacro, {
    cliRunOptionsOverrides: {},
    dependenciesOverrides: {
        ensureCleanLocalGitState: stub().rejects(new Error('Local copy is not clean'))
    },
    expectedErrorMessage: 'Local copy is not clean'
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
    const options = cliRunOptionsFactory.build({
        sloppy: true
    });

    await cli.run(options);

    t.is(prependFile.callCount, 1);
    t.deepEqual(prependFile.firstCall.args, ['/foo/CHANGELOG.md', 'sloppy changelog\n\n']);
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

    await cli.run(cliRunOptionsFactory.build());

    t.is(getMergedPullRequests.callCount, 1);
    t.deepEqual(getMergedPullRequests.firstCall.args, ['foo/bar', expectedLabels]);

    t.is(createChangelog.callCount, 1);
    t.deepEqual(createChangelog.firstCall.args[0], {
        validLabels: expectedLabels,
        mergedPullRequests: undefined,
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: Maybe.just('1.2.3')
    });
});

test('calls ensureCleanLocalGitState with correct parameters', async (t) => {
    const ensureCleanLocalGitState = stub().resolves();

    const cli = createCli({ ensureCleanLocalGitState });
    const options = cliRunOptionsFactory.build();

    const expectedGithubRepo = 'foo/bar';

    await cli.run(options);

    t.is(ensureCleanLocalGitState.callCount, 1);
    t.deepEqual(ensureCleanLocalGitState.firstCall.args, [expectedGithubRepo]);
});

test('calls getMergedPullRequests with the correct repo', async (t) => {
    const getMergedPullRequests = stub().resolves();

    const cli = createCli({ getMergedPullRequests });
    const options = cliRunOptionsFactory.build();

    const expectedGithubRepo = 'foo/bar';

    await cli.run(options);

    t.is(getMergedPullRequests.callCount, 1);
    t.is(getMergedPullRequests.firstCall.args[0], expectedGithubRepo);
});

test('reports the generated changelog to stdout and not to a file when stdout is set to true', async (t) => {
    const createChangelog = stub().returns('generated changelog');
    const prependFile = stub().resolves();
    const log = stub();

    const cli = createCli({
        createChangelog,
        prependFile: prependFile as unknown as typeof _prependFile,
        logger: { log } as unknown as Logger
    });

    await cli.run(
        cliRunOptionsFactory.build({
            stdout: true
        })
    );

    t.is(createChangelog.callCount, 1);
    t.deepEqual(createChangelog.firstCall.args[0], {
        validLabels: defaultValidLabels,
        mergedPullRequests: [],
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: Maybe.just('1.2.3')
    });

    t.is(prependFile.callCount, 0);

    t.is(log.callCount, 1);
    t.deepEqual(log.firstCall.args, ['generated changelog']);
});

test('reports the generated changelog to a file when stdout is set to false', async (t) => {
    const createChangelog = stub().returns('generated changelog');
    const prependFile = stub().resolves();

    const cli = createCli({
        createChangelog,
        prependFile: prependFile as unknown as typeof _prependFile
    });
    const options = cliRunOptionsFactory.build({
        stdout: false
    });

    await cli.run(options);

    t.is(createChangelog.callCount, 1);
    t.deepEqual(createChangelog.firstCall.args[0], {
        validLabels: defaultValidLabels,
        mergedPullRequests: [],
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: Maybe.just('1.2.3')
    });

    t.is(prependFile.callCount, 1);
    t.deepEqual(prependFile.firstCall.args, ['/foo/CHANGELOG.md', 'generated changelog\n\n']);
});

test('reports the generated unreleased changelog to a file when stdout is set to false', async (t) => {
    const createChangelog = stub().returns('generated changelog');
    const prependFile = stub().resolves();

    const cli = createCli({
        createChangelog,
        prependFile: prependFile as unknown as typeof _prependFile
    });
    const options = cliRunOptionsFactory.build({
        unreleased: true,
        stdout: false
    });

    await cli.run(options);

    t.is(createChangelog.callCount, 1);
    t.deepEqual(createChangelog.firstCall.args[0], {
        validLabels: defaultValidLabels,
        mergedPullRequests: [],
        githubRepo: 'foo/bar',
        unreleased: true,
        versionNumber: Maybe.just('1.2.3')
    });

    t.is(prependFile.callCount, 1);
    t.deepEqual(prependFile.firstCall.args, ['/foo/CHANGELOG.md', 'generated changelog\n\n']);
});

test('strips trailing empty lines from the generated changelog', async (t) => {
    const createChangelog = stub().returns('generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n\n\n\n');
    const prependFile = stub().resolves();

    const cli = createCli({ createChangelog, prependFile: prependFile as unknown as typeof _prependFile });
    const options = cliRunOptionsFactory.build();

    await cli.run(options);

    t.deepEqual(prependFile.firstCall.args, [
        '/foo/CHANGELOG.md',
        'generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n'
    ]);
});
