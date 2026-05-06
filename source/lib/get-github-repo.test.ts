import assert from 'node:assert';
import { getGithubRepo } from './get-github-repo.ts';

test('extracts the repo path of a github URL', () => {
    assert.strictEqual(getGithubRepo('git://github.com/foo/bar.git#master'), 'foo/bar');
});

test('throws if the given URL is not a github URL', () => {
    assert.throws(
        () => {
            return getGithubRepo('git://foo.com/bar.git');
        },
        { message: 'Invalid GitHub URI git://foo.com/bar.git' }
    );
});
