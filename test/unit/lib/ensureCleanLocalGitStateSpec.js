import test from 'ava';
import sinon from 'sinon';
import ensureCleanLocalGitStateFactory from '../../../lib/ensureCleanLocalGitState';

const githubRepo = 'foo/bar';

function factory({ status = '', revParse = 'master', revList = '' } = {}, git = sinon.stub()) {
    const findRemoteAlias = sinon.stub();
    const remoteAlias = 'origin';
    const dependencies = { git, findRemoteAlias };

    git.resolves();
    git.withArgs('status -s').resolves(status);
    git.withArgs('rev-parse --abbrev-ref HEAD').resolves(revParse);
    git.withArgs('rev-list --left-right master...origin/master').resolves(revList);

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
    const git = sinon.stub();
    const ensureCleanLocalGitState = factory({}, git);

    await ensureCleanLocalGitState(githubRepo);

    t.true(git.calledWithExactly('fetch origin'));
});

test('fulfills if the local git state is clean', async (t) => {
    const ensureCleanLocalGitState = factory();

    await ensureCleanLocalGitState(githubRepo);

    t.pass();
});
