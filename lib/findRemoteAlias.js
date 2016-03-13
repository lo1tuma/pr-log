import git from 'git-promise';
import parseGitUrl from 'git-url-parse';
import R from 'ramda';

function isSameGitUrl(gitUrlA, gitUrlB) {
    const parsedUrlA = parseGitUrl(gitUrlA);
    const parsedUrlB = parseGitUrl(gitUrlB);
    const pathA = parsedUrlA.pathname.replace(/\.git$/, '');
    const pathB = parsedUrlB.pathname.replace(/\.git$/, '');

    return parsedUrlA.resource === parsedUrlB.resource && pathA === pathB;
}

function getGitUrl(githubRepo) {
    return `git://github.com/${githubRepo}.git`;
}

function findRemoteAlias(githubRepo) {
    const gitRemote = getGitUrl(githubRepo);

    return git('remote -v')
        .then((output) => {
            const remotes = output
                    .split('\n')
                    .map((remote) => {
                        const tokens = remote.split(/\s/);

                        return {
                            alias: tokens[0],
                            url: tokens[1]
                        };
                    });

            const matchedRemote = R.find((remote) => {
                return remote.url && isSameGitUrl(gitRemote, remote.url);
            }, remotes);

            if (!matchedRemote) {
                throw new Error(`This local git repository doesn’t have a remote pointing to ${gitRemote}`);
            }

            return matchedRemote.alias;
        });
}

export default findRemoteAlias;
