# 05 · 宣纸青花：美术方向与落地

> 一句话：把「暖米色面板 + 宝蓝按钮」的通用后台壳，换成一套**可执行、可校验**的国风视觉系统——宣纸底、青花主色、朱砂/描金点睛、宋体标题。只动表现层：3D 场景、评分公式、关卡数值一行未改。`npm test` 87 passed / 0 failed。

## 1. 风格选择与硬规则

技能 `game-art-guide` 的 10 种风格里，本题材（景德镇制瓷）自带领一个正确答案：#7 国风水墨。落成四个决定：

1. **纸**做底（不是白、不是灰米色），所有面板、卡片、判分框都压在纸面上，靠纸纤维颗粒统一质感。
2. **青花靛蓝**做唯一强调色：主按钮、进度、选中态。它天然属于瓷器，且在白底上对比充足（可当 CTA 与成就色两用）。
3. **朱砂**只做「判分/收藏/失败」这类印章语义，**描金**只做「货币/奖励/规则边线」，两者都不大面积铺色。
4. 一个游戏一套 ≤16 色调色板，**色值只出现在 `:root` 令牌区**，其余位置一律 `var()` 或 `color-mix()` 派生。

## 2. 调色板（14 色）

落点：`src/art-direction.css` 第 1 节。这是全站唯一允许写十六进制的地方。

| 令牌 | 色值 | 用途 |
|---|---|---|
| `--xz-paper-0` | `#fdf9f0` | 面板、纸卡正面 |
| `--xz-paper-1` | `#f6efdd` | 卡片底、次级块、提示条 |
| `--xz-paper-2` | `#ece2ca` | 凹陷区、画板底、禁用面 |
| `--xz-line` | `#ddd0b2` | 1px 描边、分隔线、虚线 |
| `--xz-ink` | `#20262c` | 正文与标题（墨） |
| `--xz-ink-2` | `#4d5860` | 次级文字、说明 |
| `--xz-ink-3` | `#7b858c` | 元信息、单位、占位 |
| `--xz-qing-0` | `#193a63` | 青花深（按下态、按钮渐变尾、正文强调） |
| `--xz-qing-1` | `#26548c` | 青花主（主按钮、选中、链接） |
| `--xz-qing-2` | `#6b93bf` | 青花浅（描边、焦点环） |
| `--xz-qing-3` | `#e4ecf6` | 青花雾（极浅底、图表轨道） |
| `--xz-zhu` | `#ad3a2c` | 朱砂（印章、失败、未收藏、危险） |
| `--xz-jin` | `#a3792e` | 描金（货币、奖励、规则边线） |
| `--xz-cui` | `#3f6b52` | 青绿（达标、已收藏、成功） |

派生色不新增色值，用 `color-mix(in srgb, var(--xz-ink) 25%, transparent)` 这类写法表达透明度与深浅。

**站点主题色不是第 15–18 个色值**：四个工坊的识别色早在 `src/places.js:5-8`（古窑 `#995637` / 博物馆 `#457b89` / 御窑 `#aa553f` / 陶溪川 `#9d6179`），是场景数据而不是 UI 调色板。`src/main.js:132` 把它们写进 `--xz-station`，样式表只做 `color-mix` 派生（`--xz-station-soft`、`--xz-clay-0/1`）。所以 `src/art-direction.css` 里仍然只有上表 14 个十六进制，站点色换站即变、不写死。

## 3. 字体与字号层级

不引入网络字体（不新增请求，也不依赖 CDN）：标题走系统宋体，正文走系统黑体。
唯一的例外是**开屏主标题**——沿用仓库已有的「站酷快乐体」本地子集 `src/assets/fonts/zcool-kuaile-title.woff2`（SIL OFL 1.1，约 20KB，`src/opening-home.css` 的 `@font-face`），因为它是开屏的核心吸睛点：圆头、略带手写感的字形配上逐字入场动画，宋体替代不了。`--xz-font-kuaile` 就是这条字体栈。

| 角色 | 字号 | 字体 / 字重 |
|---|---|---|
| 开屏巨字「开窑啦！」 | `clamp(76px,8.8vw,132px)`（手机 `clamp(56px,17vw,94px)`） | **站酷快乐体 400**（`--xz-font-kuaile`），字距 .025em，逐字入场 |
| 面板标题 h1 | `clamp(24px,2.4vw,30px)` | 宋体 SC 600 |
| 分区标题 h2 | 20px | 宋体 SC 600 |
| 卡片标题 h3 | 16px | 宋体 SC 600 |
| 正文 | 14px / 行高 1.65 | 苹方 / 微软雅黑 / Noto Sans |
| 辅助 | 13px | 同上 |
| 元信息 | 11px，字距 .14em | 同上，全大写式标签 |
| 提示卡片 | 11–14px | **975 圆体（XZ Round）** 400，--xz-font-round；见下方说明 |

数字（分数、硬币、计时）一律用衬线并加大 1–2 档，让「量」和「话」在视觉上分层。

第二个本地字体例外是**提示卡片用的圆体**：src/assets/fonts/xz-round-subset.woff2（975 圆体 / 975 Maru SC Medium，SIL OFL 1.1，来源 npm 镜像包 @fontpkg/975-maru-sc，按 OFL 派生改名 XZ Round）。只保留 src/**/*.js 与 index.html 里出现的 1003 个字符（990 字形，161KB，WOFF2），@font-face 在 src/art-direction.css 末尾，font-display:swap，不请求任何 CDN。作用范围仅限「说明/提示」类元素：世界提示条 #interaction、#first-workshop-hint、#mobile-guidance、效率条、场景门、.maker-tip/.station-note/.guide-note/.brief-hint、步骤条 .panel-steps、.review-check、地图图注、#toast 与选站确认弹窗；标题仍是宋体、正文仍是系统黑体，层级不被拉平。

## 4. 空间、描边与质感

- **纸面三层**：panel = paper-0，card = paper-1，凹陷（画板、条形槽）= paper-2。
- **纤维颗粒**：`--xz-grain` 是内联 SVG `feTurbulence` 的 data URI，配 `background-blend-mode:multiply` 叠在底色上。不新增图片文件，也不新增依赖。
- **压边**：卡片一律 `1px solid --xz-line` + `box-shadow:0 0 0 1px color-mix(white 60%,transparent) inset`，形成「纸被压过一道」的边缘，替代硬投影。
- 圆角三档：8 / 12 / 18。阴影只用两级，低透明墨色。
- **釉面主按钮**：`--xz-qing-1 → --xz-qing-0` 斜向渐变 + 顶部内高光 + 2px 底线，视觉上像上过釉的青花瓷片。

## 5. 缓动

| 场景 | 时长 | 曲线 |
|---|---|---|
| 按钮 hover / 按下 | 140ms | `cubic-bezier(.22,.61,.36,1)` |
| 卡片 hover、颜色过渡 | 240ms | 同上 |
| 面板进场 | 320ms | 同上 + 10px 上移 |
| 力度抖动、印章落下 | 420ms | 同上 |

