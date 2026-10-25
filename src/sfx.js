// Procedural workshop foley. The game ships no external audio files.
const STEP = Math.PI;

const TOOLS = {
  push: {filter: 'lowpass', freq: 480, q: 0.7, gain: 0.13, rate: 0.5, buffer: 'brown', osc: 86, oscGain: 0.04, lfo: 5.5, lfoDepth: 90},
  cut: {filter: 'highpass', freq: 1400, q: 0.8, gain: 0.045, rate: 1.45, buffer: 'white', osc: 0, oscGain: 0, lfo: 14, lfoDepth: 500},
  paint: {filter: 'bandpass', freq: 1400, q: 0.85, gain: 0.03, rate: 0.72, buffer: 'white', osc: 0, oscGain: 0, lfo: 3.5, lfoDepth: 280},
};

export function createSfx() {
  let enabled = true;
  let ctx = null;
  let stepIndex = -1;
  let tool = null;
  let toolKind = '';
  let toolUntil = 0;
  let lastAccent = 0;
  let kiln = null;
  let nextCrackle = 0;

  function context() {
    if (!enabled || typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.85;
      const soften = ctx.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = 9000;
      master.connect(soften);
      soften.connect(ctx.destination);
      ctx.__master = master;
      ctx.__buffers = {white: makeNoise(ctx, 'white'), brown: makeNoise(ctx, 'brown')};
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setEnabled(value) {
    enabled = !!value;
    if (!enabled) {
      stopTool();
      stopKiln();
      stepIndex = -1;
    } else {
      try { context(); } catch { enabled = false; }
    }
    return enabled;
  }

  function unlock() {
    if (!enabled) return;
    try { context(); } catch { /* ignore */ }
  }

  function play(kind = 'tap', detail) {
    try {
      const c = context();
      if (!c) return;
      if (kind === 'coin') chime(c, [523, 659, 784, 1047], 0.05, 0.28);
      else if (kind === 'fail') chime(c, [311, 233, 174], 0.045, 0.22);
      else if (kind === 'clay') clay(c);
      else if (kind === 'fire') fireWhoosh(c);
      else if (kind === 'strike') strike(c, detail);
      else if (kind === 'hover') uiHover(c);
      else if (kind === 'click') uiClick(c);
      else chime(c, [392, 523], 0.04, 0.16);
    } catch { /* audio must never interrupt play */ }
  }

  function walk(stride, moving, heavy = false) {
    try {
      if (!enabled || !moving) { stepIndex = -1; return; }
      const index = Math.floor(stride / STEP);
      if (index === stepIndex) return;
      stepIndex = index;
      const c = context();
      if (c) footstep(c, index, heavy);
    } catch { /* ignore */ }
  }

  function shape(kind) {
    try {
      if (!enabled || !kind) { stopTool(); return; }
      const c = context();
      if (!c) return;
      if (toolKind !== kind) startTool(c, kind);
      toolUntil = performance.now() + 130;
      const gap = kind === 'cut' ? 68 : kind === 'paint' ? 95 : 150;
      const now = performance.now();
      if (now - lastAccent >= gap) {
        lastAccent = now;
        accent(c, kind);
      }
    } catch { /* ignore */ }
  }

  function firing(on) {
    try {
      if (!enabled || !on) { stopKiln(); return; }
      const c = context();
      if (c && !kiln) startKiln(c);
    } catch { /* ignore */ }
  }

  function tick() {
    try {
      if (tool && performance.now() > toolUntil) stopTool();
      if (!kiln || !ctx) return;
      if (ctx.currentTime >= nextCrackle) {
        crackle(ctx);
        nextCrackle = ctx.currentTime + 0.05 + Math.random() * 0.16;
      }
    } catch { /* ignore */ }
  }

  function startTool(c, kind) {
    stopTool();
    const spec = TOOLS[kind] || TOOLS.push;
    const source = c.createBufferSource();
    source.buffer = c.__buffers[spec.buffer];
    source.loop = true;
    source.playbackRate.value = spec.rate;
    const filter = c.createBiquadFilter();
    filter.type = spec.filter;
    filter.frequency.value = spec.freq;
    filter.Q.value = spec.q;
    const gain = c.createGain();
    const t = c.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(spec.gain, t + 0.04);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.__master);
    source.start();
    let osc = null;
    if (spec.osc) {
      osc = c.createOscillator();
      const og = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = spec.osc;
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(spec.oscGain, t + 0.05);
      osc.connect(og);
      og.connect(c.__master);
      osc.start();
      osc.gainNode = og;
    }
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = spec.lfo;
    lfoGain.gain.value = spec.lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    tool = {source, gain, osc, lfo};
    toolKind = kind;
  }

  function stopTool() {
    if (!tool || !ctx) { tool = null; toolKind = ''; toolUntil = 0; return; }
    const current = tool;
    tool = null;
    toolKind = '';
    toolUntil = 0;
    const t = ctx.currentTime;
    fadeOut(current.gain.gain, t, 0.06);
    current.source.stop(t + 0.07);
    if (current.osc) {
      fadeOut(current.osc.gainNode.gain, t, 0.06);
      current.osc.stop(t + 0.07);
    }
    current.lfo.stop(t + 0.07);
  }

  function startKiln(c) {
    const source = c.createBufferSource();
    source.buffer = c.__buffers.brown;
    source.loop = true;
    source.playbackRate.value = 0.42;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    const gain = c.createGain();
    const t = c.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.35);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.__master);
    source.start();
    const rumble = c.createOscillator();
    const rg = c.createGain();
    rumble.type = 'sine';
    rumble.frequency.value = 58;
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.exponentialRampToValueAtTime(0.045, t + 0.4);
    rumble.connect(rg);
    rg.connect(c.__master);
    rumble.start();
    kiln = {source, gain, rumble, rg};
    nextCrackle = t + 0.12;
  }

  function stopKiln() {
    if (!kiln || !ctx) { kiln = null; return; }
    const current = kiln;
    kiln = null;
    const t = ctx.currentTime;
    fadeOut(current.gain.gain, t, 0.18);
    fadeOut(current.rg.gain, t, 0.18);
    current.source.stop(t + 0.2);
    current.rumble.stop(t + 0.2);
  }

  return {
    setEnabled,
    get enabled() { return enabled; },
    unlock,
    play,
    walk,
    shape,
    firing,
    tick,
  };
}

