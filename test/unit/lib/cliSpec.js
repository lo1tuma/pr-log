import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import createCliAgent from '../../../lib/cli';

const expect = chai.expect;

chai.use(sinonChai);

function createCli(dependencies = {}) {
    const {
        ensureCleanLocalGitState = sinon.stub().resolves(),
        getMergedPullRequests = sinon.stub().resolves([]),
        createChangelog = sinon.stub().returns(''),
        prependFile = sinon.stub().resolves(),
        packageInfo = { repository: { url: 'https://github.com/foo/bar.git' } }
    } = dependencies;

    return createCliAgent({
        ensureCleanLocalGitState,
        getMergedPullRequests,
        createChangelog,
        prependFile,
        packageInfo
    });
}

describe('CLI', function () {
    const options = { sloppy: false, changelogPath: '/foo/CHANGELOG.md' };

    it('should throw if no version number was specified', function () {
        const cli = createCli();
        return expect(cli.run()).to.be.rejectedWith('version-number not specified');
    });

    it('should throw if an invalid version number was specified', function () {
        const cli = createCli();
        return expect(cli.run('a.b.c')).to.be.rejectedWith('version-number is invalid');
    });

    it('should throw if the repository is dirty', function () {
        const ensureCleanLocalGitState = sinon.stub().rejects(new Error('Local copy is not clean'));
        const cli = createCli({ ensureCleanLocalGitState });

        return expect(cli.run('1.0.0', options)).to.be.rejectedWith('Local copy is not clean');
    });

    it('should not throw if the repository is dirty', function () {
        const ensureCleanLocalGitState = sinon.stub().rejects(new Error('Local copy is not clean'));
        const createChangelog = sinon.stub().returns('sloppy changelog');
        const prependFile = sinon.stub().resolves();
        const cli = createCli({ prependFile, ensureCleanLocalGitState, createChangelog });

        return cli.run('1.0.0', { sloppy: true, changelogPath: '/foo/CHANGELOG.md' })
            .then(function () {
                expect(prependFile).to.have.been.calledOnce;
                expect(prependFile).to.have.been.calledWith('/foo/CHANGELOG.md', 'sloppy changelog');
            });
    });

    describe('custom labels', function () {
        it('should use custom labels if they are provided in package.json', function () {
            const packageInfo = {
                repository: { url: 'https://github.com/foo/bar.git' },
                'pr-log': { validLabels: { foo: 'Foo', bar: 'Bar' } }
            };
            const createChangelog = sinon.stub().returns('generated changelog');
            const getMergedPullRequests = sinon.stub().resolves();
            const cli = createCli({ packageInfo, createChangelog, getMergedPullRequests });

            const expectedGithubRepo = 'foo/bar';

            return cli.run('1.0.0', options).then(function () {
                expect(getMergedPullRequests).to.have.been.calledOnce;
                expect(getMergedPullRequests).to.have.been.calledWith(expectedGithubRepo, { foo: 'Foo', bar: 'Bar' });

                expect(createChangelog).to.have.been.calledOnce;
                expect(createChangelog).to.have.been.calledWith('1.0.0', { foo: 'Foo', bar: 'Bar' });
            });
        });
    });

    it('should report the generated changelog', function () {
        const createChangelog = sinon.stub().returns('generated changelog');
        const getMergedPullRequests = sinon.stub().resolves();
        const ensureCleanLocalGitState = sinon.stub().resolves();
        const prependFile = sinon.stub().resolves();

        const cli = createCli({
            createChangelog, getMergedPullRequests, ensureCleanLocalGitState, prependFile
        });

        const expectedGithubRepo = 'foo/bar';

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
        const createChangelog = sinon.stub().returns('generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n');
        const prependFile = sinon.stub().resolves();

        const cli = createCli({ createChangelog, prependFile });

        return cli.run('1.0.0', options)
            .then(function () {
                expect(prependFile).to.have.been
                    .calledWith('/foo/CHANGELOG.md', 'generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n');
            });
    });
});
