// 小工具模式下的场景几何来源。
//
// 容器里不能 fetch/XHR 包内二进制，`.glb` 也不在 zip 扩展名白名单里，
// 所以几何由 tools/minitool/pack_models.mjs 预压成 base64 分块的 .js，
// 这里用 <script> 逐块加载（探针已实测运行期注入 script 可用），再解成 BufferGeometry。
// 桌面/原生构建不走这里（window.__TERRA_MANIFEST 不存在）。
import * as THREE from 'three';

function modelStore() {
  return (typeof window !== 'undefined' && window.__TERRA_MODEL) || {};
}

function manifestGlobal() {
  return typeof window !== 'undefined' ? window.__TERRA_MANIFEST : null;
}

/** 是否用小工具自带几何（由 models/manifest.js 在页面里先置位）。 */
export function isPackedSceneMode() {
  return Boolean(manifestGlobal());
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`几何分块加载失败: ${src}`));
    document.head.appendChild(el);
  });
}

function decodeBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function buildGroup(bytes, id) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag !== 'TRM1') throw new Error(`几何格式不匹配: ${tag}`);
  const meshCount = view.getUint32(4, true);
  const group = new THREE.Group();
  group.name = `environment-${id}`;
  let at = 8;
  for (let m = 0; m < meshCount; m++) {
    const color = new THREE.Color().setRGB(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
    at += 12;
    const emissive = new THREE.Color().setRGB(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
    at += 12;
    const roughness = view.getFloat32(at, true); at += 4;
    const metalness = view.getFloat32(at, true); at += 4;
    const vertexCount = view.getUint32(at, true); at += 4;
    const indexCount = view.getUint32(at, true); at += 4;
    const min = [view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true)];
    at += 12;
    const scale = [view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true)];
    at += 12;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      for (let c = 0; c < 3; c++) {
        positions[i * 3 + c] = min[c] + (view.getUint16(at, true) / 65535) * scale[c];
        at += 2;
      }
      for (let c = 0; c < 3; c++) {
        normals[i * 3 + c] = view.getInt8(at) / 127;
        at += 1;
      }
    }
    const indices = new Uint16Array(indexCount);
    for (let i = 0; i < indexCount; i++) { indices[i] = view.getUint16(at, true); at += 2; }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({color, emissive, roughness, metalness});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

// 同块脚本只注入一次：开屏轮播与主世界会同时请求同一站点，
// 没有 single-flight 时 guyao 的三块各被注入两次（一次 7 个 <script>，每块约 700 KB）。
const chunkInflight = new Map();
// 解码结果只缓存最近一站，避免四站 BufferGeometry 同时驻留。
const decodeCache = new Map();

function chunkReady(id, index) {
  const store = modelStore()[id];
  return Boolean(store && typeof store[index] === 'string');
}

function loadChunk(id, index, total) {
  const key = `${id}#${index}`;
  const inflight = chunkInflight.get(key);
  if (inflight) return inflight;
  if (chunkReady(id, index)) return Promise.resolve();
  const task = loadScript(`./models/${id}.p${index}.js`).then(
    () => undefined,
    (error) => {
      chunkInflight.delete(key);
      throw new Error(`${id} · 第 ${index + 1}/${total} 块加载失败（${error.message}）`);
    }
  );
  chunkInflight.set(key, task);
  return task;
}

/**
 * 取站点配置 + 几何。分块 <script> 按需注入，注入过的站点再次进入不会重复下载。
 * 返回 {config, group}，与 scene-environment.js 的 fetch 版本对齐。
 */
export async function loadPackedEnvironment(id) {
  const manifest = manifestGlobal();
  const config = manifest && manifest[id];
  if (!config) throw new Error(`未知场景: ${id}`);
  const total = config.chunks || 0;
  for (let i = 0; i < total; i++) await loadChunk(id, i, total);
  const chunks = modelStore()[id] || [];
  if (chunks.length < total) throw new Error(`${id} · 几何分块不完整（${chunks.length}/${total}）`);
  const cached = decodeCache.get(id);
  let bytes = cached && cached.bytes;
  if (!bytes) {
    bytes = decodeBase64(chunks.slice(0, total).join(''));
    decodeCache.clear();
    decodeCache.set(id, {bytes});
  }
  return {config, group: buildGroup(bytes, id)};
}

/**
 * 后台串行预载站点几何（只注入脚本，不建几何），用于首站进入后补齐其余三站。
 * 单站失败只告警不抛出，避免影响当前操作。
 */
export async function preloadSites(ids, {onProgress} = {}) {
  const manifest = manifestGlobal() || {};
  const failed = [];
  let done = 0;
  for (const id of ids) {
    const config = manifest[id];
    if (!config) {
      failed.push(id);
      continue;
    }
    const total = config.chunks || 0;
    for (let i = 0; i < total; i++) {
      if (!chunkReady(id, i)) {
        try {
          await loadChunk(id, i, total);
        } catch (error) {
          console.warn('[模型]', id, error);
          failed.push(id);
          break;
        }
        // 让出主线程，避免预载把逐帧渲染拖慢。
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      done += 1;
      if (onProgress) onProgress({id, index: i, total, done});
    }
  }
  return {failed};
}
