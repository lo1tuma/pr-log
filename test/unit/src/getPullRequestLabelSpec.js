import test from 'ava';
import { stub } from 'sinon';
import getPullRequestLabel from '../../../lib/getPullRequestLabel';
import defaultValidLabels from '../../../lib/validLabels';

function createGithubClient(labels = []) {
    return {
        issues: {
            listLabelsOnIssue: stub().resolves({ data: labels })
        }
    };
}

const anyRepo = 'any/repo';
const anyPullRequestId = 123;

test('requests the labels for the correct repo and pull request', async (t) => {
    const githubClient = createGithubClient([{ name: 'bug' }]);

    await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient });

    t.is(githubClient.issues.listLabelsOnIssue.callCount, 1);
    t.deepEqual(githubClient.issues.listLabelsOnIssue.firstCall.args, [
        { owner: 'any', repo: 'repo', issue_number: 123 }
    ]);
});

test('fulfills with the correct label name', async (t) => {
    const githubClient = createGithubClient([{ name: 'bug' }]);

    const expectedLabelName = 'bug';

    t.is(await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), expectedLabelName);
});

test('uses custom labels when provided', async (t) => {
    const githubClient = createGithubClient([{ name: 'addons' }]);

    const expectedLabelName = 'addons';
    const customValidLabels = new Map([['addons', 'Addons']]);

    t.is(await getPullRequestLabel(anyRepo, customValidLabels, anyPullRequestId, { githubClient }), expectedLabelName);
});

test('rejects if the pull request doesn’t have one valid label', async (t) => {
    const githubClient = createGithubClient([]);

    const expectedErrorMessage =
        'Pull Request #123 has no label of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build';

    await t.throwsAsync(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: expectedErrorMessage
    });
});

test('rejects if the pull request has more than one valid label', async (t) => {
    const githubClient = createGithubClient([{ name: 'bug' }, { name: 'documentation' }]);
    const expectedErrorMessage =
        'Pull Request #123 has multiple labels of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build';

    await t.throwsAsync(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }), {
        message: expectedErrorMessage
    });
});
