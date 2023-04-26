import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Octokit } from "@octokit/rest";
import {
  ArgDateFormat,
  ArgGroupByLabels,
  ArgGroupByMatchers,
  ArgIncludePrDescription,
  ArgOnlySince,
  ArgOutputFile,
  ArgPrTitleMatcher,
  ArgSloppy,
  ArgTrace,
  ArgValidLabels,
  ArgVersion,
  MainAction,
} from "../src/main-action";
import type { Config } from "../src/modules/config";
import { ConfigLoader } from "../src/modules/config-loader";
import { DateResolver } from "../src/modules/date-resolver";
import { EnvvarReader } from "../src/modules/envvar-reader";
import { Filesystem } from "../src/modules/filesystem";
import { Git } from "../src/modules/git-client";
import type { Constructor } from "../src/utils/dependency-injector/inject";
import type { Dependencies } from "../src/utils/dependency-injector/service";

const mockRepoUrl = "https://github.com/repoOwner/repoName.git";

const ALL_ARGS = {
  sloppy: ArgSloppy as Constructor,
  trace: ArgTrace as Constructor,
  version: ArgVersion as Constructor,
  includePrDescription: ArgIncludePrDescription as Constructor,
  prTitleMatcher: ArgPrTitleMatcher as Constructor,
  dateFormat: ArgDateFormat as Constructor,
  validLabels: ArgValidLabels as Constructor,
  outputFile: ArgOutputFile as Constructor,
  onlySince: ArgOnlySince as Constructor,
  groupByLabels: ArgGroupByLabels as Constructor,
  groupByMatchers: ArgGroupByMatchers as Constructor,
};

const mockArgument = (value?: string | number | boolean) => {
  return {
    value,
    isSet: value !== undefined,
  };
};

const defaultPullResponses = [
  {
    number: 8,
    title: "feat: replaced all the code with calls to ChatGPT (lol)",
    state: "closed",
    created_at: "2023-03-0112:00:00",
    updated_at: "2023-03-01T12:00:00",
    body: "all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
    labels: ["features"] as string[],
    merged_at: "2023-03-01T12:30:00",
  },
  {
    number: 2,
    title: "feat: added a new feature",
    state: "closed",
    created_at: "2022-11-14T12:00:00",
    updated_at: "2023-01-19T12:00:00",
    body: "- **new feature added** yada yada",
    labels: ["enhancements"] as string[],
    merged_at: "2023-02-01T12:30:00",
  },
  {
    number: 3,
    title: "feat: initial commit",
    state: "closed",
    created_at: "2023-02-01T12:00:00",
    updated_at: "2023-02-01T12:00:00",
    body: "__INITIALIZED THE PROJECT REPO__",
    labels: ["features"] as string[],
    merged_at: "2022-02-01T12:30:00",
  },
  {
    number: 7,
    title: "test: added unit tests",
    state: "closed",
    created_at: "2023-02-01T12:00:00",
    updated_at: "2023-02-01T12:00:00",
    body: "-------",
    labels: [] as string[],
    merged_at: "2023-02-01T12:30:00",
  },
  {
    number: 1,
    title: "fix: some bug",
    state: "closed",
    created_at: "2023-02-01T12:00:00",
    updated_at: "2023-02-01T12:00:00",
    body: 'fixed a bug which ocurred when doing something like:\n\n```ts\n  foo("bar");\n```\n',
    labels: ["fixes", "bugfixes", "bugs"] as string[],
    merged_at: "2023-02-10T12:30:00",
  },
  {
    number: 6,
    title: "chore: updated readme",
    state: "closed",
    created_at: "2023-02-01T12:00:00",
    updated_at: "2023-02-01T12:00:00",
    body: "updated readme with new instructions",
    labels: ["chore"] as string[],
    merged_at: "2023-02-01T12:30:00",
  },
  {
    number: 4,
    title: "fix: another bug",
    state: "closed",
    created_at: "2023-02-01T12:00:00",
    updated_at: "2023-02-01T12:00:00",
    body: "a list of bugs fixed:\n\n- bug 1\n- bug 2\n- bug 3\n",
    labels: ["bugs"] as string[],
    merged_at: "2023-01-01T12:30:00",
  },
  {
    number: 5,
    title: "docs: updated readme",
    state: "closed",
    created_at: "2023-02-01T12:00:00",
    updated_at: "2023-02-01T12:00:00",
    body: "-------",
    labels: ["documentation"] as string[],
    merged_at: "2023-02-01T12:35:00",
  },
] as const;

const GithubClientMock = {
  auth: jest.fn(),
  request: jest.fn(async () => {
    return {
      data: defaultPullResponses,
    };
  }),
};

