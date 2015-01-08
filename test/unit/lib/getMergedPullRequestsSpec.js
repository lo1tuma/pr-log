'use strict';

var chai = require('chai'),
    sinon = require('sinon'),
    proxyquire = require('proxyquire'),
    expect = chai.expect;

require('sinon-as-promised');
chai.use(require('sinon-chai'));

describe('getMergedPullRequests', function () {
    var getPullRequestLabel = sinon.stub(),
        git = sinon.stub(),
        gitTag,
        gitLog,
        requireStubs = {
            './getPullRequestLabel': getPullRequestLabel,
            'git-promise': git
        },
        getMergedPullRequests = proxyquire('../../../lib/getMergedPullRequests', requireStubs),
        anyRepo = 'any/repo',
        latestVersion = '1.2.3';

    beforeEach(function () {
        git.resolves('');

        gitTag = git.withArgs('tag --list');
        gitTag.resolves(latestVersion);

        gitLog = git.withArgs('log --no-color --pretty=format:"%s (%b)" --merges ' + latestVersion + '..HEAD');
        gitLog.resolves();

        getPullRequestLabel.resolves('bug');
    });

    afterEach(function () {
        getPullRequestLabel.reset();
        git.reset();
    });

    describe('detect fromTag', function () {
        it('should ignore non-semver tag', function () {
            var expectedGitLogCommand = 'log --no-color --pretty=format:"%s (%b)" --merges 0.0.2..HEAD';

            gitTag.resolves('0.0.1\nfoo\n0.0.2\n0.0.0.0.1');

            return getMergedPullRequests(anyRepo)
                .then(function () {
                    expect(git).to.have.been.calledWith(expectedGitLogCommand);
                });
        });

        it('should always use the highest version', function () {
            var expectedGitLogCommand = 'log --no-color --pretty=format:"%s (%b)" --merges 2.0.0..HEAD';

            gitTag.resolves('1.0.0\n0.0.0\n0.7.5\n2.0.0\n0.2.5\n0.5.0');

            return getMergedPullRequests(anyRepo)
                .then(function () {
                    expect(git).to.have.been.calledWith(expectedGitLogCommand);
                });
        });
    });

    it('should extract id, title and label for merged pull requests', function () {
        var gitLogMessages = [
                'Merge pull request #1 from branch (pr-1 message)',
                'Merge pull request #2 from other (pr-2 message)'
            ],
            expectedPullRequests = [
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
});
