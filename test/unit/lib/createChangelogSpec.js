import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import createChangelog from '../../../lib/createChangelog';

const expect = chai.expect;

chai.use(sinonChai);

describe('createChangelog', function () {
    let clock;

    beforeEach(function () {
        clock = sinon.useFakeTimers();
    });

    afterEach(function () {
        clock.restore();
    });

    it('should have a title with the version number and the formatted date', function () {
        const changelog = createChangelog('1.0.0', []);
        const expectedTitle = '## 1.0.0 (January 1, 1970)';

        expect(changelog).to.contain(expectedTitle);
    });

    it('should create a formatted changelog', function () {
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

        const changelog = createChangelog('1.0.0', mergedPullRequests);

        expect(changelog).to.contain(expectedChangelog);
    });
});
