import * as THREE from 'three';
import {alignLights} from './three-compat.js';

/**
 * 统一的渲染器工厂。
 *
 * 为什么要包一层：
 *   1. three r150（小工具构建）的 WebGLRenderer 自身按 webgl2 -> webgl -> experimental-webgl
 *      依次尝试，拿不到 WebGL2 时自动降到 WebGL1；r186 只有 WebGL2。这里统一兜住创建失败的情况，
 *      必要时显式退回 WebGL1Renderer（仅 r150 存在），而不是让整页白屏。
 *   2. 对齐两个版本的光照模型（r150 默认 legacy 光照，r186 恒为物理光照）。
 *   3. 把实际拿到的上下文类型记在 renderer.__webglFlavor 上，方便运行时降档与诊断。
 */
export function createRenderer(options = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer(options);
  } catch (error) {
    // r186 已经删掉 WebGL1Renderer，所以用计算属性访问，桌面构建里就是 undefined
    const LegacyRenderer = THREE['WebGL1Renderer'];
    if (typeof LegacyRenderer !== 'function') throw error;
    renderer = new LegacyRenderer(options);
  }
  alignLights(renderer);
  const isWebGL2 = Boolean(renderer.capabilities && renderer.capabilities.isWebGL2);
  renderer.__webglFlavor = isWebGL2 ? 'webgl2' : 'webgl1';
  return renderer;
}