`prefers-reduced-motion: reduce` 下全部动效降到 0.01ms（第 14 节），这是可访问性底线，不是可选项。

## 6. 组件规范（复用清单）

| 组件 | 规范 |
|---|---|
| 主按钮 `.primary-button` | 釉面青花；≥44px 高、≥15px 字；按下态下沉 1px |
| 次按钮 `.secondary-button` | paper-1 底 + line 描边 + ink-2 字；hover 抬升纸色 |
| 文本按钮 | 1px 描金下划线，hover 转青花 |
| 禁用态 | 降饱和 + `cursor:not-allowed`；原因文案由 JS 补（04 已做） |
| 纸卡 | paper-1 + 1px line + 内 1px 高光；标题宋体 |
| 印章卡（分数卡） | 朱砂双线框（外 1px + 内 2px 缩进），通过=青绿、未通过=朱砂 |
| 效率条 | **纸底 + 左 3px 青花竖线**（原来是宝蓝色块与薄荷绿条） |
| 复选框 | 命中盒 44×44，视觉方框 22×22（`appearance:none` + `::after`） |
| 关闭按钮 | 46px 圆形纸按钮，hover 转朱砂 |
| 输入框/滑杆 | 纸底 + line 描边，聚焦 3px 青花雾焦点环 |

## 7. 逐屏改动

| 屏 | 改前的具体问题 | 改后 |
|---|---|---|
| 开屏 | 宝蓝大按钮 + 白圆角瓷卡 + 三条无意义朱色短杠 | 宋体巨字「开窑啦！」、描边「先看地图」、宣纸瓷卡 + 青花页码；全屏只有一处实心 CTA |
| 世界 | 灰色提示条、宝蓝 CTA、孤立漂浮的「恢复视角」 | 纸底任务板 + 青花 CTA + 描金目标；「恢复视角」并入圆形纸按钮；**正交相机 fit 1.46 → 1.06（手机 1.34 → 1.10）**，进屏时小岛占满画布 |
| 取泥 | 通用卡片、右侧大片空洞 | 左图右文的纸卡对照；按钮卡片化、手机端全宽堆叠 |
| 制作 | 1120px 文档式面板，画板被压到 ~336px，右侧文字墙，工具开关埋在可滚动的介绍卡里 | 画板撑到 `min(46vh,420px)` 并加双层压边；右列成纸卡，DOM 顺序固定为「参考图 / 固定的工具说明（`min-height:132px`，超出的正文自己滚、底部 52px 渐隐） / 工具与开关」，开关永远在卡外、可见 |
| 窑炉 | 灰米面板、橙+土黄扇环、薄荷效率条、宝蓝主按钮 | 纸面板；**火候带保留红橙三阶**（土黄底 = 描金 62% + 纸底，成功带 = 同色加深，完美带 = 朱砂 85% + 描金），指针墨线、烧进区间转朱砂——红橙是窑火语义，青花是釉色语义，不混用；窑炉特写压到 `min(390px,30vh)`，一屏可见 |
| 预览/结算 | 淡粉分数卡、一排白盒、绿条 | 朱砂印章分数卡、描金金额条、纸卡结算详情；缩略图按内容收边 |
| 地图·升级·帮助 | 淡绿盒 + 土黄提示盒 + 宝蓝按钮；地图底部「返回当前站」+「前往此工坊」两个键，点了不出地图 | 宣纸地图框、朱砂场景门、描金升级卡；**地图只剩一个整宽主行动键**（当前站 = 继续当前工坊，别处 = 从这里开始），点击直接落地到 3D 世界并弹出一条「已抵达」提示；选中已通关工坊时先弹 .travel-confirm 原生 dialog 询问是否以练习模式重玩 |

### 7b. 第五轮微调（用户反馈：提示框居中、遮罩内外难分辨）

**雕刻 / 塑形画布（`src/sculpture-view.js`）** —— 改的是 2D 画布渲染，不碰 3D 场景：

| 层 | 改前 | 改后 |
|---|---|---|
| 遮罩外 | 与纸底同色，看不出目标边界 | 目标之外的像素叠一层墨色（`--xz-ink`，α88），目标内保持亮 → 边界一眼可见 |
| 多余的瓷泥 | 土橙 α55，几乎看不见 | 朱砂 `--xz-zhu` α150（"这条要削掉"） |
| 缺少的瓷泥 | 浅蓝 α55 | 青花 `--xz-qing-1` α130 |
| 陶土边缘 | 纯色剪影平贴纸底 | 剪影改墨色 + 30% 不透明度，白坯有暗边，不再与纸底糊在一起 |
| 光标 | 硬编码三色 | 削 = 朱砂、推 = 青花、上色 = 笔色；放大镜底色 = 纸白 |
| 调色板来源 | 画布内硬编码一份 | `tones()` 读 CSS 令牌（`--xz-paper-0/paper-2/ink/zhu/qing-1`），带回退值 |

**提示框居中**：
- 世界屏底部 F 提示条：改成两行网格 —— 第一行 F 键 + 标题整体居中，第二行说明横跨整条居中（左右内边距各 20px，留白相等）。
- 效率条 / 状态条（`.task-efficiency`、`.efficiency-indicator`）：文字居中 + `text-wrap:balance`，整条限宽 520px 居中，不再是一条横贯面板、左对齐、右侧大片空白的"系统提示条"。
- 取泥面板左右两栏等高，右栏说明垂直居中，避免上挤下空。

### 7c. 第六轮（用户反馈：地图选站即可出发、提示卡片圆润）

地图的「返回当前站 / 前往此工坊」双键删掉，只留 `#map-select` 一键，文案随选中站点变化：当前站 =「继续当前工坊」，别处 =「从这里开始」，未解锁 =「🔒 请先完成当前工坊」（禁用并给原因）。点击后的行为也改了：原来走 `routeTask()` / 再开一张 travel 面板，永远回不到 3D 世界，看起来像「按钮卡死」；现在 `onSelect` 成功后 `closeTask()` + `toast('已抵达 …')`，`onContinue` 直接 `closeTask()`，人回到世界。

选中已通关（`state.isCollected`）的工坊时，先弹原生 `<dialog class="travel-confirm">`：标题「继续体验已通关的工坊？」+ 一句说明（收藏、金币、评分保留，以练习模式重做）+ 两个按钮「先看看别处 / 继续体验」，确认后才 `travel()`。样式：纸底、`--xz-r-lg` 圆角、墨色 42% 遮罩，圆体字。

底栏因此只剩一条整宽主键（`.task-footer` 改纵向、按钮 `flex:1 1 auto`，说明文字降到键下方的小字），桌面 1190×50、手机 369×50，都 ≥44px。

提示卡片换圆体：975 圆体子集 `xz-round-subset.woff2` + `--xz-font-round`，作用面见 §3 的说明。

### 7d. 第七轮（用户反馈：两块坯板不够突出、配色要跟站点走）

原文：「这两个展示瓷泥的框背景颜色也并不突出。另外我建议根据每一站的配色主题修改绘制的颜色和提示框的主题色。」

