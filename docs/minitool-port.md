# 小红书小工具移植记录（`Redbook_transplant`）

本文件记录把本仓库（Terra · 景德镇瓷器之旅，JS 原版）移植为小红书小工具离线包的过程、依据与实测数据。
目标产物：`dist-minitool.zip`（`index.html` 在 zip 根、相对路径、无联网）。

## 0. 规范来源

| 来源 | 说明 |
| --- | --- |
| `.skill/minitool-zip-builder/` | 来自 `https://fe-static.xhscdn.com/minitool/20261117152455/minitool-zip-builder-1.11.1.skill`，`metadata.version: 1.11.1`，22 个文件 / 134,808 B；ZIP 路径安全审计通过（无绝对路径、`..`、软链、元数据文件）。**不入库**（`.gitignore`），仅本地开发参考。 |
| 线上契约 | `https://miniapp-sandbox.xiaohongshu.com/minitool/doc`（2026-11-19 版，179,981 B HTML）。SKILL 要求：以线上文档为唯一实现依据。 |
| 冻结基线 | `.skill/minitool-zip-builder/references/js-api.md`（随包基线，用于比对增量） |

### 能力增量（相对 1.11.1 随包基线，已按 SKILL 要求逐项播报）

- 新增 `window.xhs.AI`（`createModel("deepseek-v4-flash")` / `generateText`，白名单 + 每天 100 次，**内测期间第三方 Agent 不能上传使用该能力的小工具**）
- 新增 `getWindowInfo`（9.49+，胶囊 9.55+）、`getLocation`（9.49+）、`vibrateShort` / `vibrateLong`（9.50+）、陀螺仪 4 个方法（9.50+）、`followAuthor` / `getFollowStatus`（9.51+）、`share`（9.53+）
- Worker 由「不可用」改为「9.53+ 可用，仅 classic，每页 1 个」
- 新增 §2.7：包根 `assets/` 可享平台分发优化主包体积（9.53.3+），页面仍不可直连 CDN
- 存储规则措辞收紧：版本未知 / SDK 缺失 / 调用失败**一律不得**回退 `localStorage` / `sessionStorage` / `IndexedDB` / Cookie / Cache API

## 1. 运行环境结论（S2 探针实测）

探针包 `tools/minitool/probe/`，通过 `redapp dev`（工作台 `@skillbuilder/miniapp-simulator@0.2.0`）在
`https://miniapp-sandbox.xiaohongshu.com/simulator/releases/<ver>/app/<uuid>/index.html` 中执行，
原始结果：`qa/minitool/probe-result.json`。

> 注意：模拟器页面运行在本机 Edge 157 HeadlessChromium 上，**不是真机 WebView**。
> 下面的「内核版本、性能、DPR」类结论不能替代真机验证；能验证的是容器 SDK 行为与资源通路。

| 探针项 | 结果 | 对移植的影响 |
| --- | --- | --- |
| 静态 `<script src="./probe.js">` | ✅ 执行 | 必须外置脚本，OK |
| 运行时 `document.createElement('script')` 经典脚本注入 | ✅ `window.__DYN_OK` 生效 | 几何数据可按站点懒加载 |
| `fetch('./assets/tone.mp3')` | ✅ 200 / 32,600 B | 但规范禁止 `fetch`，**不采用** |
| `<audio src="./assets/tone.mp3">` | ✅ `loadedmetadata`，duration 2.0375 | 包内 mp3 可播 |
| `<audio src="./assets/tone.wav">` | ✅ duration 2 | 包内 wav 也可播 |
| `new AudioContext()` | ✅ `state: running`，48 kHz | `sfx.js` 程序化音效可保留 |
| `canvas.getContext('webgl2')` | ✅ ANGLE/D3D11；`MAX_TEXTURE_SIZE` 16384 | 小工具里优先走 WebGL2 |
| `canvas.getContext('webgl')` | ✅ 含 `WEBGL_lose_context`、`OES_element_index_uint`、`WEBGL_depth_texture` 等 35 个扩展 | WebGL1 兜底可用（见 D5） |
| 6 个并发 WebGL 上下文 | ✅ 全部成功（桌面） | 现有 5 个 context 保留，未做收敛 |
| `miniTool.setStorage` / `getStorage` | ✅ 往返一致 | 存档改造目标 |
| `miniTool.getStorageInfo` | ✅ `limitBytes: 10485760` | 单 key ≤1 MB、总 10 MB |
| `miniTool.getWindowInfo` | ✅ 393×852，胶囊 `292..381`，`safeArea.top 44 / bottom 831` | HUD 需避让胶囊区（见 D8） |
| `miniTool.version` | `"0.7.1"` | 这是 SDK 版本号，**不能**当客户端版本做能力判断 |
| `miniTool.launchOptions` | `null`（模拟器未注入） | 一切取用点必须判空 |
| `localStorage` / `sessionStorage` / `indexedDB` | 模拟器里**都可用** | 规范禁止使用：合规不能靠「跑不起来」，必须改代码 |

