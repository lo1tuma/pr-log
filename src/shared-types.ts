import { Octokit } from '@octokit/rest';
import type semver from 'semver';

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
    'pr-log'?: unknown;
};

export type GenerateChangelogOptions = {
    changelogPath?: string;
    sloppy?: boolean;
};

export type GithubClient = InstanceType<typeof Octokit>;
