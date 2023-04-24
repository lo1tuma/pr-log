const fs = require('fs');

const swcConfig = JSON.parse(fs.readFileSync(`${__dirname}/.swcrc`, 'utf-8'));

module.exports = () => {
    /** @type {import("jest").Config} */
    const config = {
        testRegex: '.*test/.+(\\.test\\.(ts|js|tsx|jsx))$',
        transform: {
            '^.+\\.(t|j)sx?$': ['@swc/jest', swcConfig]
        },
        roots: ['<rootDir>'],
        collectCoverage: false,
        testEnvironment: 'node',
        extensionsToTreatAsEsm: ['.ts']
    };

    return config;
};
