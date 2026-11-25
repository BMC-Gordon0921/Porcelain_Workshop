// 统一的开/合过渡：所有弹层共用 hidden 作为唯一开关状态，合上时先播 140ms 退场再挂 hidden。
export const OVERLAY_MS = 140;
const timers = new WeakMap();

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function isOverlayOpen(el) { return !!el && !el.classList.contains('hidden') && !el.classList.contains('is-closing'); }

export function openOverlay(el) {
  if (!el) return;
  const pending = timers.get(el);
  if (pending) { clearTimeout(pending); timers.delete(el); }
  el.classList.remove('is-closing');
  el.classList.remove('hidden');
  el.removeAttribute('aria-hidden');
}

export function closeOverlay(el, done) {
  if (!el) return done && done();
  if (el.classList.contains('hidden') || el.classList.contains('is-closing')) return done && done();
  el.setAttribute('aria-hidden', 'true');
  if (reduced()) { el.classList.add('hidden'); return done && done(); }
  el.classList.add('is-closing');
  const timer = setTimeout(() => {
    timers.delete(el);
    el.classList.remove('is-closing');
    el.classList.add('hidden');
    if (done) done();
  }, OVERLAY_MS);
  timers.set(el, timer);
}