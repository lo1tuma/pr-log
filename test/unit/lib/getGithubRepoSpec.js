import getGithubRepo from '../../../lib/getGithubRepo';
import chai from 'chai';

const expect = chai.expect;

describe('getGithubRepo', function () {
    it('should extract the repo path of a github URL', function () {
        expect(getGithubRepo('git://github.com/foo/bar.git#master')).to.equal('foo/bar');
    });

    it('should throw if the given URL is not a github URL', function () {
        expect(getGithubRepo.bind(null, 'git://foo.com/bar.git')).to.throw('Invalid GitHub URI git://foo.com/bar.git');
    });
});
