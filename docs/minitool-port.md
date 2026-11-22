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

`vite.config.js`（加 `__MINITOOL__: 'false'`）、`src/main.js`（`boot()` 异步化 + 平台初始化 + Storage 化读写 + `pagehide`/`visibilitychange` 落盘）、`src/world.js` / `src/decals.js` / `src/kiln-view.js` / `src/hero-carousel.js` / `src/workbench-model.js`（`createRenderer`）、`src/scene-environment.js`（自带几何 / GLTF 双路径）、`src/public-assets.js`（小工具下 png/jpeg → webp）、`src/i18n.js`（语言偏好走 Storage）、`src/upgrades-view.js`（触屏文案）、`src/experience-i18n.js`（补触屏词条）。

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

## 7. 移动端与横屏适配

小程序容器是竖屏手机 + 顶部状态栏/胶囊 + 底部 home 条，且可切横屏；原桌面布局直接搬过来会错位。适配分三层：

**① 外壳让位（运行时）**：`src/platform/safe-area.js` 读 `miniTool.getWindowInfo()`，把 `safeArea.top + 36`（状态栏 44 → 80px，给胶囊留高）、`windowHeight - safeArea.bottom` 写成 CSS 变量 `--mt-top-inset` / `--mt-bottom-inset`；横屏额外算左右刘海 `--mt-left-inset` / `--mt-right-inset`，并监听 `resize` / `orientationchange`（120ms 去抖）重算。`--mt-*` 缺失时全部有 `0px` 兜底，桌面构建完全不加载这段逻辑。

**② 竖屏排版修正（`src/platform/minitool.css`，全部作用域在 `html[data-platform=minitool]`）**：

| 问题 | 根因 | 处理 |
| --- | --- | --- |
| 订单卡被顶栏压住 | `.commissions{top:85px}` 是硬编码，而 minitool 下顶栏整体下移 80px | `top: calc(85px + var(--mt-top-inset))` |
| 订单卡里「五分钟内通过，订单收益 +20%」竖排成单字 | 152px 窄列 + 长文案 | 窄屏隐藏 `.efficiency-indicator` 与 `.collection-link` |
| 6 个 3D 站点标签叠成一团 | 每帧投影的 `.station-label` 全部可见 | 默认 `opacity:0;visibility:hidden`，只放行 `.near/.next/.active/.tutorial-target` |
| `↺ 恢复视角` 被触屏方向键盖住 | 两者都在左下角 | `.reset-view` 移到右下（横屏再抬高） |
| 任务面板小标题被关闭按钮压 | `.task-header` 居中文本延伸到右上 × | `.task-header{padding:0 34px}` |
| 升级面板 3D 预览整块不见 | `.upgrade-confirmation{position:sticky;bottom:-22px}` 盖住画布，而画布本身有 240px 高 | 确认条改 `position:static`，画布压到 190px |
| 底部还有桌面键位提示（F / Esc） | 桌面文案 | 隐藏 `.bottom-bar .controls`、`.task-footer kbd`、`#interaction .interact-key` |
| 触屏操控控件整组不显示 | `#touch-controls` 只在 `@media(pointer:coarse)` 下出现，而小工具 WebView 在模拟器/部分安卓平板上 `pointer` 报 `fine`、`maxTouchPoints` 为 0 | 改按**输入模式**判定（见 ③）：`html[data-input=touch] .touch-controls{display:block}`，位置用 `--mt-*inset` 让位 |
| 交互卡写「按 F 开始操作」「操作 F」 | 键盘语义 | `#interact-sub` 触屏改「点按右下「操作」开始」；`index.html` 的触屏键文案改为「操作」；制作面板底部提示改成「用下方滑杆调整笔刷大小 / 点保存并离开」（`EDITOR_HINTS`） |
| 升级卡文案「悬停预览 · 点击选定」 | 触屏没有悬停 | `src/upgrades-view.js` 按 `matchMedia('(pointer:coarse)')` 输出「点选预览 · 确认升级」，词条同步进 `src/experience-i18n.js` |

**②b 平板 / 桌面预览（834×852、1280×852）**：容器工作台除了 iPhone 还有 iPad 与桌面两种预览设备，逻辑视口分别 834×852、1280×852（`dpr` 恒 1、`pointer: fine`）。宽屏下沿用仓库原有的桌面排版，但外壳让位把它放大了几处既有缺陷：

