import { describe, expect, it, jest } from '@jest/globals';
import { PullResponse, getMergedPullRequestsFactory } from '../src/getMergedPullRequests';
import { Repo } from '../src/utils/repo';
import { ConfigFacade } from './config';
import { mockConfig, mockGithubClient } from './shared';
import { GithubClient } from './shared-types';

const anyRepo = new Repo('any', 'repo');

function factory(
    deps: {
        config?: ConfigFacade;
        git?: jest.Mock<(cmd: string | string[]) => Promise<string>>;
        githubClient?: any;
        gitCmdResults?: Array<[arg: string, result: string]>;
    } = {}
) {
    const {
        config = mockConfig(),
        git = jest.fn(),
        githubClient = mockGithubClient() as GithubClient,
        gitCmdResults
    } = deps;

    if (gitCmdResults) {
        git.mockImplementation((arg) => {
            const cmd = Array.isArray(arg) ? arg.join(' ') : arg;

            for (const [matcher, result] of gitCmdResults) {
                if (matcher === cmd) {
                    return Promise.resolve(result);
                }
            }

            return Promise.reject(new Error());
        });
    }

    return getMergedPullRequestsFactory({
        config,
        git,
        githubClient
    });
}

describe('getMergedPullRequests', () => {
    it('ignores non-semver tag', async () => {
        const git = jest.fn<(cmd: string | string[]) => Promise<string>>();

        const getMergedPullRequests = factory({
            git,
            gitCmdResults: [
                ['tag --list', '0.0.1\nfoo\n0.0.2\n0.0.0.0.1'],
                [
                    'log --no-color --pretty=format:%ai (%d) 0.0.2',
                    [
                        '2023-01-01 12:00:00 +0200 ( (tag: 0.0.2, origin/master))',
                        '2023-01-01 11:00:00 +0200 ()',
                        '2023-01-01 10:00:00 +0200 ()',
                        '2023-01-01 9:00:00 +0200 ( (tag: 0.0.1, origin/master))'
                    ].join('\n')
                ]
            ]
        });

        await getMergedPullRequests(anyRepo);

        expect(git).toHaveBeenCalledWith(['log', '--no-color', '--pretty=format:%ai (%d)', '0.0.2']);
    });

    it('always usees the highest version', async () => {
        const git = jest.fn<(cmd: string | string[]) => Promise<string>>();

        const getMergedPullRequests = factory({
            git,
            gitCmdResults: [
                ['tag --list', '1.0.0\n0.0.0\n0.7.5\n2.0.0\n0.2.5\n0.5.0'],
                [
                    'log --no-color --pretty=format:%ai (%d) 2.0.0',
                    [
                        '2023-01-01 12:00:00 +0200 ( (tag: 2.0.0, origin/master))',
                        '2023-01-01 11:00:00 +0200 ()',
                        '2023-01-01 10:00:00 +0200 ()',
                        '2023-01-01 9:00:00 +0200 ( (tag: 1.0.0, origin/master))'
                    ].join('\n')
                ]
            ]
        });

        await getMergedPullRequests(anyRepo);

        expect(git).toHaveBeenCalledWith(['log', '--no-color', '--pretty=format:%ai (%d)', '2.0.0']);
    });

    it('ignores prerelease versions', async () => {
        const git = jest.fn<(cmd: string | string[]) => Promise<string>>();

        const getMergedPullRequests = factory({
            git,
            gitCmdResults: [
                ['tag --list', '1.0.0\n0.0.0\n0.7.5\n2.0.0\n0.2.5\n3.0.0-alpha.1'],
                [
                    'log --no-color --pretty=format:%ai (%d) 2.0.0',
                    [
                        '2023-01-01 12:00:00 +0200 ( (tag: 2.0.0, origin/master))',
                        '2023-01-01 11:00:00 +0200 ()',
                        '2023-01-01 10:00:00 +0200 ()',
                        '2023-01-01 9:00:00 +0200 ( (tag: 1.0.0, origin/master))'
                    ].join('\n')
                ]
            ]
        });

        await getMergedPullRequests(anyRepo);

        expect(git).toHaveBeenCalledWith(['log', '--no-color', '--pretty=format:%ai (%d)', '2.0.0']);
    });

    it('extracts id, title and label for merged pull requests', async () => {
        const git = jest.fn<(cmd: string | string[]) => Promise<string>>();

        const githubClient = mockGithubClient({
            request: jest.fn(async () => {
                const response: PullResponse = {
                    data: [
                        {
                            number: 1,
                            title: 'pr-1 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-01T12:00:00Z',
                            updated_at: '2023-01-01T12:00:00Z',
                            merged_at: '2023-01-01T16:00:00Z'
                        },
                        {
                            number: 2,
                            title: 'pr-2 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-01T12:00:00Z',
                            updated_at: '2023-01-01T12:00:00Z',
                            merged_at: '2023-01-01T16:00:00Z'
                        }
                    ]
                };

                return response;
            })
        });

        const getMergedPullRequests = factory({
            git,
            githubClient,
            gitCmdResults: [
                ['tag --list', '0.0.1\nfoo\n0.0.2\n0.0.0.0.1'],
                [
                    'log --no-color --pretty=format:%ai (%d) 0.0.2',
                    [
                        '2023-01-01 12:00:00 +0200 ( (tag: 0.0.2, origin/master))',
                        '2023-01-01 11:00:00 +0200 ()',
                        '2023-01-01 10:00:00 +0200 ()',
                        '2023-01-01 9:00:00 +0200 ( (tag: 0.0.1, origin/master))'
                    ].join('\n')
                ]
            ]
        });

        const expectedPullRequests = [
            { id: 1, title: 'pr-1 message', labels: ['bug'] },
            { id: 2, title: 'pr-2 message', labels: ['bug'] }
        ] as const;

        const pullRequests = await getMergedPullRequests(anyRepo);

        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[0]));
        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[1]));
    });

    it('skips non-merged pull requests', async () => {
        const git = jest.fn<(cmd: string | string[]) => Promise<string>>();

        const githubClient = mockGithubClient({
            request: jest.fn(async () => {
                const response: PullResponse = {
                    data: [
                        {
                            number: 1,
                            title: 'pr-1 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-01T12:00:00Z',
                            updated_at: '2023-01-01T12:00:00Z'
                        },
                        {
                            number: 2,
                            title: 'pr-2 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-01T12:00:00Z',
                            updated_at: '2023-01-01T12:00:00Z',
                            merged_at: '2023-01-01T16:00:00Z'
                        }
                    ]
                };

                return response;
            })
        });

        const getMergedPullRequests = factory({
            git,
            githubClient,
            gitCmdResults: [
                ['tag --list', '0.0.1\nfoo\n0.0.2\n0.0.0.0.1'],
                [
                    'log --no-color --pretty=format:%ai (%d) 0.0.2',
                    [
                        '2023-01-01 12:00:00 +0200 ( (tag: 0.0.2, origin/master))',
                        '2023-01-01 11:00:00 +0200 ()',
                        '2023-01-01 10:00:00 +0200 ()',
                        '2023-01-01 9:00:00 +0200 ( (tag: 0.0.1, origin/master))'
                    ].join('\n')
                ]
            ]
        });

        const expectedPullRequests = [{ id: 2, title: 'pr-2 message', labels: ['bug'] }] as const;

        const pullRequests = await getMergedPullRequests(anyRepo);

        expect(pullRequests.length).toBe(1);
        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[0]));
    });

    it('skips pull requests merged before the latest tag was created', async () => {
        const git = jest.fn<(cmd: string | string[]) => Promise<string>>();

        const githubClient = mockGithubClient({
            request: jest.fn(async () => {
                const response: PullResponse = {
                    data: [
                        {
                            number: 1,
                            title: 'pr-1 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-01T12:00:00Z',
                            updated_at: '2023-01-01T12:00:00Z',
                            merged_at: '2023-01-01T16:00:00Z'
                        },
                        {
                            number: 2,
                            title: 'pr-2 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-01T05:00:00Z',
                            updated_at: '2023-01-01T05:00:00Z',
                            merged_at: '2023-01-01T06:00:00Z'
                        },
                        {
                            number: 3,
                            title: 'pr-3 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-01T12:00:00Z',
                            updated_at: '2023-01-01T12:00:00Z',
                            merged_at: '2023-01-01T16:00:00Z'
                        }
                    ]
                };

                return response;
            })
        });

        const getMergedPullRequests = factory({
            git,
            githubClient,
            gitCmdResults: [
                ['tag --list', '0.0.1\nfoo\n0.0.2\n0.0.0.0.1'],
                [
                    'log --no-color --pretty=format:%ai (%d) 0.0.2',
                    [
                        '2023-01-01 12:00:00 +0200 ( (tag: 0.0.2, origin/master))',
                        '2023-01-01 11:00:00 +0200 ()',
                        '2023-01-01 10:00:00 +0200 ()',
                        '2023-01-01 9:00:00 +0200 ( (tag: 0.0.1, origin/master))'
                    ].join('\n')
                ]
            ]
        });

        const expectedPullRequests = [
            { id: 1, title: 'pr-1 message', labels: ['bug'] },
            { id: 3, title: 'pr-3 message', labels: ['bug'] }
        ] as const;

        const pullRequests = await getMergedPullRequests(anyRepo);

        expect(pullRequests.length).toBe(2);
        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[0]));
        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[1]));
    });

    it('includes all pull requests since the date time specified in config', async () => {
        const git = jest.fn<(cmd: string | string[]) => Promise<string>>();

        const githubClient = mockGithubClient({
            request: jest.fn(async () => {
                const response: PullResponse = {
                    data: [
                        {
                            number: 1,
                            title: 'pr-1 message',
                            state: 'closed',
                            body: '',
                            labels: ['bug'],
                            created_at: '2023-01-15T12:00:00Z',
                            updated_at: '2023-01-15T12:00:00Z',
                            merged_at: '2023-01-15T16:00:00Z'
                        },
                        {
                            number: 2,
                            title: 'pr-2 message',
                            state: 'closed',
                            body: '',
                            labels: ['feature'],
                            created_at: '2023-01-02T05:00:00Z',
                            updated_at: '2023-01-02T05:00:00Z',
                            merged_at: '2023-01-02T06:00:00Z'
                        },
                        {
                            number: 3,
                            title: 'pr-3 message',
                            state: 'closed',
                            body: '',
                            labels: ['docs'],
                            created_at: '2023-01-06T12:00:00Z',
                            updated_at: '2023-01-06T12:00:00Z',
                            merged_at: '2023-01-06T16:00:00Z'
                        },
                        {
                            number: 4,
                            title: 'pr-4 message',
                            state: 'closed',
                            body: '',
                            labels: ['enhancement'],
                            created_at: '2022-01-01T12:00:00Z',
                            updated_at: '2022-01-01T12:00:00Z',
                            merged_at: '2022-01-01T16:00:00Z'
                        }
                    ]
                };

                return response;
            })
        });

        const getMergedPullRequests = factory({
            git,
            githubClient,
            config: mockConfig({
                onlySince: '2023-01-01T00:00:00Z'
            }),
            gitCmdResults: [
                ['tag --list', '0.0.1\nfoo\n0.0.2\n0.0.0.0.1'],
                [
                    'log --no-color --pretty=format:%ai (%d) 0.0.2',
                    [
                        '2023-01-10 12:00:00 +0200 ( (tag: 0.0.2, origin/master))',
                        '2023-01-10 11:00:00 +0200 ()',
                        '2023-01-10 10:00:00 +0200 ()',
                        '2023-01-10 9:00:00 +0200 ( (tag: 0.0.1, origin/master))'
                    ].join('\n')
                ]
            ]
        });

        const expectedPullRequests = [
            { id: 1, title: 'pr-1 message', labels: ['bug'] },
            { id: 2, title: 'pr-2 message', labels: ['feature'] },
            { id: 3, title: 'pr-3 message', labels: ['docs'] }
        ] as const;

        const pullRequests = await getMergedPullRequests(anyRepo);

        expect(pullRequests.length).toBe(3);
        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[0]));
        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[1]));
        expect(pullRequests).toContainEqual(expect.objectContaining(expectedPullRequests[2]));
    });
});
