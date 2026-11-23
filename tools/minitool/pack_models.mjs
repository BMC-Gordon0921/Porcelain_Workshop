// 把 public/models/maps/*.glb 打成小工具可用的自带几何。
//
// 为什么不能直接带 .glb：
//   1. 小工具 zip 的扩展名白名单里没有 .glb；
//   2. 容器里不能 fetch/XHR 读包内二进制，GLTFLoader 的加载路径直接失效；
//   3. 9.8 MB GLB 会把 10 MiB 包体预算吃光。
//
// 成品格式（逐站点一个小端二进制流，再 base64 分块落到 .js 里由 <script> 加载）：
//   magic 'TRM1' | uint32 meshCount
//   每 mesh: float32 rgb(12) | float32 emissiveRGB(12) | float32 roughness | float32 metalness
//            uint32 vertexCount | uint32 indexCount | float32 minXYZ(12) | float32 scaleXYZ(12)
//            顶点 vertexCount * 9B  [uint16 x,y,z][int8 nx,ny,nz]
//            索引 indexCount * 2B   uint16
// 顶点量化：pos = min + q * scale / 65535；法线 int8 = round(n*127)。
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';

const SRC = 'public/models/maps';
const OUT = 'minitool/gen/models';
const CHUNK_CHARS = 700_000;
const SITES = ['guyao', 'museum', 'imperial', 'taoxichuan'];

const COMPONENT = {5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array};
const NUM_COMPONENTS = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16};

function parseGLB(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  let offset = 12, json = null, bin = null;
  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body));
    else if (type === 0x004e4942) bin = body;
    offset += 8 + length + ((4 - (length % 4)) % 4);
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return {json, bin};
}

function readAccessor(json, bin, index) {
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const accessor = json.accessors[index];
  const n = NUM_COMPONENTS[accessor.type];
  const Ctor = COMPONENT[accessor.componentType];
  if (!Ctor) throw new Error(`unsupported componentType ${accessor.componentType}`);
  const view = accessor.bufferView == null ? null : json.bufferViews[accessor.bufferView];
  const stride = view?.byteStride ?? 0;
  const elementBytes = n * Ctor.BYTES_PER_ELEMENT;
  const base = (view?.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const out = new Ctor(accessor.count * n);
  if (!view) return out; // 全零 accessor
  for (let i = 0; i < accessor.count; i++) {
    const start = base + i * (stride || elementBytes);
    for (let c = 0; c < n; c++) {
      const at = start + c * Ctor.BYTES_PER_ELEMENT;
      switch (accessor.componentType) {
        case 5126: out[i * n + c] = dv.getFloat32(at, true); break;
        case 5125: out[i * n + c] = dv.getUint32(at, true); break;
        case 5123: out[i * n + c] = dv.getUint16(at, true); break;
        case 5122: out[i * n + c] = dv.getInt16(at, true); break;
        case 5120: out[i * n + c] = dv.getInt8(at); break;
        default: out[i * n + c] = dv.getUint8(at);
      }
    }
  }
  return out;
}

function mat4FromNode(node) {
  if (node.matrix) return Float64Array.from(node.matrix);
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return Float64Array.from([
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ]);
}

function multiply(a, b) { // column-major, a*b
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

function normalMatrix(m) { // upper-left 3x3 inverse transpose
  const a = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  const det = a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]);
  if (!det) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const inv = 1 / det;
  return [
    (a[4] * a[8] - a[5] * a[7]) * inv, (a[2] * a[7] - a[1] * a[8]) * inv, (a[1] * a[5] - a[2] * a[4]) * inv,
    (a[5] * a[6] - a[3] * a[8]) * inv, (a[0] * a[8] - a[2] * a[6]) * inv, (a[2] * a[3] - a[0] * a[5]) * inv,
    (a[3] * a[7] - a[4] * a[6]) * inv, (a[1] * a[6] - a[0] * a[7]) * inv, (a[0] * a[4] - a[1] * a[3]) * inv
  ];
}

