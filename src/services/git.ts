import parseGitUrl from "git-url-parse";
import { Git } from "../modules/git-client";
import { Inject } from "../utils/dependency-injector/inject";
import { Service } from "../utils/dependency-injector/service";
import { Repo } from "../utils/repo";

export class GitService extends Service {
  @Inject(() => Git)
  private declare git: Git;

  _isSameGitUrl(gitUrlA: string, gitUrlB: string) {
    const parsedUrlA = parseGitUrl(gitUrlA);
    const parsedUrlB = parseGitUrl(gitUrlB);
    const pathA = parsedUrlA.pathname.replace(/\.git$/, "");
    const pathB = parsedUrlB.pathname.replace(/\.git$/, "");

    return parsedUrlA.resource === parsedUrlB.resource && pathA === pathB;
  }

  _getGitUrl(githubRepo: Repo) {
    return `git://github.com/${githubRepo.path}.git`;
  }

  async _findRemoteAlias(githubRepo: Repo) {
    const gitRemote = this._getGitUrl(githubRepo);

    const output = await this.git.run("remote -v");
    const remotes = output.split("\n").map((remote) => {
      const tokens = remote.split(/\s/);

      return {
        alias: tokens[0],
        url: tokens[1],
      };
    });

    const matchedRemote = remotes.find(
      (remote) => remote.url && this._isSameGitUrl(gitRemote, remote.url)
    );

    if (!matchedRemote || !matchedRemote.alias) {
      throw new Error(`This local git repository doesn’t have a remote pointing to ${gitRemote}`);
    }

    return matchedRemote.alias;
  }

  async _ensureCleanLocalCopy() {
    const status = await this.git.run("status -s");
    if (status.trim() !== "") {
      throw new Error("Local copy is not clean");
    }
  }

  async _ensureMasterBranch() {
    const branchName = await this.git.run("rev-parse --abbrev-ref HEAD");
    if (branchName.trim() !== "master") {
      throw new Error("Not on master branch");
    }
  }

  async _fetchRemote(remoteAlias: string) {
    return await this.git.run(`fetch ${remoteAlias}`);
  }

  async _ensureLocalIsEqualToRemote(remoteAlias: string) {
    const remoteBranch = `${remoteAlias}/master`;

    const result = await this.git.run(`rev-list --left-right master...${remoteBranch}`);
    const commits = result.split("\n");

    let commitsAhead = 0;
    let commitsBehind = 0;

    commits.forEach((commit) => {
      if (commit.trim().length > 0) {
        if (commit.indexOf(">") === 0) {
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

  async ensureCleanLocalGitState(githubRepo: Repo) {
    await this._ensureCleanLocalCopy();
    await this._ensureMasterBranch();

    const remoteAlias = await this._findRemoteAlias(githubRepo);

    await this._fetchRemote(remoteAlias);
    await this._ensureLocalIsEqualToRemote(remoteAlias);
  }
}
