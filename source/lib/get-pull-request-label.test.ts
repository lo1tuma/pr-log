import assert from 'node:assert';
import { fake, type SinonSpy } from 'sinon';
import { oneLine } from 'common-tags';
import type { Octokit } from '@octokit/rest';
import { getPullRequestLabel } from './get-pull-request-label.ts';
import { defaultValidLabels } from './valid-labels.ts';

type Overrides = {
    readonly listLabelsOnIssue?: SinonSpy;
};

function createGithubClient(overrides: Overrides = {}): Readonly<Octokit> {
    const { listLabelsOnIssue = fake.resolves({ data: [] }) } = overrides;

    return {
        issues: { listLabelsOnIssue }
    } as unknown as Octokit;
}

const anyRepo = 'any/repo';
const anyPullRequestId = 123;

test('throws when the given repo doesn’t have a "/"', async () => {
    const githubClient = createGithubClient();

    await assert.rejects(getPullRequestLabel('foo', defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: 'Could not find a repository'
    });
});

test('requests the labels for the correct repo and pull request', async () => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'bug' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });

    await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient });

    assert.strictEqual(listLabelsOnIssue.callCount, 1);
    assert.deepStrictEqual(listLabelsOnIssue.firstCall.args, [{ owner: 'any', repo: 'repo', issue_number: 123 }]);
});

test('fulfills with the correct label name', async () => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'bug' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });

    const expectedLabelName = 'bug';

    assert.strictEqual(
        await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }),
        expectedLabelName
    );
});

test('uses custom labels when provided', async () => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'addons' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });

    const expectedLabelName = 'addons';
    const customValidLabels = new Map([['addons', 'Addons']]);

    assert.strictEqual(
        await getPullRequestLabel(anyRepo, customValidLabels, anyPullRequestId, { githubClient }),
        expectedLabelName
    );
});

test('rejects if the pull request doesn’t have one valid label', async () => {
    const githubClient = createGithubClient();

    const expectedErrorMessage = oneLine`Pull Request #123 has no label of breaking, bug,
        feature, enhancement, documentation, upgrade, refactor, build`;

    await assert.rejects(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: expectedErrorMessage
    });
});

test('rejects if the pull request has more than one valid label', async () => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'bug' }, { name: 'documentation' }] });
    const githubClient = createGithubClient({ listLabelsOnIssue });
    const expectedErrorMessage = oneLine`Pull Request #123 has multiple labels of breaking,
        bug, feature, enhancement, documentation, upgrade, refactor, build`;

    await assert.rejects(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: expectedErrorMessage
    });
});
