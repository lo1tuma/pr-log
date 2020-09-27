import semver from 'semver';

export default function createModule(dependencies) {
    const { git, getPullRequestLabel } = dependencies;

    async function getLatestVersionTag() {
        const result = await git('tag --list');
        const tags = result.split('\n');
        const versionTags = tags.filter((tag) => semver.valid(tag) && !semver.prerelease(tag));
        const orderedVersionTags = versionTags.sort(semver.compare);

        return orderedVersionTags[orderedVersionTags.length - 1];
    }

    async function getPullRequests(fromTag) {
        const result = await git(`log --no-color --pretty=format:"%s (%b)" --merges ${fromTag}..HEAD`);
        const mergeCommits = result.replace(/[\n\r]+\)/g, ')').split('\n');

        return mergeCommits
            .map((commit) => commit.match(/^Merge pull request #(?<id>\d+) from .*? \((?<title>.*)\)$/u))
            .filter((matches) => matches)
            .map((matches) => {
                return { id: matches.groups.id, title: matches.groups.title };
            });
    }

    function extendWithLabel(githubRepo, validLabels, pullRequests) {
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

    return async function getMergedPullRequests(githubRepo, validLabels) {
        const latestVersionTag = await getLatestVersionTag();
        const pullRequests = await getPullRequests(latestVersionTag);
        const pullRequestsWithLabels = await extendWithLabel(githubRepo, validLabels, pullRequests);

        return pullRequestsWithLabels;
    };
}