| 问题 | 根因 | 处理 |
| --- | --- | --- |
| 订单栏压住 3D 视口 21px | `src/upgrade.css` 把 `.commissions` 设为 260px 宽、`#world-wrap{right:310px}`，而 minitool 层只让了 265px | 收成变量 `--mt-orders-w`（≥1101px 260px、761–1100px 222px）+ `--mt-orders-gap`（26px 外边距 + 16px 间隙），`#world-wrap` 与订单栏都按变量让位 |
| 右下「操作」键半个身子埋进订单栏（重叠 52×58） | `#touch-interact` 固定在 `right:20px`，而订单栏占据右侧整条竖带 | `@media (min-width:761px)` 里改为 `right: calc(var(--mt-orders-w) + var(--mt-orders-gap) + var(--mt-right-inset))`，落到 3D 视口右下角 |
| 升级面板 3D 预览底边被 sticky 确认条盖住 76px | `.upgrade-confirmation{position:sticky;bottom:-22px}` 常态悬浮 | 宽屏同样改 `position:static`（手机端此前已改） |
| 开屏轮播页左侧文案列比网格行高 15–23px，压到页脚 | 桌面字号在 834 宽下把 `.opening-copy` 撑高 | 宽屏收紧：`h1 34px`、`.opening-lead 13px`、`.opening-chapter{min-height:0}`、`.opening-rules` 上边距收窄 |
| 品牌字标 `terra®` 在窄屏折行 | `.brand h1` 未禁折行 | `white-space:nowrap` |
| 订单栏内容越界压到底部信息条（iPad 214×58、PC 252×40） | 只给了固定 `top`，没给 `bottom`，`max-height:calc(100dvh - 185px)` 也没算 top inset | `[data-layout=wide] #app > .commissions{bottom:calc(74px+inset);max-height:none;overflow-y:auto}` |
| 「当前目标」引导卡压住摇杆/操作键/交互卡 | 卡片沿用桌面左下角定位 | 平板/桌面预览挪到摇杆上方（`bottom:196px`、`max-width:46%`）；手机触屏直接 `display:none`（内容与教学徽标重复） |
| 手机「操作」键压住底部信息条、`↺ 恢复视角` 与它重叠 | 两者都靠右下 | 操作键 `bottom:calc(52px+inset)`；恢复视角移到摇杆上方 `bottom:192px` |
| 平板竖屏下「游历图」「贴画工坊」够不到（点不到、被底栏挡住） | 订单栏内容比可视高度多约 20px，按钮落到滚动区之外 | 触屏 + 宽屏收掉 `.efficiency-indicator`、把 `.reference-card>p` 收成两行（`-webkit-line-clamp:2`）、参考图限高 56px；订单栏保留 `overflow-y:auto` 兜底 |

> 量化方式：`tools/minitool/audit_layout.mjs`（`W/H/IN_TOP/IN_SIDE` 环境变量）逐屏量 HUD 盒子、两两重叠、越界元素、文本截断与面板滚动；`tools/minitool/audit_panels.mjs` / `check_upgrade.mjs` 查面板内部（画布是否被 sticky 覆盖、子块是否横向越界）。三种视口跑完 `errors: []`，重叠项只剩「HUD 浮在 3D 画布之上」这种既有设计。

**③ 虚拟摇杆与输入模式**：四个方向键换成左下角摇杆，右下角「操作」键放大到 78px（横屏 50px）。

- `#joystick` 是 118px 圆盘 + 虚线圈 + 54px 球，`pointerdown/move/up/cancel` 全程 `setPointerCapture`（拿不到捕获时也不影响拖动，已 try/catch）；输出 `stick.x/stick.y ∈ [-1,1]`，`joyVector()` 按「到圆心距离 / JOY_TRAVEL(34)」算推力，半径外限幅到 1；
- 帧循环里摇杆与键盘**相加后再夹到 ±1**：`dx = clamp(keyX + stick.x)`，`world.move()` 再按模长缩放速度（`thrust = min(1, hypot(dx,dz))`），所以轻推=慢走、推满=全速，不是二值开关；
- 输入模式由 `detectInputMode()` 决定：`(pointer:coarse)` → `touch`；否则宽度 ≥900 且横屏 → `keyboard`；小工具里宽度 <900 → `touch`；其余 → `keyboard`。结果写到 `html[data-input]`，`resize` 时重算；
- 桌面预览（1280×852）自动落到 `keyboard`：摇杆与触屏文案全部收起，底栏恢复 `WASD / F` 键位提示——同一个包两种输入形态。

**④ 手动横版渲染（系统方向不变）**：容器没有锁屏方向 API，所以给顶栏加了一枚 `⟳` 按钮（只在触屏显示），点一下就把整页按「旋转 90° 后的屏幕」重排：