- **取泥面板**：两块 `section` 原来是 `--xz-paper-0` 平铺 + 一条金色左线，跟面板底色同色，等于没有边界。现在 `.supply-layout` 退成 `--xz-paper-1` 的凹槽托盘，两块 `section` 提亮成实心纸卡：站点色 10% 底 + 顶部 radial 16% 高光 + 站点色 34% 描边 + `inset 0 0 0 1px` 内白圈 + 一级投影，缩略图加站点色 30% 描边。读起来像「嵌在木托盘里的两块坯板」，不再是一片米色。
- **制作面板的画板不是 CSS 画的**，是 `src/sculpture-view.js:22` 里 canvas 的 `paper0→paper2` 渐变——两个纸色跟面板几乎同色，所以糊成一片。`tones()` 的缓存键改成带 `--xz-station`（原来一次算死），新增 `--xz-clay-0/1` 给坯板做渐变，画板底色随站点走；`.sculpt-canvas-wrap` 再加站点色 12% 底 + 36% 描边 + 投影；右栏参考图 canvas 同源（8% / 32%）。
- **提示框**统一由 `--xz-station` 驱动（第 16 节）：`#interaction`、`#first-workshop-hint`、`#mobile-guidance`、`.brief-hint`、`.maker-tip/.station-note/.guide-note`、`.canvas-corner`、`.panel-steps li.now` 都用 10% 站点色底 + 32% 站点色描边 + 3px 站点色左线。文字仍用墨色，不跟着变——站点色当正文色在浅底上对比度不够。城市地图的 `.scene-gate` 没有并入：它自带朱砂/青绿语义（锁定 / 可进），套站点色会和状态色打架。
- **不跟着变的**：瓷器本身的绘制调色板（`src/sculpture.js:15` 的瓷白 `#f2efe5` / 钴蓝 `#315fa9`）不动。那是玩家在画的釉色，评分按索引统计，换个站点就换釉色会让「青花」变成别的东西。3D 场景、灯光、模型依旧一行未动。

### 7e. 第八轮（用户反馈：火候红橙、工具出卡片、藏品缩略图空白、去参考照片）

- **窑炉火候带**（`src/art-direction.css:338-343`）：`.kiln-good` = 描金 62% 混纸底（土黄），`.kiln-perfect` = 朱砂 85% 混描金（烧透深红），指针与中心轴改墨线，`#kiln-needle.live` 进区间转朱砂。上一轮误把它改成青花三阶，青花是釉色语义、红橙才是窑火语义，这轮按用户要求退回。
- **制作面板右栏分层**（`src/main.js:238`）：`.editor-views / details.editor-more / .editor-tools` 三段；`mountStationInfo` 把升级入口按钮与参考线/对称塑形复选框追加进 `.editor-tools`（`src/main.js:255`）。说明卡自己滚（`overflow-y:auto`），底部渐隐替掉硬裁；第九轮把它的最小高度定死为 132px，见 §7f。
- **藏品缩略图空白**（`src/decals.js:165-175`）：`bowlImage()` 原先在离屏 canvas 上建预览，画布没挂进文档 → `clientWidth` 为 0 → 快照是空白 dataURL。现在第一次调用时建一个 320×320 的 host canvas 挂到 `body`（`left:-9999px`、`pointer-events:none`）再渲染，dataURL 按站点缓存；4 张缩略图从此各不相同。
- **参考照片下线**：删除 `public/references/` 四张照片，贴画纹样全部改由 `src/decals.js` 的 `decalCanvas()` 程序自绘，世界的 3D 贴花与面板预览共用同一张画布；`grep -rn "references/" src/ index.html` 已无命中，运行时不发任何图片请求。
- **版本号重排**：`package.json` 0.1.0 → **1.1.0**，`CHANGELOG.md` 旧的 0.1.x 段整体抬到 1.0.x（内容不变），顶部新增 1.1.0 段列出玩家可见的九条变化。

### 7f. 第九轮（用户反馈：制作面板说明卡看不到内容）

- 现象：右栏说明卡 `flex:1 1 auto` 又被 `min-height:0` 压扁，1280×800 下只剩约 10px，正文全被渐隐吃掉。
- 修法（`src/art-direction.css` §17）：给 `details.editor-more` 加 `min-height:132px; flex:0 0 auto`，它不再参与压缩；工具行 `flex:0 0 auto`，参考图 `flex:0 0 auto`。卡内正文自己滚（`overflow-y:auto`），底部 52px 渐隐让滚动中的文字整行消失，不会把一行字切在两像素里。
- 代价：制作面板 `#task-body` 从 566/566 变成 614/595，多 19px 滚动；这是「正文可见」换来的，已写进 §9。
- 试过但撤回：把右栏 `height:min(72vh,640px)` 撑满画板下方空白 → 卡片仍不长（flex 容器高度由内容决定），反把工具行挤出可视区，已回退成 `max-height:min(66vh,560px)`。

## 8. 三档响应式

| 档位 | 关键变化 |
|---|---|
| 桌面 ≥1100px | 面板最宽 1120px；制作面板「画板 + 240px 参考列」双栏 |
| 平板 640–1099px | 参考列收窄到 200px；地图/结算转单列；字号降一档 |
| 手机 <640px | 面板全宽、按钮全宽堆叠；隐藏键盘提示（Esc/空格）与页脚说明；画板 1:1 满宽；触控热区 44 起 |

## 9. 实测（探针 newbie_playthrough.mjs，42 个状态）

同一探针、同一地址、同一档位跑改动前后：

| 指标 | 改动前 | 改动后 |
|---|---|---|
| 桌面 <44px 命中区（总数） | 93 | **0** |
| 手机 <44px 命中区（本轮新增实测） | — | **0**（帮助页 × 曾测到 43.99，`.close-button` 统一垫到 46px 后归零） |
| 面板内容被裁切（CLIP） | 0 | 0（手机窑炉「升级预览」胶囊、升级页「确认升级」在面板滚动区内，见 §11） |
| `npm test` | 83 | **87**（新增 4 条美术层守卫） |

改动前后截图：`qa/art/before/`（改动前 43 张 + playthrough.json）、`qa/art/after/`（改动后同集合）。

面板内滚动状态（同一探针的 overflow 度量，`内容高/可视高`）：

| 状态 | 改动前 | 改动后 |
|---|---|---|
| desktop 窑炉 | 528/450 | **440/440（一屏放下）** |
| desktop 制作（取泥/塑形/上色/烧制四态） | 566/566 | 614/595（说明卡垫到 132px，整块付出 19px 滚动） |
| desktop 预览 | 427/365 | 431/366 |
| desktop 结算 | fit | 450/450 |
| desktop 结算·展开详情 | 620/475 | 722/471 |
| desktop 地图 | fit | **499/499（一屏放下）** |
| desktop 升级 | 712/477 | 728/473 |
| phone 窑炉 | — | 721/554 |
| phone 结算 | — | 799/552 |
| phone 地图 | — | 758/582 |
| phone 升级 | — | 766/608 |

