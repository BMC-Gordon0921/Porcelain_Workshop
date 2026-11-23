// 小工具外壳适配：安全区让位、横屏（真机旋转 / 手动旋屏）、输入方式与版面档位。
// 只在 __MINITOOL__ 构建里被调用；桌面/原生构建不加载这段逻辑。
const ROTATE_ATTR = 'rotate';
const ROTATE_ON = 'on';

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

function num(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 把窗口信息折算成四条让位边：真机旋转与手动旋屏都走这里。 */
function computeInsets(info) {
  const winW = num(info?.windowWidth, window.innerWidth);
  const winH = num(info?.windowHeight, window.innerHeight);
  const area = info?.safeArea || {};
  const safeTop = num(area.top, 0);
  const safeBottomGap = Math.max(0, winH - num(area.bottom, winH));
  const safeLeft = num(area.left, 0);
  const safeRightGap = Math.max(0, winW - num(area.right, winW));
  // 状态栏 + 胶囊需要额外头部空间（实测 safeArea.top 44 → 需要 80px）
  const buttons = info?.menuButtons;
  const visibleButtons = [buttons?.capsule].some(button => button?.width > 0 && button?.height > 0)
    ? [buttons.capsule] : [buttons?.back, buttons?.me, buttons?.share];
  const buttonBottoms = visibleButtons.filter(button => button?.width > 0 && button?.height > 0)
    .map(button => num(button.bottom, safeTop));
  const headTop = buttonBottoms.length ? Math.max(safeTop, ...buttonBottoms) : safeTop + 36;

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

/** 手动旋屏：只改页面绘制方向，不动系统方向。 */
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
  if (typeof __MINITOOL__ === 'undefined' || !__MINITOOL__) return null;
  const el = root();
  el.dataset.platform = 'minitool';
  if (!el.dataset[ROTATE_ATTR]) el.dataset[ROTATE_ATTR] = '';
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
