import test from 'ava';
import sinon from 'sinon';
import findRemoteAliasFactory from '../../../lib/findRemoteAlias';

const githubRepo = 'foo/bar';

function factory(result = '') {
    const git = sinon.stub().resolves(result);
    const dependencies = { git };

    return findRemoteAliasFactory(dependencies);
}

test('rejects if no alias is found', async (t) => {
    const expectedGitRemote = `git://github.com/${githubRepo}.git`;
    const expectedErrorMessage = `This local git repository doesn’t have a remote pointing to ${expectedGitRemote}`;
    const findRemoteAlias = factory();

    await t.throwsAsync(findRemoteAlias(githubRepo), expectedErrorMessage);
});

test('resolves with the correct remote alias', async (t) => {
    const gitRemotes = [
        'origin git://github.com/fork/bar (fetch)',
        'origin git://github.com/fork/bar (push)',
        'upstream git://github.com/foo/bar (fetch)',
        'upstream git://github.com/foo/bar (push)'
    ];
    const findRemoteAlias = factory(gitRemotes.join('\n'));

    t.is(await findRemoteAlias(githubRepo), 'upstream');
});

test('works with tab as a separator', async (t) => {
    const gitRemotes = [
        'origin\tgit://github.com/fork/bar (fetch)',
        'origin\tgit://github.com/fork/bar (push)',
        'upstream\tgit://github.com/foo/bar (fetch)',
        'upstream\tgit://github.com/foo/bar (push)'
    ];
    const findRemoteAlias = factory(gitRemotes.join('\n'));

    t.is(await findRemoteAlias(githubRepo), 'upstream');
});

test('works with different forms of the same URL', async (t) => {
    const findRemoteAlias = factory('origin git+ssh://git@github.com/foo/bar (fetch)');

    t.is(await findRemoteAlias(githubRepo), 'origin');
});