第七、八轮（站点主题色 / 火候红橙 / 工具出卡片）改完各跑了一次同一探针，最终一轮：桌面与手机 42 个状态全部 `small=0`；桌面制作面板四个状态由 566/566 变成 614/595（说明卡从可压扁改成 `min-height:132px`，换来卡内正文与步骤条可见，代价是 19px 滚动），其余溢出集合与上表一致。44px 这个数字在亚像素下会测成 43.99，所以第七轮起所有面板/地图控件统一垫到 46px（`src/art-direction.css:496` 与各按钮原规则）。

所有溢出都发生在 `#task-body`（唯一滚动容器）内，固定 footer 的主 CTA 始终可见；没有一个面板因溢出而丢失操作入口。

## 10. 实现约束与守卫

- 新增 1 个样式文件 `src/art-direction.css`（693 行，18 节），在 `src/redesign.js` 末尾 `import './art-direction.css'`，保证它是级联最后一层。
- 新增 1 个测试 `tests/art-direction.test.js`（4 条断言）：加载层序、令牌区外无十六进制、调色板 ≤16 色、旧令牌（`--scene-accent` / `--scene-light` / `--paper` / `--border`）已重定向到新调色板。
- 没有新增 npm 依赖、没有新增图片、没有引入 CSS 框架或 CSS-in-JS。
- 触控热区基准是 46px 而不是 44px：44px 在亚像素测量下会变成 43.99，实测探针按 `<44` 判定不达标；`src/art-direction.css:496` 统一垫到 46px。
- 保留既有 id / class 钩子与事件绑定：只补类名与 `:has()` 选择器，不改 DOM 结构与 JS 逻辑。

## 11. 已知限制（明确不做的部分）

1. **3D 场景只调了取景**：模型、材质、灯光、动画一行未动；按用户反馈只改了 `src/world.js` 的正交相机 fit 系数（1.46 → 1.06 / 手机 1.34 → 1.10），让进屏时小岛占满画布。岛上工位标签互相压字仍是 3D 层的排布问题，需要在 world 里按工位位置分离标签（另开任务）。
2. **字体依赖系统**：没有网络字体，Windows 与 macOS 的宋体字形会有差异；要统一就得内嵌字体子集（约 +200KB），本次按「不加请求、不加体积」的要求放弃。
3. **面板内滚动仍在**：窑炉、预览、升级三屏在 800px 高的桌面视口里内容仍高于可视区，需要滚动（改动前同样溢出，且本轮已收窄 20–60px）。手机端「确认升级」与窑炉「升级预览」胶囊位于滚动区底部，滚一下即可见。
4. **效率条在地图屏隐藏**：地图是浏览屏，计时没有决策价值，直接把高度让给地图与游历护照。
5. **步骤条判定在 JS 里**：制作面板步骤条（取泥→塑形→上色→烧制→交付）的当前步高亮由 `src/redesign.js` 决定，本轮只改样式不改判定。实测雕刻站（`desktop-05-carve`）高亮落在「3. 上色」，与所在工位不一致——按「逻辑一行不改」的约定留给后续任务。
6. **参考列卡内滚动**：制作面板右列高于画板时只有「工具说明」卡自己滚（可滚动区 = `details.editor-more`），工具行与开关是卡外的固定块，永远不会被裁；说明卡底部用 16px 渐隐遮罩收尾，长文不会切在半行上。手机 <1100px 按 `src/challenge.css:94` 的既有规则整卡隐藏，只留工具块。
7. **开屏首屏入口**：原本是两个块级「下划线文字链」，各自一行、宽度不等（看起来像错位）；改成等宽 188px 并排按钮，手机仍全宽堆叠。

## 12. 站点主题色铺满面板（第十轮）

**起因**：用户指出每一站应有自己的配色主题，绘制颜色、提示框主题色都跟着变；窑火判定必须回到红橙。

**令牌**（`src/art-direction.css` 令牌区末尾，全部由 `--xz-station` 派生，不新增十六进制）：

| 令牌 | 派生 | 用途 |
|---|---|---|
| `--xz-station` | JS 写入 `PLACES[i].color` | 站色本体（古窑 #995637 / 博物馆 #457b89 / 御窑 #aa553f / 陶溪川 #9d6179） |
| `--xz-station-soft` | station 10% + paper-0 | 提示框底 |
| `--xz-station-line` | station 38% + paper-0 | 面板/卡片描边 |
| `--xz-station-mid` | station 72% + paper-0 | 选中态、步骤条当前步 |
| `--xz-station-deep` | station 92% + ink | 标题、数字强调 |
| `--xz-flame-plain/-good/-perfect` | jin20+paper2 / zhu46+jin / zhu88+ink | 窑火三段 |

**落点**：`#task-overlay .task-panel` 底 = station 6%、边框 station-line；eyebrow、标题、页脚吃站色；`.supply-layout/.kiln-control/.editor-reference/.decal-details/.atlas-detail/.guide-card/.review-pair figure/.score-card` 用 5% 站色底；主行动键（`.primary-button`、`#map-select`）改站色三段渐变；次按钮 hover 描站色；`.panel-steps li.now` 用 station-mid。旧令牌 `--scene-accent` 早已重定向到青花，本轮不再依赖它，避免站色被覆盖。

**调色板跟站变色**：`src/places.js` 每条 PLACES 增 `glaze` 名（赭石釉/影青釉/朱砂釉/藕荷釉），`src/sculpture.js` 增 `export function setGlaze(hex,name)` 改写 `PALETTE[2]` 与 `COLOR_NAMES[2]`；`src/main.js` 的 `updateUI()` 在写 `--xz-station` 后调用。评分按颜色索引统计（`src/sculpture.js:146-153`），换 hex 不影响分数；`relief-model.js` 每次调用重建 THREE.Color，无需刷新。

**窑火三色**：轨道 = flame-plain（土黄）、成功区 = flame-good 42% 混纸（浅琥珀）、完美区 = flame-perfect（深朱红）；指针取 `--xz-qing-0` 墨蓝、烧到区间时 `--xz-cui` 青绿，与红橙带明确区分；时间条与 legend 同源。

**聚光灯新手引导**：`src/spotlight.js` 六步（`TOUR_STEPS`：地图 → 升级 → 更新说明 → 更多 → 订单 → 工位），挖洞用 `box-shadow 0 0 0 9999px color-mix(ink 52%,transparent)` 加 2px 站色描边。卡片默认用纯函数 `cardPosition(rect,viewport,size)` 贴在目标下方（放不下转上方、再不行居中，夹 12px 边距）；`.commissions` 与工位标签这两步用 `place:'corner'` 走 `cornerPosition()`，落到左下角与纸卡教练同一落点（桌面 left 22 / bottom 74，手机 left 12 / bottom 188 让开摇杆），实测桌面 [22,533] 与手机 [12,477]，与侧栏订单卡和参考图重叠面积 0。首次自动弹、跳过记 `terra-tour-seen`、菜单「◈ 新手引导」可重看；键盘 Esc/←/→/Tab，`role=dialog aria-modal`，`prefers-reduced-motion` 关过渡。测试 `tests/spotlight.test.js` 3 条（落点、窄视口不越界、默认贴下方）。

