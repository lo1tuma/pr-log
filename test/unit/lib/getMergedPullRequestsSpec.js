import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import proxyquire from 'proxyquire';
import 'sinon-as-promised';

const expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('getMergedPullRequests', function () {
    const getPullRequestLabel = sinon.stub();
    const git = sinon.stub();
    const anyRepo = 'any/repo';
    const latestVersion = '1.2.3';
    const requireStubs = {
        './getPullRequestLabel': { default: getPullRequestLabel },
        'git-promise': git
    };

    const getMergedPullRequests = proxyquire('../../../lib/getMergedPullRequests', requireStubs).default;

    let gitTag;
    let gitLog;

    beforeEach(function () {
        git.resolves('');

        gitTag = git.withArgs('tag --list');
        gitTag.resolves(latestVersion);

        gitLog = git.withArgs(`log --no-color --pretty=format:"%s (%b)" --merges ${latestVersion}..HEAD`);
        gitLog.resolves();

        getPullRequestLabel.resolves('bug');
    });

    afterEach(function () {
        getPullRequestLabel.reset();
        git.reset();
    });

    describe('detect fromTag', function () {
        it('should ignore non-semver tag', function () {
            const expectedGitLogCommand = 'log --no-color --pretty=format:"%s (%b)" --merges 0.0.2..HEAD';

            gitTag.resolves('0.0.1\nfoo\n0.0.2\n0.0.0.0.1');

            return getMergedPullRequests(anyRepo)
                .then(function () {
                    expect(git).to.have.been.calledWith(expectedGitLogCommand);
                });
        });

        it('should always use the highest version', function () {
            const expectedGitLogCommand = 'log --no-color --pretty=format:"%s (%b)" --merges 2.0.0..HEAD';

            gitTag.resolves('1.0.0\n0.0.0\n0.7.5\n2.0.0\n0.2.5\n0.5.0');

            return getMergedPullRequests(anyRepo)
                .then(function () {
                    expect(git).to.have.been.calledWith(expectedGitLogCommand);
                });
        });
    });

    it('should extract id, title and label for merged pull requests', function () {
        const gitLogMessages = [
            'Merge pull request #1 from branch (pr-1 message)',
            'Merge pull request #2 from other (pr-2 message)'
        ];

        const expectedPullRequests = [
            { id: '1', title: 'pr-1 message', label: 'bug' },
            { id: '2', title: 'pr-2 message', label: 'bug' }
        ];

        gitLog.resolves(gitLogMessages.join('\n'));

        return getMergedPullRequests(anyRepo)
            .then(function (pullRequests) {
                expect(getPullRequestLabel).to.have.been.calledTwice;
                expect(getPullRequestLabel).to.have.been.calledWithExactly(anyRepo, '1');
                expect(getPullRequestLabel).to.have.been.calledWithExactly(anyRepo, '2');

                expect(pullRequests).to.deep.equal(expectedPullRequests);
            });
    });

    it('should work with line feeds in commit message body', function () {
        const gitLogMessages = [
            'Merge pull request #1 from A (pr-1 message\n)',
            'Merge pull request #2 from B (pr-2 message)'
        ];

        const expectedResults = [
            { id: '1', title: 'pr-1 message', label: 'bug' },
            { id: '2', title: 'pr-2 message', label: 'bug' }
        ];

        gitLog.resolves(gitLogMessages.join('\n'));

        return expect(getMergedPullRequests(anyRepo))
            .to.become(expectedResults);
    });

    it('should work with parentheses in the commit message body', function () {
        const gitLogMessages = [
            'Merge pull request #42 from A (pr-42 message (fixes #21))'
        ];

        const expectedResults = [
            { id: '42', title: 'pr-42 message (fixes #21)', label: 'bug' }
        ];

        gitLog.resolves(gitLogMessages.join('\n'));

        return expect(getMergedPullRequests(anyRepo))
            .to.become(expectedResults);
    });
});
