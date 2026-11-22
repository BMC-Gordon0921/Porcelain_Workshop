// 小红书小工具构建配置（S3）。
// 与默认 vite.config.js 的差别：
//   1. three 走 r150（three-legacy 别名），保留 WebGL1 运行时；
//   2. 目标 chrome61 / ES2017：安卓 WebView 61 基线；
//   3. 单文件经典脚本（无 module、无 preload、无 code split）；
//   4. publicDir 关闭：public/ 里的 .glb、原尺寸位图不是小工具能带的资源，
//      改由 tools/minitool/* 生成 WebP 与自带几何，再由 build_minitool.mjs 灌入；
//   5. 产物直接落到 dist-minitool/，由 build_minitool.mjs 再做 HTML 后处理与审计。
import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {audioShim, logoShim} from './tools/minitool/minitool-plugins.mjs';

const threeR150 = fileURLToPath(new URL('./src/platform/three-r150.js', import.meta.url));

export default defineConfig({
  base: './',
  publicDir: false,
  define: {__MINITOOL__: 'true'},
  plugins: [audioShim(), logoShim()],
  resolve: {
    alias: [
      {find: /^three$/, replacement: threeR150},
      // addons 必须跟核心同版本，否则 r186 的 GLTFLoader 会跟 r150 核心的色彩空间表打架
      {find: /^three\/addons\//, replacement: 'three-legacy/examples/jsm/'},
      {find: /^three\/examples\/jsm\//, replacement: 'three-legacy/examples/jsm/'}
    ]
  },
  optimizeDeps: {include: ['three-legacy']},
  build: {
    target: 'chrome61',
    outDir: 'dist-minitool',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    modulePreload: false,
    sourcemap: false,
    rolldownOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
