import Git from 'git-promise';
import { Repo } from './utils/repo';

export type CleanLocalGitStateFactoryParams = {
    git: typeof Git;
    findRemoteAlias: (githubRepo: Repo) => Promise<string>;
};

export function ensureCleanLocalGitStateFactory(dependencies: CleanLocalGitStateFactoryParams) {
    const { git, findRemoteAlias } = dependencies;

    async function ensureCleanLocalCopy() {
        const status = await git('status -s');
        if (status.trim() !== '') {
            throw new Error('Local copy is not clean');
        }
    }

    async function ensureMasterBranch() {
        const branchName = await git('rev-parse --abbrev-ref HEAD');
        if (branchName.trim() !== 'master') {
            throw new Error('Not on master branch');
        }
    }

    function fetchRemote(remoteAlias: string) {
        return git(`fetch ${remoteAlias}`);
    }

    async function ensureLocalIsEqualToRemote(remoteAlias: string) {
        const remoteBranch = `${remoteAlias}/master`;

        const result = await git(`rev-list --left-right master...${remoteBranch}`);
        const commits = result.split('\n');

        let commitsAhead = 0;
        let commitsBehind = 0;

        commits.forEach((commit) => {
            if (commit.trim().length > 0) {
                if (commit.indexOf('>') === 0) {
                    commitsBehind += 1;
                } else {
                    commitsAhead += 1;
                }
            }
        });

        if (commitsAhead > 0 || commitsBehind > 0) {
            const errorMessage = `Local git master branch is ${commitsAhead} commits ahead and ${commitsBehind} commits behind of ${remoteBranch}`;

            throw new Error(errorMessage);
        }
    }

    return async function ensureCleanLocalGitState(githubRepo: Repo) {
        await ensureCleanLocalCopy();
        await ensureMasterBranch();

        const remoteAlias = await findRemoteAlias(githubRepo);

        await fetchRemote(remoteAlias);
        await ensureLocalIsEqualToRemote(remoteAlias);
    };
}
