import { describe, expect, it, jest } from '@jest/globals';
import { ensureCleanLocalGitStateFactory } from '../src/ensureCleanLocalGitState';
import { Repo } from '../src/utils/repo';

const githubRepo = new Repo('foo', 'bar');

function factory({ status = '', revParse = 'master', revList = '' } = {}, git = jest.fn()) {
    const findRemoteAlias = jest.fn(async () => '');
    const remoteAlias = 'origin';
    const dependencies = { git, findRemoteAlias };

    git.mockImplementation(async (arg) => {
        switch (arg) {
            case 'status -s':
                return status;
            case 'rev-parse --abbrev-ref HEAD':
                return revParse;
            case 'rev-list --left-right master...origin/master':
                return revList;
        }
    });

    findRemoteAlias.mockResolvedValue(remoteAlias);

    return ensureCleanLocalGitStateFactory(dependencies);
}

describe('ensureCleanLocalGitState', () => {
    it('rejects if `git status -s` is not empty', async () => {
        const ensureCleanLocalGitState = factory({ status: 'M foobar\n' });

        await expect(ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
            expect.objectContaining({ message: 'Local copy is not clean' })
        );
    });

    it('rejects if current branch is not master', async () => {
        const ensureCleanLocalGitState = factory({ revParse: 'feature-foo\n' });

        await expect(ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
            expect.objectContaining({ message: 'Not on master branch' })
        );
    });

    it('rejects if the local branch is ahead of the remote', async () => {
        const ensureCleanLocalGitState = factory({ revList: '<commit-sha1\n' });
        const expectedMessage = 'Local git master branch is 1 commits ahead and 0 commits behind of origin/master';

        await expect(ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
            expect.objectContaining({ message: expectedMessage })
        );
    });

    it('rejects if the local branch is behind the remote', async () => {
        const ensureCleanLocalGitState = factory({ revList: '>commit-sha1\n' });
        const expectedMessage = 'Local git master branch is 0 commits ahead and 1 commits behind of origin/master';

        await expect(ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
            expect.objectContaining({ message: expectedMessage })
        );
    });

    it('fetches the remote repository', async () => {
        const git = jest.fn();
        const ensureCleanLocalGitState = factory({}, git);

        await ensureCleanLocalGitState(githubRepo);

        expect(git).toHaveBeenCalledWith('fetch origin');
    });

    it('fulfills if the local git state is clean', async () => {
        const ensureCleanLocalGitState = factory();

        await expect(ensureCleanLocalGitState(githubRepo)).resolves.toBe(undefined);
    });
});