const GitClientMock = {
  currentRemotes:
    "origin git@github.com:repoOwner/repoName.git (fetch)\norigin  git@github.com:repoOwner/repoName.git (push)",
  currentStatus: "",
  currentBranch: "master",
  currentTags: "1.0.0\n1.0.1\n1.1.0\n2.0.0\n2.0.1",
  getFetchResult: (arg: string) => "",
  getRevListUpTo: (branchName: string) => "",
  getTagDates: (tagName: string) =>
    [
      "2023-01-01 12:00:00 +0200 ( (tag: 2.0.1, origin/master))",
      "2023-01-01 11:00:00 +0200 ()",
      "2023-01-01 10:00:00 +0200 ()",
      "2023-01-01 9:00:00 +0200 ( (tag: 2.0.0, origin/master))",
    ].join("\n"),
  run: jest.fn(async (cmd: string | string[]): Promise<string> => {
    const fullCommand = Array.isArray(cmd) ? cmd.join(" ") : cmd;

    switch (fullCommand) {
      case "remote -v":
        return GitClientMock.currentRemotes;
      case "status -s":
        return GitClientMock.currentStatus;
      case "rev-parse --abbrev-ref HEAD":
        return GitClientMock.currentBranch;
      case "tag --list":
        return GitClientMock.currentTags;
    }

    const fetch = "fetch";
    if (fullCommand.startsWith(fetch)) {
      const arg = fullCommand.substring(fetch.length);
      return GitClientMock.getFetchResult(arg);
    }

    const revList = "rev-list --left-right master...";
    if (fullCommand.startsWith(revList)) {
      const arg = fullCommand.substring(revList.length);
      return GitClientMock.getRevListUpTo(arg);
    }

    const tagLog = "log --no-color --pretty=format:%ai (%d)";
    if (fullCommand.startsWith(tagLog)) {
      const arg = fullCommand.substring(tagLog.length);
      return GitClientMock.getTagDates(arg);
    }

    throw new Error("Unknown git command");
  }),
};

const FilesystemMock = {
  prepend: jest.fn(),
};

const DateResolverMock = {
  getCurrentDate: jest.fn(() => new Date("2023-04-01T12:00:00")),
};

const factory = (
  params: {
    argMocks?: Partial<Record<keyof typeof ALL_ARGS, string | number | boolean>>;
    githubClient?: any;
    gitClient?: any;
    filesystem?: any;
    config?: Partial<Config>;
    envvars?: Record<string, any>;
  } = {}
) => {
  const {
    argMocks,
    githubClient = GithubClientMock,
    gitClient = GitClientMock,
    filesystem = FilesystemMock,
    config = {},
    envvars = {},
  } = params;

  const argDeps: Dependencies = [];

  for (const key of Object.keys(ALL_ARGS) as (keyof typeof ALL_ARGS)[]) {
    argDeps.push([ALL_ARGS[key], mockArgument(argMocks ? argMocks[key] : undefined)]);
  }

  const configLoaderMock = {
    loadConfig: () => Promise.resolve(config),
    loadPackageJson: () => Promise.resolve({ repository: { url: mockRepoUrl } }),
  };

  const envvarReaderMock = {
    get: (key: string) => envvars[key],
  };

  return MainAction.init(
    [ConfigLoader, configLoaderMock],
    [EnvvarReader, envvarReaderMock],
    [DateResolver, DateResolverMock],
    [Octokit, githubClient],
    [Git, gitClient],
    [Filesystem, filesystem],
    ...argDeps
  );
};

const programExitSpy = jest.spyOn(process, "exit");
const consoleErrorSpy = jest.spyOn(console, "error");
const cwdSpy = jest.spyOn(process, "cwd");

/**
 * These test all the modules that consist of this program, excluding only
 * those modules that are directly interacting with Git, Github and the
 * filesystem.
 */
