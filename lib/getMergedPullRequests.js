import git from 'git-promise';
import Promise from 'bluebird';
import semver from 'semver';
import getPullRequestLabel from './getPullRequestLabel';

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
        return getPullRequestLabel(githubRepo, validLabels, pullRequest.id)
            .then((label) => {
                return {
                    id: pullRequest.id,
                    title: pullRequest.title,
                    label
                };
            });
    });

    return Promise.all(promises);
}

function getMergedPullRequests(githubRepo, validLabels) {
    return getLatestVersionTag()
        .then(getPullRequests)
        .then(extendWithLabel.bind(null, githubRepo, validLabels));
}

export default getMergedPullRequests;
