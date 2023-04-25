import { describe, expect, it } from '@jest/globals';
import { createChangelogFactory } from '../src/createChangelog';
import { Repo } from '../src/utils/repo';
import { mockConfig } from './shared';
import { PullRequest } from './shared-types';

const repository = new Repo('foo', 'bar');

describe('createChangelog', () => {
    it('contains a title with the version number and the formatted date', async () => {
        const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0), config: mockConfig() });
        const changelog = await createChangelog('1.0.0', [], repository);
        const expectedTitle = '## 1.0.0 (January 1, 1970)\n\n';

        expect(changelog).toBe(expectedTitle);
    });

    it('format the date with a custom date format', async () => {
        const createChangelog = createChangelogFactory({
            getCurrentDate: () => new Date(0),
            config: mockConfig({ dateFormat: 'dd.MM.yyyy' })
        });
        const changelog = await createChangelog('1.0.0', [], repository);
        const expectedTitle = '## 1.0.0 (01.01.1970)\n\n';

        expect(changelog).toBe(expectedTitle);
    });

    it('creates a formatted changelog', async () => {
        const createChangelog = createChangelogFactory({
            getCurrentDate: () => new Date(0),
            config: mockConfig({ groupByLabels: true })
        });
        const mergedPullRequests = [
            {
                id: 1,
                title: 'Fixed bug foo',
                labels: ['bug'],
                mergedAt: new Date(0)
            },
            {
                id: 2,
                title: 'Fixed bug bar',
                labels: ['bug', 'feature'],
                mergedAt: new Date(1)
            },
            {
                id: 3,
                title: 'Added new feature',
                labels: ['feature'],
                mergedAt: new Date(2)
            }
        ] satisfies PullRequest[];

        const expectedChangelog = [
            '## 1.0.0 (January 1, 1970)',
            '',
            '### Bug',
            '',
            '- #### Fixed bug bar ([#2](https://github.com/foo/bar/pull/2))',
            '',
            '- #### Fixed bug foo ([#1](https://github.com/foo/bar/pull/1))',
            '',
            '### Feature',
            '',
            '- #### Added new feature ([#3](https://github.com/foo/bar/pull/3))',
            '',
            ''
        ].join('\n');

        const changelog = await createChangelog('1.0.0', mergedPullRequests, repository);

        expect(changelog).toBe(expectedChangelog);
    });

    it('uses custom labels when provided', async () => {
        const customValidLabels = ['core', 'addons'];

        const createChangelog = createChangelogFactory({
            getCurrentDate: () => new Date(0),
            config: mockConfig({ groupByLabels: true, validLabels: customValidLabels })
        });

        const mergedPullRequests = [
            {
                id: 1,
                title: 'Fixed bug foo',
                labels: ['core'],
                mergedAt: new Date(0)
            },
            {
                id: 2,
                title: 'Fixed bug bar',
                labels: ['addons'],
                mergedAt: new Date(1)
            },
            {
                id: 3,
                title: 'Fix spelling error',
                labels: ['core'],
                mergedAt: new Date(2)
            }
        ] satisfies PullRequest[];

        const expectedChangelog = [
            '## 1.0.0 (January 1, 1970)',
            '',
            '### Core',
            '',
            '- #### Fix spelling error ([#3](https://github.com/foo/bar/pull/3))',
            '',
            '- #### Fixed bug foo ([#1](https://github.com/foo/bar/pull/1))',
            '',
            '### Addons',
            '',
            '- #### Fixed bug bar ([#2](https://github.com/foo/bar/pull/2))',
            '',
            ''
        ].join('\n');

        const changelog = await createChangelog('1.0.0', mergedPullRequests, repository);

        expect(changelog).toBe(expectedChangelog);
    });

    it('uses the same order for the changelog sections as in validLabels', async () => {
        const customValidLabels = ['first', 'second', 'third', 'fourth'];

        const createChangelog = createChangelogFactory({
            getCurrentDate: () => new Date(0),
            config: mockConfig({ groupByLabels: true, validLabels: customValidLabels })
        });

        const mergedPullRequests = [
            {
                id: 1,
                title: 'PR #1',
                labels: ['second'],
                mergedAt: new Date(0)
            },
            {
                id: 2,
                title: 'PR #2',
                labels: ['second'],
                mergedAt: new Date(1)
            },
            {
                id: 3,
                title: 'PR #3',
                labels: ['first'],
                mergedAt: new Date(2)
            },
            {
                id: 4,
                title: 'PR #4',
                labels: ['fourth'],
                mergedAt: new Date(3)
            },
            {
                id: 5,
                title: 'PR #5',
                labels: ['third'],
                mergedAt: new Date(4)
            }
        ] satisfies PullRequest[];

        const expectedChangelog = [
            '## 1.0.0 (January 1, 1970)',
            '',
            '### First',
            '',
            '- #### PR #3 ([#3](https://github.com/foo/bar/pull/3))',
            '',
            '### Second',
            '',
            '- #### PR #2 ([#2](https://github.com/foo/bar/pull/2))',
            '',
            '- #### PR #1 ([#1](https://github.com/foo/bar/pull/1))',
            '',
            '### Third',
            '',
            '- #### PR #5 ([#5](https://github.com/foo/bar/pull/5))',
            '',
            '### Fourth',
            '',
            '- #### PR #4 ([#4](https://github.com/foo/bar/pull/4))',
            '',
            ''
        ].join('\n');

        const changelog = await createChangelog('1.0.0', mergedPullRequests, repository);

        expect(changelog).toBe(expectedChangelog);
    });
});
