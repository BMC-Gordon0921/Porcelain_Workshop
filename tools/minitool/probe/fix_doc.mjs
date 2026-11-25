import fs from 'node:fs';
const p = 'docs/ui_redesign/02-redesign.md';
let s = fs.readFileSync(p, 'utf8');
const marker = s.indexOf('\\n## 10.');
if (marker >= 0) s = s.slice(0, marker);
const sec = [
  '',
  '## 10. 交付物清单',
  '',
  '| 文件 | 作用 |',
  '|---|---|',
  '| docs/ui_redesign/01-newbie-playthrough.md | 新手视角试玩记录：13 屏第一眼排行榜 + N1–N14 卡点 |',
  '| docs/ui_redesign/02-redesign.md | 本文件：根因、原则、新 IA、响应式、逐屏 before→after、规范、落地映射 |',
  '| docs/ui_redesign/03-rollout-plan.md | P0/P1/P2 三期施工单与验收口径 |',
  '| docs/ui_redesign/mockup.html | 自包含可点原型：桌面/手机 × 开屏/世界/制作/预览/结算/地图 |',
  '| prototypes/board-01-world.png | 世界屏 现状/建议 对比板 |',
  '| prototypes/board-02-editor.png | 上色面板 建议版（步骤条 / 参考图常显 / 底部固定主按钮）|',
  '| prototypes/board-03-result.png | 结算屏 现状/建议 对比板（标准 + 权重 + 诊断句）|',
  '| prototypes/board-04-phone.png | 手机竖屏世界屏 建议版 |',
  '| prototypes/board-05-intro.png | 开屏：叙事 + 一句「走进工坊」|',
  '| prototypes/board-06-map.png | 瓷都地图 / 区域介绍页 |',
  '| qa/newbie/mockup/*.png | mockup.html 的桌面/手机实拍（12 张，供评审用）|',
  '',
  '原型图只表达信息结构与视觉重量，画面里的 3D 小岛、瓷罐是等距插画占位；真实实现仍用现有 three.js 场景与作品模型，不新画美术资源。',
  ''
].join('\n');
fs.writeFileSync(p, s.replace(/\s*$/, '') + '\n' + sec, 'utf8');
console.log('doc tail rebuilt, bytes', fs.statSync(p).size);
