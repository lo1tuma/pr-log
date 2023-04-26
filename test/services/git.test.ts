import { describe, expect, it, jest } from "@jest/globals";
import { Git } from "../../src/modules/git-client";
import { GitService } from "../../src/services/git";
import { Repo } from "../../src/utils/repo";

const githubRepo = new Repo("foo", "bar");

class GS extends GitService {
  async _findRemoteAlias(): Promise<string> {
    return "origin";
  }
}

function createGitServiceWithDefaultRemoteAlias(
  { status = "", revParse = "master", revList = "" } = {},
  git = jest.fn<(a: string[]) => Promise<string>>()
) {
  git.mockImplementation(async (arg: string[]) => {
    const cmd = arg.join(" ");

    switch (cmd) {
      case "status -s":
        return status;
      case "rev-parse --abbrev-ref HEAD":
        return revParse;
      case "rev-list --left-right master...origin/master":
        return revList;
    }

    if (cmd.startsWith("fetch")) {
      return "";
    }

    throw new Error("Unexpected git command");
  });

  return GS.init([Git, { run: git }]);
}

function createGitService(result = "") {
  const git = jest.fn(async () => result);

  return GitService.init([Git, { run: git }]);
}

describe("GitService", () => {
  describe("ensureCleanLocalGitState", () => {
    it("rejects if `git status -s` is not empty", async () => {
      const git = createGitServiceWithDefaultRemoteAlias({ status: "M foobar\n" });

      await expect(git.ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
        expect.objectContaining({ message: "Local copy is not clean" })
      );
    });

    it("rejects if current branch is not master", async () => {
      const git = createGitServiceWithDefaultRemoteAlias({ revParse: "feature-foo\n" });

      await expect(git.ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
        expect.objectContaining({ message: "Not on master branch" })
      );
    });

    it("rejects if the local branch is ahead of the remote", async () => {
      const git = createGitServiceWithDefaultRemoteAlias({ revList: "<commit-sha1\n" });
      const expectedMessage =
        "Local git master branch is 1 commits ahead and 0 commits behind of origin/master";

      await expect(git.ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
        expect.objectContaining({ message: expectedMessage })
      );
    });

    it("rejects if the local branch is behind the remote", async () => {
      const git = createGitServiceWithDefaultRemoteAlias({ revList: ">commit-sha1\n" });
      const expectedMessage =
        "Local git master branch is 0 commits ahead and 1 commits behind of origin/master";

      await expect(git.ensureCleanLocalGitState(githubRepo)).rejects.toThrow(
        expect.objectContaining({ message: expectedMessage })
      );
    });

    it("fetches the remote repository", async () => {
      const gitModuleMock = jest.fn<(a: string[]) => Promise<string>>();
      const git = createGitServiceWithDefaultRemoteAlias({}, gitModuleMock);

      await git.ensureCleanLocalGitState(githubRepo);

      expect(gitModuleMock).toHaveBeenCalledWith(["fetch", "origin"]);
    });

    it("fulfills if the local git state is clean", async () => {
      const git = createGitServiceWithDefaultRemoteAlias();

      await expect(git.ensureCleanLocalGitState(githubRepo)).resolves.toBe(undefined);
    });
  });

  describe("_findRemoteAlias", () => {
    it("rejects if no alias is found", async () => {
      const expectedGitRemote = `git://github.com/${githubRepo.path}.git`;
      const expectedErrorMessage = `This local git repository doesn’t have a remote pointing to ${expectedGitRemote}`;
      const git = createGitService();

      await expect(git._findRemoteAlias(githubRepo)).rejects.toThrow(
        expect.objectContaining({ message: expectedErrorMessage })
      );
    });

    it("resolves with the correct remote alias", async () => {
      const gitRemotes = [
        "origin git://github.com/fork/bar (fetch)",
        "origin git://github.com/fork/bar (push)",
        "upstream git://github.com/foo/bar (fetch)",
        "upstream git://github.com/foo/bar (push)",
      ];
      const git = createGitService(gitRemotes.join("\n"));

      expect(await git._findRemoteAlias(githubRepo)).toBe("upstream");
    });

    it("works with tab as a separator", async () => {
      const gitRemotes = [
        "origin\tgit://github.com/fork/bar (fetch)",
        "origin\tgit://github.com/fork/bar (push)",
        "upstream\tgit://github.com/foo/bar (fetch)",
        "upstream\tgit://github.com/foo/bar (push)",
      ];
      const git = createGitService(gitRemotes.join("\n"));

      expect(await git._findRemoteAlias(githubRepo)).toBe("upstream");
    });

    it("works with different forms of the same URL", async () => {
      const git = createGitService("origin git+ssh://git@github.com/foo/bar (fetch)");

      expect(await git._findRemoteAlias(githubRepo)).toBe("origin");
    });
  });
});
