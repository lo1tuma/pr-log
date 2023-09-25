import test from 'ava';
import { fake } from 'sinon';
import { findRemoteAliasFactory, FindRemoteAliasDependencies, FindRemoteAlias } from './find-remote-alias.js';
import { RemoteAlias } from './git-command-runner.js';

const githubRepo = 'foo/bar';

function factory(result: readonly RemoteAlias[] = []): FindRemoteAlias {
    const getRemoteAliases = fake.resolves(result);
    const dependencies = { gitCommandRunner: { getRemoteAliases } } as unknown as FindRemoteAliasDependencies;

    return findRemoteAliasFactory(dependencies);
}

test('rejects if no alias is found', async (t) => {
    const expectedGitRemote = `git://github.com/${githubRepo}.git`;
    const expectedErrorMessage = `This local git repository doesn’t have a remote pointing to ${expectedGitRemote}`;
    const findRemoteAlias = factory();

    await t.throwsAsync(findRemoteAlias(githubRepo), { message: expectedErrorMessage });
});

test('resolves with the correct remote alias', async (t) => {
    const gitRemotes = [
        { alias: 'origin', url: 'git://github.com/fork/bar' },
        { alias: 'upstream', url: 'git://github.com/foo/bar' }
    ];
    const findRemoteAlias = factory(gitRemotes);

    t.is(await findRemoteAlias(githubRepo), 'upstream');
});

test('works with different forms of the same URL', async (t) => {
    const gitRemotes = [{ alias: 'origin', url: 'git+ssh://git@github.com/foo/bar ' }];
    const findRemoteAlias = factory(gitRemotes);

    t.is(await findRemoteAlias(githubRepo), 'origin');
});
