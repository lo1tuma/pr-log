import test from 'ava';
import { stub } from 'sinon';
import defaultValidLabels from '../../../lib/validLabels';
import getMergedPullRequestsFactory from '../../../lib/getMergedPullRequests';

const anyRepo = 'any/repo';
const latestVersion = '1.2.3';

function factory({ tag = latestVersion, log } = {}, git = stub(), getPullRequestLabel = stub()) {
    getPullRequestLabel.resolves('bug');

    git.resolves('');
    git.withArgs('tag --list').resolves(tag);
    git.withArgs(`log --no-color --pretty=format:"%s (%b)" --merges ${latestVersion}..HEAD`).resolves(log);

    const dependencies = { getPullRequestLabel, git };

    return getMergedPullRequestsFactory(dependencies);
}

test('ignores non-semver tag', async (t) => {
    const git = stub();
    const getMergedPullRequests = factory({ tag: '0.0.1\nfoo\n0.0.2\n0.0.0.0.1' }, git);
    const expectedGitLogCommand = 'log --no-color --pretty=format:"%s (%b)" --merges 0.0.2..HEAD';

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.true(git.calledWith(expectedGitLogCommand));
});

test('always usees the highest version', async (t) => {
    const git = stub();
    const getMergedPullRequests = factory({ tag: '1.0.0\n0.0.0\n0.7.5\n2.0.0\n0.2.5\n0.5.0' }, git);
    const expectedGitLogCommand = 'log --no-color --pretty=format:"%s (%b)" --merges 2.0.0..HEAD';

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.true(git.calledWith(expectedGitLogCommand));
});

test('ignores prerelease versions', async (t) => {
    const git = stub();
    const getMergedPullRequests = factory({ tag: '1.0.0\n0.0.0\n0.7.5\n2.0.0\n0.2.5\n3.0.0-alpha.1' }, git);
    const expectedGitLogCommand = 'log --no-color --pretty=format:"%s (%b)" --merges 2.0.0..HEAD';

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.true(git.calledWith(expectedGitLogCommand));
});

test('extracts id, title and label for merged pull requests', async (t) => {
    const gitLogMessages = [
        'Merge pull request #1 from branch (pr-1 message)',
        'Merge pull request #2 from other (pr-2 message)'
    ];
    const expectedPullRequests = [
        { id: '1', title: 'pr-1 message', label: 'bug' },
        { id: '2', title: 'pr-2 message', label: 'bug' }
    ];
    const getPullRequestLabel = stub();
    const git = stub();
    const getMergedPullRequests = factory({ log: gitLogMessages.join('\n') }, git, getPullRequestLabel);

    const pullRequests = await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.is(getPullRequestLabel.callCount, 2);
    t.is(getPullRequestLabel.firstCall.args[2], '1');
    t.is(getPullRequestLabel.secondCall.args[2], '2');

    t.deepEqual(pullRequests, expectedPullRequests);
});

test('works with line feeds in commit message body', async (t) => {
    const gitLogMessages = [
        'Merge pull request #1 from A (pr-1 message\n)',
        'Merge pull request #2 from B (pr-2 message)'
    ];
    const expectedResults = [
        { id: '1', title: 'pr-1 message', label: 'bug' },
        { id: '2', title: 'pr-2 message', label: 'bug' }
    ];
    const getMergedPullRequests = factory({ log: gitLogMessages.join('\n') });

    t.deepEqual(await getMergedPullRequests(anyRepo), expectedResults);
});

test('works with parentheses in the commit message body', async (t) => {
    const gitLogMessages = ['Merge pull request #42 from A (pr-42 message (fixes #21))'];
    const expectedResults = [{ id: '42', title: 'pr-42 message (fixes #21)', label: 'bug' }];
    const getMergedPullRequests = factory({ log: gitLogMessages.join('\n') });

    t.deepEqual(await getMergedPullRequests(anyRepo), expectedResults);
});

test('skips with non-matching parenthesis', async (t) => {
    const gitLogMessages = ['Merge pull request #3 from kadirahq/greenkeeper-update-all'];
    const expectedResults = [];
    const getMergedPullRequests = factory({ log: gitLogMessages.join('\n') });

    t.deepEqual(await getMergedPullRequests(anyRepo), expectedResults);
});
