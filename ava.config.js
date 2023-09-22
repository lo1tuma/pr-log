const avaConfig = {
    files: ['./source/**/*.test.ts'],
    typescript: {
        rewritePaths: {
            'source/': 'target/build/source/'
        },
        compile: false
    }
};

export default avaConfig;
