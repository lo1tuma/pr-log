import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import createChangelogFactory from '../../../lib/createChangelog';
import defaultValidLabels from '../../../lib/validLabels';

const expect = chai.expect;

chai.use(sinonChai);

describe('createChangelog', function () {
    it('should have a title with the version number and the formatted date', function () {
        const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0) });
        const changelog = createChangelog('1.0.0', defaultValidLabels, []);
        const expectedTitle = '## 1.0.0 (January 1, 1970)';

        expect(changelog).to.contain(expectedTitle);
    });

    it('should create a formatted changelog', function () {
        const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0) });
        const mergedPullRequests = [
            {
                id: '1',
                title: 'Fixed bug foo',
                label: 'bug'
            },
            {
                id: '2',
                title: 'Fixed bug bar',
                label: 'bug'
            },
            {
                id: '3',
                title: 'Fix spelling error',
                label: 'documentation'
            }
        ];

        const expectedChangelog = [
            '### Bug Fixes',
            '',
            '* Fixed bug foo (#1)',
            '* Fixed bug bar (#2)',
            '',
            '### Documentation',
            '',
            '* Fix spelling error (#3)',
            ''
        ].join('\n');

        const changelog = createChangelog('1.0.0', defaultValidLabels, mergedPullRequests);

        expect(changelog).to.contain(expectedChangelog);
    });

    it('should use custom labels when provided', function () {
        const createChangelog = createChangelogFactory({ getCurrentDate: () => new Date(0) });
        const customValidLabels = {
            core: 'Core Features',
            addons: 'Addons'
        };
        const mergedPullRequests = [
            {
                id: '1',
                title: 'Fixed bug foo',
                label: 'core'
            },
            {
                id: '2',
                title: 'Fixed bug bar',
                label: 'addons'
            },
            {
                id: '3',
                title: 'Fix spelling error',
                label: 'core'
            }
        ];

        const expectedChangelog = [
            '### Core Features',
            '',
            '* Fixed bug foo (#1)',
            '* Fix spelling error (#3)',
            '',
            '### Addons',
            '',
            '* Fixed bug bar (#2)',
            ''
        ].join('\n');

        const changelog = createChangelog('1.0.0', customValidLabels, mergedPullRequests);

        expect(changelog).to.contain(expectedChangelog);
    });
});
