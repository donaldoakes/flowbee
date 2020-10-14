// TODO: stay on plugin-typescript 3.x pending this issue:
// https://github.com/rollup/plugins/issues/287
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

export default [
    // browser UMD build (tsc builds module output & types)
    {
        input: 'src/main.ts',
        output: {
            name: 'flowbee',
            file: 'dist/index.js',
            format: 'umd'
        },
        plugins: [
            resolve(),
            commonjs(),
            typescript(),
            postcss()
        ]
    },
	{
		input: 'src/main.ts',
		output: {
            file: 'dist/main.js',
            format: 'es'
        },
        plugins: [
            resolve(),
            commonjs(),
            typescript(),
            postcss()
        ]
	}
];
