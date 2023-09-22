import test from 'ava';
import { getGithubRepo } from './get-github-repo.js';

test('extracts the repo path of a github URL', (t) => {
    t.is(getGithubRepo('git://github.com/foo/bar.git#master'), 'foo/bar');
});

test('throws if the given URL is not a github URL', (t) => {
    t.throws(() => getGithubRepo('git://foo.com/bar.git'), { message: 'Invalid GitHub URI git://foo.com/bar.git' });
});
