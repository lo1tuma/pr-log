import { $ } from 'execa';
import parseGitUrl from 'git-url-parse';

function isSameGitUrl(gitUrlA: string, gitUrlB: string): boolean {
    const parsedUrlA = parseGitUrl(gitUrlA);
    const parsedUrlB = parseGitUrl(gitUrlB);
    const pathA = parsedUrlA.pathname.replace(/\.git$/, '');
    const pathB = parsedUrlB.pathname.replace(/\.git$/, '');

    return parsedUrlA.resource === parsedUrlB.resource && pathA === pathB;
}

function getGitUrl(githubRepo: string): string {
    return `git://github.com/${githubRepo}.git`;
}

export interface FindRemoteAliasDependencies {
    readonly execute: typeof $;
}

export type FindRemoteAlias = (githubRepo: string) => Promise<string>;

export function findRemoteAliasFactory(dependencies: FindRemoteAliasDependencies): FindRemoteAlias {
    const { execute } = dependencies;

    return async function findRemoteAlias(githubRepo: string) {
        const gitRemote = getGitUrl(githubRepo);

        const output = await execute`git remote -v`;
        const remotes = output.stdout.split('\n').map((remote: string) => {
            const tokens = remote.split(/\s/);

            return {
                alias: tokens[0],
                url: tokens[1]
            };
        });

        const matchedRemote = remotes.find((remote) => {
            return remote.url && isSameGitUrl(gitRemote, remote.url);
        });

        if (!matchedRemote?.alias) {
            throw new Error(`This local git repository doesn’t have a remote pointing to ${gitRemote}`);
        }

        return matchedRemote.alias;
    };
}
