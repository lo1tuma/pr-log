import git from 'git-promise';
import Promise from 'bluebird';
import semver from 'semver';
import getPullRequestLabel from './getPullRequestLabel';

function getLatestVersionTag() {
    return git('tag --list')
        .then(function (result) {
            const tags = result.split('\n');
            const versionTags = tags.filter(semver.valid);
            const orderedVersionTags = versionTags.sort(semver.compare);

            return orderedVersionTags[orderedVersionTags.length - 1];
        });
}

function getPullRequests(fromTag) {
    return git(`log --no-color --pretty=format:"%s (%b)" --merges ${fromTag}..HEAD`)
        .then((result) => {
            const mergeCommits = result.replace(/[\r\n]+\)/g, ')').split('\n');

            return mergeCommits
                .filter((commit) => {
                    return commit.indexOf('Merge pull request') === 0;
                })
                .map((pullRequest) => {
                    const pattern = /^Merge pull request #(\d+) from (.*) \((.*)\)/;
                    const matches = pullRequest.match(pattern);

                    return {
                        id: matches[1],
                        title: matches[3]
                    };
                });
        });
}

function extendWithLabel(githubRepo, pullRequests) {
    const promises = pullRequests.map((pullRequest) => {
        return getPullRequestLabel(githubRepo, pullRequest.id)
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

function getMergedPullRequests(githubRepo) {
    return getLatestVersionTag()
        .then(getPullRequests)
        .then(extendWithLabel.bind(null, githubRepo));
}

export default getMergedPullRequests;
