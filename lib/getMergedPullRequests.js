import git from 'git-promise';
import Promise from 'bluebird';
import semver from 'semver';
import getGithubPullRequest from './getGithubPullRequest';

function getLatestVersionTag() {
    return git('tag --list').then(function (result) {
        const tags = result.split('\n');
        const versionTags = tags.filter((tag) => semver.valid(tag));
        const orderedVersionTags = versionTags.sort(semver.compare);

        return orderedVersionTags[orderedVersionTags.length - 1];
    });
}

function getPullRequests(mergeType, fromTag) {
    return git(`log --no-color --pretty=format:"%s (%b)%n%n" --${mergeType} ${fromTag}..HEAD`).then((result) => {
        const mergeCommits = result.split('\n\n\n');

        return mergeCommits
            .map((commit) => commit.replace(/[\r\n]+/g, ''))
            .map((commit) => commit.match(/^Merge pull request #(\d+) from (.*?) \((.*)\)$/u))
            .filter((matches) => matches && parseInt(matches[1], 10) > 500)
            .map((matches) => ({ id: matches[1], title: matches[3] }));
    });
}

function extendWithLabel(githubRepo, validLabels, pullRequests) {
    const promises = pullRequests.map((pullRequest) => {
        return getGithubPullRequest(githubRepo, validLabels, pullRequest.id);
    });

    return Promise.all(promises);
}

function getMergedPullRequests(githubRepo, validLabels, cherryPick) {
    const mergeType = cherryPick ? 'cherry-pick' : 'merges';
    return getLatestVersionTag()
        .then(getPullRequests.bind(null, mergeType))
        .then(extendWithLabel.bind(null, githubRepo, validLabels));
}

export default getMergedPullRequests;
