import { babel } from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import vue from 'rollup-plugin-vue'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'
import analyze from 'rollup-plugin-analyzer'

const pkg = require('../package.json')
export const name = 'VueLightbox'

export default {
  input: 'src/index.js',
  plugins: [
    resolve({
      mainFields: ['module', 'jsnext:main', 'main', 'browser'],
    }),
    vue({
      css: true,
    }),
    commonjs(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'runtime',
      extensions: ['.js', '.vue', 'jsx'],
    }),
    replace({
      VERSION: JSON.stringify(pkg.version),
      preventAssignment: false,
    }),
    postcss({
      minimize: true,
      plugins: [
        autoprefixer()
      ],
      extract: 'index.css'
    }),
    analyze(),
  ],
  watch: {
    // 指出应将哪些模块视为外部模块
    include: 'src/**',
  },
  external: ['vue'],
}
