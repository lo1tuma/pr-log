import test from 'ava';
import { fake, type SinonSpy } from 'sinon';
import {
    createGitCommandRunner,
    type GitCommandRunner,
    type GitCommandRunnerDependencies
} from './git-command-runner.js';

type Overrides = {
    readonly execute?: SinonSpy;
};

function gitCommandRunnerFactory(overrides: Overrides = {}): GitCommandRunner {
    const { execute = fake.resolves({ stdout: '' }) } = overrides;
    const fakeDependencies = { execute } as unknown as GitCommandRunnerDependencies;

    return createGitCommandRunner(fakeDependencies);
}

test('getShortStatus() executes "git status" with correct options', async (t) => {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getShortStatus();

    t.is(execute.callCount, 1);
    t.deepEqual(execute.firstCall.args, ['git status --short']);
});

test('getShortStatus() returns the command output without leading or trailing whitespace', async (t) => {
    const execute = fake.resolves({ stdout: '  foo \n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getShortStatus();

    t.is(result, 'foo');
});

test('getCurrentBranchName() executes "git rev-parse" with correct options', async (t) => {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getCurrentBranchName();

    t.is(execute.callCount, 1);
    t.deepEqual(execute.firstCall.args, ['git rev-parse --abbrev-ref HEAD']);
});

test('getCurrentBranchName() returns the command output without leading or trailing whitespace', async (t) => {
    const execute = fake.resolves({ stdout: '  foo \n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getCurrentBranchName();

    t.is(result, 'foo');
});

test('fetchRemote() executes "git fetch" with the given remote', async (t) => {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.fetchRemote('foo');

    t.is(execute.callCount, 1);
    t.deepEqual(execute.firstCall.args, ['git fetch foo']);
});

test('getSymmetricDifferencesBetweenBranches() executes "git rev-list" with correct options', async (t) => {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getSymmetricDifferencesBetweenBranches('a', 'b');

    t.is(execute.callCount, 1);
    t.deepEqual(execute.firstCall.args, ['git rev-list --left-right a...b']);
});

test('getSymmetricDifferencesBetweenBranches() returns the command output splitted as individual lines', async (t) => {
    const execute = fake.resolves({ stdout: ' a \nb\nc \n \n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getSymmetricDifferencesBetweenBranches('a', 'b');

    t.deepEqual(result, ['a', 'b', 'c']);
});

test('getRemoteAliases() executes "git remote -v"', async (t) => {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getRemoteAliases();

    t.is(execute.callCount, 1);
    t.deepEqual(execute.firstCall.args, ['git remote -v']);
});

test('getRemoteAliases() returns the parsed command output', async (t) => {
    const execute = fake.resolves({
        stdout: 'foo git@example.com/repo/a.git (fetch)\nfoo\tgit@example.com/repo/a.git (push)\n\n'
    });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getRemoteAliases();

    t.deepEqual(result, [
        { alias: 'foo', url: 'git@example.com/repo/a.git' },
        { alias: 'foo', url: 'git@example.com/repo/a.git' }
    ]);
});

test('getRemoteAliases() throws when the url of an remote entry cannot be determined', async (t) => {
    const execute = fake.resolves({ stdout: 'foo git@example.com/repo/a.git (fetch)\nfoo' });
    const runner = gitCommandRunnerFactory({ execute });

    await t.throwsAsync(runner.getRemoteAliases(), { message: 'Failed to determine git remote alias' });
});

test('listTags() executes "git tag" with correct options', async (t) => {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.listTags();

    t.is(execute.callCount, 1);
    t.deepEqual(execute.firstCall.args, ['git tag --list']);
});

test('listTags() returns the command output splitted as individual lines', async (t) => {
    const execute = fake.resolves({ stdout: ' a \nb\nc \n \n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.listTags();

    t.deepEqual(result, ['a', 'b', 'c']);
});

test('getMergeCommitLogs() executes "git log" with the correct options', async (t) => {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getMergeCommitLogs('foo');

    t.is(execute.callCount, 1);
    t.deepEqual(execute.firstCall.args, ['git log --no-color --pretty=format:%s__||__%b##$$@@$$## --merges foo..HEAD']);
});

test('getMergeCommitLogs() returns the parsed command output', async (t) => {
    const execute = fake.resolves({ stdout: 'foo__||__bar##$$@@$$##\nbaz__||__qux##$$@@$$##\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    t.deepEqual(result, [
        { subject: 'foo', body: 'bar' },
        { subject: 'baz', body: 'qux' }
    ]);
});

test('getMergeCommitLogs() parses multi-line message bodies correctly', async (t) => {
    const execute = fake.resolves({ stdout: 'foo__||__bar\nbaz\nqux##$$@@$$##\nbaz__||__qux##$$@@$$##\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    t.deepEqual(result, [
        { subject: 'foo', body: 'bar\nbaz\nqux' },
        { subject: 'baz', body: 'qux' }
    ]);
});

test('getMergeCommitLogs() parses multi-line bodies correctly when it doesn’t end with a line break', async (t) => {
    const execute = fake.resolves({ stdout: 'foo__||__bar\nbaz\nqux##$$@@$$##\nbaz__||__qux##$$@@$$##' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    t.deepEqual(result, [
        { subject: 'foo', body: 'bar\nbaz\nqux' },
        { subject: 'baz', body: 'qux' }
    ]);
});

test('getMergeCommitLogs() falls back to undefined when the body couldn’t be extracted', async (t) => {
    const execute = fake.resolves({ stdout: 'foo##$$@@$$##\n\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    t.deepEqual(result, [{ subject: 'foo', body: undefined }]);
});

test('getMergeCommitLogs() falls back to undefined when the body is an empty string', async (t) => {
    const execute = fake.resolves({ stdout: 'foo__||__##$$@@$$##\n\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    t.deepEqual(result, [{ subject: 'foo', body: undefined }]);
});