**字体铺开**：`--xz-font-body` 首位改 `XZ Round`，正文与绝大多数卡片（订单、提示、按钮、数值）统一圆体，标题仍 Songti；实测 `document.fonts.check('14px "XZ Round"')` 为 true。

## 13. 顶栏图标 / 首页更新 / 地图三修 / 引导交互化（第十一轮）

**起因**：用户反馈顶栏常驻按钮出现重复文字、地图主按钮点了没反应、确认框没有动画、首页看不到更新说明，并希望新手引导让玩家自己走一步再推进。

**顶栏图标**：`index.html` 的 `#map-button`（地图）、`#upgrades-button`（升级）与新增的 `#changelog-button`（更新）改为 24×24 线性 SVG，统一 44×44、`stroke: currentColor`、1.7 描边；文字标签一律移除，`src/main.js` 的 `toolbarLabels` 不再含这三项，`labelToolbar()` 也不再给它们生成 `.toolbar-label`。同一轮删掉 `src/redesign.css` 里 `#map-button::after{content:"地图"}`、`#upgrades-button::after{content:"升级"}` 两条桌面伪元素文案——这两条才是「⌖ 地图」重复文字的真正来源。菜单里原有的「更新」项移到顶栏，`moreMenu` 的关闭列表同步移除。

**首页更新说明**：`.opening-header`（`src/city-map.js:25`）新增 `.opening-updates`，带 `data-changelog-open`，复用 `src/main.js:231` 已有的 welcome 事件委托直接打开更新面板，不新增接线。手机 ≤760 头部自动换行，`.opening-skip` 用 `margin-left:auto` 贴右。

**地图三修**：
1. 按钮卡死的根因是 `src/main.js:383` 把 `.task-action-row`（含 `#map-select`）搬进 `#task-footer`，而 `createCityMap` 的 `render()` 仍用 `host.querySelector('#map-select')`，返回 null 后抛 `TypeError: Cannot set properties of null (setting 'disabled')`。现在 innerHTML 之后立刻 `const selectBtn=host.querySelector('#map-select')` 持有引用，`render()` 与 `onclick` 都只认它，元素搬家不影响。
2. 文案补「重温这间工坊」：当前站已收藏时显示；锁定站显示「🔒 请先完成当前工坊」。
3. `#map-replay-opening` 改为 `opening.show(true,'map')`；`src/city-map.js` 的 `show(animate,startAt)` 在 `startAt==='map'` 时直接 `unfold()`，跳过 prologue，落回四场景轮播。

**确认框动画**：`dialog.travel-confirm[open]` 210ms `confirm-in`（淡入 + 上移 10px + 缩到 97%），`::backdrop` 同步淡入；`prefers-reduced-motion` 关掉。

**引导交互化**：步骤表 6 条，`move` 步监听 WASD/方向键与 `#joystick` pointerdown，`station` 步用 MutationObserver 看 `#interaction` 是否去掉 `.hidden`；两步行进期间 `.spotlight-catcher{pointer-events:none}`，让键鼠与摇杆照常工作。工位步延迟 450ms 才判定，保证卡片看得见。DOM 改成 `.spotlight-panel`（固定在左下角，清单在上、卡片在下），清单 `.spotlight-check.done/.now/.todo` 逐项打勾。手机上卡片上移到摇杆之上（`bottom:190px`），清单两列；`body.spotlighting` 同时隐藏 `#mobile-guidance` 等旧提示，避免两套教学同时说话。
## 14. 新手教练卡重做（第十二轮）

**起因**：用户 m02891「新手教程修改作用域不对，修改效果也很糟糕。重做。」上一版聚光灯指认顶栏/地图/⋯菜单，与真实教学七步（move→clay→wheel→carve→paint→kiln→serve）脱节。本轮只改表现层，状态机、评分与 3D 不动。

**单一引导出口**：`src/coach.js` 的 `renderCoach({step,panel,touch})` 由 `main.js updateTutorial()` 调用。世界无面板时写 `#first-workshop-hint`（左下 340px 纸卡：第 01/07 步、工位胶囊、跳过教学、7 段进度轨、标题、正文、「现在做」、站点色柔光），面板打开且类型匹配 `COACH_PANEL` 时把卡片收成 `.task-body` 顶部的 sticky `.coach-strip`，只留序号、标题、面板内动作与跳过。

**动作分三套**：`COACH_GOAL`（世界，如「走两步，靠近取泥台」）、`COACH_GOAL_TOUCH`（触屏，摇杆/「操作」）、`COACH_GOAL_PANEL`（面板内，如「点下方『领取完整瓷泥』」）。文案不再假定玩家还在路上。

**去重**：`body.coach-on` 时 CSS 隐藏 `#interaction`（F 提示卡）与 `#mobile-guidance`；手机顶部不再出现「按 WASD…暂不可用」的误导演示。旧的 `.brief-hint` 空壳与 `.tutorial-instruction` 逻辑删除。

**开合**：`coachEnabled()` 读 `terra-coach-off`，默认开；跳过即写 1，并从 `#replay-tutorial`（⋯ 菜单「◈ 新手引导」）重新 `enableCoach()` 并立刻重绘。

**响应式**：≤760px 卡片 `left/right:12px`、`bottom:calc(188px + safe-area)`，让开摇杆与右下「操作」键（实测 64px 键在 768–832px，卡片止于 664px）；正文让位给「现在做」，`.coach-strip` 只留标题。`prefers-reduced-motion` 关掉进场与脉冲。

**面板步骤锁定**：状态机在上色第一笔后就跳到 `kiln`，旧逻辑会立刻把提示条撤掉，玩家剩下一大半上色没有引导。`src/coach.js` 新增 `panelStep(panel,station,step)`：`editor` 面板按 `activeTask.station` 取 wheel/carve/paint 中正在做的那一步，状态机已经走到下一站也照旧显示；窑炉、交付仍按状态机（烧完自动让位给交付提示）。`tests/coach.test.js` 增加 5 条断言。

**验证**：`tools/minitool/probe/newbie_playthrough.mjs` 不再强制 `tutorial={status:'done'}` 绕过门禁 —— 真实流程里烧制完成会把教学推进到 `serve`，交付门禁本来就放行。桌面一轮实测：05b 雕刻 4/7、06-paint 5/7、第一笔后 06b 仍 5/7、07-kiln 6/7（`#fire-button` 柔光）、08-review 7/7（`#confirm-review`），提交后教学完成、`09-settlement` 正常出现；42 张快照 small=0。

## 15. 圆体统一与窑炉成功区调浅（第十三轮）

**起因**：用户 m03422 附「玲珑白瓷碗，完成！」截图，指出这类宋体标题要改圆润、领取瓷泥台上同款字体也要改；同一轮要求窑炉成功区再浅一档。

**字体令牌**：`src/art-direction.css:27-30` 的 `--xz-font-display` 从宋体栈（Songti SC / STSong / Source Han Serif）改成 `'XZ Round','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC',Georgia,serif`，30 处引用一次生效（`.task-header`、`.wallet strong`、`.kiln-timer`、`.score-card strong`、`.supply-preview h3`、`.opening-chapter h3` 等）。

