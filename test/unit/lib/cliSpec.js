'use strict';

var chai = require('chai'),
    sinon = require('sinon'),
    proxyquire = require('proxyquire').noCallThru(),
    expect = chai.expect;

chai.use(require('sinon-chai'));
require('sinon-as-promised');

describe('CLI', function () {
    var ensureCleanLocalGitState = sinon.stub().resolves(),
        getMergedPullRequests = sinon.stub().resolves([]),
        createChangelog = sinon.stub().returns(''),
        prependFile = sinon.stub().yields(),
        requireStubs = {
            './ensureCleanLocalGitState': ensureCleanLocalGitState,
            './getMergedPullRequests': getMergedPullRequests,
            './createChangelog': createChangelog,
            '/foo/package.json': {
                repository: { url: 'https://github.com/foo/bar.git' }
            },
            prepend: prependFile
        },
        cli = proxyquire('../../../lib/cli', requireStubs);

    beforeEach(function () {
        sinon.stub(process, 'cwd').returns('/foo');
    });

    afterEach(function () {
        ensureCleanLocalGitState.reset();
        getMergedPullRequests.reset();
        createChangelog.reset();
        process.cwd.restore();
        prependFile.reset();
    });

    it('should throw if no version number was specified', function () {
        expect(cli.run).to.throw('version-number not specified');
    });

    it('should report the generated changelog', function () {
        var expectedGithubRepo = 'foo/bar';

        createChangelog.returns('generated changelog');

        return cli.run('1.0.0')
            .then(function () {
                expect(ensureCleanLocalGitState).to.have.been.calledOnce;
                expect(ensureCleanLocalGitState).to.have.been.calledWith(expectedGithubRepo);

                expect(getMergedPullRequests).to.have.been.calledOnce;
                expect(getMergedPullRequests).to.have.been.calledWith(expectedGithubRepo);

                expect(createChangelog).to.have.been.calledOnce;
                expect(createChangelog).to.have.been.calledWith('1.0.0');

                expect(prependFile).to.have.been.calledOnce;
                expect(prependFile).to.have.been.calledWith('/foo/CHANGELOG.md', 'generated changelog');
            });
    });
});
