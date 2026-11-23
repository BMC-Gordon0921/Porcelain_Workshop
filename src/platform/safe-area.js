// 设备适配层：安全区让位、横屏（真机旋转 / 手动旋屏）、版面档位。
// 容器里由 getWindowInfo 提供安全区与胶囊；普通浏览器里退回 env(safe-area-inset-*)。
const ROTATE_ATTR = 'rotate';
const ROTATE_ON = 'on';

const MINITOOL = typeof __MINITOOL__ !== 'undefined' && __MINITOOL__;

let lastInfo = null;
let listening = false;
let rotateListener = null;
const listeners = new Set();

const root = () => document.documentElement;

function readInfo() {
  const tool = window.xhs?.miniTool;
  if (!tool || typeof tool.getWindowInfo !== 'function') return null;
  try {
    const info = tool.getWindowInfo();
    if (info && typeof info.then === 'function') return info.catch(() => null);
    return info || null;
  } catch {
    return null;
  }
}

/** 浏览器里的安全区：借一个固定定位的探针读 env(safe-area-inset-*)。 */
function envInsets() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;'
    + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  (document.body || root()).append(probe);
  const style = getComputedStyle(probe);
  const px = value => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };
  const out = {top: px(style.paddingTop), right: px(style.paddingRight), bottom: px(style.paddingBottom), left: px(style.paddingLeft)};
  probe.remove();
  return out;
}

function num(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 把窗口信息折算成四条让位边：真机旋转与手动旋屏都走这里。 */
function computeInsets(info) {
  const winW = num(info?.windowWidth, window.innerWidth);
  const winH = num(info?.windowHeight, window.innerHeight);
  const area = info?.safeArea || {};
  // 浏览器没有 safeArea/menuButtons：用 env() 探针，且没有胶囊要额外让位
  const env = info ? null : envInsets();
  const safeTop = num(area.top, env ? env.top : 0);
  const safeBottomGap = info ? Math.max(0, winH - num(area.bottom, winH)) : env.bottom;
  const safeLeft = num(area.left, env ? env.left : 0);
  const safeRightGap = info ? Math.max(0, winW - num(area.right, winW)) : env.right;
  // 状态栏 + 胶囊需要额外头部空间（实测 safeArea.top 44 → 需要 80px）；浏览器里只让出安全区
  const buttons = info?.menuButtons;
  const visibleButtons = [buttons?.capsule].some(button => button?.width > 0 && button?.height > 0)
    ? [buttons.capsule] : [buttons?.back, buttons?.me, buttons?.share];
  const buttonBottoms = visibleButtons.filter(button => button?.width > 0 && button?.height > 0)
    .map(button => num(button.bottom, safeTop));
  const headTop = buttonBottoms.length ? Math.max(safeTop, ...buttonBottoms) : safeTop + (info ? 36 : 0);

  if (root().dataset[ROTATE_ATTR] === ROTATE_ON) {
    // 画面顺时针转 90°：屏幕右→布局上、屏幕下→布局右
    return {top: safeLeft, bottom: safeRightGap, left: safeBottomGap, right: headTop,
      landscape: true, rotated: true, winW, winH};
  }
  return {top: headTop, bottom: safeBottomGap, left: safeLeft, right: safeRightGap,
    landscape: winW > winH, rotated: false, winW, winH};
}

function applyLayout(insets) {
  const el = root();
  // 只在「真的够扁」时启用横版紧凑/两栏：旋屏后 iPad 近乎正方（852×834），套 58/42 会把画布挤成竖条
  const effW = insets.rotated ? insets.winH : insets.winW;
  const effH = insets.rotated ? insets.winW : insets.winH;
  const flatEnough = effW / effH >= 1.2;
  const compactLandscape = flatEnough && (insets.rotated || (insets.landscape && insets.winH <= 520));
  el.dataset.layout = compactLandscape ? 'ls' : (insets.winW >= 761 ? 'wide' : 'sm');
  // 弹层外壳（全屏贴边 + 常驻关闭）只在窄屏/触屏上换掉窗口式卡片；宽屏桌面保持原样
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  el.dataset.shell = (effW <= 900 || coarse) ? 'full' : 'card';
  el.style.setProperty('--mt-left-inset', `${Math.round(insets.left)}px`);
  el.style.setProperty('--mt-right-inset', `${Math.round(insets.right)}px`);
  el.style.setProperty('--mt-top-inset', `${Math.round(insets.top)}px`);
  el.style.setProperty('--mt-bottom-inset', `${Math.round(insets.bottom)}px`);
  el.style.setProperty('--mt-width', `${Math.round(insets.winW)}px`);
  el.style.setProperty('--mt-height', `${Math.round(insets.winH)}px`);
  for (const fn of listeners) fn(insets);
  return insets;
}

async function refresh() {
  lastInfo = (await readInfo()) ?? lastInfo;
  return applyLayout(computeInsets(lastInfo));
}

/** 手动旋屏：只改页面绘制方向，不动系统方向。入口（⟳）只在容器里出现；
 *  旋屏的视觉规则也挂在 data-platform=minitool 上，浏览器里调用它只是空转。 */
export async function toggleRotate(force) {
  const el = root();
  const next = typeof force === 'boolean' ? force : el.dataset[ROTATE_ATTR] !== ROTATE_ON;
  el.dataset[ROTATE_ATTR] = next ? ROTATE_ON : '';
  const insets = await refresh();
  // 容器尺寸变了要重算 canvas 与相机
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  rotateListener?.(next);
  return {rotated: next, insets};
}

export function isRotated() {
  return root().dataset[ROTATE_ATTR] === ROTATE_ON;
}

export function onLayoutChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onRotateChange(fn) {
  rotateListener = fn;
}

export async function initPlatformChrome() {
  const el = root();
  // 设备适配层两个环境都跑；平台专属（容器胶囊、手动旋屏）只在 __MINITOOL__ 下开
  el.dataset.adapt = '';
  if (MINITOOL) {
    el.dataset.platform = 'minitool';
    if (!el.dataset[ROTATE_ATTR]) el.dataset[ROTATE_ATTR] = '';
  }
  const insets = await refresh();
  if (!listening) {
    listening = true;
    let timer = 0;
    const reflow = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void refresh(); }, 120);
    };
    window.addEventListener('resize', reflow);
    window.addEventListener('orientationchange', reflow);
  }
  return insets;
}
