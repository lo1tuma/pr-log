import type semver from "semver";

export type SemverNumber = string | semver.SemVer | null | undefined;

export type PullRequest = {
  id: number;
  title: string;
  labels?: string[];
  body?: string;
  mergedAt: Date;
};

export type PackageJson = {
  repository?: {
    url?: string;
    type?: string;
  };
  "pr-changelog-gen"?: unknown;
};