- `toggleRotate()` 切 `html[data-rotate=on]`，`applyLayout()` 把安全区**换轴**映射（旋转后 top ← 横屏 left、bottom ← right、left ← 竖屏 bottom、right ← 状态栏 headTop），并写 `--mt-width/--mt-height`；
- 几何上不是把界面转 90° 了事：`html[data-rotate=on] #app{position:fixed;top:50%;left:50%;width:var(--mt-height);height:var(--mt-width);transform:translate(-50%,-50%) rotate(90deg)}`——`#app` 先换成 852×393 的横版盒子再整体旋转，所以内部所有响应式规则（含 `data-layout=ls` 的紧凑横屏）按横版尺寸生效，画面与图标都是「排好再转」，不是拉伸；
- 旋转后 `world.setDisplayRotation(90)` 把相机拖拽的 x/y 互换（否则手指方向与场景转动方向会错位），摇杆的 `joyVector()` 同样做坐标换轴；
- 系统方向始终不变（不调 `screen.orientation`，也不请求全屏），因此不依赖任何容器权限。

**⑤ 横屏紧凑布局（`html[data-layout=ls]`，由 JS 判定：真机横屏且高 ≤520px，或用户手动旋屏）**：不是把界面旋转 90° 的假横屏，而是真正的响应式：

- 顶栏 54px、底栏 38px，`#world-wrap` 四边重新让位（右侧留给 172px 宽的订单竖栏）；
- 订单栏改成右侧窄栏，隐藏 `.scene-heading/.scene-path/.preset-path/.reference-card>p/.reference-link/.efficiency-indicator/.section-heading/.goal-card`，只留「第几关 + 参考图（限高 62px）+ 作品名 + 贴画目标」——参考图是玩家判断这一关要做什么的主要线索，横屏也必须留着；
- 弹层：`task-artboard 148px`、`kiln-view 150px`、`serve-art 140px`、`upgrade-detail canvas 150px`、确认条 static；
- 开屏页：故事页（`[data-opening-stage=intro]`）压成双栏海报（标题 52px、瓷碗容器 240px、隐藏轮播控件与「暂停背景」）；轮播页（`[data-opening-stage=map]`）左栏瘦身（隐藏 `.opening-lead`、`.opening-chapter p`、`.opening-rules`），右栏场景卡限高 200px，时间轴压到一行；
- 触屏方向键、操作键、恢复视角都按 `--mt-*inset` 定位，避开订单栏与底部信息条。

**⑥ 画布尺寸与旋转坐标（横版渲染的隐藏坑）**：整页 `rotate(90deg)` 之后，`getBoundingClientRect()` 返回的是旋转后的**轴对齐包围盒**，宽高互换。凡是拿它当画布尺寸的地方都会坏：

| 症状 | 根因 | 处理 |
| --- | --- | --- |
| 横版下 3D 场景被横向拉长、相机取景不对 | `src/world.js` 的 `resize()` 用 `rect.width/height` → `renderer.setSize(579,301)` 把 579×301 的布局塞进 301×579 的缓冲 | 改用 `canvas.clientWidth/clientHeight`（不受 transform 影响），并在旋屏回调里双 `rAF` + 240ms 兜底 + `ResizeObserver` 各重算一次 |
| 升级面板工作台预览、贴画工坊、窑火视图的 3D 缩略图空白/变形 | `workbench-model.js` / `decals.js` / `kiln-view.js` / `hero-carousel.js` 各自用 `getBoundingClientRect()` 算尺寸 | 统一换成 `canvasSize(canvas)`（`src/platform/canvas-metrics.js`） |
| 横版下在瓷泥上画/推压，笔触落点偏一大截 | `sculpture-view.js` 用 `(clientX - rect.left)/rect.width` 映射像素格 | 换成 `canvasPoint(canvas, clientX, clientY)`，旋屏时做 90° 逆变换（屏幕 X → 布局 V、屏幕 Y → 布局 U） |

`src/platform/canvas-metrics.js` 只有三个导出：`isDisplayRotated()`（读 `html[data-rotate]`）、`canvasSize(canvas)`、`canvasPoint(canvas, clientX, clientY)`。它不 import `safe-area.js`，模块无副作用，所以能在 node 里单测：`tests/canvas-metrics.test.js` 用「本地点 → 屏幕点 → 反解」的往返性质覆盖四角、中心与任意点，并校验零尺寸画布不会退化成 0。

> 踩坑备忘：`[data-opening-stage=map] > .city-prologue{display:none}` 的特异性低于 `html[data-platform] .opening-screen > .city-prologue`，横屏覆盖 `display` 时若不带上 `[data-opening-stage=intro]`，会让已经隐藏的故事页重新出现（表现为两套文案叠在一起）。

> 关于「怎么才能看到横屏」：工作台本身只有 iPhone / iPad / 桌面三种预览设备、没有旋转按钮，但它也不需要——顶栏的 `⟳` 按钮就是产品内的横版入口（点一下，`#app` 变 852×393 再旋转，系统方向不动）。真机横握时 `data-layout` 也会自动落到 `ls`，两套路径共用同一批规则。

**⑦ 旋转态下的 HUD 再排布（用户截图反馈后补齐）**：⑥/④ 生效之后，旋转态的「屏幕」其实是 852×393 的横版盒子，但**视口宽度仍是 393**，于是 `@media (max-width:760px)` 的竖屏规则会和 `[data-layout=ls]` 同时命中。踩到的三处：

