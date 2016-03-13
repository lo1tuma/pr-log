import git from 'git-promise';
import Promise from 'bluebird';
import findRemoteAlias from './findRemoteAlias';

function ensureCleanLocalCopy() {
    return git('status -s')
        .then((status) => {
            if (status.trim() !== '') {
                throw new Error('Local copy is not clean');
            }
        });
}

function ensureMasterBranch() {
    return git('rev-parse --abbrev-ref HEAD')
        .then((branchName) => {
            if (branchName.trim() !== 'master') {
                throw new Error('Not on master branch');
            }
        });
}

function fetchRemote(remoteAlias) {
    return git(`fetch ${remoteAlias}`);
}

function ensureLocalIsEqualToRemote(remoteAlias) {
    const remoteBranch = `${remoteAlias}/master`;

    return git(`rev-list --left-right master...${remoteBranch}`)
        .then((result) => {
            const commits = result.split('\n');

            let commitsAhead = 0;
            let commitsBehind = 0;

            commits.forEach(function (commit) {
                if (commit.trim().length > 0) {
                    if (commit.indexOf('>') === 0) {
                        commitsBehind += 1;
                    } else {
                        commitsAhead += 1;
                    }
                }
            });

            if (commitsAhead > 0 || commitsBehind > 0) {
                // eslint-disable-next-line max-len
                const errorMessage = `Local git master branch is ${commitsAhead} commits ahead and ${commitsBehind} commits behind of ${remoteBranch}`;

                throw new Error(errorMessage);
            }
        });
}

function ensureCleanLocalGitState(githubRepo) {
    return Promise.try(ensureCleanLocalCopy)
        .then(ensureMasterBranch)
        .then(findRemoteAlias.bind(null, githubRepo))
        .tap(fetchRemote)
        .then(ensureLocalIsEqualToRemote);
}

export default ensureCleanLocalGitState;
