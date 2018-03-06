import git from 'git-promise';
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
                .filter((matches) => matches)
                .map((matches) => ({ id: matches[1], title: matches[3] }));
        });
}

function extendWithLabel(githubRepo, validLabels, pullRequests, dependencies) {
    const promises = pullRequests.map(async (pullRequest) => {
        const label = await getPullRequestLabel(githubRepo, validLabels, pullRequest.id, dependencies);

        return {
            id: pullRequest.id,
            title: pullRequest.title,
            label
        };
    });

    return Promise.all(promises);
}

async function getMergedPullRequests(githubRepo, validLabels, dependencies) {
    const latestVersionTag = await getLatestVersionTag();
    const pullRequests = await getPullRequests(latestVersionTag);
    const pullRequestsWithLabels = await extendWithLabel(
        githubRepo,
        validLabels,
        pullRequests,
        dependencies
    );

    return pullRequestsWithLabels;
}

export default getMergedPullRequests;
