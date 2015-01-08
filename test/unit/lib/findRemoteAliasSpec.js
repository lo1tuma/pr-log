'use strict';

var chai = require('chai'),
    sinon = require('sinon'),
    proxyquire = require('proxyquire'),
    expect = chai.expect;

require('sinon-as-promised');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

describe('findRemoteAlias', function () {
    var git = sinon.stub(),
        requireStubs = {
            'git-promise': git
        },
        findRemoteAlias = proxyquire('../../../lib/findRemoteAlias', requireStubs),
        githubRepo = 'foo/bar';

    beforeEach(function () {
        git.resolves('');
    });

    afterEach(function () {
        git.reset();
    });

    it('should reject if no alias is found', function () {
        var expectedGitRemote = 'git://github.com/' + githubRepo + '.git',
            expectedErrorMessage = 'This local git repository doesn’t have a remote pointing to ' + expectedGitRemote;

        return expect(findRemoteAlias(githubRepo))
            .to.be.rejectedWith(expectedErrorMessage);
    });

    it('should resolve with the correct remote alias', function () {
        var gitRemotes = [
            'origin git://github.com/fork/bar (fetch)',
            'origin git://github.com/fork/bar (push)',
            'upstream git://github.com/foo/bar (fetch)',
            'upstream git://github.com/foo/bar (push)'
        ];

        git.resolves(gitRemotes.join('\n'));

        return expect(findRemoteAlias(githubRepo))
            .to.become('upstream');
    });

    it('should work with tab as a separator', function () {
        var gitRemotes = [
            'origin\tgit://github.com/fork/bar (fetch)',
            'origin\tgit://github.com/fork/bar (push)',
            'upstream\tgit://github.com/foo/bar (fetch)',
            'upstream\tgit://github.com/foo/bar (push)'
        ];

        git.resolves(gitRemotes.join('\n'));

        return expect(findRemoteAlias(githubRepo))
            .to.become('upstream');
    });

    it('should work with different forms of the same URL', function () {
        git.resolves('origin git+ssh://git@github.com/foo/bar (fetch)');

        return expect(findRemoteAlias(githubRepo))
            .to.become('origin');
    });
});
