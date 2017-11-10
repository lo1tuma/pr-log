import git from 'git-promise';
import bluebird from 'bluebird';
import semver from 'semver';
import getGithubPullRequest from './getGithubPullRequest';

function getLatestVersionTag() {
    return git('tag --list')
        .then(function (result) {
            const tags = result.split('\n');
            const versionTags = tags.filter((tag) => semver.valid(tag) && !semver.prerelease(tag));
            const orderedVersionTags = versionTags.sort(semver.compare);

            return orderedVersionTags[orderedVersionTags.length - 1];
        });
}

function getPullRequests(fromTag) {
    return git(`log --no-color --pretty=format:"%s (%b)" --merges ${fromTag}..HEAD`)
        .then((result) => {
            const mergeCommits = result.replace(/[\r\n]+\)/g, ')').split('\n');

            return mergeCommits
                .map((commit) => commit.match(/^Merge pull request #(\d+) from (.*?) \((.*)\)$/u))
                .filter((matches) => matches && parseInt(matches[1], 10) > 500)
                .map((matches) => ({ id: matches[1], title: matches[3] }));
        });
}

function extendWithLabel(githubRepo, validLabels, pullRequests) {
    const promises = pullRequests.map((pullRequest) => {
        return getGithubPullRequest(githubRepo, validLabels, pullRequest.id);
    });

    return bluebird.all(promises);
}

function getMergedPullRequests(githubRepo, validLabels) {
    return getLatestVersionTag()
        .then(getPullRequests)
        .then(extendWithLabel.bind(null, githubRepo, validLabels));
}

export default getMergedPullRequests;
