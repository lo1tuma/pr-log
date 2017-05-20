import path from 'path';

let validLabels;

try {
    validLabels = require(path.join(process.cwd(), 'pr-log.json'));
} catch (err) {
    validLabels = {
        bug: 'Bug Fixes',
        upgrade: 'Dependency Upgrades',
        documentation: 'Documentation',
        feature: 'Features',
        enhancement: 'Enhancements',
        build: 'Build-Related',
        breaking: 'Breaking Changes'
    };
}

module.exports = validLabels;
