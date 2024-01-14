import test from 'ava';
import { Factory } from 'fishery';
import Maybe, { type Just } from 'true-myth/maybe';
import { createChangelogFactory, type ChangelogOptions } from './create-changelog.js';
import { defaultValidLabels } from './valid-labels.js';

const changelogOptionsFactory = Factory.define<ChangelogOptions>(() => {
    return {
        unreleased: false,
        versionNumber: Maybe.just('1.0.0') as Just<string>,
        validLabels: defaultValidLabels,
        mergedPullRequests: [],
        githubRepo: ''
    };
});

test('contains no title when version was not released', (t) => {
    const createChangelog = createChangelogFactory({
        getCurrentDate: () => {
            return new Date(0);
        },
        packageInfo: {}
    });
    const options = changelogOptionsFactory.build({
        unreleased: true,
        versionNumber: Maybe.nothing()
    });

    const changelog = createChangelog(options);
    const expected = '';

    t.is(changelog, expected);
});

test('contains a title with the version number and the formatted date when version was released', (t) => {
    const createChangelog = createChangelogFactory({
        getCurrentDate: () => {
            return new Date(0);
        },
        packageInfo: {}
    });
    const options = changelogOptionsFactory.build();
    const changelog = createChangelog(options);
    const expectedTitle = '## 1.0.0 (January 1, 1970)';

    t.true(changelog.includes(expectedTitle));
});

test('format the date with a custom date format when version was released', (t) => {
    const packageInfo = { 'pr-log': { dateFormat: 'dd.MM.yyyy' } };
    const createChangelog = createChangelogFactory({
        getCurrentDate: () => {
            return new Date(0);
        },
        packageInfo
    });
    const options = changelogOptionsFactory.build();
    const changelog = createChangelog(options);
    const expectedTitle = '## 1.0.0 (01.01.1970)';

    t.true(changelog.includes(expectedTitle));
});

test('creates a formatted changelog when version was released', (t) => {
    const createChangelog = createChangelogFactory({
        getCurrentDate: () => {
            return new Date(0);
        },
        packageInfo: {}
    });
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

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    t.true(changelog.includes(expectedChangelog));
});

test('uses custom labels when provided and version was released', (t) => {
    const createChangelog = createChangelogFactory({
        getCurrentDate: () => {
            return new Date(0);
        },
        packageInfo: {}
    });
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

    const options = changelogOptionsFactory.build({
        validLabels: customValidLabels,
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    t.true(changelog.includes(expectedChangelog));
});

test('uses the same order for the changelog sections as in validLabels when version was released', (t) => {
    const createChangelog = createChangelogFactory({
        getCurrentDate: () => {
            return new Date(0);
        },
        packageInfo: {}
    });
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

    const options = changelogOptionsFactory.build({
        validLabels: customValidLabels,
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    t.true(changelog.includes(expectedChangelog));
});
