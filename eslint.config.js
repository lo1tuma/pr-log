import { baseConfig } from '@enormora/eslint-config-base';
import { nodeConfig } from '@enormora/eslint-config-node';
import { mochaConfig } from '@enormora/eslint-config-mocha';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

export default [
    {
        ignores: ['target/**', 'mocha.config.json']
    },
    baseConfig,
    nodeConfig,
    {
        ...typescriptConfig,
        files: ['**/*.ts'],
        rules: {
            ...typescriptConfig.rules,
            'import/extensions': [
                'error',
                'always',
                {
                    ignorePackages: true
                }
            ],
            'functional/prefer-immutable-types': [
                'error',
                {
                    ...typescriptConfig.rules['functional/prefer-immutable-types'][1],
                    ignoreTypePattern: ['Result']
                }
            ]
        }
    },
    {
        ...mochaConfig,
        files: ['**/*.test.ts'],
        rules: {
            ...mochaConfig.rules,
            'mocha/no-global-tests': 'off',
            'mocha/no-mocha-arrows': 'off'
        }
    },
    {
        rules: {
            'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }]
        }
    },
    {
        files: ['eslint.config.js', 'mocha.config.json', 'prettier.config.js'],
        rules: {
            'import/no-default-export': 'off'
        }
    },
    {
        files: ['source/bin/pr-log.ts'],
        rules: {
            'no-console': 'off',
            'node/no-process-env': 'off',
            'import/max-dependencies': 'off'
        }
    }
];
