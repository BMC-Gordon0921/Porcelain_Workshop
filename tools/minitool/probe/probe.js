/* jshint esversion: 6 */
(function () {
  'use strict';

  var result = { ts: new Date().toISOString(), tests: {} };
  var out = document.getElementById('out');

  function flush() {
    out.textContent = JSON.stringify(result, null, 2);
    window.__PROBE_RESULT = result;
  }

  function record(name, value) {
    result.tests[name] = value;
    flush();
  }

  function fail(name, err) {
    record(name, { ok: false, error: String((err && err.message) || err) });
  }

  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('timeout:' + label + ':' + ms + 'ms'));
      }, ms);
      Promise.resolve(promise).then(function (v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      }, function (e) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  // ---- 1. environment / container ----
  function testEnv() {
    var xhs = window.xhs || null;
    var mt = xhs && xhs.miniTool ? xhs.miniTool : null;
    var info = {
      ok: true,
      ua: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screen: [window.screen.width, window.screen.height],
      hasXhs: !!xhs,
      xhsKeys: xhs ? Object.keys(xhs).sort() : [],
      hasMiniTool: !!mt,
      miniToolKeys: mt ? Object.keys(mt).sort() : [],
      hasLaunchOptions: !!(xhs && xhs.getLaunchOptions),
      deviceMemory: navigator.deviceMemory || null,
      hardwareConcurrency: navigator.hardwareConcurrency || null
    };
    record('env', info);
    if (xhs && typeof xhs.getLaunchOptions === 'function') {
      withTimeout(new Promise(function (res) { xhs.getLaunchOptions({ success: res, fail: function (e) { res({ __fail: e }); } }); }), 3000, 'launchOptions')
        .then(function (lo) { record('launchOptions', { ok: true, value: lo }); })
        .catch(function (e) { fail('launchOptions', e); });
    }
    if (mt) {
      record('miniToolMeta', {
        ok: true,
        version: mt.version || null,
        launchOptions: mt.launchOptions || null,
        config: xhs.config || null
      });
      if (typeof mt.getWindowInfo === 'function') {
        withTimeout(new Promise(function (res, rej) {
          mt.getWindowInfo({ success: res, fail: function (e) { rej(new Error(JSON.stringify(e))); } });
        }), 3000, 'getWindowInfo').then(function (v) { record('windowInfo', { ok: true, value: v }); })
          .catch(function (e) { fail('windowInfo', e); });
      }
      if (typeof mt.getStorageInfo === 'function') {
        withTimeout(new Promise(function (res, rej) {
          mt.getStorageInfo({ success: res, fail: function (e) { rej(new Error(JSON.stringify(e))); } });
        }), 3000, 'getStorageInfo').then(function (v) { record('storageInfo', { ok: true, value: v }); })
          .catch(function (e) { fail('storageInfo', e); });
      }
    }
  }

  // ---- 2. storage ----
  function testStorage() {
    var mt = window.xhs && window.xhs.miniTool;
    if (!mt || typeof mt.setStorage !== 'function') {
      record('storage', { ok: false, error: 'no miniTool.setStorage' });
      return;
    }
    var key = 'probe-key';
    withTimeout(new Promise(function (res, rej) {
      mt.setStorage({
        key: key,
        data: JSON.stringify({ hello: 'terra', n: 42 }),
        success: function () { res(); },
        fail: function (e) { rej(new Error(JSON.stringify(e))); }
      });
    }), 4000, 'setStorage').then(function () {
      return withTimeout(new Promise(function (res, rej) {
        mt.getStorage({
          key: key,
          success: function (r) { res(r); },
          fail: function (e) { rej(new Error(JSON.stringify(e))); }
        });
      }), 4000, 'getStorage');
    }).then(function (r) {
      record('storage', { ok: true, roundTrip: r, parsed: r && r.data ? JSON.parse(r.data) : null });
    }).catch(function (e) { fail('storage', e); });
  }

  // ---- 3. same-origin fetch of package file ----
  function testFetch() {
    if (typeof fetch !== 'function') { record('fetch', { ok: false, error: 'no fetch' }); return; }
    withTimeout(fetch('./assets/tone.mp3').then(function (r) {
      return r.arrayBuffer().then(function (b) { return { status: r.status, ok: r.ok, bytes: b.byteLength }; });
    }), 5000, 'fetch-mp3').then(function (v) {
      record('fetch', { ok: true, value: v });
    }).catch(function (e) { fail('fetch', e); });
  }

  // ---- 4. audio element playback of packaged mp3 / wav ----
  function testAudio(src, label) {
    return withTimeout(new Promise(function (resolve, reject) {
      var a = document.createElement('audio');
      a.preload = 'auto';
      a.src = src;
      var settled = false;
      function done(v) { if (settled) return; settled = true; resolve(v); }
      a.addEventListener('loadedmetadata', function () {
        done({ ok: true, phase: 'loadedmetadata', duration: a.duration, readyState: a.readyState });
      });
      a.addEventListener('canplaythrough', function () {
        done({ ok: true, phase: 'canplaythrough', duration: a.duration, readyState: a.readyState });
      });
      a.addEventListener('error', function () {
        var code = a.error ? a.error.code : null;
        done({ ok: false, error: 'media-error', code: code, src: a.currentSrc });
      });
      document.body.appendChild(a);
      a.load();
    }), 8000, label).then(function (v) {
      record(label, v);
    }).catch(function (e) { fail(label, e); });
  }

  // ---- 5. WebAudio ----
  function testAudioContext() {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) { record('audioContext', { ok: false, error: 'no AudioContext' }); return; }
    try {
      var ctx = new Ctor();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.start(0);
      osc.stop(ctx.currentTime + 0.05);
      record('audioContext', {
        ok: true,
        state: ctx.state,
        sampleRate: ctx.sampleRate,
        baseLatency: ctx.baseLatency || null,
        ctor: Ctor === window.AudioContext ? 'AudioContext' : 'webkitAudioContext'
      });
    } catch (e) {
      fail('audioContext', e);
    }
  }

  // ---- 6. WebGL ----
  function probeGL(kind, attrs) {
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var gl = null;
    try { gl = canvas.getContext(kind, attrs); } catch (e) { return { ok: false, error: String(e && e.message) }; }
    if (!gl) return { ok: false, error: 'getContext returned null' };
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    var info = {
      ok: true,
      kind: kind,
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      unmaskedRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxViewportDims: Array.prototype.slice.call(gl.getParameter(gl.MAX_VIEWPORT_DIMS) || []),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      extensions: (gl.getSupportedExtensions() || []).sort()
    };
    if (kind === 'webgl2') {
      info.max3DTextureSize = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
      info.maxArrayTextureLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
      info.maxSamples = gl.getParameter(gl.MAX_SAMPLES);
    }
    // draw a frame so we know the context really renders
    gl.clearColor(0.1, 0.2, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    info.readback = [px[0], px[1], px[2], px[3]];
    var lose = gl.getExtension('WEBGL_lose_context');
    info.hasLoseContext = !!lose;
    return info;
  }

  function testWebGL() {
    record('webgl2', probeGL('webgl2', { antialias: true, alpha: true, depth: true, powerPreference: 'default' }));
    record('webgl1', probeGL('webgl', { antialias: true, alpha: true, depth: true }));
    // how many contexts can coexist (renderer instances in the game)
    var list = [];
    for (var i = 0; i < 6; i++) {
      var c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      var g = null;
      try { g = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { g = null; }
      list.push(!!g);
    }
    record('multiContext', { ok: true, six: list });
  }

  // ---- 7. dynamic classic script injection ----
  function testDynamicScript() {
    withTimeout(new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = './assets/dyn.js';
      s.onload = function () { resolve({ ok: true, value: window.__DYN_OK || null }); };
      s.onerror = function () { reject(new Error('script load error')); };
      document.head.appendChild(s);
    }), 5000, 'dyn-script').then(function (v) {
      record('dynamicScript', v);
    }).catch(function (e) { fail('dynamicScript', e); });
  }

  // ---- 8. canvas 2d + inline data url image ----
  function testCanvas2d() {
    try {
      var c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      var ctx = c.getContext('2d');
      if (!ctx) { record('canvas2d', { ok: false, error: 'no 2d context' }); return; }
      ctx.fillStyle = '#c33';
      ctx.fillRect(0, 0, 32, 32);
      var data = ctx.getImageData(0, 0, 1, 1).data;
      record('canvas2d', { ok: true, pixel: [data[0], data[1], data[2], data[3]], hasToDataURL: typeof c.toDataURL === 'function' });
    } catch (e) { fail('canvas2d', e); }
  }

  // ---- 9. legacy storage visibility (must NOT be used, only detected) ----
  function testLegacyStorage() {
    var probe = { localStorage: null, sessionStorage: null, indexedDB: null };
    try { window.localStorage.setItem('probe', '1'); probe.localStorage = 'available'; } catch (e) { probe.localStorage = 'blocked:' + (e && e.name); }
    try { window.sessionStorage.setItem('probe', '1'); probe.sessionStorage = 'available'; } catch (e) { probe.sessionStorage = 'blocked:' + (e && e.name); }
    probe.indexedDB = typeof window.indexedDB !== 'undefined' ? 'available' : 'absent';
    record('legacyStorage', probe);
  }

  // ---- run ----
  function run() {
    try { testEnv(); } catch (e) { fail('env', e); }
    try { testStorage(); } catch (e) { fail('storage', e); }
    try { testFetch(); } catch (e) { fail('fetch', e); }
    try { testAudioContext(); } catch (e) { fail('audioContext', e); }
    try { testWebGL(); } catch (e) { fail('webgl2', e); }
    try { testCanvas2d(); } catch (e) { fail('canvas2d', e); }
    try { testLegacyStorage(); } catch (e) { fail('legacyStorage', e); }
    testAudio('./assets/tone.mp3', 'audioMp3');
    testAudio('./assets/tone.wav', 'audioWav');
    testDynamicScript();

    setTimeout(function () {
      result.done = true;
      document.title = 'PROBE_DONE';
      flush();
    }, 12000);
  }

  run();
}());
