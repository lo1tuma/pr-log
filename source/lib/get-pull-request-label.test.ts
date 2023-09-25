import test from 'ava';
import { fake, SinonSpy } from 'sinon';
import type { Octokit } from '@octokit/rest';
import { getPullRequestLabel } from './get-pull-request-label.js';
import { defaultValidLabels } from './valid-labels.js';

interface Overrides {
    listLabelsOnIssue?: SinonSpy;
}

function createGithubClient(overrides: Overrides = {}): Octokit {
    const { listLabelsOnIssue = fake.resolves({ data: [] }) } = overrides;

    return {
        issues: { listLabelsOnIssue }
    } as unknown as Octokit;
}

const anyRepo = 'any/repo';
const anyPullRequestId = 123;

test('throws when the given repo doesn’t have a "/"', async (t) => {
    const githubClient = createGithubClient();

    await t.throwsAsync(getPullRequestLabel('foo', defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: 'Could not find a repository'
    });
});

test('requests the labels for the correct repo and pull request', async (t) => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'bug' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });

    await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient });

    t.is(listLabelsOnIssue.callCount, 1);
    t.deepEqual(listLabelsOnIssue.firstCall.args, [{ owner: 'any', repo: 'repo', issue_number: 123 }]);
});

test('fulfills with the correct label name', async (t) => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'bug' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });

    const expectedLabelName = 'bug';

    t.is(await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), expectedLabelName);
});

test('uses custom labels when provided', async (t) => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'addons' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });

    const expectedLabelName = 'addons';
    const customValidLabels = new Map([['addons', 'Addons']]);

    t.is(await getPullRequestLabel(anyRepo, customValidLabels, anyPullRequestId, { githubClient }), expectedLabelName);
});

test('rejects if the pull request doesn’t have one valid label', async (t) => {
    const githubClient = createGithubClient();

    const expectedErrorMessage =
        'Pull Request #123 has no label of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build';

    await t.throwsAsync(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: expectedErrorMessage
    });
});

test('rejects if the pull request has more than one valid label', async (t) => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'bug' }, { name: 'documentation' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });
    const expectedErrorMessage =
        'Pull Request #123 has multiple labels of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build';

    await t.throwsAsync(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: expectedErrorMessage
    });
});