function materialFactors(material) {
  const pbr = material?.pbrMetallicRoughness ?? {};
  const f = pbr.baseColorFactor ?? [0.8, 0.8, 0.8, 1];
  const e = material?.emissiveFactor ?? [0, 0, 0];
  return {
    color: [f[0], f[1], f[2]],
    emissive: [e[0], e[1], e[2]],
    roughness: pbr.roughnessFactor ?? 1,
    metalness: pbr.metallicFactor ?? 1
  };
}

function collectMeshes(json, bin) {
  const nodes = json.nodes ?? [];
  const meshes = [];
  const visit = (index, parent) => {
    const node = nodes[index];
    const world = multiply(parent, mat4FromNode(node));
    if (node.mesh != null) meshes.push({mesh: json.meshes[node.mesh], world});
    for (const child of node.children ?? []) visit(child, world);
  };
  const identity = Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  for (const root of json.scenes?.[json.scene ?? 0]?.nodes ?? []) visit(root, identity);
  return meshes;
}

function buildSite(json, bin) {
  const meshes = collectMeshes(json, bin);
  const parts = [];
  for (const {mesh, world} of meshes) {
    const nmat = normalMatrix(world);
    for (const primitive of mesh.primitives) {
      if ((primitive.mode ?? 4) !== 4) continue; // 只要三角形
      const position = readAccessor(json, bin, primitive.attributes.POSITION);
      const count = position.length / 3;
      if (count > 65535) throw new Error(`mesh has ${count} vertices, uint16 index too small`);
      const normalAttr = primitive.attributes.NORMAL != null ? readAccessor(json, bin, primitive.attributes.NORMAL) : null;
      const indexAttr = primitive.indices != null ? readAccessor(json, bin, primitive.indices) : null;
      const positions = new Float32Array(count * 3);
      const normals = new Float32Array(count * 3);
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < count; i++) {
        const x = position[i * 3], y = position[i * 3 + 1], z = position[i * 3 + 2];
        const wx = world[0] * x + world[4] * y + world[8] * z + world[12];
        const wy = world[1] * x + world[5] * y + world[9] * z + world[13];
        const wz = world[2] * x + world[6] * y + world[10] * z + world[14];
        positions[i * 3] = wx; positions[i * 3 + 1] = wy; positions[i * 3 + 2] = wz;
        for (let c = 0; c < 3; c++) {
          min[c] = Math.min(min[c], c === 0 ? wx : c === 1 ? wy : wz);
          max[c] = Math.max(max[c], c === 0 ? wx : c === 1 ? wy : wz);
        }
        let nx, ny, nz;
        if (normalAttr) { nx = normalAttr[i * 3]; ny = normalAttr[i * 3 + 1]; nz = normalAttr[i * 3 + 2]; }
        else { nx = 0; ny = 1; nz = 0; }
        let tx = nmat[0] * nx + nmat[3] * ny + nmat[6] * nz;
        let ty = nmat[1] * nx + nmat[4] * ny + nmat[7] * nz;
        let tz = nmat[2] * nx + nmat[5] * ny + nmat[8] * nz;
        const len = Math.hypot(tx, ty, tz) || 1;
        normals[i * 3] = tx / len; normals[i * 3 + 1] = ty / len; normals[i * 3 + 2] = tz / len;
      }
      const indices = indexAttr ? Uint16Array.from(indexAttr) : Uint16Array.from({length: count}, (_, i) => i);
      parts.push({
        ...materialFactors(json.materials?.[primitive.material]),
        positions, normals, indices, min, max, count
      });
    }
  }
  return parts;
}

