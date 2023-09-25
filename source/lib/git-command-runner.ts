import { execaCommand } from 'execa';
import { splitByString, splitByPattern } from './split.js';

export interface RemoteAlias {
    alias: string;
    url: string;
}

interface MergeCommitLogEntry {
    subject: string;
    body: string | undefined;
}

export interface GitCommandRunner {
    getShortStatus(): Promise<string>;
    getCurrentBranchName(): Promise<string>;
    fetchRemote(remoteAlias: string): Promise<void>;
    getSymmetricDifferencesBetweenBranches(branchA: string, branchB: string): Promise<readonly string[]>;
    getRemoteAliases(): Promise<readonly RemoteAlias[]>;
    listTags(): Promise<readonly string[]>;
    getMergeCommitLogs(from: string): Promise<readonly MergeCommitLogEntry[]>;
}

export interface GitCommandRunnerDependencies {
    readonly execute: typeof execaCommand;
}

function trim(value: string): string {
    return value.trim();
}

function isNonEmptyString(value: string): boolean {
    return value.length > 0;
}

function splitLines(value: string, lineSeperatorPrefix = ''): readonly string[] {
    return splitByString(value, `${lineSeperatorPrefix}\n`).map(trim).filter(isNonEmptyString);
}

export function createGitCommandRunner(dependencies: GitCommandRunnerDependencies): GitCommandRunner {
    const { execute } = dependencies;

    return {
        async getShortStatus() {
            const result = await execute('git status --short');
            return result.stdout.trim();
        },

        async getCurrentBranchName() {
            const result = await execute('git rev-parse --abbrev-ref HEAD');
            return result.stdout.trim();
        },

        async fetchRemote(remoteAlias) {
            await execute(`git fetch ${remoteAlias}`);
        },

        async getSymmetricDifferencesBetweenBranches(branchA, branchB) {
            const result = await execute(`git rev-list --left-right ${branchA}...${branchB}`);
            return splitLines(result.stdout);
        },

        async getRemoteAliases() {
            const result = await execute('git remote -v');

            return splitLines(result.stdout).map((line: string) => {
                const remoteLineTokens = splitByPattern(line, /\s/);
                const [alias, url] = remoteLineTokens;

                if (url === undefined) {
                    throw new TypeError('Failed to determine git remote alias');
                }

                return { alias, url };
            });
        },

        async listTags() {
            const result = await execute('git tag --list');
            return splitLines(result.stdout);
        },

        async getMergeCommitLogs(from) {
            const subjectPlaceholder = '%s';
            const bodyPlaceholder = '%b';
            const fieldSeperator = '__||__';
            const lineSeperator = '##$$@@$$##';
            const fields = [subjectPlaceholder, bodyPlaceholder];
            const format = `${fields.join(fieldSeperator)}${lineSeperator}`;

            const result = await execute(`git log --no-color --pretty=format:${format} --merges ${from}..HEAD`);

            const logs = splitLines(result.stdout, lineSeperator);
            return logs.map((log) => {
                const parts = splitByString(log, fieldSeperator);
                const [subject, body] = parts;

                return { subject, body: body === '' ? undefined : body };
            });
        }
    };
}
