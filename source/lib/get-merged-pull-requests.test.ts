import test from 'ava';
import { fake, type SinonSpy } from 'sinon';
import { defaultValidLabels } from './valid-labels.js';
import {
    getMergedPullRequestsFactory,
    type GetMergedPullRequests,
    type GetMergedPullRequestsDependencies
} from './get-merged-pull-requests.js';

const anyRepo = 'any/repo';
const latestVersion = '1.2.3';

type Overrides = {
    readonly listTags?: SinonSpy;
    readonly getMergeCommitLogs?: SinonSpy;
    readonly getPullRequestLabel?: SinonSpy;
};

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

test('throws when there is no tag at all', async (t) => {
    const listTags = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags });

    await t.throwsAsync(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to determine latest version number git tag'
    });
});

test('throws when there are only non-semver tags', async (t) => {
    const listTags = fake.resolves(['foo', 'bar']);
    const getMergedPullRequests = factory({ listTags });

    await t.throwsAsync(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to determine latest version number git tag'
    });
});

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

test('throws when the pull request cannot be extracted from the commit message', async (t) => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request foo from branch',
            body: 'pr-1 message'
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs });

    await t.throwsAsync(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to extract pull request id from merge commit log'
    });
});

test('throws when the the commit log doesn’t have a body', async (t) => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs });

    await t.throwsAsync(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to extract pull request title from merge commit log'
    });
});

test('extracts id, title and label for merged pull requests', async (t) => {
    const firstExpectedPullRequest = { id: 1, title: 'pr-1 message', label: 'bug' };
    const secondExpectedPullRequest = { id: 2, title: 'pr-2 message', label: 'bug' };
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

    t.like(getPullRequestLabel.args, [
        ['any/repo', defaultValidLabels, firstExpectedPullRequest.id],
        ['any/repo', defaultValidLabels, secondExpectedPullRequest.id]
    ]);

    t.deepEqual(pullRequests, [firstExpectedPullRequest, secondExpectedPullRequest]);
});
