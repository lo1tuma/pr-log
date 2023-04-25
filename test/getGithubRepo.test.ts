import { describe, expect, it } from '@jest/globals';
import { getGithubRepo } from '../src/getGithubRepo';
import { Repo } from '../src/utils/repo';

describe('getGithubRepo', () => {
    it('extracts the repo path of a github URL', () => {
        expect(getGithubRepo('git://github.com/foo/bar.git#master')).toEqual(new Repo('foo', 'bar'));
    });

    it('throws if the given URL is not a github URL', () => {
        expect(() => getGithubRepo('git://foo.com/bar.git')).toThrow(
            expect.objectContaining({ message: 'Invalid GitHub URI git://foo.com/bar.git' })
        );
    });
});
