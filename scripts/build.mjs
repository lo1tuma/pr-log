#!/usr/bin/env node

import { build } from '@ncpa0cpl/nodepack';
import path from 'path';
import { URL, fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const p = (pathSegment) => path.resolve(__dirname, '..', pathSegment);

async function main() {
    try {
        await build({
            srcDir: p('src'),
            outDir: p('dist'),
            formats: ['esm'],
            target: 'ES2020',
            declarations: true,
            tsConfig: p('tsconfig.json')
        });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
