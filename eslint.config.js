import { baseConfig } from '@enormora/eslint-config-base';
import { nodeConfig } from '@enormora/eslint-config-node';
import { avaConfig } from '@enormora/eslint-config-ava';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

export default [
    {
        ignores: ['target/**']
    },
    baseConfig,
    nodeConfig,
    {
        ...typescriptConfig,
        files: ['**/*.ts']
    },
    {
        ...avaConfig,
        files: ['**/*.test.ts']
    },
    {
        rules: {
            'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }]
        }
    },
    {
        files: ['eslint.config.js', 'ava.config.js', 'prettier.config.js'],
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
