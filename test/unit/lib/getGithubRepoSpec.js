import test from 'ava';
import getGithubRepo from '../../../lib/getGithubRepo';

test('extracts the repo path of a github URL', (t) => {
    t.is(getGithubRepo('git://github.com/foo/bar.git#master'), 'foo/bar');
});

test('throws if the given URL is not a github URL', (t) => {
    t.throws(() => getGithubRepo('git://foo.com/bar.git'), 'Invalid GitHub URI git://foo.com/bar.git');
});