`window.xhs.miniTool` 实测暴露 46 个方法，其中 `request`、`navigateToMiniTool`、`openRedPage`、`xhsOpenSiteLocation` 未出现在 1.11.1 文档表中；本期一律不依赖。

## 2. 只有真机/上传才能验证的项

1. **zip 内 `.mp3` 是否被上传侧扩展名白名单接受**：线上文档 §2.6 / `device-capabilities.md` 明确「`<video>`/`<audio>` 媒体文件须打包在内」，但 `references/zip-artifact-spec.md` 的允许扩展名列表里没有音频扩展名——文档自身不一致。模拟器已证明能播（`duration 120.02`，`error: null`）；上传侧是否放行未知。
2. 真机 WebView 61 的 ES2017 与 CSS 基线表现、帧率、内存。
3. 真机是否存在 WebGL2 / WebGL1（桌面模拟器不能代表）。
4. 真机容器对运行时 `<script>` 注入的额外限制（模拟器已通过）。

## 3. 技术决定

- **D1 资源加载不使用 `fetch`/XHR**：几何等大数据以经典脚本（`<script>` 注入）注册到 `window` 上的命名空间；媒体用包内相对路径 `<audio>`。
- **D2 BGM 转 MP3**：23.0 MB WAV → MP3（`tools/minitool/encode_audio.mjs`，lamejs 纯 JS 编码，本机无 ffmpeg）。
- **D3 弃用 GLB/GLTFLoader**：`.glb` 不在允许扩展名内，且加载只能靠 `fetch`。构建期把 GLB 量化重打包为二进制（位置 int16 + 法线 int8 + 索引 uint16），base64 分块写入 `.js`；运行时直接构 `THREE.BufferGeometry`。
- **D4 存储统一走容器 API**：`src/platform/storage.js` 封装 `window.xhs.miniTool` storage，失败即报错，**不设任何本地回退**。
- **D5 three 降到 r150 + WebGL1 兜底**：three r186 只支持 WebGL2（文档 §7.4），而安卓 WebView 61 不保证 WebGL2。用 npm 别名 `three-legacy`（`npm:three@0.150.1`）只给小工具构建用，桌面/原生构建继续 r186，两边共用同一份源码；`src/platform/three-compat.js` 把 `texture.colorSpace` / `renderer.outputColorSpace` / legacy 光照对齐到 r150 的 `encoding` 语义，`src/platform/renderer.js` 的 `createRenderer()` 在 WebGLRenderer 构造失败时显式退回 `WebGL1Renderer`。
- **D6 渲染预算**：`min(devicePixelRatio, 1.5)`、单帧三角 ≤100k、draw call ≤100、`webglcontextlost` 处理、页面隐藏停 `rAF`。
- **D7 输入**：WASD/滚轮等桌面输入保留；触屏方向键 `.touch-controls` 本来就在 `@media(pointer:coarse)` 下显示，小工具里自动生效。
- **D8 容器外壳让位**：`src/platform/safe-area.js` 读 `getWindowInfo()` 写 `--mt-top-inset`（状态栏 + 胶囊 ≈80px）与 `--mt-bottom-inset`（home 条 ≈21px），`src/platform/minitool.css` 只在 `html[data-platform=minitool]` 下把开屏页、顶栏、工坊视口、底栏、弹层让开外壳。

## 4. 体积预算（实测值）