| 症状 | 根因 | 处理 |
| --- | --- | --- |
| 订单卡顶部参考图变成一个空白小方块，看起来像「图片没加载」 | 竖屏规则把 `.commissions` 变成 `display:grid;grid-template-columns:minmax(0,1fr) 128px`，参考图被压进 18px 高的网格单元 | `ls` 下强制 `.commissions{display:block}`，`.reference-card{display:block;height:auto}`、`>img{width:100%;height:52px;object-fit:contain;background:#eee6d3}`（`cover` 会把瓷罐裁成一条） |
| 携带卡里的作品缩略图撑破 32×34 的框 | `#carry-art` 内是 `<img src=data:...>`，而样式只写了 `.carrying svg{width:100%;height:100%}` | 补 `html[data-platform=minitool] #carry-art img{width:100%;height:100%;object-fit:contain}` |
| 右下「操作」绿键压住携带卡与订单栏；顶栏在旋转后变成一条 46px 的宽侧栏 | 触屏键与订单栏都落在屏幕左下/右下同一片区域 | 顶栏 54→46px、`.icon-button` 26px、`.carry`/`.carrying` 移到屏幕左中段空带、订单栏 `bottom:calc(72px+inset)` 让出角、`#touch-interact{right:8px;bottom:4px;64px}`、`ls` 下直接 `display:none` 收起底栏（旋转后它只是 38px 宽的侧条，内容只有原型角标与键位提示） |

> 踩坑备忘（两次都浪费了一轮截图）：①同一个 `minitool.css` 里先写的 `[data-layout=ls]` 规则会被**后面**追加的同类块按源码顺序覆盖——ls 规则只保留一处；②`#touch-interact` 的基础规则是 `html[data-platform=minitool] .touch-controls #touch-interact`（0,3,1），想覆盖必须带 `.touch-controls` 前缀，否则特异性不够、静默失效。

**验证方式**：容器内 `tools/minitool/verify_touch_rotate.mjs` 覆盖「触屏档摇杆出现 → 推杆位移非零 → 换轴后仍能移动 → 点 `⟳` 变 852×393 且画布重排 → 再点还原 → 切桌面档自动变键盘方案」共 11 项断言（`qa/minitool/verify-touch-rotate.json`，当前全绿）；`tools/minitool/shots_devices.mjs` 按 iPhone / iPad / 桌面 / 旋屏四态截图（`qa/minitool/final/`）。`tools/minitool/shots_mobile.mjs` 用 Playwright 在 393×852（竖屏）与 852×393（横屏）两种视口跑完整 10 屏 + 4 个面板，`errors: []` 全绿；产物 `qa/minitool/mobile3/`、`qa/minitool/landscape2/`。横版专项用 `tools/minitool/debug_landscape.mjs`（容器内逐态量画布**宽高比是否等于布局宽高比**，并把 HUD 里每个可点元素的中心点丢给 `elementFromPoint` 判「够不够得到」——这是「按钮被遮挡」唯一可量化的判据）、`debug_canvas_panels.mjs`（旋屏下打开升级/贴画面板，检查面板内画布）、`check_hero_canvas.mjs`（截图裁出开屏瓷碗区域，交给 Pillow 统计像素多样性，判断是否真的画出来了）。`tools/minitool/audit_layout.mjs`（393×852 / 834×852 / 1280×852 三视口）、`audit_panels.mjs`、`check_upgrade.mjs`、`measure_panel.mjs` / `measure_opening.mjs` 用来量关键元素盒子，避免只靠肉眼调 CSS；产物 `qa/minitool/audit-{phone2,ipad3,pc3}/`。

## 8. 后续待办

1. 上传到创服平台并走一遍真机（Android 10+ / iOS 18.4+）验收；确认上传侧接受 `.mp3`。
2. 若要压到审计的 2 MiB 建议线以内，去掉 BGM 或改程序化音效（几何 base64 是体积主体）。
3. 触屏手感调优（拖拽旋转、笔刷大小手势），以及低端机的动态降档（`renderer.__webglFlavor` 已就绪）。
4. 若真机出现 WebGL 完全不可用，再补 2D 兜底视图（当前只有错误态）。
5. 触屏文案还剩教学卡「按 WASD、方向键或屏幕方向按钮移动」（已含「屏幕方向按钮」，可接受）；其余桌面味文案（交互卡、触屏键、制作面板底部）已在本轮改掉。
6. 横屏故事页的 3D 瓷碗已改为 240px 高的紧凑取景框（画布尺寸修好后不再被压成一条线）；若真机上仍显拥挤，可再给 `hero-carousel` 加按画布比例自适应取景的相机分支。
