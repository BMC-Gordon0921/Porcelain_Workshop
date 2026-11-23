import musicUrl from './assets/pottery backround music.wav?url';

const MINITOOL = typeof __MINITOOL__ !== 'undefined' && __MINITOOL__;

// 小工具平台的允许扩展名里没有音频，所以 mp3 以 base64 存进 assets/bgm.js，
// 首次播放时注入脚本再交给 WebAudio 解码（见 tools/minitool/embed_audio.mjs）。
function loadBgmData() {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = './assets/bgm.js';
    el.async = true;
    el.onload = () => resolve(window.__TERRA_BGM || '');
    el.onerror = () => reject(new Error('BGM 数据加载失败：./assets/bgm.js'));
    document.head.appendChild(el);
  });
}

function createBufferMusic() {
  let enabled = true;
  let unlocked = false;
  let failed = false;
  let ctx = null;
  let buffer = null;
  let source = null;
  let gain = null;
  let volume = 1;
  let loading = null;

  const AudioCtx = () => window.AudioContext || window.webkitAudioContext;

  function decode(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function ensure() {
    if (buffer) return Promise.resolve(buffer);
    if (loading) return loading;
    loading = (async () => {
      try {
        const base64 = window.__TERRA_BGM || (await loadBgmData());
        if (!base64) throw new Error('缺少 BGM 数据');
        const Ctor = AudioCtx();
        if (!Ctor) throw new Error('音频上下文不可用');
        if (!ctx) ctx = new Ctor();
        buffer = await ctx.decodeAudioData(decode(base64));
        return buffer;
      } catch (error) {
        failed = true;
        console.warn('[music]', error);
        return null;
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  async function start() {
    if (!enabled || !unlocked || failed || document.hidden || source) return;
    const data = await ensure();
    if (!data || !enabled || document.hidden || source) return;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    if (!enabled || document.hidden || source) return;
    gain = gain || ctx.createGain();
    gain.gain.value = 0.2 * volume;
    gain.connect(ctx.destination);
    source = ctx.createBufferSource();
    source.buffer = data;
    source.loop = true;
    source.connect(gain);
    source.start();
  }

  function stop() {
    if (!source) return;
    try { source.stop(); } catch {}
    source.disconnect();
    source = null;
    if (gain) gain.disconnect();
  }

  const visibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', visibility);

  return {
    unlock() { unlocked = true; start(); },
    setEnabled(value) { enabled = !!value; enabled ? start() : stop(); },
    setVolume(value) { volume = value; if (gain) gain.gain.value = 0.2 * volume; },
    get enabled() { return enabled; },
    get unavailable() { return failed; },
    dispose() {
      stop();
      document.removeEventListener('visibilitychange', visibility);
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
      buffer = null;
    },
  };
}

// One track for the whole journey; page changes never restart it.
export function createMusic() {
  if (MINITOOL) return createBufferMusic();
  const audio = new Audio(musicUrl); audio.loop = true; audio.volume = .2; audio.preload = 'none';
  let enabled = true, unlocked = false, failed = false, pending = false;
  function pause() { audio.pause(); }
  async function resume() {
    if (!enabled || !unlocked || failed || document.hidden || pending || !audio.paused) return;
    pending = true;
    try { await audio.play(); if (!enabled || document.hidden) pause(); } catch (error) { if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') failed = true; } finally { pending = false; }
  }
  const visibility = () => document.hidden ? pause() : resume();
  const error = () => { failed = true; };
  audio.addEventListener('error', error); document.addEventListener('visibilitychange', visibility);
  return {
    unlock() { unlocked = true; resume(); },
    setEnabled(value) { enabled = !!value; enabled ? resume() : pause(); },
    setVolume(value) { audio.volume = 0.2 * value; },
    get enabled() { return enabled; }, get unavailable() { return failed; },
    dispose() { pause(); document.removeEventListener('visibilitychange', visibility); audio.removeEventListener('error', error); audio.removeAttribute('src'); audio.load(); },
  };
}
