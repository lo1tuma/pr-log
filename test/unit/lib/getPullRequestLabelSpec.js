import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Promise from 'bluebird';
import rest from 'restling';
import getPullRequestLabel from '../../../lib/getGithubPullRequest';
import defaultValidLabels from '../../../lib/validLabels';

const expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('getPullRequestLabel', function () {
    const anyRepo = 'any/repo';
    const anyPullRequestId = 123;
    const response = {};

    let getStub;

    beforeEach(function () {
        response.data = [ { name: 'bug' } ];

        getStub = sinon.stub(rest, 'get').usingPromise(Promise).resolves(response);
    });

    afterEach(function () {
        getStub.restore();
    });

    it('should request the correct URL', function () {
        const expectedUrl = `https://api.github.com/repos/${anyRepo}/issues/${anyPullRequestId}/labels`;

        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId);

        expect(getStub).to.have.been.calledOnce;
        expect(getStub).to.have.been.calledWith(expectedUrl);
    });

    it('should fulfill with the correct label name', function () {
        const expectedLabelName = 'bug';

        return expect(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId))
            .to.become(expectedLabelName);
    });

    it('should use custom labels when provided', function () {
        const expectedLabelName = 'addons';
        const customValidLabels = {
            addons: 'Addons'
        };
        response.data = [ { name: 'addons' } ];

        return expect(getPullRequestLabel(anyRepo, customValidLabels, anyPullRequestId))
            .to.become(expectedLabelName);
    });

    it('should reject if the pull request doesn’t have one valid label', function () {
        // eslint-disable-next-line max-len
        const expectedErrorMessage = 'Pull Request #123 has no label of bug, upgrade, documentation, feature, enhancement, build, breaking';

        response.data = [];

        return expect(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId))
            .to.be.rejectedWith(expectedErrorMessage);
    });

    it('should reject if the pull request has more than one valid label', function () {
        // eslint-disable-next-line max-len
        const expectedErrorMessage = 'Pull Request #123 has multiple labels of bug, upgrade, documentation, feature, enhancement, build, breaking';

        response.data = [ { name: 'bug' }, { name: 'documentation' } ];

        return expect(getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId))
            .to.be.rejectedWith(expectedErrorMessage);
    });
});
