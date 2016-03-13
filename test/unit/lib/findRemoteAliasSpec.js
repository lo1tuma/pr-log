import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import proxyquire from 'proxyquire';
import 'sinon-as-promised';

const expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('findRemoteAlias', function () {
    const git = sinon.stub();
    const githubRepo = 'foo/bar';
    const requireStubs = {
        'git-promise': git
    };

    const findRemoteAlias = proxyquire('../../../lib/findRemoteAlias', requireStubs).default;

    beforeEach(function () {
        git.resolves('');
    });

    afterEach(function () {
        git.reset();
    });

    it('should reject if no alias is found', function () {
        const expectedGitRemote = `git://github.com/${githubRepo}.git`;
        const expectedErrorMessage = `This local git repository doesn’t have a remote pointing to ${expectedGitRemote}`;

        return expect(findRemoteAlias(githubRepo))
            .to.be.rejectedWith(expectedErrorMessage);
    });

    it('should resolve with the correct remote alias', function () {
        const gitRemotes = [
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
        const gitRemotes = [
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
