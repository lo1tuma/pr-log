import { Octokit } from '@octokit/rest';
import { Argument } from 'clify';
import { MainCommandInitializeCallback } from 'clify/dist/Commands/types';
import fs from 'fs';
import git from 'git-promise';
import path from 'node:path';
import { promisify } from 'node:util';
import prepend from 'prepend';
import { CliAgentParams, createCliAgent } from './cli'; // eslint-disable-line import/no-unresolved
import { createChangelogFactory } from './createChangelog'; // eslint-disable-line import/no-unresolved
import { ensureCleanLocalGitStateFactory } from './ensureCleanLocalGitState'; // eslint-disable-line import/no-unresolved
import { findRemoteAliasFactory } from './findRemoteAlias'; // eslint-disable-line import/no-unresolved
import { getMergedPullRequestsFactory } from './getMergedPullRequests'; // eslint-disable-line import/no-unresolved
import { PackageJson } from './shared-types';

const ArgIncludePrDescription = Argument.define({
    keyword: '--include-pr-description',
    flagChar: '-ipd',
    dataType: 'boolean',
    description: 'Include the description of each pull request in the changelog. Default: true.',
    default: true,
    require: true
});

const ArgSloppy = Argument.define({
    keyword: '--sloppy',
    flagChar: '-s',
    dataType: 'boolean',
    description: 'Skip ensuring clean local git state. Default: false.',
    default: false,
    require: true
});

const ArgTrace = Argument.define({
    keyword: '--trace',
    flagChar: '-t',
    dataType: 'boolean',
    description: 'Show stack traces for any error. Default: false.',
    default: false,
    require: true
});

const ArgVersion = Argument.define({
    keyword: '--target-version',
    flagChar: '-tv',
    dataType: 'string',
    description: 'The version number of the release the changelog is being created for.',
    require: true
});

export const MainAction: MainCommandInitializeCallback = () => {
    const sloppy = new ArgSloppy();
    const trace = new ArgTrace();
    const version = new ArgVersion();
    const includePrDescription = new ArgIncludePrDescription();

    return {
        run() {
            const { GH_TOKEN } = process.env;

            const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
            const options = { sloppy: sloppy.value, changelogPath };
            const findRemoteAlias = findRemoteAliasFactory({ git });
            const githubClient = new Octokit();
            if (GH_TOKEN) {
                githubClient.auth({ type: 'token', token: GH_TOKEN });
            }
            const getMergedPullRequests = getMergedPullRequestsFactory({ githubClient, git });
            const getCurrentDate = () => new Date();
            const packageInfo = JSON.parse(
                fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
            ) as PackageJson;
            const dependencies: CliAgentParams = {
                githubClient,
                prependFile: promisify(prepend),
                packageInfo,
                ensureCleanLocalGitState: ensureCleanLocalGitStateFactory({ git, findRemoteAlias }),
                getMergedPullRequests,
                createChangelog: createChangelogFactory({
                    getCurrentDate,
                    packageInfo,
                    prDescription: includePrDescription.value
                })
            };
            const cliAgent = createCliAgent(dependencies);

            cliAgent.run(version.value, options).catch((error) => {
                let message = `Error: ${error.message}`;

                if (trace.value) {
                    message = error.stack;
                }

                console.error(message);
                process.exit(1);
            });
        }
    };
};