| 项 | 原始 | 最终入包 | 说明 |
| --- | --- | --- | --- |
| JS | r186 `vite build` 857.62 kB | `assets/app.js` 681.18 kB（gzip 201.89 kB） | r150 IIFE，含 three + 全部业务逻辑 |
| 几何 | 4 个 GLB 合计 9.8 MB | 11 个分块 `.js` 共 6,914 KiB | 量化二进制 + base64（`tools/minitool/pack_models.mjs`） |
| 图片 | 13 张位图 8.42 MiB | 11 张 WebP 共 888 KiB | WebP q88 + 最长边 1536（`tools/minitool/prepare_assets.py`） |
| 音频 | WAV 23.0 MiB | `assets/bgm.mp3` 1,875 KiB | 120 s / 48 kHz / 立体声 / 128 kbps |
| CSS | 98.39 kB | `assets/style.css` 97 KiB | 含 Chrome 61 基线兜底 |
| 字体/HTML | — | 1 KiB + 7 KiB | `zcool-kuaile-title.woff2`、`index.html` |
| **解压合计** | — | **9.55 MiB / 28 文件** | 硬限 10 MiB |
| **zip** | — | **5.39 MiB（5,649,040 B）** | deflate-9 |

## 5. 已知风险

| 编号 | 风险 | 处置 |
| --- | --- | --- |
| R1 | 文本合计 6.85 MiB（几何 base64）触发官方审计 WARN | 已按块拆分（单块 ≈683 KB 字符、单条 base64 解码 ≈512 KiB）；这是 3D 资源本体，不是塞进代码的数据集，交付摘要中显式说明 |
| R2 | 单文件最大 `taoxichuan.p0.js` ≈2.2 MiB > 2 MiB 提示线 | 该站是最大场景（93,130 三角）；如需压到提示线以内，可把分块上限调到 350 KB 字符，代价是请求数从 11 增到 ~20 |
| R3 | mp3 扩展名白名单文档不一致 | 先按 mp3 交付；若上传被拒，改用「音效程序化合成 + 无 BGM」或与平台确认扩展名 |
| R4 | 真机无 WebGL2 | `createRenderer()` 退回 `WebGL1Renderer`；**完全无 WebGL 的设备没有 2D 兜底**，会停在「工坊加载失败 / 重新加载」错误态 |
| R5 | 模拟器内核比真机新 | 构建期 `chrome61` 目标 + 语法探针 + CSS 基线后处理；真机仍需验收 |
| R6 | `aspect-ratio` / `color-mix()` / `backdrop-filter` / flex `gap` 在 WebView 61 上缺效果 | 属优雅降级（`color-mix` 只用于 box-shadow、`backdrop-filter` 只用于毛玻璃）；`dvh`、`inset` 已由 `tools/minitool/css_legacy.mjs` 补兜底 |

## 6. 实施结果（S3–S7）

### 新增文件

| 路径 | 作用 |
| --- | --- |
| `vite.minitool.config.js` | 小工具构建配置：`target: chrome61`、IIFE、`publicDir:false`、three 别名、`__MINITOOL__` 宏 |
| `src/platform/three-r150.js` | 小工具构建的 `three` 入口（`export * from 'three-legacy'`） |
| `src/platform/three-compat.js` | r150/r186 色彩空间与光照兼容层 |
| `src/platform/renderer.js` | `createRenderer()`：WebGL2 优先、WebGL1 兜底、记 `__webglFlavor` |
| `src/platform/storage.js` | 容器 Storage 适配（异步预热 + 同步读 + 去抖写 + `flushStorage()`） |
| `src/platform/safe-area.js` | 读 `getWindowInfo()` 算外壳让位，写 CSS 变量 |
| `src/platform/minitool.css` | 只在 `html[data-platform=minitool]` 生效的版式修正 |
| `src/platform/model-source.js` | 自带几何：分块 `<script>` 注入 + TRM1 解码 + 构 `BufferGeometry` |
| `tools/minitool/pack_models.mjs` | GLB → 量化二进制 → base64 分块 `.js` + `manifest.js` |
| `tools/minitool/prepare_assets.py` | 位图 → WebP（Pillow） |
| `tools/minitool/encode_audio.mjs` | WAV → MP3（lamejs） |
| `tools/minitool/minitool-plugins.mjs` | vite 插件：WAV/PNG 请求改写到合规产物 |
| `tools/minitool/css_legacy.mjs` | CSS 基线后处理（`dvh`→`vh`、`inset`→四条长属性） |
| `tools/minitool/build_minitool.mjs` | 6 步构建管线（资源 → vite → 灌产物 → HTML/CSS 后处理 → 自检 → 审计 + 打 zip） |
| `tools/minitool/make_zip.py` | deflate-9 打 zip，校验 `index.html` 在根 |
| `tools/minitool/verify_minitool.mjs` | 容器内验证（Playwright + Edge headless） |
| `tools/minitool/probe/` | S2 探针包（音频/OGL/Storage/窗口信息） |
| `tools/minitool/debug_*.mjs` | 排查脚本（点击命中、布局尺寸、进场景流程） |

