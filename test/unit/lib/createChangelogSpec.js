'use strict';

var chai = require('chai'),
    sinon = require('sinon'),
    createChangelog = require('../../../lib/createChangelog'),
    expect = chai.expect;

chai.use(require('sinon-chai'));

describe('createChangelog', function () {
    var clock;

    beforeEach(function () {
        clock = sinon.useFakeTimers();
    });

    afterEach(function () {
        clock.restore();
    });

    it('should have a title with the version number and the formatted date', function () {
        var changelog = createChangelog('1.0.0', []),
            expectedTitle = '## 1.0.0 (January 1, 1970)';

        expect(changelog).to.contain(expectedTitle);
    });

    it('should create a formatted changelog', function () {
        var mergedPullRequests = [ {
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
            } ],
            expectedChangelog = [
                '### Bug Fixes',
                '',
                '* Fixed bug foo (#1)',
                '* Fixed bug bar (#2)',
                '',
                '### Documentation',
                '',
                '* Fix spelling error (#3)',
                ''
            ].join('\n'),
            changelog = createChangelog('1.0.0', mergedPullRequests);

        expect(changelog).to.contain(expectedChangelog);
    });
});