**硬编码衬线清掉**：`src/journey.css`（`.task-header h2`、`.scene-heading h2`、`.reference-card h3`、`.decal-details h3`、`.collection-card h3`、`.welcome-panel h2`、`.earnings-banner>b`）、`src/challenge.css`（`.reference-card h3`、`.editor-reference h3`、`.brief-arrow`、`.review-rule>b`、`.score-card>strong`、`.collection-money`）、`src/redesign.css:20`、`src/style.css`、`src/upgrade.css`、`src/workshop.css` 中的 `'Songti SC',Georgia,serif` / `Georgia,'Songti SC',serif` / `'Fraunces',Georgia,serif` / `Georgia,serif` 全部替换为 `var(--xz-font-display)`；替换后这六个文件已无衬线残留。

**例外**：开屏序章（`src/city-map.css` 的 `.prologue-copy>h1`、`.opening-brand>b`、章节序号）保留衬线作为封面语汇；开屏主标题仍用站酷快乐体，不进面板体系。

**实测**：`document.fonts.check('16px "XZ Round"')=true`；供应面板 `.task-header h2`、`.supply-preview h3`、`.task-header p`、`.task-header .eyebrow` 的 computed `font-family` 全部落到 XZ Round 栈。

**窑炉成功区**：只调混比，不动判定与读数 —— `src/art-direction.css:348` `.kiln-good{fill:color-mix(in srgb,var(--xz-flame-good) 58%,var(--xz-paper-0))}`（原 86%）。实测成功区填充 sRGB(0.798,0.619,0.498) ≈ #cb9e7f，完美区仍是深红 sRGB(0.612,0.218,0.173) ≈ #9c372c，轨道 #e5d7ba；时间条与图例保持原红橙，指针仍用冷色墨蓝/青绿。


## 16. 手机小工具包同步（第十四轮）

**起因**：用户 m03568「手机端一并更新」。两件事都要做：手机网页端确认同一套令牌已生效；手机小工具产物（`dist-minitool.zip`）重打包，否则真机还是旧界面。

**网页端核对**：393×852 / hasTouch / isMobile 实测 `document.fonts.check('16px "XZ Round"')=true`、`body` 与供应面板 `.task-header h2` / `.supply-preview h3` 的 computed 字体都是 XZ Round 栈，窑炉成功区同样是调浅后的 `--xz-flame-good` 58% 混纸色；开屏主标题仍是站酷快乐体。

**打包**：`npm run build:minitool`（六步：预处理资源 → vite（three r150 / chrome61 / iife）→ 灌入 WebP 与 BGM → HTML 后处理 → 体积自检 → 官方审计打 zip）。产物 25 个文件、`dist-minitool.zip` 5.06 MiB、`PASS`（唯一 warning 是未压缩文本总量 8.84 MiB 的体积提示）。

**发现并修掉的生产构建缺陷**：`tools/minitool/build_minitool.mjs` 原来只把 `<script type="module" crossorigin src=…>` 改成 `<script src=…>`。module 脚本天然 defer，去掉类型后变成阻塞式经典脚本，在 `<head>` 里就执行 —— `document.getElementById('world')` 得到 null，`new THREE.WebGLRenderer({canvas:null})` 抛 `TypeError: Cannot read properties of null (reading 'width')`（three r150 源码里 `T=t.width`），整局初始化中断，真机只能看到开屏静态文案。改法：入口脚本与 `models/manifest.js` 都补 `defer`，保持解析后按序执行。修复后 393×852 实测：3D 世界正常渲染、教练卡 369×147 落在 (12,517)、字体圆体、交互热区 small=0、无 pageerror。

**验证**：`npm test` 91 passed；DEV 端 `newbie_playthrough` 双端 42 snaps / 42 条 small=0；小工具预览（4173）手机尺寸走完「开屏 → 进入世界」无异常。

## 17. 参考图透明底与教学重看（第十五轮）

**参考图去灰底**：问题出在缩略图自带的坯板渐变，不是卡片底色。`src/sculpture-view.js:22` 的 `drawSculpture(canvas,pixels,{cursor,grid,target,line,background=true})` 新增 `background` 开关，只有 true 时才画坯板渐变；`:51` `thumbnail(pixels,size=224,options={})` 把 options 透传。`src/main.js` 四处调用加 `{background:false}`：供应的 `presetImages`（`:73`）、brief 面板（`:170`）、塑形对照图 `#editor-target`（`:251`）、交付预览（`:316`）。瓷釉本体不改，透明后直接落在卡片纸面上 —— 实测供应面板 `img` computed `background-color: rgba(0,0,0,0)`、PNG 角点 alpha=0（关掉开关时角点 alpha=255 作对照），桌面与 393×852 手机一致。

**教学重看**：`src/sculpture.js:166` 新增 `restartTutorial()`，按当前作品状态挑步骤 —— `!hasClay → move`、`!hasShape → wheel`、`!hasPaint → paint`、`fired → serve`、否则 `kiln`。不无条件回到第一步，是因为回头重领瓷泥会把进行中的作品冲掉。`src/main.js:192` 的菜单项「◈ 新手引导」改为：关菜单 → 关帮助/任务面板 → `enableCoach()` → `restartTutorial()` → `updateTutorial()` → toast 提示落到第几步。

**首次自动展示**：`freshTutorial()` 默认 active、`coachEnabled()` 默认 true，`enterGame` 后即渲染世界卡；跳过写 `terra-coach-off=1`，菜单重看时清回 `0`。

**验证**：`tests/progression.test.js` 新增用例按标志位断言 `restartTutorial()` 依次落在 move/wheel/paint/kiln/serve，且已有瓷泥时不会退回 move（`npm test` 92 passed）。浏览器实测：首次进入卡片 `data-step=move`、跳过 → `terra-coach-off=1` 且卡片隐藏、菜单重开 → `off=0` 卡片回到 move；模拟上色完成后重看 → 卡片直接是 06/07「守住窑火」，进入窑炉面板顶部条目为「6 / 7 守住窑火 …」，点「跳过」照常关闭并写 off=1。

## 18. 圆体字集补全（第十六轮）

**症状**：用户反馈「更新卡片里面有一部分字没有用上圆体」，并猜是字集不够。

**根因**：`src/assets/fonts/xz-round-subset.woff2` 当初只按 `src/**/*.js` + `index.html` 收字（1003 码位 / 990 字形）。更新说明卡片的正文来自 `CHANGELOG.md`（`rawChangelog` 原样打进 bundle，运行时 `parseChangelog` 渲染），这份文件的字从来没进过字集 —— 缺 26 个汉字与符号（`七 兀 员 埋 如 宋 宣 授 描 框 橙 浅 浮 渐 珀 琥 砂 突 翻 聚 述 追 题 『 』 ◈`），缺的字静默回退到 PingFang / 微软雅黑，于是卡片里出现「一部分圆、一部分不圆」。

