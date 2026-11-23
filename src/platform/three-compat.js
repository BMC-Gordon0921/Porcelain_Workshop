// three 版本兼容层：让小工具构建（three r150，保留 WebGL1 运行时）与
// 桌面/原生构建（three r186，仅 WebGL2）共用同一份源码。
//
// r150 与 r186 的实际差异（已核实 r150 的 build/three.module.js）：
//   - 常量 SRGBColorSpace('srgb') / LinearSRGBColorSpace('srgb-linear') 两者都有；
//   - r150 的贴图色彩空间写在 texture.encoding（3001=sRGB / 3000=linear），
//     r186 起改用 texture.colorSpace；
//   - r150 的渲染器写在 renderer.outputEncoding，r186 起改用 outputColorSpace；
//   - r150 默认 renderer.useLegacyLights = true，r186 已删除该开关、恒为物理光照；
//   - r150 默认 ColorManagement.enabled = false，r186 默认开启。
// 因此本模块只在 r150 下打三个补丁，r186 下完全不做事。
import * as THREE from 'three';

const REVISION = Number.parseInt(THREE.REVISION, 10);
export const LEGACY_THREE = Number.isFinite(REVISION) && REVISION < 152;

// 3001 / 3000 是 three 冻结的 encoding 常量（THREE.sRGBEncoding / THREE.LinearEncoding）；
// 直接写字面量，避免 r186 构建里引用已被删除的导出。
const SRGB = 3001;
const LINEAR = 3000;

function encodingFor(space) {
  if (space === 'srgb' || space === THREE.SRGBColorSpace) return SRGB;
  return LINEAR;
}

function spaceFor(encoding) {
  return encoding === SRGB ? 'srgb' : 'srgb-linear';
}

function defineAccessor(target, name, get, set) {
  if (!target || Object.prototype.hasOwnProperty.call(target, name)) return false;
  Object.defineProperty(target, name, {configurable: true, enumerable: false, get, set});
  return true;
}

if (LEGACY_THREE) {
  // texture.colorSpace -> texture.encoding
  defineAccessor(
    THREE.Texture.prototype,
    'colorSpace',
    function colorSpace() { return spaceFor(this.encoding); },
    function colorSpace(value) { this.encoding = encodingFor(value); }
  );
  // renderer.outputColorSpace -> renderer.outputEncoding
  defineAccessor(
    THREE.WebGLRenderer.prototype,
    'outputColorSpace',
    function outputColorSpace() { return spaceFor(this.outputEncoding); },
    function outputColorSpace(value) { this.outputEncoding = encodingFor(value); }
  );
  // r186 恒为物理光照；r150 需要显式关掉 legacy 光照才能对齐画面。
  if (THREE.ColorManagement) THREE.ColorManagement.enabled = true;
}

/**
 * 对齐 r186 的渲染器光照行为。r186 无此开关，调用是空操作。
 */
export function alignLights(renderer) {
  if (renderer && 'useLegacyLights' in renderer) renderer.useLegacyLights = false;
  return renderer;
}