function makeNoise(audio, color) {
  const length = audio.sampleRate * 2;
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (color === 'brown') {
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = Math.max(-1, Math.min(1, brown * 3.6));
    } else data[i] = white;
  }
  const fade = 64;
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    data[i] *= w;
    data[length - 1 - i] *= w;
  }
  return buffer;
}

function fadeOut(param, t, dur) {
  const value = Math.max(0.0001, param.value || 0.0001);
  param.cancelScheduledValues(t);
  param.setValueAtTime(value, t);
  param.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(c, {freq, end, dur = 0.12, gain = 0.06, type = 'sine', delay = 0}) {
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(1, freq), t);
  if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.3));
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp);
  amp.connect(c.__master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(c, {buffer, dur = 0.08, gain = 0.05, type = 'lowpass', freq = 800, q = 0.7, endFreq, delay = 0}) {
  const t = c.currentTime + delay;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(Math.max(40, freq), t);
  if (endFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + dur);
  const amp = c.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur * 0.25));
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(c.__master);
  source.start(t);
  source.stop(t + dur + 0.02);
}

function chime(c, notes, gain, dur) {
  notes.forEach((freq, i) => tone(c, {freq, dur, gain, type: 'triangle', delay: i * 0.08}));
}

function uiHover(c) {
  tone(c, {freq: 1180, end: 1560, dur: 0.045, gain: 0.018, type: 'sine'});
}

function uiClick(c) {
  tone(c, {freq: 640, end: 280, dur: 0.05, gain: 0.05, type: 'triangle'});
  noiseBurst(c, {buffer: c.__buffers.white, dur: 0.03, gain: 0.028, type: 'highpass', freq: 1600});
}

function footstep(c, index, heavy) {
  const left = index % 2 === 0;
  tone(c, {freq: left ? (heavy ? 128 : 146) : (heavy ? 108 : 124), end: 62, dur: 0.09, gain: heavy ? 0.11 : 0.085, type: 'sine'});
  noiseBurst(c, {buffer: c.__buffers.white, dur: 0.045, gain: heavy ? 0.05 : 0.035, type: 'lowpass', freq: left ? 780 : 640});
}

function clay(c) {
  tone(c, {freq: 210, end: 70, dur: 0.16, gain: 0.1, type: 'sine'});
  noiseBurst(c, {buffer: c.__buffers.brown, dur: 0.12, gain: 0.08, type: 'lowpass', freq: 500, endFreq: 180});
}

function fireWhoosh(c) {
  noiseBurst(c, {buffer: c.__buffers.brown, dur: 0.55, gain: 0.14, type: 'bandpass', freq: 180, q: 0.6, endFreq: 900});
  tone(c, {freq: 90, end: 48, dur: 0.4, gain: 0.07, type: 'sine'});
}

function strike(c, grade) {
  if (grade === 'perfect') {
    tone(c, {freq: 880, dur: 0.28, gain: 0.07, type: 'sine'});
    tone(c, {freq: 1320, dur: 0.34, gain: 0.04, type: 'triangle', delay: 0.02});
  } else if (grade === 'good') {
    tone(c, {freq: 620, dur: 0.18, gain: 0.07, type: 'triangle'});
    tone(c, {freq: 930, dur: 0.16, gain: 0.035, type: 'sine', delay: 0.03});
  } else {
    tone(c, {freq: 180, end: 70, dur: 0.12, gain: 0.08, type: 'sine'});
    noiseBurst(c, {buffer: c.__buffers.white, dur: 0.07, gain: 0.04, type: 'lowpass', freq: 400});
  }
}

function accent(c, kind) {
  if (kind === 'cut') noiseBurst(c, {buffer: c.__buffers.white, dur: 0.045, gain: 0.05, type: 'bandpass', freq: 2200 + Math.random() * 800, q: 1.6});
  else if (kind === 'paint') noiseBurst(c, {buffer: c.__buffers.white, dur: 0.07, gain: 0.028, type: 'bandpass', freq: 1100, q: 0.8, endFreq: 1800});
  else {
    tone(c, {freq: 150 + Math.random() * 30, end: 70, dur: 0.1, gain: 0.045, type: 'sine'});
    noiseBurst(c, {buffer: c.__buffers.brown, dur: 0.08, gain: 0.04, type: 'lowpass', freq: 360});
  }
}

function crackle(c) {
  noiseBurst(c, {buffer: c.__buffers.white, dur: 0.03 + Math.random() * 0.04, gain: 0.025 + Math.random() * 0.04, type: 'highpass', freq: 1800 + Math.random() * 1500, q: 0.7});
}
