import { Octokit } from '@octokit/rest';
import { Argument } from 'clify';
import { MainCommandInitializeCallback } from 'clify/dist/Commands/types';
import fs from 'fs';
import git from 'git-promise';
import path from 'node:path';
import { promisify } from 'node:util';
import prepend from 'prepend';
import { CliAgentParams, createCliAgent } from './cli'; // eslint-disable-line import/no-unresolved
import { ConfigFacade } from './config';
import { createChangelogFactory } from './createChangelog'; // eslint-disable-line import/no-unresolved
import { ensureCleanLocalGitStateFactory } from './ensureCleanLocalGitState'; // eslint-disable-line import/no-unresolved
import { findRemoteAliasFactory } from './findRemoteAlias'; // eslint-disable-line import/no-unresolved
import { getMergedPullRequestsFactory } from './getMergedPullRequests'; // eslint-disable-line import/no-unresolved
import { PackageJson } from './shared-types';

const ArgIncludePrDescription = Argument.define({
    keyword: '--include-pr-description',
    flagChar: '-n',
    dataType: 'boolean',
    description: 'Include the description of each pull request in the changelog. Default: true.',
    default: true,
    require: true
});

const ArgPrTitleMatcher = Argument.define({
    keyword: '--pr-title-matcher',
    flagChar: '-p',
    dataType: 'string',
    description:
        'A regex patter that will be used to determine if a Pull Request should be included in the changelog. Default: /^feat|fix[:\\/\\(].+/i'
});

const ArgDateFormat = Argument.define({
    keyword: '--date-format',
    flagChar: '-d',
    dataType: 'string',
    description: 'The date format to use in the changelog. Default: MMMM d, yyyy'
});

const ArgValidLabels = Argument.define({
    keyword: '--valid-labels',
    flagChar: '-l',
    dataType: 'string',
    description:
        'A comma separated list of PR labels. If a PR has a matching label it will be included in the changelog.'
});

const ArgOutputFile = Argument.define({
    keyword: '--output-file',
    flagChar: '-o',
    dataType: 'string',
    description: 'The file to write the changelog to. Default: <cwd>/CHANGELOG.md'
});

const ArgOnlySince = Argument.define({
    keyword: '--only-since',
    flagChar: '-c',
    dataType: 'string',
    description:
        'Only include PRs merged since the given date. This option overrides the default behavior of only including PRs merged since the last tag was created.'
});

const ArgSloppy = Argument.define({
    keyword: '--sloppy',
    flagChar: '-s',
    dataType: 'boolean',
    description: 'Skip ensuring clean local git state. Default: false.'
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
    flagChar: '-v',
    dataType: 'string',
    description: '[Required] The version number of the release the changelog is being created for.',
    require: true
});

export const MainAction: MainCommandInitializeCallback = () => {
    const sloppy = new ArgSloppy();
    const trace = new ArgTrace();
    const version = new ArgVersion();
    const includePrDescription = new ArgIncludePrDescription();
    const prTitleMatcher = new ArgPrTitleMatcher();
    const dateFormat = new ArgDateFormat();
    const validLabels = new ArgValidLabels();
    const outputFile = new ArgOutputFile();
    const onlySince = new ArgOnlySince();

    return {
        run() {
            const { GH_TOKEN } = process.env;

            const packageInfo = JSON.parse(
                fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
            ) as PackageJson;

            const config = new ConfigFacade(packageInfo['pr-log'], {
                prTitleMatcher: prTitleMatcher.value,
                dateFormat: dateFormat.value,
                validLabels: validLabels.value?.split(','),
                sloppy: sloppy.value,
                outputFile: outputFile.value,
                onlySince: onlySince.value
            });

            const findRemoteAlias = findRemoteAliasFactory({ git });
            const githubClient = new Octokit();
            if (GH_TOKEN) {
                githubClient.auth({ type: 'token', token: GH_TOKEN });
            }
            const getMergedPullRequests = getMergedPullRequestsFactory({ githubClient, git, config });
            const getCurrentDate = () => new Date();

            const dependencies: CliAgentParams = {
                githubClient,
                prependFile: promisify(prepend),
                packageInfo,
                ensureCleanLocalGitState: ensureCleanLocalGitStateFactory({ git, findRemoteAlias }),
                getMergedPullRequests,
                createChangelog: createChangelogFactory({
                    getCurrentDate,
                    prDescription: includePrDescription.value,
                    config
                })
            };
            const cliAgent = createCliAgent(dependencies);

            cliAgent.run(version.value, config).catch((error) => {
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
