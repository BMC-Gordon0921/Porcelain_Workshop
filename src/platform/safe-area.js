// 容器外壳整数（状态栏 / 胶囊 / home 指示条 / 横屏刘海）与平台标记。
//
// 小工具把网页放在小红书容器里：顶部有状态栏和右侧胶囊按钮，底部有 home 指示条，
// 横屏时左右还可能有安全区。这几个区域会直接盖住页面内容，所以把可用区算成 CSS 变量，
// 交给 minitool.css 使用；旋转屏幕或容器改尺寸时重算一次。
const MINITOOL = typeof __MINITOOL__ !== 'undefined' && __MINITOOL__;

let listening = false;

function readInfo() {
  const miniTool = typeof window !== 'undefined' && window.xhs && window.xhs.miniTool;
  if (!miniTool || typeof miniTool.getWindowInfo !== 'function') return Promise.resolve(null);
  try {
    return Promise.resolve(miniTool.getWindowInfo()).catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

function apply(info) {
  const root = document.documentElement;
  const viewport = typeof window !== 'undefined'
    ? {width: window.innerWidth, height: window.innerHeight}
    : {width: 0, height: 0};
  const statusBar = Math.max(0, Number(info && info.statusBarHeight) || 0);
  const safeArea = (info && info.safeArea) || {};
  const safeTop = Math.max(statusBar, Number(safeArea.top) || 0);
  const safeBottom = Number(safeArea.bottom) || 0;
  const safeLeft = Math.max(0, Number(safeArea.left) || 0);
  const safeRight = Number(safeArea.right) || 0;
  const windowHeight = Number(info && info.windowHeight) || viewport.height;
  const windowWidth = Number(info && info.windowWidth) || viewport.width;
  const landscape = windowWidth > windowHeight;

  // 胶囊按钮高度约 32px，跟状态栏同一行叠放，所以顶部让出「状态栏 + 胶囊」的高度
  const topInset = Math.round(safeTop + 36);
  const bottomInset = Math.round(Math.max(0, windowHeight - safeBottom));
  // 竖屏一般没有左右安全区；横屏才有（刘海 / 圆角屏），此时窗口宽度可能小于安全区右边界
  const leftInset = landscape ? Math.round(safeLeft) : 0;
  const rightInset = landscape ? Math.round(Math.max(0, windowWidth - safeRight)) : 0;

  root.style.setProperty('--mt-top-inset', `${topInset}px`);
  root.style.setProperty('--mt-bottom-inset', `${bottomInset}px`);
  root.style.setProperty('--mt-left-inset', `${leftInset}px`);
  root.style.setProperty('--mt-right-inset', `${rightInset}px`);
  root.dataset.orientation = landscape ? 'landscape' : 'portrait';

  return {topInset, bottomInset, leftInset, rightInset, landscape, info};
}

export async function initPlatformChrome() {
  if (!MINITOOL) return null;
  document.documentElement.dataset.platform = 'minitool';

  let state = apply(await readInfo());

  if (!listening && typeof window !== 'undefined') {
    listening = true;
    let timer = 0;
    const resync = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        state = apply(await readInfo());
      }, 120);
    };
    window.addEventListener('resize', resync, {passive: true});
    window.addEventListener('orientationchange', resync, {passive: true});
  }

  return state;
}
