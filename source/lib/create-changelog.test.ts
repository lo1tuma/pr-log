import test from 'ava';
import { createChangelogFactory } from './create-changelog.js';
import { defaultValidLabels } from './valid-labels.js';

test('contains a title with the version number and the formatted date', (t) => {
    const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0), packageInfo: {} });
    const changelog = createChangelog('1.0.0', defaultValidLabels, [], '');
    const expectedTitle = '## 1.0.0 (January 1, 1970)';

    t.true(changelog.includes(expectedTitle));
});

test('format the date with a custom date format', (t) => {
    const packageInfo = { 'pr-log': { dateFormat: 'dd.MM.yyyy' } };
    const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0), packageInfo });
    const changelog = createChangelog('1.0.0', defaultValidLabels, [], '');
    const expectedTitle = '## 1.0.0 (01.01.1970)';

    t.true(changelog.includes(expectedTitle));
});

test('creates a formatted changelog', (t) => {
    const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0), packageInfo: {} });
    const mergedPullRequests = [
        {
            id: 1,
            title: 'Fixed bug foo',
            label: 'bug'
        },
        {
            id: 2,
            title: 'Fixed bug bar',
            label: 'bug'
        },
        {
            id: 3,
            title: 'Fix spelling error',
            label: 'documentation'
        }
    ] as const;

    const expectedChangelog = [
        '### Bug Fixes',
        '',
        '* Fixed bug foo ([#1](https://github.com/any/repo/pull/1))',
        '* Fixed bug bar ([#2](https://github.com/any/repo/pull/2))',
        '',
        '### Documentation',
        '',
        '* Fix spelling error ([#3](https://github.com/any/repo/pull/3))',
        ''
    ].join('\n');

    const changelog = createChangelog('1.0.0', defaultValidLabels, mergedPullRequests, 'any/repo');

    t.true(changelog.includes(expectedChangelog));
});

test('uses custom labels when provided', (t) => {
    const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0), packageInfo: {} });
    const customValidLabels = new Map([
        ['core', 'Core Features'],
        ['addons', 'Addons']
    ]);
    const mergedPullRequests = [
        {
            id: 1,
            title: 'Fixed bug foo',
            label: 'core'
        },
        {
            id: 2,
            title: 'Fixed bug bar',
            label: 'addons'
        },
        {
            id: 3,
            title: 'Fix spelling error',
            label: 'core'
        }
    ] as const;

    const expectedChangelog = [
        '### Core Features',
        '',
        '* Fixed bug foo ([#1](https://github.com/any/repo/pull/1))',
        '* Fix spelling error ([#3](https://github.com/any/repo/pull/3))',
        '',
        '### Addons',
        '',
        '* Fixed bug bar ([#2](https://github.com/any/repo/pull/2))',
        ''
    ].join('\n');

    const changelog = createChangelog('1.0.0', customValidLabels, mergedPullRequests, 'any/repo');

    t.true(changelog.includes(expectedChangelog));
});

test('uses the same order for the changelog sections as in validLabels', (t) => {
    const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0), packageInfo: {} });
    const customValidLabels = new Map([
        ['first', 'First Section'],
        ['second', 'Second Section']
    ]);
    const mergedPullRequests = [
        {
            id: 1,
            title: 'Fixed bug foo',
            label: 'second'
        },
        {
            id: 2,
            title: 'Fixed bug bar',
            label: 'second'
        },
        {
            id: 3,
            title: 'Fix spelling error',
            label: 'first'
        }
    ] as const;

    const expectedChangelog = [
        '### First Section',
        '',
        '* Fix spelling error ([#3](https://github.com/any/repo/pull/3))',
        '',
        '### Second Section',
        '',
        '* Fixed bug foo ([#1](https://github.com/any/repo/pull/1))',
        '* Fixed bug bar ([#2](https://github.com/any/repo/pull/2))',
        ''
    ].join('\n');

    const changelog = createChangelog('1.0.0', customValidLabels, mergedPullRequests, 'any/repo');

    t.true(changelog.includes(expectedChangelog));
});
