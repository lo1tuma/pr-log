import assert from 'node:assert';
import { fake, spy, type SinonSpy } from 'sinon';
import { defaultValidLabels } from './valid-labels.ts';
import {
    getMergedPullRequestsFactory,
    type GetMergedPullRequests,
    type GetMergedPullRequestsDependencies
} from './get-merged-pull-requests.ts';

const anyRepo = 'any/repo';
const latestVersion = '1.2.3';
const expectedPullRequestLabelCallCount = 2;
const expectedWaitForMillisecondsCallCount = 2;
const comparedArgumentCount = 3;

type Overrides = {
    readonly listTags?: SinonSpy;
    readonly getMergeCommitLogs?: SinonSpy;
    readonly getPullRequestLabel?: SinonSpy;
    readonly waitForMilliseconds?: SinonSpy;
    readonly labelLookupIntervalMilliseconds?: number;
};

type ControlledLabelLookup = {
    readonly getPullRequestLabel: SinonSpy;
    readonly firstLabelLookupStarted: Promise<void>;
    resolveFirstLabelLookup(label: string): void;
};

function factory(overrides: Overrides = {}): GetMergedPullRequests {
    const {
        listTags = fake.resolves([latestVersion]),
        getMergeCommitLogs = fake.resolves([]),
        getPullRequestLabel = fake.resolves('bug'),
        waitForMilliseconds = fake.resolves(undefined),
        labelLookupIntervalMilliseconds
    } = overrides;

    const dependencies = {
        getPullRequestLabel,
        gitCommandRunner: { listTags, getMergeCommitLogs },
        waitForMilliseconds,
        labelLookupIntervalMilliseconds
    } as unknown as GetMergedPullRequestsDependencies;

    return getMergedPullRequestsFactory(dependencies);
}

function failUninitializedControlledLabelLookupResolver(): never {
    throw new Error('Controlled label lookup resolver was called before initialization');
}

function createControlledLabelLookup(): ControlledLabelLookup {
    let resolveFirstLabelLookup: (label: string) => void = failUninitializedControlledLabelLookupResolver;
    const firstLabelLookup = new Promise<string>((resolve) => {
        resolveFirstLabelLookup = resolve;
    });
    let resolveFirstLabelLookupStarted: () => void = failUninitializedControlledLabelLookupResolver;
    const firstLabelLookupStarted = new Promise<void>((resolve) => {
        resolveFirstLabelLookupStarted = resolve;
    });
    const getPullRequestLabel = spy(async (_githubRepo, _validLabels, pullRequestId: number): Promise<string> => {
        if (pullRequestId === 1) {
            resolveFirstLabelLookupStarted();
            return firstLabelLookup;
        }

        return 'documentation';
    });

    return { getPullRequestLabel, firstLabelLookupStarted, resolveFirstLabelLookup };
}

function assertFirstPullRequestLabelLookup(callCount: number, comparedArguments: readonly unknown[]): void {
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(comparedArguments, ['any/repo', defaultValidLabels, 1]);
}

function assertSecondPullRequestLabelLookup(callCount: number, comparedArguments: readonly unknown[]): void {
    assert.strictEqual(callCount, expectedPullRequestLabelCallCount);
    assert.deepStrictEqual(comparedArguments, ['any/repo', defaultValidLabels, expectedPullRequestLabelCallCount]);
}

test('throws when there is no tag at all', async () => {
    const listTags = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to determine latest version number git tag'
    });
});

test('throws when there are only non-semver tags', async () => {
    const listTags = fake.resolves(['foo', 'bar']);
    const getMergedPullRequests = factory({ listTags });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to determine latest version number git tag'
    });
});

test('ignores non-semver tag', async () => {
    const listTags = fake.resolves(['0.0.1', 'foo', '0.0.2', '0.0.0.0.1']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(getMergeCommitLogs.callCount, 1);
    assert.deepStrictEqual(getMergeCommitLogs.firstCall.args, ['0.0.2']);
});

test('always uses the highest version', async () => {
    const listTags = fake.resolves(['1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '0.5.0']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(getMergeCommitLogs.callCount, 1);
    assert.deepStrictEqual(getMergeCommitLogs.firstCall.args, ['2.0.0']);
});

test('ignores prerelease versions', async () => {
    const listTags = fake.resolves(['1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '3.0.0-alpha.1']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(getMergeCommitLogs.callCount, 1);
    assert.deepStrictEqual(getMergeCommitLogs.firstCall.args, ['2.0.0']);
});

test('throws when the pull request cannot be extracted from the commit message', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request foo from branch',
            body: 'pr-1 message'
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to extract pull request id from merge commit log'
    });
});

test('throws when the the commit log doesn’t have a body', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to extract pull request title from merge commit log'
    });
});

test('extracts id, title and label for merged pull requests', async () => {
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

    assert.strictEqual(getPullRequestLabel.callCount, expectedPullRequestLabelCallCount);
    assert.deepStrictEqual(getPullRequestLabel.firstCall.args.slice(0, comparedArgumentCount), [
        'any/repo',
        defaultValidLabels,
        firstExpectedPullRequest.id
    ]);
    assert.deepStrictEqual(getPullRequestLabel.secondCall.args.slice(0, comparedArgumentCount), [
        'any/repo',
        defaultValidLabels,
        secondExpectedPullRequest.id
    ]);

    assert.deepStrictEqual(pullRequests, [firstExpectedPullRequest, secondExpectedPullRequest]);
});

test('looks up pull request labels sequentially', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { subject: 'Merge pull request #2 from other', body: 'pr-2 message' }
    ]);
    const { getPullRequestLabel, firstLabelLookupStarted, resolveFirstLabelLookup } = createControlledLabelLookup();
    const getMergedPullRequests = factory({ getMergeCommitLogs, getPullRequestLabel });
    const mergedPullRequests = getMergedPullRequests(anyRepo, defaultValidLabels);

    await firstLabelLookupStarted;

    assertFirstPullRequestLabelLookup(
        getPullRequestLabel.callCount,
        getPullRequestLabel.firstCall.args.slice(0, comparedArgumentCount)
    );

    resolveFirstLabelLookup('bug');
    const pullRequests = await mergedPullRequests;

    assertSecondPullRequestLabelLookup(
        getPullRequestLabel.callCount,
        getPullRequestLabel.secondCall.args.slice(0, comparedArgumentCount)
    );
    assert.deepStrictEqual(pullRequests, [
        { id: 1, title: 'pr-1 message', label: 'bug' },
        { id: 2, title: 'pr-2 message', label: 'documentation' }
    ]);
});

test('waits between pull request label lookups', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { subject: 'Merge pull request #2 from other', body: 'pr-2 message' },
        { subject: 'Merge pull request #3 from third', body: 'pr-3 message' }
    ]);
    const waitForMilliseconds = fake.resolves(undefined);
    const labelLookupIntervalMilliseconds = 123;
    const getMergedPullRequests = factory({
        getMergeCommitLogs,
        waitForMilliseconds,
        labelLookupIntervalMilliseconds
    });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(waitForMilliseconds.callCount, expectedWaitForMillisecondsCallCount);
    assert.deepStrictEqual(waitForMilliseconds.firstCall.args, [labelLookupIntervalMilliseconds]);
    assert.deepStrictEqual(waitForMilliseconds.secondCall.args, [labelLookupIntervalMilliseconds]);
});
