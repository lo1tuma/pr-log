import { Octokit } from '@octokit/rest';
import type semver from 'semver';

export type SemverNumber = string | semver.SemVer | null | undefined;

export type PullRequest = {
    id: number;
    title: string;
    labels?: string[];
    body?: string;
};

export type PackageJson = {
    repository?: {
        url?: string;
        type?: string;
    };
    'pr-log'?: {
        dateFormat?: string;
        validLabels?: Array<[string, string]>;
    };
};

export type GenerateChangelogOptions = {
    changelogPath?: string;
    sloppy?: boolean;
};

export type GithubClient = InstanceType<typeof Octokit>;