**修法**：从 npm 镜像包 `@fontpkg/975-maru-sc` 取回原始 `975MaruSC-Medium.ttf`（17.2 MB，不入库），用 fontTools `pyftsubset` 重打子集，输入收字范围改为 `src/**/*.js` + `src/**/*.css` + `index.html` + `CHANGELOG.md`（1116 码位），产物 1104 字形、178 KB。字体文件名与 `@font-face` 不变，CSS 无需改动。

**验证**：字体 cmap 与源码文本对账 —— 除装饰符号 `◈ ✦ ✧ ↶ ↷ ↺ ⌂ ☼ ⚙ ✋ ⟳` 与 emoji（源字体本身没有，继续走系统字体）外无缺字；浏览器里对更新说明卡的 390 个非空白字符逐字做「自定义字体 vs 回退字体」像素比对，回退清单为空；`document.fonts.load('16px "XZ Round"')` 正常，圆体对『』与汉字均生效。

**顺带补上的**：`↶ ↷ ↺ ⌂ ☼ ⚙ ✋ ✦ ✧ ⟳` 这些此前也缺，但源字体没有，属预期内的系统字体回退，不要为了「看起来统一」硬塞 emoji。

## 19. 站点主题色与十二条修订（第十七轮）

**主题色令牌**：`#app[data-scene]` 上的 `--xz-station` 由场景 preset 写入，派生 `-soft/-mist/-line/-mid/-deep`。世界屏侧栏订单卡、贴画卡、参考图框统一吃 `color-mix(station 9%, paper-0)` 底 + `grain` 与 7%→22% 站色渐变，边框 `--xz-station-line`；面板主按钮三段站色渐变（实测 `linear-gradient(… .72 .536 .451 → .467 .285 .204 → .534 .311 .210)`），`.panel-steps li.now` 与 eyebrow/标题/页脚吃站色。

**两套规则**：首页按钮固定钴蓝（`.prologue-unfold.intro-primary` 实测 `rgb(38,84,140)` 渐变），世界内按钮与提示跟随站色 —— 页面级「入口用品牌色、场景内用站点色」要一直保持。

**焦点环**：`:focus-visible` 由钴蓝 3px 圆环改为站色 2px + 8px 柔光；Tab 位次实测 `#map-button → #upgrades-button → #changelog-button → #more-button → #reset-view → #view-brief → #quest-cta`，每个 `outline: 2px solid rgb(153,86,55)` + `drop-shadow`。

**Toast 三态**：`toast(msg,tone)` —— 中性/成功站色底、`'deny'` 柔和朱砂（`#8f3b2f` 84% + 米白字），拒绝类调用点（教学门禁、场景加载失败、缺瓷泥、烧窑前置、提交、取泥、工位准入）全部传 `'deny'`。

**参考图随场景**：`state.selectScene()` → `setGlaze()` + `refreshPresetImages()`，`createTarget(preset)` 用当前调色板重画 224px 缩略图；实测切到第 3 站后 `.commissions .reference-card img` 的 dataURL 变化、暖色像素和 20580→22470。

**上色台釉名**：站点色与釉名放在 `src/places.js`（#995637 赭石釉 / #457b89 影青釉 / #aa553f 朱砂釉 / #9d6179 藕荷釉），`src/main.js:140` 的 `updateUI()` 调 `setGlaze(PLACES[scene].color, PLACES[scene].glaze)` 再 `refreshPresetImages()`；调色板按钮的 `title`/`aria-label` 与 `#color-name` 都读 `COLOR_NAMES[2]`。实测第 3 站上色面板 `#color-name`=「朱砂釉」、色块 `--paint`=#aa553f、`aria-label`=「朱砂釉」，标题仍是「给瓷坯上色」。注意：手动 `state.selectScene()` 后必须再调 `updateUI()`（`__terra.refresh()`），否则调色板仍停在上一个站 —— 真实地图点击走的就是 `updateUI`。

**圆体子集重建**：本轮新增文案带出 7 个缺字（← 晕 棕 焦 碧 稍 黑），`npm run font:round` 重打后 `xz-round-subset.woff2` 覆盖 1132 字形 / 1117 码位，`npm run font:check` 无缺字（源字体缺 13 个装饰符号，走系统字体）。

**文案去青花**：`src/main.js:395`、`src/guidance.js:2`、`src/experience-i18n.js:25`、`src/i18n.js:61` 的「青花」改「釉色」（i18n key 同步），自查卡与重试提示早已是釉色。

**地图站点卡**：`.scene-gate` 从 `inline-flex` 改为 `flex;flex-direction:column;width:100%`，标题与清单不再并排 —— desk 右栏 x=778 宽 457（整栏）、phone x=14 宽 365 居中；`.atlas-detail h3` 改 `var(--xz-font-display)`。

**镜头**：`src/world.js:172` `orbit.zoom=1.22`（`:217` reduced-motion 复位、`:219` 入场补间同值），进入世界时场景更满。

**底部操作提示**：`#interaction` 回到 241-246 的基础规则（`station-deep` 94% 深底、16px 圆角、`#interact-sub` 米白），此前被 699 行的「提示框染纸色」组覆盖成浅色方角。

**字体管线**：`tools/fonts/collect.mjs`（收字）+ `build.mjs`（fontTools 子集）+ `check.mjs`（cmap 对账）+ `py_build_woff2.py`，npm script `font:round` / `font:check`；收字范围 `src/**/*.js|css`、`index.html`、`CHANGELOG.md`。

**验证**：`npm test` 95 passed；`newbie_playthrough … both` 42 snaps / 42 条 small=0；desk/phone 多轮探针 `pageerror` 均为空。

**环境坑**：Vite dev server 长时间 HMR 后 CSSOM 会残留同一份样式表的旧副本（同名选择器两份、计算值落后），排查计算样式前先重启 dev server，不要为它加 `!important`。

## 20. 开屏旁白轮播（第十八轮）

**起因**：用户问「这三条同色条的作用是？」——它们是 `.prologue-beats` 的旁白分句进度条（`INTRO_LINES` 三句），无标签、三块同色，信息量接近零。用户随后要求：改钴蓝系、做成按钮、点哪句跳哪句、旁白自动轮播，并把顶部小标改字放大。

**结构**：`src/city-map.js` 把 `<i>` 换成 `<button class="prologue-beat" data-intro-beat="i"><span></span></button>`，容器 `role="group" aria-label="开场白轮播"`；`drawIntro()` 由 `beatAt(introElapsed)` 取当前句，只给当前句 `active`、之前的 `done`，并写 `aria-pressed`。

**轮播与打断**：`tick()` 里 `introElapsed=(introElapsed+dt)%INTRO_DURATION` 改成交替循环（原实现到末句就停），所以三句会一直轮播、末句吃满自己的时间段再回到首句。点按钮走 `showBeat(i)`：把 `introElapsed` 设为该句起点、`narrative=-1` 强制重画、取消并重排 `raf`，轮播从这句继续。鼠标悬停按钮行或键盘聚焦时 `tick` 不再累加时间（`holding`），避免读到一半被换走。纯函数 `beatAt()` 移进 `src/places.js` 方便测试（`city-map.js` 引了 png，node 里 import 不了）。

