// 小工具构建专用 rollup/vite 插件：把桌面版的重量级资源替换成小工具包里的合规产物。
// 由 vite.minitool.config.js 引入；桌面构建（vite.config.js）不受影响。

const LOGO_MAP = {'logo-mark.png': './assets/logo-mark.webp', 'logo-lockup.png': './assets/logo-lockup.webp'};

// 桌面版把 BGM 作为 23 MB WAV 打进包；小工具包不允许音频扩展名，
// 所以这里把 WAV 的 URL 置空，BGM 改由 assets/bgm.js 的 base64 + WebAudio 播放。
export function audioShim() {
  return {
    name: 'minitool-audio-shim',
    enforce: 'pre',
    resolveId(source) {
      return source.split('?')[0].endsWith('.wav') ? '\0minitool-audio' : null;
    },
    load(id) {
      return id === '\0minitool-audio' ? "export default '';\n" : null;
    }
  };
}

// 位图统一走 WebP（tools/minitool/prepare_assets.py 生成），logo 的 URL 直接由这里给出，
// 避免 vite 再把原 PNG 打进包。
export function logoShim() {
  return {
    name: 'minitool-logo-shim',
    enforce: 'pre',
    resolveId(source) {
      const base = source.split('?')[0].split('/').pop();
      return LOGO_MAP[base] ? `\0logo:${base}` : null;
    },
    load(id) {
      if (!id.startsWith('\0logo:')) return null;
      return `export default ${JSON.stringify(LOGO_MAP[id.slice(6)])};\n`;
    }
  };
}
