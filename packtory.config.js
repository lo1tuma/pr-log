// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');
const licensePath = path.join(projectFolder, 'LICENSE');
const coreReadmePath = path.join(projectFolder, 'source/packages/core/README.md');
const cliReadmePath = path.join(projectFolder, 'source/packages/command-line-interface/README.md');

async function readPackageInfo() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    return JSON.parse(packageJsonContent);
}

function sharedPackageAttributes(packageInfo) {
    return {
        author: packageInfo.author,
        contributors: packageInfo.contributors,
        license: packageInfo.license,
        repository: packageInfo.repository,
        engines: packageInfo.engines
    };
}

function commonPackageSettings(packageInfo) {
    return {
        sourcesFolder,
        mainPackageManifest: packageInfo,
        deadCodeElimination: { enabled: true },
        publishSettings: {
            access: 'public',
            provenance: { type: 'automatic' }
        }
    };
}

function registrySettings() {
    return {
        authentication: { type: 'npm-open-identity-connect', provider: 'github-actions' }
    };
}

function publishedPackageFiles(readmePath) {
    return [
        { inputFilePath: licensePath, targetFilePath: 'LICENSE' },
        { inputFilePath: readmePath, targetFilePath: 'README.md' }
    ];
}

function corePackage(sharedAttributes) {
    return {
        name: '@pr-log/core',
        versioning: { automatic: true, minimumVersion: '0.0.1' },
        additionalFiles: publishedPackageFiles(coreReadmePath),
        roots: {
            main: {
                javaScript: 'packages/core/core.entry-point.js',
                declarationFile: 'packages/core/core.entry-point.d.ts'
            }
        },
        additionalPackageManifestAttributes: {
            ...sharedAttributes,
            description: 'Library API for changelog generation from GitHub pull requests',
            keywords: [ 'pr-log', 'changelog', 'github', 'pull-request', 'release-plan' ]
        }
    };
}

function cliPackage(packageInfo, sharedAttributes) {
    return {
        name: 'pr-log',
        versioning: {
            automatic: false,
            source: 'pull-request-labels'
        },
        additionalFiles: publishedPackageFiles(cliReadmePath),
        roots: {
            cli: {
                javaScript: 'packages/command-line-interface/bin.entry-point.js',
                declarationFile: 'packages/command-line-interface/bin.entry-point.d.ts'
            }
        },
        packageInterface: {
            executables: [ { root: 'cli', name: 'pr-log' } ]
        },
        additionalPackageManifestAttributes: {
            ...sharedAttributes,
            description: packageInfo.description,
            keywords: packageInfo.keywords
        },
        bundleDependencies: [ '@pr-log/core' ]
    };
}

/**
@returns {NonNullable<import('@packtory/cli').PacktoryConfiguration['changelog']>}
*/
function createChangelogSettings() {
    return {
        packageTagFormat: '{packageName}@{version}',
        pullRequestLog: {
            ignoredLabels: [ 'release' ],
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update dependency (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$',
                    replace: '$<prefix>Update dependency $<dependency> from $<from> to $<to>'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update (?:dependency )?`?(?<dependency>.+?)`? to `?(?<to>[^` ]+)`?$',
                    replace: '$<prefix>Update dependency $<dependency> to $<to>',
                    versionGroup: 'to'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?(?<dependency>Lock file maintenance|Update (?:.+ dependencies|eslint))$',
                    replace: '$<prefix>$<dependency>',
                    collapse: 'same'
                }
            ]
        },
        outputs: [
            {
                kind: 'package-file',
                paths: {
                    '@pr-log/core': 'source/packages/core/CHANGELOG.md',
                    'pr-log': 'source/packages/command-line-interface/CHANGELOG.md'
                }
            },
            { kind: 'github-release' }
        ]
    };
}

function releasePullRequestSettings() {
    return {
        branch: 'release/pr-log',
        body: 'Updates changelogs for the next `pr-log` release.',
        githubActionsContinuousIntegration: {
            trigger: 'workflow-dispatch',
            workflowFile: 'continuous-integration.yml',
            requiredStatusContexts: [
                'Node v22',
                'Node v24',
                'Node v26',
                'Package checks',
                'Release PR policy',
                'Workflow security analysis'
            ]
        }
    };
}

/**
 * @returns {Promise<import('@packtory/cli').PacktoryConfiguration>}
 */
export async function buildConfiguration() {
    const packageInfo = await readPackageInfo();
    const sharedAttributes = sharedPackageAttributes(packageInfo);
    return {
        registrySettings: registrySettings(),
        changelog: createChangelogSettings(),
        commonPackageSettings: commonPackageSettings(packageInfo),
        checks: {
            typeScriptIntegrity: { enabled: true, declarations: 'all' },
            noDuplicatedFiles: { enabled: true, allowList: [ licensePath ] },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
            noUnusedBundleDependencies: { enabled: true },
            noDevelopmentDependencyImports: { enabled: true },
            uniqueTargetPaths: { enabled: true },
            noUnexposedExecutables: { enabled: true },
            noSideEffects: { enabled: false },
            nodeEngineCompatibility: { enabled: true }
        },
        releasePullRequest: releasePullRequestSettings(),
        packages: [ corePackage(sharedAttributes), cliPackage(packageInfo, sharedAttributes) ]
    };
}
