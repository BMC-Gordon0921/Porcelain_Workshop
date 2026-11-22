// 画布尺寸与指针坐标的「旋转安全」换算。
//
// 手动横版渲染（小工具里的 ⟳ 按钮）会给 #app 加 rotate(90deg)，于是画布的所有祖先都带了一个
// 90° 变换：
//   · getBoundingClientRect() 返回的是旋转后的**轴对齐包围盒**，宽高互换 → 用它 setSize 会让
//     绘制缓冲与布局尺寸不一致（3D 被拉伸、缩略图空白）；
//   · 用 rect.left/width 换算指针坐标会让点击落在错误的位置（画歪、点不中）。
// clientWidth/clientHeight 不受 transform 影响，是布局尺寸的可靠来源；指针坐标在旋屏下做一次
// 逆变换（屏幕 X → 布局 V，屏幕 Y → 布局 U）即可回到画布本地坐标。
//
// 这里直接读 html[data-rotate]，不 import safe-area：模块保持无副作用，方便在 node 里单测。
export function isDisplayRotated() {
  return typeof document !== 'undefined' && document.documentElement?.dataset?.rotate === 'on';
}

export function canvasSize(canvas) {
  return {
    w: Math.max(1, canvas.clientWidth || 0),
    h: Math.max(1, canvas.clientHeight || 0),
  };
}

// 把 clientX/clientY 换成画布本地像素坐标，同时给出布局尺寸。
export function canvasPoint(canvas, clientX, clientY) {
  const {w, h} = canvasSize(canvas);
  const r = canvas.getBoundingClientRect();
  if (!isDisplayRotated()) return {x: clientX - r.left, y: clientY - r.top, w, h};
  // 绕中心顺时针 90°：(u,v) → (-(v - h/2), u - w/2)，其中 u,v 是画布本地坐标，w,h 是布局尺寸。
  // 反解：u = w/2 + (sy - cy)，v = h/2 - (sx - cx)。
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return {x: w / 2 + (clientY - cy), y: h / 2 - (clientX - cx), w, h};
}
