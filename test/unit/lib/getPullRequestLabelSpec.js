'use strict';

var chai = require('chai'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    getPullRequestLabel = require('../../../lib/getPullRequestLabel'),
    rest = require('restling'),
    expect = chai.expect;

require('sinon-as-promised')(Promise);
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

describe('getPullRequestLabel', function () {
    var getStub,
        anyRepo = 'any/repo',
        anyPullRequestId = 123,
        response = {};

    beforeEach(function () {
        response.data = [ { name: 'bug' } ];

        getStub = sinon.stub(rest, 'get').resolves(response);
    });

    afterEach(function () {
        getStub.restore();
    });

    it('should request the correct URL', function () {
        var expectedUrl = 'https://api.github.com/repos/' + anyRepo + '/issues/' + anyPullRequestId + '/labels';

        getPullRequestLabel(anyRepo, anyPullRequestId);

        expect(getStub).to.have.been.calledOnce;
        expect(getStub).to.have.been.calledWith(expectedUrl);
    });

    it('should fulfill with the correct label name', function () {
        var expectedLabelName = 'bug';

        return expect(getPullRequestLabel(anyRepo, anyPullRequestId))
            .to.become(expectedLabelName);
    });

    it('should reject if the pull request doesn’t have one valid label', function () {
        var expectedErrorMessage = 'Pull Request #123 has no label of ' +
            'bug, upgrade, documentation, feature, enhancement, build, breaking';

        response.data = [];

        return expect(getPullRequestLabel(anyRepo, anyPullRequestId))
            .to.be.rejectedWith(expectedErrorMessage);
    });

    it('should reject if the pull request has more than one valid label', function () {
        var expectedErrorMessage = 'Pull Request #123 has multiple labels of ' +
            'bug, upgrade, documentation, feature, enhancement, build, breaking';

        response.data = [ { name: 'bug' }, { name: 'documentation' } ];

        return expect(getPullRequestLabel(anyRepo, anyPullRequestId))
            .to.be.rejectedWith(expectedErrorMessage);
    });
});
