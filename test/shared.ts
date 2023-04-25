import { jest } from "@jest/globals";
import { Octokit } from "@octokit/rest";
import { Config, ConfigFacade } from "../src/modules/config";
import { PullResponse } from "./services/pull-request-resolver";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export const mockConfig = (overrides?: Config, overrideDefaults?: Config) => {
  return new ConfigFacade(
    {
      dateFormat: "MMMM d, yyyy",
      groupByLabels: false,
      groupByMatchers: true,
      outputFile: "CHANGELOG.md",
      sloppy: false,
      ...(overrideDefaults || {}),
    } satisfies Config,
    overrides
  );
};

export const mockGithubClient = (overrides: DeepPartial<InstanceType<typeof Octokit>> = {}) => {
  const deepAssign = (target: any, source: any) => {
    for (const [key, value] of Object.entries(source)) {
      if (
        typeof value === "object" &&
        value != null &&
        Object.getPrototypeOf(value) === Object.prototype
      ) {
        deepAssign(target[key], value);
      } else {
        target[key] = value;
      }
    }
  };

  const client = {
    request: jest.fn(async () => {
      return { data: [] } as PullResponse;
    }),
  };

  deepAssign(client, overrides);

  return client;
};