### 改动文件

`vite.config.js`（加 `__MINITOOL__: 'false'`）、`src/main.js`（`boot()` 异步化 + 平台初始化 + Storage 化读写 + `pagehide`/`visibilitychange` 落盘）、`src/world.js` / `src/decals.js` / `src/kiln-view.js` / `src/hero-carousel.js` / `src/workbench-model.js`（`createRenderer`）、`src/scene-environment.js`（自带几何 / GLTF 双路径）、`src/public-assets.js`（小工具下 png/jpeg → webp）、`src/i18n.js`（语言偏好走 Storage）。

### 命令

```bash
node tools/minitool/build_minitool.mjs        # 构建 + 自检 + 官方审计 + 打 zip
redapp dev --dir dist-minitool --no-open --env prod --agent   # 起容器模拟器工作台
node tools/minitool/verify_minitool.mjs http://127.0.0.1:3214/ qa/minitool
npm test                                       # 60 项单测
node node_modules/vite/bin/vite.js build       # 桌面/原生构建（不受影响）
```

### 验证结果

| 项 | 结果 |
| --- | --- |
| 单测 | 60 pass / 0 fail |
| 桌面构建 | ✅ `vite build` 通过（r186，非小工具产物不变） |
| r150 视觉回归 | 10 屏流程零 pageerror；逐屏像素差 0.05–2.53（均值），差异只在烟粒子相位/相机微移 |
| 强制 WebGL1 回归 | 同上路径跑通，差异与 WebGL2 基本一致 |
| 官方审计（目录） | `PASS: 28 file(s), 1 warning(s)`（WARN 仅为文本合计 6.85 MiB） |
| 官方审计（zip） | `PASS: 1 file(s), 1 warning(s)`（WARN 仅为 5.39 MiB > 建议值 2 MiB） |
| 容器启动 | ✅ `steps.boot = true`，`errors: []`（无 pageerror / console error） |
| 首屏 3D | ✅ `openingGeometry = true`（自带几何解码 + WebGL 渲染） |
| 进入工坊 | ✅ `openingDismissed = true`、`worldGeometry = true`、`worldLoading = "false"` |
| 自带几何 | ✅ `hasManifest: true`、4 个站点齐全、`guyao` 3 块 / 1,713,180 字符、7 个 `models/*.js` 已注入 |
| WebGL | ✅ `webgl2`、`drawingBuffer 393×468`、`WEBGL_lose_context` 可用 |
| 音频 | ✅ `./assets/bgm.mp3` 加载成功，`duration 120.02`、`error: null` |
| 存档 | ✅ 走容器 Storage：`available: true`、`usedBytes 51,562`、`limitBytes 10,485,760`，`localStorage` 里 `terra*` 键为 `[]` |

截图：`qa/minitool/01-opening.png`（开屏已避开状态栏与胶囊）、`qa/minitool/02-workshop.png`（进入工坊后的关卡说明弹层已让开外壳）。

## 7. 后续待办

1. 上传到创服平台并走一遍真机（Android 10+ / iOS 18.4+）验收；确认上传侧接受 `.mp3`。
2. 若要压到审计的 2 MiB 建议线以内，去掉 BGM 或改程序化音效（几何 base64 是体积主体）。
3. 触屏手感调优（拖拽旋转、笔刷大小手势），以及低端机的动态降档（`renderer.__webglFlavor` 已就绪）。
4. 若真机出现 WebGL 完全不可用，再补 2D 兜底视图（当前只有错误态）。