**配色与字号**（`src/city-map.css` + `art-direction.css`）：按钮 44×44 命中区、内部 30×3 圆角条；未到 `color-mix(qing-1 20%,transparent)`、已过 `48% + paper-0`、当前 `--xz-qing-1` 纯色、hover `68%`；焦点环 2px 钴蓝内嵌。钴蓝常量写死，不随站点换色。旁白 `16px/1.95`（手机 `13.5px`），顶部小标 12→14px（手机 13px）并改文案「文旅融合 · 江西 · 景德镇」，`src/i18n.js` 同步了英文键。字号最终值写在 `art-direction.css`（它在 `city-map.css` 之后加载，桌面规则会盖掉后者的媒体查询，所以手机覆盖追加在该文件末尾的 `@media (max-width:760px)` 里）。

**实测**：桌面 `kickerSize=14px / copySize=16px / 按钮 44×44 / 行 y=632`，手机 `13px / 13.5px / 行 y=732`；点第 3 条 → 文本变「走过古窑与展馆…」、`aria-pressed` 只有第 3 个 true；等 5.2s 后回到第 1 句（循环生效）；无 pageerror。`npm test` 101 条（新增 `tests/opening-beats.test.js` 1 条：`beatAt` 时间切片）。

## 21. 放大与找路：参考图灯箱、画布缩放、场景切换（第十九轮）

**起因**：五条玩家反馈（m05279）经方案确认后落地 —— ①上色时右栏参考图太小，想点开看大图；②上色/拉胚/雕刻时看不清操作区，想用滚轮放大；③世界页的切换场景按钮不明显，「下方」提示没说清在哪；④结算页「相似度」卡显示不全；⑤拉胚手感仍然差。用户拍板：①灯箱、②滚轮重采样缩放（不是 CSS 拉伸）、③文案改「点最下方 01–04」＋站条胶囊＋上一站/下一站＋顶栏「地图」文字、④面板宽与矮屏自适应、⑤只治「慢推抖动」和「抓不准」，不动行程上限与吸附强度。

**参考图灯箱**（`src/main.js`）：右栏 `<figure class="ref-zoom">` 整块变成 `role="button" tabindex="0"`，右下角有 `点击放大` 徽标；Enter/Space 或点击调用 `openRefLightbox()` —— 建一个 `<dialog class="ref-lightbox">`，内部 canvas 用 `drawSculpture(...,{background:false})` 按 640² 重绘（不是把小图放大），点击任意处或 Esc 关闭。**Esc 会被全局 keydown 吃掉**（`main.js` 那只 `if(key==='escape'){preventDefault();closeTask()}`），所以全局处理器开头加了 `if(document.querySelector('dialog[open]'))return;`，把 Esc 让给浏览器的 `dialog.cancel`。

**画布缩放**（`src/sculpture-view.js`）：`drawSculpture` 新增 `view={z,x,y}`，用 `ctx.setTransform(z,0,0,z,-x*(w/SIZE)*z,-y*(h/SIZE)*z)` 把整张 112 模型 px 的画布当作视野窗口，重采样绘制所以放大不糊（不是 CSS transform）。`attachEditor` 维护 `view`（z ∈ 1–3，x/y 是视口左上角在模型 px 里的位置）：`wheel` 以光标为锚点 `z*=exp(-deltaY*.0018)` 再反解 x/y，`contextmenu` 只在 z>1 时阻止；按住右键拖动平移（`k=SIZE/(rect.w||1)/view.z`）；右下角 `#canvas-zoom` 胶囊显示 `1.0× · 滚轮放大` / `2.1× · 复位`，点一下 `resetView()`；`canvas.dataset.zoom / dataset.view` 暴露当前视野给探针。指针映射跟着改：`mx=view.x+x/view.z`，loupe 采样 `(cursor.x-view.x)*view.z/SIZE*canvas.width`。触屏没有滚轮，`@media (max-width:760px)` 直接隐藏胶囊，避免误导。

**手感**（`src/sculpture.js`）：推压死区 `0.75` → `0.3` 模型 px（轻推一两个像素就有反应），首次抓边容差 `5` → `10`（贴近轮廓更容易抓到手下那一段，原来的 90 兜底保留）。`attachEditor` 的推压不再每次 pointermove 立即落笔，而是记 `target`、由 rAF 里的 `step()` 以 `k=.4` 缓动追指针（settled 阈值 `0.08`），松手时先 `apply(target)` 对齐再结束笔画；所有重绘合并到一帧（`queue()`），慢推不再一格一格跳。层缓存从「每帧新建 canvas」改成两个复用槽（`scratchSlots()` 懒创建，否则 node 里 import 会碰 `document is not defined`）。

**场景切换**：`src/city-map.js` 的 caption 改三块 —— 标题、「拖动旋转 · 点最下方 01–04 切换工坊」、`[data-chapter-step="-1|1"]` 的「‹ 上一站 / 下一站 ›」；点击按 `(selected+step+PLACES.length)%PLACES.length` 调 `sceneCarousel?.show()`。01–04 站条在 `art-direction.css` 里改成胶囊（`border-radius:12px`、hover 纸底、当前站 `paper-0 92%` 底 + 站色 45% 描边 + 软阴影），内部进度条 `i` 收到 `left/right:10px;bottom:6px`。游戏内顶栏 `#map-button` 加 `<span class="toolbar-label">地图</span>`，按钮 `width:auto;padding:0 13px`（手机媒体查询里恢复 44px 图标并隐藏文字）。

**结算页**：根因是 `src/redesign.js:54 enrichResult()` 在 `.result-images` 后插入 `.result-explain`，`.result-layout` 变成三轨，第三轨只有 169px，而 `.score-card` 带着 `min-width:209px` → 卡片右溢 39px 被 `.task-panel{overflow:hidden}` 裁掉。改法两处：`art-direction.css` 的 `.score-card` 加 `min-width:0`，`[data-panel="result"] .result-layout` 三轨改 `minmax(200px,1fr) minmax(0,1.4fr) minmax(148px,.7fr)`；`.wide-panel{width:min(920px,calc(100vw - 48px))}`；`@media (max-height:840px)` 收参考图到 128px、`strong` 34px、`.settlement-details` 内部滚动。

**实测**：灯箱 560×560、Esc 关闭后 `lightboxClosed=true`；滚轮 2.13×（`view=29.7,29.7`，即 `(112-112/2.13)/2` 的光标锚点值）、右键拖 → `37.9,35.6`、点胶囊回 1.00；慢推 1px 步进也能落笔（`edits 0→4`）。地图页 desktop/phone aria 一致，点「下一站」`active 0→1`、点「上一站」回 0；`#map-button` 桌面 81px 带字、手机 44px 无字。结算探针 1920/1600/1440/1366/1280/1024 六档全部 `bodySW==bodyCW`、`cardOverflow=0`，1366×768 自动用 34px 数字。`npm test` 101 passed，无 pageerror。

