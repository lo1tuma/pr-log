import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import getPullRequestLabel from '../../../lib/getPullRequestLabel';
import defaultValidLabels from '../../../lib/validLabels';

const expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);

function createGithubClient(labels = []) {
    return {
        issues: {
            getIssueLabels: sinon.stub().resolves({ data: labels })
        }
    };
}

describe('getPullRequestLabel', function () {
    const anyRepo = 'any/repo';
    const anyPullRequestId = 123;

    it('should request the the labels for the correct repo and pull request', async function () {
        const githubClient = createGithubClient([ { name: 'bug' } ]);

        await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient });

        expect(githubClient.issues.getIssueLabels).to.have.been.calledOnce;
        expect(githubClient.issues.getIssueLabels)
            .to.have.been.calledWithExactly({ owner: 'any', repo: 'repo', number: 123 });
    });

    it('should fulfill with the correct label name', function () {
        const githubClient = createGithubClient([ { name: 'bug' } ]);

        const expectedLabelName = 'bug';

        return expect(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }))
            .to.become(expectedLabelName);
    });

    it('should use custom labels when provided', function () {
        const githubClient = createGithubClient([ { name: 'addons' } ]);

        const expectedLabelName = 'addons';
        const customValidLabels = { addons: 'Addons' };

        return expect(getPullRequestLabel(anyRepo, customValidLabels, anyPullRequestId, { githubClient }))
            .to.become(expectedLabelName);
    });

    it('should reject if the pull request doesn’t have one valid label', function () {
        const githubClient = createGithubClient([]);

        // eslint-disable-next-line max-len
        const expectedErrorMessage = 'Pull Request #123 has no label of bug, upgrade, documentation, feature, enhancement, build, breaking';

        return expect(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }))
            .to.be.rejectedWith(expectedErrorMessage);
    });

    it('should reject if the pull request has more than one valid label', function () {
        const githubClient = createGithubClient([ { name: 'bug' }, { name: 'documentation' } ]);
        // eslint-disable-next-line max-len
        const expectedErrorMessage = 'Pull Request #123 has multiple labels of bug, upgrade, documentation, feature, enhancement, build, breaking';

        return expect(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, { githubClient }))
            .to.be.rejectedWith(expectedErrorMessage);
    });
});
