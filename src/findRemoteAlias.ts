import Git from 'git-promise';
import parseGitUrl from 'git-url-parse';
import { Repo } from './repo';

function isSameGitUrl(gitUrlA: string, gitUrlB: string) {
    const parsedUrlA = parseGitUrl(gitUrlA);
    const parsedUrlB = parseGitUrl(gitUrlB);
    const pathA = parsedUrlA.pathname.replace(/\.git$/, '');
    const pathB = parsedUrlB.pathname.replace(/\.git$/, '');

    return parsedUrlA.resource === parsedUrlB.resource && pathA === pathB;
}

function getGitUrl(githubRepo: Repo) {
    return `git://github.com/${githubRepo.path}.git`;
}

export function findRemoteAliasFactory({ git }: { git: typeof Git }) {
    return async function findRemoteAlias(githubRepo: Repo) {
        const gitRemote = getGitUrl(githubRepo);

        const output = await git('remote -v');
        const remotes = output.split('\n').map((remote) => {
            const tokens = remote.split(/\s/);

            return {
                alias: tokens[0],
                url: tokens[1]
            };
        });

        const matchedRemote = remotes.find((remote) => remote.url && isSameGitUrl(gitRemote, remote.url));

        if (!matchedRemote || !matchedRemote.alias) {
            throw new Error(`This local git repository doesn’t have a remote pointing to ${gitRemote}`);
        }

        return matchedRemote.alias;
    };
}
