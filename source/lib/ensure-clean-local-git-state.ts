import { oneLine } from 'common-tags';
import type { FindRemoteAlias } from './find-remote-alias.js';
import type { GitCommandRunner } from './git-command-runner.js';

export type EnsureCleanLocalGitStateDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
    readonly findRemoteAlias: FindRemoteAlias;
};

export type EnsureCleanLocalGitState = (githubRepo: string) => Promise<void>;

export function ensureCleanLocalGitStateFactory(
    dependencies: EnsureCleanLocalGitStateDependencies
): EnsureCleanLocalGitState {
    const { gitCommandRunner, findRemoteAlias } = dependencies;

    async function ensureCleanLocalCopy(): Promise<void> {
        const status = await gitCommandRunner.getShortStatus();
        if (status !== '') {
            throw new Error('Local copy is not clean');
        }
    }

    async function ensureMasterBranch(): Promise<void> {
        const branchName = await gitCommandRunner.getCurrentBranchName();
        if (branchName !== 'master') {
            throw new Error('Not on master branch');
        }
    }

    async function ensureLocalIsEqualToRemote(remoteAlias: string): Promise<void> {
        const remoteBranch = `${remoteAlias}/master`;

        const commits = await gitCommandRunner.getSymmetricDifferencesBetweenBranches('master', remoteBranch);
        let commitsAhead = 0;
        let commitsBehind = 0;

        commits.forEach((commit: string) => {
            if (commit.startsWith('>')) {
                commitsBehind += 1;
            } else {
                commitsAhead += 1;
            }
        });

        if (commitsAhead > 0 || commitsBehind > 0) {
            const errorMessage = oneLine`Local git master branch is ${commitsAhead} commits ahead
                and ${commitsBehind} commits behind of ${remoteBranch}`;

            throw new Error(errorMessage);
        }
    }

    return async function ensureCleanLocalGitState(githubRepo: string): Promise<void> {
        await ensureCleanLocalCopy();
        await ensureMasterBranch();

        const remoteAlias = await findRemoteAlias(githubRepo);

        await gitCommandRunner.fetchRemote(remoteAlias);
        await ensureLocalIsEqualToRemote(remoteAlias);
    };
}