describe("integration", () => {
  beforeAll(() => {
    // @ts-expect-error
    programExitSpy.mockImplementation((): any => {});
    cwdSpy.mockImplementation(() => "/home/user/Documents/repo");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    programExitSpy.mockRestore();
  });

  it("should correctly generate and write the CHANGELOG", async () => {
    const action = factory({
      argMocks: {
        version: "2.0.2",
      },
    });

    await expect(action.run()).resolves.toBeUndefined();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(programExitSpy).not.toHaveBeenCalled();

    const expectedChangelog = [
      "## 2.0.2 (April 1, 2023)",
      "",
      "### Features",
      "",
      "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
      "",
      "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
      "",
      "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
      "",
      "  - **new feature added** yada yada",
      "",
      "### Bug Fixes",
      "",
      "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
      "",
      "  fixed a bug which ocurred when doing something like:",
      "  ",
      "  ```ts",
      '    foo("bar");',
      "  ```",
      "  ",
      "",
      "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
      "",
      "  a list of bugs fixed:",
      "  ",
      "  - bug 1",
      "  - bug 2",
      "  - bug 3",
      "  ",
      "",
    ].join("\n");

    expect(FilesystemMock.prepend).toHaveBeenCalledWith(
      "/home/user/Documents/repo/CHANGELOG.md",
      expectedChangelog
    );
  });

  describe("arguments should correctly modify the behavior of the program", () => {
    describe("output file", () => {
      it("with a relative path", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            outputFile: "./docs/history.md",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/docs/history.md",
          expect.any(String)
        );
      });

      it("with a absolute path", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            outputFile: "/home/user/projects/my-project/H.md",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/projects/my-project/H.md",
          expect.any(String)
        );
      });
    });

    describe("date format", () => {
      it("ISO format", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            dateFormat: "yyyy-MM-dd'T'HH:mm:ss",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        expect(FilesystemMock.prepend.mock.calls[0]![1]).toMatch(
          /^## 2\.0\.2 \(2023-04-01T12:00:00\)/m
        );
      });

      it("custom format", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            dateFormat: "yyyy-MM-dd",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        expect(FilesystemMock.prepend.mock.calls[0]![1]).toMatch(
          /^## 2\.0\.2 \(2023-04-01\)/m
        );
      });
    });

    describe("include pr description", () => {
      it("when enabled", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            includePrDescription: true,
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Features",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
          "### Bug Fixes",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });

      it("when disabled", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            includePrDescription: false,
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Features",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "### Bug Fixes",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });
    });

    describe("only since", () => {
      it("with a date before last tag", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            onlySince: "2020-01-01",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Features",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
          "- #### feat: initial commit ([#3](https://github.com/repoOwner/repoName/pull/3))",
          "",
          "  __INITIALIZED THE PROJECT REPO__",
          "",
          "### Bug Fixes",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });

      it("with a date after the last tag", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            onlySince: "2023-02-05",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Features",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "### Bug Fixes",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });
    });

    describe("sloppy", () => {
      describe("when enabled", () => {
        it("and on different branch", async () => {
          GitClientMock.currentBranch = "feat/some";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: false,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).toHaveBeenCalled();
          expect(programExitSpy).toHaveBeenCalled();

          expect(consoleErrorSpy).toHaveBeenCalledWith("Error: Not on master branch");

          expect(FilesystemMock.prepend).not.toHaveBeenCalled();

          GitClientMock.currentBranch = "master";
        });

        it("and with un-commited changes", async () => {
          GitClientMock.currentStatus = "22 test/file.ts";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: false,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).toHaveBeenCalled();
          expect(programExitSpy).toHaveBeenCalled();

          expect(consoleErrorSpy).toHaveBeenCalledWith("Error: Local copy is not clean");

          expect(FilesystemMock.prepend).not.toHaveBeenCalled();

          GitClientMock.currentStatus = "";
        });

        it("and not up to date with remote", async () => {
          GitClientMock.getRevListUpTo = () => "<123\n<324";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: false,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).toHaveBeenCalled();
          expect(programExitSpy).toHaveBeenCalled();

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error: Local git master branch is 2 commits ahead and 0 commits behind of origin/master"
          );

          expect(FilesystemMock.prepend).not.toHaveBeenCalled();

          GitClientMock.getRevListUpTo = () => "";
        });

        it("and no origin", async () => {
          const orgRemotes = GitClientMock.currentRemotes;
          GitClientMock.currentRemotes = "";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: false,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).toHaveBeenCalled();
          expect(programExitSpy).toHaveBeenCalled();

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error: This local git repository doesn’t have a remote pointing to git://github.com/repoOwner/repoName.git"
          );

          expect(FilesystemMock.prepend).not.toHaveBeenCalled();

          GitClientMock.currentRemotes = orgRemotes;
        });
      });
      describe("when disabled", () => {
        it("and on different branch", async () => {
          GitClientMock.currentBranch = "feat/some";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: true,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).not.toHaveBeenCalled();
          expect(programExitSpy).not.toHaveBeenCalled();

          expect(FilesystemMock.prepend).toHaveBeenCalled();

          GitClientMock.currentBranch = "master";
        });

        it("and with un-commited changes", async () => {
          GitClientMock.currentStatus = "22 test/file.ts";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: true,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).not.toHaveBeenCalled();
          expect(programExitSpy).not.toHaveBeenCalled();

          expect(FilesystemMock.prepend).toHaveBeenCalled();

          GitClientMock.currentStatus = "";
        });

        it("and not up to date with remote", async () => {
          GitClientMock.getRevListUpTo = () => "<123\n<324";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: true,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).not.toHaveBeenCalled();
          expect(programExitSpy).not.toHaveBeenCalled();

          expect(FilesystemMock.prepend).toHaveBeenCalled();

          GitClientMock.getRevListUpTo = () => "";
        });

        it("and no origin", async () => {
          const orgRemotes = GitClientMock.currentRemotes;
          GitClientMock.currentRemotes = "";

          const action = factory({
            argMocks: {
              version: "2.0.2",
              sloppy: true,
            },
          });

          await expect(action.run()).resolves.toBeUndefined();

          expect(consoleErrorSpy).not.toHaveBeenCalled();
          expect(programExitSpy).not.toHaveBeenCalled();

          expect(FilesystemMock.prepend).toHaveBeenCalled();

          GitClientMock.currentRemotes = orgRemotes;
        });
      });
    });

    describe("trace", () => {
      it("should add a stack trace to the error message when enabled", async () => {
        const action = factory({
          argMocks: {
            trace: true,
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(programExitSpy).toHaveBeenCalled();

        const errStackRegexp =
          /Error: version-number not specified\n(\s+at .+?\((\/.+?)+\.ts:\d+:\d+\)\n?)+/m;

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringMatching(errStackRegexp)
        );

        expect(FilesystemMock.prepend).not.toHaveBeenCalled();
      });
    });

    describe("valid labels", () => {
      it("with a single label: 'documentation'", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            validLabels: "documentation",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Features",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
          "### Bug Fixes",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
          "### Other",
          "",
          "- #### docs: updated readme ([#5](https://github.com/repoOwner/repoName/pull/5))",
          "",
          "  -------",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });

      it("with two labels: 'documentation' and 'chore'", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            validLabels: "documentation,chore",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Features",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
          "### Bug Fixes",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
          "### Other",
          "",
          "- #### docs: updated readme ([#5](https://github.com/repoOwner/repoName/pull/5))",
          "",
          "  -------",
          "",
          "- #### chore: updated readme ([#6](https://github.com/repoOwner/repoName/pull/6))",
          "",
          "  updated readme with new instructions",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });
    });

    describe("group by labels", () => {
      it("groups pr by default labels", async () => {
        GithubClientMock.request.mockImplementationOnce(async () => {
          return {
            data: [
              { ...defaultPullResponses[0], labels: ["enhancement"] },
              { ...defaultPullResponses[1], labels: ["enhancement"] },
              defaultPullResponses[2],
              defaultPullResponses[3],
              { ...defaultPullResponses[4], labels: ["bug"] },
              defaultPullResponses[5],
              { ...defaultPullResponses[6], labels: ["bug"] },
              defaultPullResponses[7],
            ],
          };
        });

        const action = factory({
          argMocks: {
            version: "2.0.2",
            groupByLabels: true,
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Bug",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
          "### Enhancement",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });

      it("groups pr by provided labels", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            groupByLabels: true,
            validLabels: "bugs,features,enhancements",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Bugs",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
          "### Features",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "### Enhancements",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });

      it("groups prs that have matching labels while also grouping by matchers", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            groupByLabels: true,
            validLabels: "bugs",
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "### Bugs", // grouped via label
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
          "### Features", // grouped via matcher
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });
    });

    describe("group by matchers", () => {
      it("doesn't group pr when disabled and no valid labels", async () => {
        const action = factory({
          argMocks: {
            version: "2.0.2",
            groupByMatchers: false,
          },
        });

        await expect(action.run()).resolves.toBeUndefined();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(programExitSpy).not.toHaveBeenCalled();

        const expectedChangelog = [
          "## 2.0.2 (April 1, 2023)",
          "",
          "- #### feat: replaced all the code with calls to ChatGPT (lol) ([#8](https://github.com/repoOwner/repoName/pull/8))",
          "",
          "  all api call are now replaced with calls to the ChatGPT API, hope the AI can do the job better than us",
          "",
          "- #### fix: some bug ([#1](https://github.com/repoOwner/repoName/pull/1))",
          "",
          "  fixed a bug which ocurred when doing something like:",
          "  ",
          "  ```ts",
          '    foo("bar");',
          "  ```",
          "  ",
          "",
          "- #### feat: added a new feature ([#2](https://github.com/repoOwner/repoName/pull/2))",
          "",
          "  - **new feature added** yada yada",
          "",
          "- #### fix: another bug ([#4](https://github.com/repoOwner/repoName/pull/4))",
          "",
          "  a list of bugs fixed:",
          "  ",
          "  - bug 1",
          "  - bug 2",
          "  - bug 3",
          "  ",
          "",
        ].join("\n");

        expect(FilesystemMock.prepend).toHaveBeenCalledWith(
          "/home/user/Documents/repo/CHANGELOG.md",
          expectedChangelog
        );
      });
    });
  });
});
