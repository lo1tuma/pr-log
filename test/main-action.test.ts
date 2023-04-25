import { describe, expect, it, jest } from "@jest/globals";
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
import { Config, ConfigFacade } from "../src/modules/config";
import { ConfigLoader } from "../src/modules/config-loader";
import { EnvvarReader } from "../src/modules/envvar-reader";
import { CliService } from "../src/services/cli";
import { Constructor, Inject } from "../src/utils/dependency-injector/inject";
import { Dependencies, Service } from "../src/utils/dependency-injector/service";

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

const factory = (
  params: {
    argMocks?: Partial<Record<keyof typeof ALL_ARGS, string | number | boolean>>;
    githubClient?: any;
    cliRun?: (ver: string, packageJson: object) => Promise<void>;
    cliServiceMock?: any;
    config?: Partial<Config>;
    envvars?: Record<string, any>;
  } = {}
) => {
  const {
    argMocks,
    githubClient = { auth() {} },
    cliRun = jest.fn(async () => {}),
    config = {},
    cliServiceMock,
    envvars = {},
  } = params;

  const argDeps: Dependencies = [];

  for (const key of Object.keys(ALL_ARGS) as (keyof typeof ALL_ARGS)[]) {
    argDeps.push([ALL_ARGS[key], mockArgument(argMocks ? argMocks[key] : undefined)]);
  }

  const configLoaderMock = {
    loadConfig: () => Promise.resolve(config),
    loadPackageJson: () => Promise.resolve({}),
  };

  const envvarReaderMock = {
    get: (key: string) => envvars[key],
  };

  return MainAction.init(
    [ConfigLoader, configLoaderMock],
    [EnvvarReader, envvarReaderMock],
    [CliService, cliServiceMock ?? { run: cliRun }],
    [Octokit, githubClient],
    ...argDeps
  );
};

const createCliForConfigTesting = async (
  config?: Partial<Config>,
  argMocks?: Partial<Record<keyof typeof ALL_ARGS, string | number | boolean>>
) => {
  let cli!: CliServiceMock;

  class CliServiceMock extends Service {
    @Inject(() => ConfigFacade)
    declare config: ConfigFacade;

    constructor() {
      super();
      cli = this;
    }

    run() {
      return Promise.resolve();
    }
  }

  const action = factory({
    argMocks,
    config,
    cliServiceMock: CliServiceMock,
  });

  await action.run();

  return cli;
};

describe("MainAction", () => {
  it("should properly initialize without optional arguments", () => {
    expect(
      (() => {
        const action = factory({
          argMocks: { version: "1.0.0" },
        });
        return action.run();
      })()
    ).resolves.toBe(undefined);
  });

  it("should run() the cli service", async () => {
    const cliRun = jest.fn(async () => {});
    const action = factory({
      argMocks: { version: "1.0.0" },
      cliRun,
    });

    await action.run();

    expect(cliRun).toHaveBeenCalledTimes(1);
  });

  it("should authenticate the github client if GH_TOKEN env var is defined", async () => {
    const ghClient = { auth: jest.fn() };
    const envvars = { GH_TOKEN: "123" };

    const action = factory({
      argMocks: { version: "1.0.0" },
      githubClient: ghClient,
      envvars,
    });

    await action.run();

    expect(ghClient.auth).toHaveBeenCalledTimes(1);
    expect(ghClient.auth).toHaveBeenCalledWith({ type: "token", token: "123" });
  });

  it("should  not authenticate the github client if GH_TOKEN env var is not defined", async () => {
    const ghClient = { auth: jest.fn() };
    const envvars = {};

    const action = factory({
      argMocks: { version: "1.0.0" },
      githubClient: ghClient,
      envvars,
    });

    await action.run();

    expect(ghClient.auth).toHaveBeenCalledTimes(0);
  });

  describe("should properly parse config and arguments, and provide the config to the nested services", () => {
    it("all default values should be set", async () => {
      const cli = await createCliForConfigTesting(undefined, { version: "1.0.0" });

      expect(cli).toBeDefined();
      expect(cli.config.get("dateFormat")).toBe(undefined);
      expect(cli.config.get("groupByLabels")).toBe(undefined);
      expect(cli.config.get("groupByMatchers")).toBe(undefined);
      expect(cli.config.get("includePrBody")).toBe(undefined);
      expect(cli.config.get("onlySince")).toBe(undefined);
      expect(cli.config.get("outputFile")).toBe(undefined);
      expect(cli.config.get("prTitleMatcher")).toBe(undefined);
      expect(cli.config.get("sloppy")).toBe(undefined);
      expect(cli.config.get("validLabels")).toBe(undefined);
    });

    it("all values as defined in config", async () => {
      const config: Partial<Config> = {
        dateFormat: "YYYY-MM-DD",
        groupByLabels: true,
        groupByMatchers: false,
        includePrBody: false,
        onlySince: "2020-01-01",
        outputFile: "./history.md",
        prTitleMatcher: ["^feat", "^fix"],
        sloppy: true,
        validLabels: ["feat", "fix"],
      };

      const cli = await createCliForConfigTesting(config, { version: "1.0.0" });

      expect(cli).toBeDefined();
      expect(cli.config.get("dateFormat")).toBe("YYYY-MM-DD");
      expect(cli.config.get("groupByLabels")).toBe(true);
      expect(cli.config.get("groupByMatchers")).toBe(false);
      expect(cli.config.get("includePrBody")).toBe(false);
      expect(cli.config.get("onlySince")).toBe("2020-01-01");
      expect(cli.config.get("outputFile")).toBe("./history.md");
      expect(cli.config.get("prTitleMatcher")).toEqual(["^feat", "^fix"]);
      expect(cli.config.get("sloppy")).toBe(true);
      expect(cli.config.get("validLabels")).toEqual(["feat", "fix"]);
    });

    it("arguments should override config settings", async () => {
      const config: Partial<Config> = {
        dateFormat: "YYYY-MM-DD",
        groupByLabels: true,
        groupByMatchers: false,
        includePrBody: false,
        onlySince: "2020-01-01",
        outputFile: "./history.md",
        prTitleMatcher: ["^feat", "^fix"],
        sloppy: true,
        validLabels: ["feat", "fix"],
      };

      const cli = await createCliForConfigTesting(config, {
        version: "1.0.0",
        dateFormat: "DD-MM-YYYY",
        includePrDescription: true,
        outputFile: "./CHANGELOG.md",
        validLabels: "bugfix,feature,docs",
      });

      expect(cli).toBeDefined();
      expect(cli.config.get("dateFormat")).toBe("DD-MM-YYYY");
      expect(cli.config.get("groupByLabels")).toBe(true);
      expect(cli.config.get("groupByMatchers")).toBe(false);
      expect(cli.config.get("includePrBody")).toBe(true);
      expect(cli.config.get("onlySince")).toBe("2020-01-01");
      expect(cli.config.get("outputFile")).toBe("./CHANGELOG.md");
      expect(cli.config.get("prTitleMatcher")).toEqual(["^feat", "^fix"]);
      expect(cli.config.get("sloppy")).toBe(true);
      expect(cli.config.get("validLabels")).toEqual(["bugfix", "feature", "docs"]);
    });
  });
});
