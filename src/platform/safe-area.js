// 容器外壳整数（状态栏 / 胶囊 / home 指示条）与平台标记。
//
// 小工具把网页放在小红书容器里：顶部有状态栏和右侧胶囊按钮，底部有 home 指示条。
// 这几个区域会直接盖住页面内容，所以把可用区算成 CSS 变量，交给 minitool.css 使用。
const MINITOOL = typeof __MINITOOL__ !== 'undefined' && __MINITOOL__;

export async function initPlatformChrome() {
  if (!MINITOOL) return null;
  const root = document.documentElement;
  root.dataset.platform = 'minitool';

  const miniTool = typeof window !== 'undefined' && window.xhs && window.xhs.miniTool;
  let info = null;
  if (miniTool && typeof miniTool.getWindowInfo === 'function') {
    try {
      info = await miniTool.getWindowInfo();
    } catch {}
  }

  const statusBar = Math.max(0, Number(info && info.statusBarHeight) || 0);
  const safeArea = (info && info.safeArea) || {};
  const safeTop = Math.max(statusBar, Number(safeArea.top) || 0);
  const safeBottom = Number(safeArea.bottom) || 0;
  const windowHeight = Number(info && info.windowHeight) || (typeof window !== 'undefined' ? window.innerHeight : 0);

  // 胶囊按钮高度约 32px，跟状态栏同一行叠放，所以顶部让出「状态栏 + 胶囊」的高度
  const topInset = Math.round(safeTop + 36);
  const bottomInset = Math.round(Math.max(0, windowHeight - safeBottom));
  root.style.setProperty('--mt-top-inset', `${topInset}px`);
  root.style.setProperty('--mt-bottom-inset', `${bottomInset}px`);
  return {topInset, bottomInset, info};
}