function packSite(parts) {
  let size = 8;
  for (const p of parts) size += 64 + p.count * 9 + p.indices.length * 2;
  const buffer = new Uint8Array(size);
  const view = new DataView(buffer.buffer);
  let at = 0;
  const tag = 'TRM1';
  for (let i = 0; i < 4; i++) buffer[at++] = tag.charCodeAt(i);
  view.setUint32(at, parts.length, true); at += 4;
  for (const p of parts) {
    view.setFloat32(at, p.color[0], true); at += 4;
    view.setFloat32(at, p.color[1], true); at += 4;
    view.setFloat32(at, p.color[2], true); at += 4;
    view.setFloat32(at, p.emissive[0], true); at += 4;
    view.setFloat32(at, p.emissive[1], true); at += 4;
    view.setFloat32(at, p.emissive[2], true); at += 4;
    view.setFloat32(at, p.roughness, true); at += 4;
    view.setFloat32(at, p.metalness, true); at += 4;
    view.setUint32(at, p.count, true); at += 4;
    view.setUint32(at, p.indices.length, true); at += 4;
    const scale = [0, 1, 2].map(c => Math.max(p.max[c] - p.min[c], 1e-5));
    for (let c = 0; c < 3; c++) { view.setFloat32(at, p.min[c], true); at += 4; }
    for (let c = 0; c < 3; c++) { view.setFloat32(at, scale[c], true); at += 4; }
    for (let i = 0; i < p.count; i++) {
      for (let c = 0; c < 3; c++) {
        const q = Math.round((p.positions[i * 3 + c] - p.min[c]) / scale[c] * 65535);
        view.setUint16(at, Math.min(65535, Math.max(0, q)), true); at += 2;
      }
      for (let c = 0; c < 3; c++) {
        const v = Math.max(-127, Math.min(127, Math.round(p.normals[i * 3 + c] * 127)));
        view.setInt8(at, v); at += 1;
      }
    }
    for (let i = 0; i < p.indices.length; i++) { view.setUint16(at, p.indices[i], true); at += 2; }
  }
  return buffer;
}

function quantizeFeasible(parts) {
  return parts.every(p => p.indices.length % 3 === 0 && p.count <= 65535);
}

async function main() {
  await mkdir(OUT, {recursive: true});
  const manifestPath = join(SRC, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const summary = {sites: {}, chunks: {}};
  const manifestOut = {};
  for (const id of SITES) {
    const glb = new Uint8Array(await readFile(join(SRC, `${id}.glb`)));
    const {json, bin} = parseGLB(glb);
    const parts = buildSite(json, bin);
    if (!quantizeFeasible(parts)) throw new Error(`${id}: quantization infeasible`);
    const packed = packSite(parts);
    const b64 = Buffer.from(packed).toString('base64');
    const chunks = [];
    for (let i = 0; i < b64.length; i += CHUNK_CHARS) chunks.push(b64.slice(i, i + CHUNK_CHARS));
    for (let i = 0; i < chunks.length; i++) {
      const file = `${id}.p${i}.js`;
      const code = `(window.__TERRA_MODEL=window.__TERRA_MODEL||{})["${id}"]=(window.__TERRA_MODEL["${id}"]||[]);window.__TERRA_MODEL["${id}"][${i}]=${JSON.stringify(chunks[i])};\n`;
      await writeFile(join(OUT, file), code);
    }
    const triangles = parts.reduce((sum, p) => sum + p.indices.length / 3, 0);
    const vertices = parts.reduce((sum, p) => sum + p.count, 0);
    summary.sites[id] = {
      glbBytes: glb.byteLength, packedBytes: packed.byteLength, base64Chars: b64.length,
      meshes: parts.length, triangles, vertices, chunks: chunks.length
    };
    manifestOut[id] = {...manifest[id], chunks: chunks.length};
    console.log(`${id}: glb ${(glb.byteLength / 1024).toFixed(0)}K -> packed ${(packed.byteLength / 1024).toFixed(0)}K -> b64 ${(b64.length / 1024).toFixed(0)}K in ${chunks.length} chunks; ${parts.length} meshes / ${triangles} tris / ${vertices} verts`);
  }
  await writeFile(join(OUT, 'manifest.js'), `window.__TERRA_MANIFEST=${JSON.stringify(manifestOut)};\n`);
  await writeFile(join(OUT, 'pack-summary.json'), JSON.stringify(summary, null, 2));
  console.log('chunk total chars', Object.values(summary.sites).reduce((a, s) => a + s.base64Chars, 0));
}

await main();
