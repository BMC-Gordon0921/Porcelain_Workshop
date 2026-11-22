// 小工具构建的 CSS 基线后处理：把小工具内核门槛（安卓 WebView 61 / Chrome 61）不认识的
// 声明补一份等价兜底，老内核拿到能用的值，新内核仍走原声明（写在后面，后者胜出）。
//
// 处理项：
//   1. `Xdvh` → 先补一条 `Xvh`（dvh 是 Chrome 108+，61 会整条丢弃，布局直接塌）
//   2. `inset: a b c d` → 先补 top/right/bottom/left 四条长属性（inset 是 Chrome 87+）
//
// 不处理（属可接受的优雅降级，已在 docs/minitool-port.md 记录）：
//   aspect-ratio、color-mix()、backdrop-filter、flex gap —— 老内核上只是缺效果/间距，
//   `color-mix()` 只用于 box-shadow，`backdrop-filter` 只用于毛玻璃。

const KEYWORDS = ['auto', 'initial', 'inherit', 'unset', 'revert', 'revert-layer'];

function expandInset(value) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || parts.length > 4) return null;
  if (parts.some((part) => KEYWORDS.includes(part.toLowerCase()))) return null;
  const [top, right = top, bottom = top, left = right] = parts;
  return {top, right, bottom, left};
}

function fixDeclaration(decl) {
  const colon = decl.indexOf(':');
  if (colon < 0) return decl;
  const prop = decl.slice(0, colon).trim().toLowerCase();
  const value = decl.slice(colon + 1).trim();
  if (!prop || !value) return decl;

  if (prop === 'inset') {
    const box = expandInset(value);
    if (!box) return decl;
    return `top:${box.top};right:${box.right};bottom:${box.bottom};left:${box.left};${decl}`;
  }

  if (/dvh(?![a-z])/.test(value)) {
    const fallback = `${prop}:${value.replace(/dvh(?![a-z])/g, 'vh')}`;
    return `${fallback};${decl}`;
  }

  return decl;
}

function fixBlock(body) {
  return body
    .split(';')
    .map((decl) => (decl.trim() ? fixDeclaration(decl.trim()) : decl))
    .join(';');
}

export function legacyCss(css) {
  // 逐条规则处理声明块；@media/@supports 的外层花括号也会被内层先行匹配到
  return css.replace(/\{([^{}]*)\}/g, (match, body) => `{${fixBlock(body)}}`);
}
