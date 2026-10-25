import {TUTORIAL_STEPS} from './tutorial.js';
const steps=[
 ['Take your first steps','Use WASD, the arrow keys or the on-screen arrows to move, then walk to the clay table.'],
 ['Collect your first clay','Walk to the clay table, press F or the action button, and collect a white clay blank.'],
 ['Shape the clay edge','At the shaping table, drag along an edge to push or stretch the clay. Refine the outline before visiting the carving table.'],
 ['Carve away extra clay','At the carving table, remove a small piece outside the target outline. Keep the body intact; undo if you cut too much.'],
 ['Paint your first blue band','Choose cobalt blue at the painting table and draw a wide band across the middle. Use the reference to refine your work.'],
 ['Keep the kiln fire steady','Start firing at the kiln. Hold Space or the bellows button to heat up, release to cool, and finish the 12-second firing.'],
 ['Deliver your first piece','Take your piece to the delivery counter. Reach 80% to complete order one. Teaching ends after this submission; failed work can be retried freely.'],
];
export const JOURNEY_EN={
 ...Object.fromEntries(TUTORIAL_STEPS.flatMap((step,i)=>[[step.title,steps[i][0]],[step.copy,steps[i][1]]])),
 '新手教学 · {} / {}':'First order tutorial · {} / {}',
 '上一件':'Previous piece','下一件':'Next piece','上一站':'Previous stop','下一站':'Next stop',
 '切换展示':'Choose an exhibit','四站工坊全景，可拖动旋转':'Four workshop panoramas; drag to rotate',
 '四站工坊全景':'Four workshop panoramas','景德镇 · 工坊全景':'Jingdezhen · workshop panoramas',
 '拖动旋转 · 悬停暂停':'Drag to rotate · hover to pause','拖动旋转 · 按钮切换':'Drag to rotate · buttons to switch',
 '走进工坊，':'Step into the workshops,','看见':'discover ','景德镇。':'Jingdezhen.',
 '从古窑出发':'Start at the Ancient Kiln',
 '四处工坊，四种瓷韵。':'Four workshops, four porcelain traditions.',
 '转动场景，欣赏每一站的建筑与烟火，':'Turn each scene to explore its architecture and daily life,',
 '把城市的故事做成亲手收藏的瓷碗。':'and turn the city’s stories into bowls of your own.',
 '进入工坊 ↗':'Enter workshop ↗','每站 {} 单':'{} orders per stop','重播开场介绍':'Replay the introduction',
 'Ⅱ 暂停轮播':'Ⅱ Pause carousel','▷ 继续轮播':'▷ Resume carousel',
 '可选练习':'Optional practice','选择练习订单':'Choose a practice order',
 '练习可以赚取硬币，不增加本场景的三单进度。':'Practice earns coins without adding to this stop’s three required orders.',
};
