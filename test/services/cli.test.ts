import { describe, expect, it, jest } from "@jest/globals";
import { ConfigFacade } from "../../src/modules/config";
import { Filesystem } from "../../src/modules/filesystem";
import { ChangelogGeneratorService } from "../../src/services/changelog-generator";
import { CliService } from "../../src/services/cli";
import { GitService } from "../../src/services/git";
import { PullRequestResolverService } from "../../src/services/pull-request-resolver";
import { Repo } from "../../src/utils/repo";
import { mockConfig } from "../shared";
import type { PullRequest, SemverNumber } from "../shared-types";

export type CliFactoryParams = {
  ensureCleanLocalGitState: (githubRepo: Repo) => Promise<void>;
  getMergedPullRequests: (githubRepo: Repo) => Promise<Array<PullRequest>>;
  createChangelog: (
    newVersionNumber: SemverNumber,
    pullRequests: Array<PullRequest>,
    githubRepo: Repo
  ) => Promise<string>;
  prependFile: (filePath: string, content: string) => Promise<void>;
  config: ConfigFacade;
};

function createCli(dependencies: Partial<CliFactoryParams> = {}) {
  dependencies.ensureCleanLocalGitState ??= jest.fn(async () => {});
  dependencies.prependFile ??= jest.fn(async () => {});
  dependencies.getMergedPullRequests ??= jest.fn(async () => []);
  dependencies.createChangelog ??= jest.fn(async () => "");
  dependencies.config ??= mockConfig();

  return CliService.init(
    [ConfigFacade, dependencies.config],
    [ChangelogGeneratorService, { create: dependencies.createChangelog }],
    [PullRequestResolverService, { getMerged: dependencies.getMergedPullRequests }],
    [Filesystem, { prepend: dependencies.prependFile }],
    [GitService, { ensureCleanLocalGitState: dependencies.ensureCleanLocalGitState }]
  );
}

jest.spyOn(process, "cwd").mockReturnValue("/foo");

const packageInfo = { repository: { url: "https://github.com/foo/bar.git" } };

describe("CliService", () => {
  it("throws if no version number was specified", async () => {
    const cli = createCli();

    await expect(() => cli.run(undefined, packageInfo)).rejects.toThrow(
      expect.objectContaining({ message: "version-number not specified" })
    );
  });

  it("throws if an invalid version number was specified", async () => {
    const cli = createCli();

    await expect(() => cli.run("a.b.c", packageInfo)).rejects.toThrow(
      expect.objectContaining({ message: "version-number is invalid" })
    );
  });

  it("throws if the repository is dirty", async () => {
    const ensureCleanLocalGitState = jest.fn(() => {
      throw new Error("Local copy is not clean");
    });
    const cli = createCli({ ensureCleanLocalGitState });

    await expect(() => cli.run("1.0.0", packageInfo)).rejects.toThrow(
      expect.objectContaining({ message: "Local copy is not clean" })
    );
  });

  it("does not throw if the repository is dirty", async () => {
    const ensureCleanLocalGitState = jest.fn(() => {
      throw new Error("Local copy is not clean");
    });
    const createChangelog = jest.fn(async () => "sloppy changelog");
    const prependFile = jest.fn(async () => {});
    const cli = createCli({
      prependFile,
      ensureCleanLocalGitState,
      createChangelog,
      config: mockConfig({ sloppy: true }),
    });

    await cli.run("1.0.0", packageInfo);

    expect(prependFile).toHaveBeenCalledTimes(1);
    expect(prependFile).toHaveBeenCalledWith("/foo/CHANGELOG.md", "sloppy changelog");
  });

  it("reports the generated changelog", async () => {
    const createChangelog = jest.fn(async () => "generated changelog");
    const getMergedPullRequests = jest.fn(async () => []);
    const ensureCleanLocalGitState = jest.fn(async () => {});
    const prependFile = jest.fn(async () => {});

    const cli = createCli({
      createChangelog,
      getMergedPullRequests,
      ensureCleanLocalGitState,
      prependFile,
    });

    const expectedGithubRepo = new Repo("foo", "bar");

    await cli.run("1.0.0", packageInfo);

    expect(ensureCleanLocalGitState).toHaveBeenCalledTimes(1);
    expect(ensureCleanLocalGitState).toHaveBeenCalledWith(expectedGithubRepo);

    expect(getMergedPullRequests).toHaveBeenCalledTimes(1);
    expect(getMergedPullRequests).toHaveBeenCalledWith(expectedGithubRepo);

    expect(createChangelog).toHaveBeenCalledTimes(1);
    expect(createChangelog).toHaveBeenCalledWith("1.0.0", [], expectedGithubRepo);

    expect(prependFile).toHaveBeenCalledTimes(1);
    expect(prependFile).toHaveBeenCalledWith("/foo/CHANGELOG.md", "generated changelog");
  });

  it("strips trailing empty lines from the generated changelog", async () => {
    const createChangelog = jest.fn(
      async () => "generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n"
    );
    const prependFile = jest.fn(async () => {});

    const cli = createCli({ createChangelog, prependFile });

    await cli.run("1.0.0", packageInfo);

    expect(prependFile).toHaveBeenCalledTimes(1);
    expect(prependFile).toHaveBeenCalledWith(
      "/foo/CHANGELOG.md",
      "generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n"
    );
  });
});
