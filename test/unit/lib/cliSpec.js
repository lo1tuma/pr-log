import chai from 'chai';
import sinon from 'sinon';
import proxyquireModule from 'proxyquire';
import sinonChai from 'sinon-chai';
import 'sinon-as-promised';

const expect = chai.expect;
const proxyquire = proxyquireModule.noCallThru();

chai.use(sinonChai);

describe('CLI', function () {
    const ensureCleanLocalGitState = sinon.stub().resolves();
    const getMergedPullRequests = sinon.stub().resolves([]);
    const createChangelog = sinon.stub().returns('');
    const prependFile = sinon.stub().yields();
    const requireStubs = {
        './ensureCleanLocalGitState': ensureCleanLocalGitState,
        './getMergedPullRequests': getMergedPullRequests,
        './createChangelog': createChangelog,
        '/foo/package.json': {
            repository: { url: 'https://github.com/foo/bar.git' }
        },
        prepend: prependFile
    };
    const options = { sloppy: false };

    const cli = proxyquire('../../../lib/cli', requireStubs).default;

    beforeEach(function () {
        sinon.stub(process, 'cwd').returns('/foo');
    });

    afterEach(function () {
        ensureCleanLocalGitState.resolves();
        ensureCleanLocalGitState.reset();
        getMergedPullRequests.reset();
        createChangelog.reset();
        process.cwd.restore();
        prependFile.reset();
    });

    it('should throw if no version number was specified', function () {
        expect(cli.run).to.throw('version-number not specified');
    });

    it('should throw if the repository is dirty', function () {
        ensureCleanLocalGitState.rejects('Local copy is not clean');
        expect(cli.run('1.0 ', options)).to.be.rejectedWith('Local copy is not clean');
    });

    it('should not throw if the repository is dirty', function () {
        ensureCleanLocalGitState.rejects('Local copy is not clean');
        createChangelog.returns('sloppy changelog');
        return cli.run('1.0 ', { sloppy: true })
          .then(function () {
              expect(prependFile).to.have.been.calledOnce;
              expect(prependFile).to.have.been.calledWith('/foo/CHANGELOG.md', 'sloppy changelog');
          });
    });

    it('should report the generated changelog', function () {
        const expectedGithubRepo = 'foo/bar';

        createChangelog.returns('generated changelog');

        return cli.run('1.0.0', options)
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

    it('should strip trailing empty lines from the generated changelog', function () {
        createChangelog.returns('generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n');

        return cli.run('1.0.0', options)
            .then(function () {
                expect(prependFile).to.have.been
                    .calledWith('/foo/CHANGELOG.md', 'generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n');
            });
    });
});
