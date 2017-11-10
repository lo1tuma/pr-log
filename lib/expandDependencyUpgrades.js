import R from 'ramda';

export function parseUpgrades(description) {
    if (description.startsWith('## Overview\n\nThe following dependencies have been updated:')) {
        const parts = description.split('## Details');
        if (parts.length === 2) {
            return parts[0]
                .trim()
                .split('\n')
                .filter((line) => line.startsWith('- '))
                .map((line) => line.replace(/^- /, ''));
        }
    }
    return null;
}

export function expandUpgradePR(pr) {
    const { id, title, label, body } = pr;
    const unexpanded = [ pr ];
    if (title.match(/^Update \d+ dependencies from npm$/u)) {
        const upgrades = parseUpgrades(body);
        if (upgrades) {
            return upgrades.map((line) => ({
                id, label, body, title: `Upgraded ${line}`
            }));
        }
    }
    return unexpanded;
}

export default function expandDependencyUpgrades(prs) {
    return R.flatten(prs.map(expandUpgradePR));
}
