import chai from 'chai';

import sinonChai from 'sinon-chai';

import { expandUpgradePR } from '../../../lib/expandDependencyUpgrades';

const expect = chai.expect;
chai.use(sinonChai);

const validTitle = 'Update 10 dependencies from npm';
const invalidTitle = 'Foo bar baz';

const validBody = `## Overview

The following dependencies have been updated:

- react-textarea-autosize in \`addons/events\` from \`5.1.0\` to \`5.2.0\`
- react-textarea-autosize in \`addons/knobs\` from \`5.1.0\` to \`5.2.0\`

## Details

[Dependencies.io](https://www.dependencies.io) has updated react-textarea-autosize (a npm dependency in \`addons/events\`) from \`5.1.0\` to \`5.2.0\`.
`;
const invalidBody = 'Blah blah blah';

describe('expanding upgrades', () => {
    const id = 1;
    const label = 'test';
    it('should skip prs with invalid titles', () => {
        const pr = { id, label, title: invalidTitle, body: validBody };
        expect(expandUpgradePR(pr)).to.deep.equal([ pr ]);
    });
    it('should skip prs with invalid bodies', () => {
        const pr = { id, label, title: validTitle, body: invalidBody };
        expect(expandUpgradePR(pr)).to.deep.equal([ pr ]);
    });
    it('should parse valid upgrades', () => {
        const body = validBody;
        const pr = { id, label, title: validTitle, body };
        expect(expandUpgradePR(pr)).to.deep.equal([
            { id, label, body, title: 'Upgraded react-textarea-autosize in `addons/events` from `5.1.0` to `5.2.0`' },
            { id, label, body, title: 'Upgraded react-textarea-autosize in `addons/knobs` from `5.1.0` to `5.2.0`' }
        ]);
    });
});
