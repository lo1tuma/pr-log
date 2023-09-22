import { execaCommand } from 'execa';
import type { FindRemoteAlias } from './find-remote-alias.js';

export interface EnsureCleanLocalGitStateDependencies {
    readonly execute: typeof execaCommand;
    readonly findRemoteAlias: FindRemoteAlias;
}

export type EnsureCleanLocalGitState = (githubRepo: string) => Promise<void>;

export function ensureCleanLocalGitStateFactory(
    dependencies: EnsureCleanLocalGitStateDependencies
): EnsureCleanLocalGitState {
    const { execute, findRemoteAlias } = dependencies;

    async function ensureCleanLocalCopy(): Promise<void> {
        const status = await execute('git status -s');
        if (status.stdout.trim() !== '') {
            throw new Error('Local copy is not clean');
        }
    }

    async function ensureMasterBranch(): Promise<void> {
        const branchName = await execute('git rev-parse --abbrev-ref HEAD');
        if (branchName.stdout.trim() !== 'master') {
            throw new Error('Not on master branch');
        }
    }

    async function fetchRemote(remoteAlias: string): Promise<void> {
        await execute(`git fetch ${remoteAlias}`);
    }

    async function ensureLocalIsEqualToRemote(remoteAlias: string): Promise<void> {
        const remoteBranch = `${remoteAlias}/master`;

        const result = await execute(`git rev-list --left-right master...${remoteBranch}`);
        const commits = result.stdout.split('\n');

        let commitsAhead = 0;
        let commitsBehind = 0;

        commits.forEach((commit: string) => {
            if (commit.trim().length > 0) {
                if (commit.startsWith('>')) {
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

    return async function ensureCleanLocalGitState(githubRepo: string): Promise<void> {
        await ensureCleanLocalCopy();
        await ensureMasterBranch();

        const remoteAlias = await findRemoteAlias(githubRepo);

        await fetchRemote(remoteAlias);
        await ensureLocalIsEqualToRemote(remoteAlias);
    };
}
