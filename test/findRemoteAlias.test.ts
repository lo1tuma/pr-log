import { describe, expect, it, jest } from '@jest/globals';
import { findRemoteAliasFactory } from '../src/findRemoteAlias';

import { Repo } from '../src/utils/repo';

const githubRepo = new Repo('foo', 'bar');

function factory(result = '') {
    const git = jest.fn(async () => result);
    const dependencies = { git };

    return findRemoteAliasFactory(dependencies);
}

describe('findRemoteAlias', () => {
    it('rejects if no alias is found', async () => {
        const expectedGitRemote = `git://github.com/${githubRepo.path}.git`;
        const expectedErrorMessage = `This local git repository doesn’t have a remote pointing to ${expectedGitRemote}`;
        const findRemoteAlias = factory();

        await expect(findRemoteAlias(githubRepo)).rejects.toThrow(
            expect.objectContaining({ message: expectedErrorMessage })
        );
    });

    it('resolves with the correct remote alias', async () => {
        const gitRemotes = [
            'origin git://github.com/fork/bar (fetch)',
            'origin git://github.com/fork/bar (push)',
            'upstream git://github.com/foo/bar (fetch)',
            'upstream git://github.com/foo/bar (push)'
        ];
        const findRemoteAlias = factory(gitRemotes.join('\n'));

        expect(await findRemoteAlias(githubRepo)).toBe('upstream');
    });

    it('works with tab as a separator', async () => {
        const gitRemotes = [
            'origin\tgit://github.com/fork/bar (fetch)',
            'origin\tgit://github.com/fork/bar (push)',
            'upstream\tgit://github.com/foo/bar (fetch)',
            'upstream\tgit://github.com/foo/bar (push)'
        ];
        const findRemoteAlias = factory(gitRemotes.join('\n'));

        expect(await findRemoteAlias(githubRepo)).toBe('upstream');
    });

    it('works with different forms of the same URL', async () => {
        const findRemoteAlias = factory('origin git+ssh://git@github.com/foo/bar (fetch)');

        expect(await findRemoteAlias(githubRepo)).toBe('origin');
    });
});
