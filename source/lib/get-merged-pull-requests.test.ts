import test from 'ava';
import { fake, SinonSpy } from 'sinon';
import { defaultValidLabels } from './valid-labels.js';
import {
    getMergedPullRequestsFactory,
    GetMergedPullRequests,
    GetMergedPullRequestsDependencies
} from './get-merged-pull-requests.js';

const anyRepo = 'any/repo';
const latestVersion = '1.2.3';

interface Overrides {
    listTags?: SinonSpy;
    getMergeCommitLogs?: SinonSpy;
    getPullRequestLabel?: SinonSpy;
}

function factory(overrides: Overrides = {}): GetMergedPullRequests {
    const {
        listTags = fake.resolves([latestVersion]),
        getMergeCommitLogs = fake.resolves([]),
        getPullRequestLabel = fake.resolves('bug')
    } = overrides;

    const dependencies = {
        getPullRequestLabel,
        gitCommandRunner: { listTags, getMergeCommitLogs }
    } as unknown as GetMergedPullRequestsDependencies;

    return getMergedPullRequestsFactory(dependencies);
}

test('ignores non-semver tag', async (t) => {
    const listTags = fake.resolves(['0.0.1', 'foo', '0.0.2', '0.0.0.0.1']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.is(getMergeCommitLogs.callCount, 1);
    t.deepEqual(getMergeCommitLogs.firstCall.args, ['0.0.2']);
});

test('always uses the highest version', async (t) => {
    const listTags = fake.resolves(['1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '0.5.0']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.is(getMergeCommitLogs.callCount, 1);
    t.deepEqual(getMergeCommitLogs.firstCall.args, ['2.0.0']);
});

test('ignores prerelease versions', async (t) => {
    const listTags = fake.resolves(['1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '3.0.0-alpha.1']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.is(getMergeCommitLogs.callCount, 1);
    t.deepEqual(getMergeCommitLogs.firstCall.args, ['2.0.0']);
});

test('extracts id, title and label for merged pull requests', async (t) => {
    const expectedPullRequests = [
        { id: 1, title: 'pr-1 message', label: 'bug' },
        { id: 2, title: 'pr-2 message', label: 'bug' }
    ];
    const getPullRequestLabel = fake.resolves('bug');
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { subject: 'Merge pull request #2 from other', body: 'pr-2 message' }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs, getPullRequestLabel });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultValidLabels);

    t.is(getPullRequestLabel.callCount, 2);
    t.is(getPullRequestLabel.firstCall.args[2], 1);
    t.is(getPullRequestLabel.secondCall.args[2], 2);

    t.deepEqual(pullRequests, expectedPullRequests);
});
