import test from 'ava';
import { stub } from 'sinon';
import type { EnsureCleanLocalGitState, EnsureCleanLocalGitStateDependencies } from './ensure-clean-local-git-state.js';
import { ensureCleanLocalGitStateFactory } from './ensure-clean-local-git-state.js';

const githubRepo = 'foo/bar';

function factory({ status = '', revParse = 'master', revList = '' } = {}, execute = stub()): EnsureCleanLocalGitState {
    const findRemoteAlias = stub();
    const remoteAlias = 'origin';
    const dependencies = { execute, findRemoteAlias } as unknown as EnsureCleanLocalGitStateDependencies;

    execute.resolves({ stdout: '' });
    execute.withArgs(['git status -s']).resolves({ stdout: status });
    execute.withArgs(['git rev-parse --abbrev-ref HEAD']).resolves({ stdout: revParse });
    execute.withArgs(['git rev-list --left-right master...', ''], 'origin/master').resolves({ stdout: revList });

    findRemoteAlias.resolves(remoteAlias);

    return ensureCleanLocalGitStateFactory(dependencies);
}

test('rejects if `git status -s` is not empty', async (t) => {
    const ensureCleanLocalGitState = factory({ status: 'M foobar\n' });

    await t.throwsAsync(ensureCleanLocalGitState(githubRepo), { message: 'Local copy is not clean' });
});

test('rejects if current branch is not master', async (t) => {
    const ensureCleanLocalGitState = factory({ revParse: 'feature-foo\n' });

    await t.throwsAsync(ensureCleanLocalGitState(githubRepo), { message: 'Not on master branch' });
});

test('rejects if the local branch is ahead of the remote', async (t) => {
    const ensureCleanLocalGitState = factory({ revList: '<commit-sha1\n' });
    const expectedMessage = 'Local git master branch is 1 commits ahead and 0 commits behind of origin/master';

    await t.throwsAsync(ensureCleanLocalGitState(githubRepo), { message: expectedMessage });
});

test('rejects if the local branch is behind the remote', async (t) => {
    const ensureCleanLocalGitState = factory({ revList: '>commit-sha1\n' });
    const expectedMessage = 'Local git master branch is 0 commits ahead and 1 commits behind of origin/master';

    await t.throwsAsync(ensureCleanLocalGitState(githubRepo), { message: expectedMessage });
});

test('fetches the remote repository', async (t) => {
    const execute = stub();
    const ensureCleanLocalGitState = factory({}, execute);

    await ensureCleanLocalGitState(githubRepo);

    t.true(execute.calledWithExactly(['git fetch ', ''], 'origin'));
});

test('fulfills if the local git state is clean', async (t) => {
    const ensureCleanLocalGitState = factory();

    await ensureCleanLocalGitState(githubRepo);

    t.pass();
});
