// Bilingual UI layer: Chinese is the source of truth, English is a lookup table.
// Text is translated at the DOM level so every template keeps working untouched.
const STORAGE_KEY = 'terra-lang';
const CJK = /[\u4e00-\u9fa5]/;

const EN = {
  '进入地图介绍': 'Explore the map introduction',
  '跳过介绍，进入工坊 ↗': 'Skip introduction, enter workshop ↗',
  '↺ 恢复视角': '↺ Reset view',
  '恢复初始视角': 'Reset camera view',
  '左键旋转 · 滚轮缩放': 'Left drag to orbit · scroll to zoom',
  '保存并退出当前面板。左键拖动旋转视角，滚轮缩放。': 'to save and close. Drag with the left mouse button to orbit; scroll to zoom.',
  '3D 瓷器工坊，WASD 移动，靠近工作台按 F 操作': '3D porcelain workshop. WASD to move; press F at a workbench.',
  '钴蓝花朵与舒展藤蔓绕碗而生，呈现青花瓷清雅的韵味。': 'Cobalt flowers and flowing vines wrap around this elegant blue-and-white bowl.',
  '淡青白釉映衬米粒状花纹，玲珑瓷在光下透出温润柔光。': 'Rice-grain motifs glow softly through the pale glaze of this linglong bowl.',
  '金黄、朱红与深紫交融，流淌的釉色记录窑火的变化。': 'Gold, vermilion and deep purple mingle in a flowing glaze shaped by kiln fire.',
  '粉色花瓣、纤细叶脉与嫩绿花萼，勾勒粉彩瓷的柔美。': 'Pink petals, delicate veins and green sepals capture the beauty of famille-rose porcelain.',
  '60% 起奖励 · 火候加成最高 125 硬币': 'Rewards from 60% · up to 125 coins with firing',
  '塑形、雕刻、上色后烧窑': 'Shape, carve, paint, then fire',
  '烧制完成 · 前往交付台': 'Fired · head to the delivery counter',
  '完成制作后先到窑炉烧制，再到交付台评分。': 'Fire your finished piece at the kiln, then take it to the delivery counter.',
  '沿水平方向推压或拉伸': 'Push or stretch horizontally',
  '沿竖直方向推压或拉伸': 'Push or stretch vertically',
  '请将手掌移到瓷泥边缘': 'Move your hand to the clay edge',
  '提交前必经 · 瓷器窑炉': 'Required before delivery · the kiln',
  '在 9 秒烧制中，指针进入火候区间时按一次空格。一般 / 成功 / 完美分别获得金币 ×1 / ×1.1 / ×1.25；未按键记为一般。': 'During the 9-second firing, press Space once when the needle reaches the heat zone. Fair / Success / Perfect award coins ×1 / ×1.1 / ×1.25. No input gives Fair.',
  '锁定火候': 'Lock in heat',
  '空格': 'Space',
  '一般 ×1': 'Fair ×1',
  '成功 ×1.1': 'Success ×1.1',
  '完美 ×1.25': 'Perfect ×1.25',
  '按空格锁定火候；退出面板会暂停烧制。': 'Press Space to lock in heat. Closing this panel pauses firing.',
  '修改作品后需要重新烧制。': 'Editing the piece requires firing it again.',
  '请先完成烧制': 'Finish firing first',
  '请先到窑炉烧制': 'Fire at the kiln first',
  '请先到窑炉完成烧制，再提交作品。': 'Finish firing at the kiln before submitting your piece.',
  '查看火候结果': 'View firing result',
  '继续烧制瓷器': 'Resume firing',
  '烧制瓷器 · 必经环节': 'Fire porcelain · required',
  '基础奖励': 'Base reward',
  '火候加成': 'Firing bonus',
  '火候{} · 金币 ×{}': 'Heat: {} · coins ×{}',
  '火候 {} · 金币 ×{}': 'Heat: {} · coins ×{}',
  '火候{} · 本关金币 ×{}': 'Heat: {} · coins this level ×{}',
  '按 F': 'Press F',
  '操作 F': 'Interact F',
  '操作': 'Interact',
  '币': 'coins',
  '等待烧制': 'Ready to fire',
  '判定中…': 'Watch the heat…',
  '火候判定扇环': 'Firing timing arc',
  '形状占 65%，上色占 35%。80% 通过本关；未通过则重试，已获得硬币保留。提交前必须烧制：在扇环指针进入目标区间时按空格。烧制不改变相似度。': 'Shape contributes 65% and paint 35%. Reach 80% to pass; retries keep earned coins. Firing is required before delivery: press Space in the target zone. Firing does not change similarity.',
  '低于 60%：0 币；60–69%：60 币；70–79%：70 币；80–89%：80 币；90–99%：90 币；100%：100 币。火候一般 ×1、成功 ×1.1、完美 ×1.25，最终金币四舍五入。': 'Below 60%: 0 coins; 60–69%: 60; 70–79%: 70; 80–89%: 80; 90–99%: 90; 100%: 100. Firing multiplies coins by 1 / 1.1 / 1.25 for Fair / Success / Perfect, rounded to the nearest coin.',
  // ——— brand & chrome ———
  '四方瓷韵 · 瓷器工坊': 'Four Porcelains · The Workshop',
  '四方瓷韵': 'Four Porcelains',
  '青花工坊': 'Blue-and-white workshop',
  '当前硬币': 'Coins',
  '硬币': 'coins',
  '地图': 'Map',
  '玩法说明': 'How to play',
  '开启声音': 'Turn sound on',
  '关闭声音': 'Turn sound off',
  '更换瓷泥': 'Swap clay',
  '正在制作': 'In progress',
  '移动': 'Move',
  '方向键': 'arrows',
  '退出面板': 'Close panel',
  '取泥台': 'Clay station',
  '查看景德镇地图': 'View the Jingdezhen map',
  '场景进度与订单': 'Scene progress and orders',
  '3D 瓷器工坊，WASD 移动，按 F 与工作台交互': '3D porcelain workshop. WASD to move; press F at a workbench.',
  '上': 'Up', '左': 'Left', '下': 'Down', '右': 'Right',
  '关闭面板': 'Close panel', '关闭帮助': 'Close help',
  '开始你的第一件作品': 'Start your first piece',
  '从一抔瓷泥开始': 'Begin with a lump of clay',
  '去取泥台领取瓷泥。': 'Collect clay at the clay station.',

  // ——— help ———
  '工坊指南': 'Workshop guide',
  '从瓷泥，到你的藏品。': 'From clay to your collection.',
  'WASD / 方向键移动；走近工作台按 F 开始操作。按 Esc 保存并退出当前面板。':
    'WASD / arrow keys to move; press F at a workbench to start. Esc saves and closes the panel.',
  '01 · 领取瓷泥': '01 · Collect clay',
  '每次制作都从取泥台的一整块白色瓷泥开始。': 'Every piece starts with a full lump of white clay at the clay station.',
  '02 · 自由制作': '02 · Work freely',
  '塑形台用宽手掌推压，雕刻台用刻刀去除多余瓷泥，上色台用瓷白与钴蓝画笔绘制。可自由往返；Ctrl/Cmd + Z 撤销，[ / ] 调整工具大小。':
    'Press with a wide palm at the shaping bench, cut excess clay at the carving bench, paint in porcelain white and cobalt at the painting bench. Move between them freely; Ctrl/Cmd + Z undoes, [ / ] changes tool size.',
  '03 · 提交评分': '03 · Submit for scoring',
  '04 · 按评分赚硬币': '04 · Earn coins',
  '低于 60%：0 币；60–69%：60 币；70–79%：70 币；80–89%：80 币；90–99%：90 币；100%：100 币。':
    'Below 60%: 0 coins; 60–69%: 60; 70–79%: 70; 80–89%: 80; 90–99%: 90; 100%: 100.',
  '05 · 购买、贴花与下一场景': '05 · Decal and next scene',
  '本场景五关通过，余额达到 400 币，即可花 400 币购买贴画。点击选择贴画，再点击白瓷碗或“贴到碗上”。完成后进入下一场景，剩余硬币继续保留。':
    'Clear this scene’s five levels and hold 400 coins to buy the decal. Pick it, then tap the bowl or “Apply to bowl”. The next scene opens and leftover coins carry over.',
  '四站按地图顺序：古窑民俗博览区、中国陶瓷博物馆、御窑厂国家考古遗址公园、陶溪川文创街区。对应贴画依次为青花缠枝、玲珑白瓷、红金窑变、粉彩花瓣。点击顶部“地图”可查看路线或重播开场。每个场景五关，共二十关。四件成品全部收藏后完成旅程。':
    'Four stops in map order: Ancient Kiln Folk Custom Park, China Ceramic Museum, Royal Kiln Factory Archaeological Site Park, Taoxichuan Creative District. Their decals: blue-and-white vine, linglong white, copper-red flambé, famille-rose petals. “Map” replays the route or the opening. Five levels per scene, twenty in all; collect all four pieces to finish.',
  '回到工坊': 'Back to the workshop',

  // ——— campaign data ———
  '青花缠枝纹': 'Blue-and-white vine',
  '青花瓷碗': 'Blue-and-white bowl',
  '钴蓝花朵、舒展的藤蔓与双线边饰，取自第一张青花瓶。':
    'Cobalt flowers, unfurling vines and double-line borders, after the first blue-and-white vase.',
  '玲珑白瓷纹': 'Linglong white porcelain',
  '玲珑白瓷碗': 'Linglong white bowl',
  '以第二张白瓷杯为灵感，米粒状花瓣在淡青白釉上透出柔光。':
    'After the second white cup: rice-grain petals glow softly through a pale celadon glaze.',
  '红金窑变纹': 'Copper-red flambé',
  '红金窑变碗': 'Copper-red flambé bowl',
  '第三张窑变瓶的金黄、朱红和深紫，化作向下流淌的釉色。':
    'Gold, vermilion and deep purple from the third flambé vase, flowing down as glaze.',
  '粉彩花瓣纹': 'Famille-rose petals',
  '粉彩花瓣碗': 'Famille-rose petal bowl',
  '第四张花形瓷器的粉色花瓣、纤细脉络与嫩绿花萼，环绕碗身。':
    'Pink petals, fine veins and pale green calyxes from the fourth flower-shaped vessel wrap the bowl.',

  // ——— places ———
  '古窑民俗': 'Ancient Kiln Folk',
  '古窑民俗博览区': 'Ancient Kiln Folk Custom Park',
  '古窑手作坊': 'Ancient Kiln Workshop',
  '第一站 · 窑火初见': 'Stop 1 · First sight of kiln fire',
  '古窑 · 制瓷 · 传承': 'Ancient kiln · porcelain craft · heritage',
  '从老窑的烟囱下出发，让第一抹青花在瓷泥上生长。':
    'Start beneath the old kiln chimneys and let the first blue-and-white grow on the clay.',
  '窑火微明，木架上摆着待烧的瓷坯。你的第一份青花订单正在这里等你。':
    'Kiln fire glows; greenware waits on wooden racks. Your first blue-and-white order waits here.',
  '砖窑、烟囱、灰瓦坡顶与木制晾坯架': 'Brick kilns, chimneys, grey tiled roofs and wooden drying racks',
  '窑火': 'Kiln fire',
  '陶瓷博物馆': 'Ceramics Museum',
  '中国陶瓷博物馆': 'China Ceramic Museum',
  '博物馆体验工坊': 'Museum Experience Workshop',
  '第二站 · 瓷光入藏': 'Stop 2 · Light of porcelain',
  '展馆 · 玲珑 · 光影': 'Gallery · linglong · light',
  '循着昌江的水色，走进收藏瓷光的展馆，寻找白瓷上的玲珑花影。':
    'Follow the colour of the Chang River into the gallery of porcelain light and find linglong shadows on white ware.',
  '明亮的展厅与玻璃展柜之间，观察瓷器的形与光，把玲珑纹样带回你的碗上。':
    'Among bright halls and glass cases, study form and light, and carry the linglong pattern back to your bowl.',
  '现代展馆、玻璃幕墙、陈列柜与青花大瓶': 'Modern gallery, glass curtain wall, display cases and a giant blue-and-white vase',
  '瓷光': 'Porcelain light',
  '御窑 · 寻迹': 'Royal kiln · tracing',
  '御窑厂国家考古遗址公园': 'Royal Kiln Factory Archaeological Site Park',
  '御窑厂遗址': 'Royal Kiln Site',
  '御窑遗址研习坊': 'Royal Kiln Study Workshop',
  '第三站 · 御窑寻色': 'Stop 3 · Seeking colour at the royal kiln',
  '遗址 · 拱券 · 流釉': 'Ruins · arches · flowing glaze',
  '转向御窑旧址，穿过红砖拱券，在窑火留下的颜色里寻找金与红。':
    'Turn to the old royal kiln, pass through red-brick arches and seek gold and red in the colours the kiln left behind.',
  '砖拱与旧窑遗迹围起新的手作课堂。完成五份订单，收集一张红金窑变贴画。':
    'Brick arches and old kiln ruins enclose a new workshop. Finish five orders and collect a copper-red decal.',
  '红砖拱券、残墙、考古探方与旧窑基座': 'Red-brick arches, broken walls, excavation pits and old kiln bases',
  '御色': 'Imperial colour',
  '陶溪川': 'Taoxichuan',
  '陶溪川文创街区': 'Taoxichuan Creative District',
  '陶溪川创意工坊': 'Taoxichuan Creative Workshop',
  '第四站 · 花开陶溪': 'Stop 4 · Blooming at Taoxichuan',
  '厂房 · 市集 · 新生': 'Factories · market · rebirth',
  '最后来到陶溪川，在老厂房与创意市集间，给这段旅程添上一瓣粉色。':
    'Finally Taoxichuan: among old factory halls and craft markets, add a pink petal to the journey.',
  '高烟囱旁的红砖厂房亮起灯光。把最后一张花瓣贴画贴上瓷碗，集齐景德镇四件纪念。':
    'Lights come on in the red-brick halls by the tall chimneys. Apply the last petal decal and complete your four Jingdezhen keepsakes.',
  '红砖厂房、锯齿屋顶、高烟囱与文创市集': 'Red-brick workshops, sawtooth roofs, tall chimneys and a craft market',
  '花开': 'In bloom',
  '因瓷而名，因瓷而兴。\n山水之间，一座城市与泥、火相伴。':
    'Named for porcelain, raised by porcelain.\nAmong hills and rivers, a city lives with clay and fire.',
  '千年窑火不熄，匠心代代相传。\n从一抔瓷泥，到一件温润的器物。':
    'Kiln fire for a thousand years, craft handed down.\nFrom a lump of clay to a warm, quiet vessel.',
  '走过古窑与展馆，穿行遗址与街巷。\n把景德镇的故事，做成属于你的瓷韵。':
    'Through old kilns and galleries, ruins and lanes.\nTurn Jingdezhen’s story into porcelain of your own.',

  // ——— opening ———
  '景德镇瓷器之旅开场': 'Jingdezhen porcelain journey opening',
  '景德镇 · 瓷器之旅': 'Jingdezhen · A Porcelain Journey',
  '跳过动画': 'Skip',
  '江西 · 景德镇': 'Jingdezhen, Jiangxi',
  '景德镇': 'Jingdezhen',
  '千年瓷都 · 窑火不息': 'A thousand years of kiln fire',
  '展开游历地图': 'Unfold the journey map',
  '瓷': 'Porcelain',
  '韵': 'Charm',
  '一抔泥，一炉火，一城瓷。': 'A handful of clay, a kiln of fire, a city of porcelain.',
  '千年瓷都 · 一城窑火': 'A thousand-year porcelain capital',
  '循着窑火，': 'Follow the kiln fire,',
  '走进': 'into',
  '景德镇。': 'Jingdezhen.',
  '一张地图，四处瓷韵。': 'One map, four porcelain stories.',
  '从古窑到陶溪川，把城市的故事': 'From the ancient kiln to Taoxichuan, turn the city’s stories',
  '做成你亲手收藏的四只瓷碗。': 'into four bowls you make and keep.',
  '↺ 重播': '↺ Replay',
  '每站 5 关': '5 levels per stop',
  '400 币兑换贴画': '400 coins per decal',
  '景德镇 · 手作游历图': 'Jingdezhen · Handmade journey map',
  '探索路线 01—04': 'Route 01—04',
  'Ⅱ 暂停': 'Ⅱ Pause',
  '▷ 继续': '▷ Resume',
  '山水之间，人文与烟火。': 'Mountains and rivers, craft and everyday life.',
  '继续开场动画': 'Resume the opening',
  '暂停开场动画': 'Pause the opening',
  '路线已展开 ✓': 'Route revealed ✓',
  '重播开场动画': 'Replay the opening',
  '跳过路线动画 ↗': 'Skip route animation ↗',
  '跳过介绍 · 展开地图 ↗': 'Skip intro · unfold map ↗',
  '根据景德镇手绘地图展开的游戏路线 · 点击标记查看各站':
    'Game route drawn on the hand-painted Jingdezhen map · tap a pin to preview each stop',
  '已收藏': 'Collected',
  '待收集': 'Not yet',
  '完成本站五关，购买并贴好贴画，才能开启下一站。':
    'Clear five levels here, then buy and apply the decal to unlock the next stop.',
  '这一站的景致': 'The look of this stop',
  '纪念贴画': 'Souvenir decal',
  '✓ 已收藏': '✓ Collected',
  '尚未抵达 · 先完成前一站': 'Not reached · finish the previous stop',
  '已走过': 'Visited',
  '第 {} 站：{}': 'Stop {}: {}',

  // ——— workshop HUD ———
  '场景 {} / 4 · {}': 'Scene {} / 4 · {}',
  '场景 {} / 4': 'Scene {} / 4',
  '瓷器之旅 · {} / 4': 'Porcelain journey · {} / 4',
  '瓷器之旅 · {} / 4 件藏品': 'Porcelain journey · {} / 4 pieces',
  '第 {} 关 · 第 {} 次尝试': 'Level {} · attempt {}',
  '第 {} 关：{}': 'Level {}: {}',
  '{} · 第 {} 关': '{} · Level {}',
  '第 {} 关 · {} · 尝试 {}': 'Level {} · {} · attempt {}',
  '{} · 尝试 {}': '{} · attempt {}',
  '第 {} 关 · {}': 'Level {} · {}',
  '第 {} 关 / 5': 'Level {} / 5',
  '练习订单': 'Practice order',
  '80% 通关': '80% to pass',
  '60% 起奖励 · 最高 100 硬币': 'Rewards from 60% · up to 100 coins',
  '本场景贴画 · 400 币': 'This stop’s decal · 400 coins',
  '已购买 · 点击贴花': 'Purchased · apply it',
  '已制成 · 进入下一场景': 'Finished · next scene',
  '四件作品已集齐': 'All four pieces collected',
  '我的瓷器藏品': 'My porcelain collection',
  '80% 通关 · 60% 起奖励': '80% to pass · rewards from 60%',
  '五关完成 · 制作场景成品': 'Five levels done · make the souvenir',
  '塑形、雕刻、上色': 'Shape, carve and paint',
  '到取泥台领取瓷泥': 'Collect clay at the clay station',
  '点击右侧贴画，完成你的瓷碗': 'Tap the decal on the right to finish your bowl',
  '走近对应工作台，按 F 开始操作。': 'Walk to a workbench and press F to start.',
  '购买 → 选择贴画 → 贴到碗上 → 下一场景': 'Buy → pick a decal → apply → next scene',
  '进度自动保存。按 Esc 返回工坊。': 'Progress saves automatically. Press Esc to return.',
  '查看订单 ↗': 'View order ↗',
  '五关已完成 ✓': 'Five levels cleared ✓',
  '当前余额 {} 币 · 本场景 {}/5 关': 'Balance {} coins · {}/5 levels here',
  '+{} 硬币': '+{} coins',
  '剩余 {} 硬币': '{} coins left',

  // ——— benches ———
  '粗塑成形': 'Rough shaping',
  '细节雕刻': 'Detail carving',
  '手绘上色': 'Hand painting',
  '用双手推压瓷泥': 'Press the clay with both hands',
  '从外边缘向内拖动以压缩瓷泥，向外拖动以拉伸。用宽手掌调整大体形状，再去雕刻台修整。':
    'Drag inward from the edge to compress, outward to stretch. Use the wide palm for the overall form, then refine at the carving bench.',
  '✋ 推压瓷泥 · 宽手掌': '✋ Press clay · wide palm',
  '这里只能推压塑形，现有颜色会随瓷泥一起移动。雕刻和上色请去对应工作台。':
    'Only pressing happens here; paint moves with the clay. Carve or paint at their own benches.',
  '刻去多余的瓷泥': 'Cut away excess clay',
  '拖动刻刀去除多余瓷泥，对照右侧图片修整轮廓。刻多了可以撤销。':
    'Drag the knife to remove excess clay and match the reference outline. Over-cut? Undo.',
  '✂ 雕刻 · 刻刀': '✂ Carve · knife',
  '这里只能去除瓷泥。推压造型请去塑形台，绘制颜色请去上色台。':
    'Only cutting happens here. Press at the shaping bench, paint at the painting bench.',
  '画上你的青花': 'Paint your blue-and-white',
  '选择颜色，在瓷器表面拖动画笔。上色只改变颜色，不改变轮廓。':
    'Pick a colour and drag the brush on the surface. Painting changes colour, not shape.',
  '● 上色 · 画笔': '● Paint · brush',
  '这里只能绘画。切去瓷泥请去雕刻台，改变造型请去塑形台。':
    'Only painting happens here. Cut at the carving bench, reshape at the shaping bench.',
  '你的瓷泥 · 正面': 'Your clay · front',
  '已保存': 'Saved',
  '正在制作…': 'Working…',
  '亲手制作': 'Made by hand',
  '对照参考图，观察形状与花纹。': 'Compare with the reference: shape and pattern.',
  '保存并离开': 'Save and leave',
  '带上作品到评分与交付台查看分数。': 'Take it to the counter to be scored.',
  '拖动操作': 'Drag to work',
  '撤销本次操作': 'Undo this stroke',
  '工具大小': 'Tool size',
  '手掌宽度': 'Palm width',
  '保存并关闭': 'Save and close',
  '仅用于粗塑': 'Shaping only',
  '本站专用工具': 'Station tool',
  '选择颜色': 'Pick a colour',
  '瓷白': 'Porcelain white',
  '钴蓝': 'Cobalt blue',

  // ——— briefs & orders ———
  '对照形状与蓝色装饰，自由制作。': 'Match the shape and blue decoration freely.',
  '达到 80% 通关': 'Reach 80% to pass',
  '未通过则重试本关，已获得硬币保留。': 'Below that you retry this level; earned coins are kept.',
  '累计 400 币购买贴画': 'Save 400 coins for the decal',
  '完成五关后购买，贴到瓷碗上进入下一场景。':
    'Buy after five levels and apply it to move to the next scene.',
  '订单参考图': 'Order reference',
  '你正在制作的瓷泥': 'Your clay in progress',
  '初始瓷泥': 'Starting lump',
  '保留当前作品，继续完善。': 'Keep this piece and keep refining it.',
  '到取泥台领取一整块瓷泥。': 'Collect a full lump at the clay station.',
  '从一块瓷泥开始': 'Start with a lump of clay',
  '领取瓷泥后，自由选择塑形、雕刻、上色的顺序。每个工作台使用自己的工具。':
    'Once you have clay, shape, carve and paint in any order. Each bench has its own tool.',
  '✓ 已通过': '✓ Passed',
  '当前订单': 'Current order',
  '80% 解锁下一关': '80% unlocks the next level',
  '查看订单': 'View order',
  '领取完整瓷泥': 'Take a full lump of clay',
  '领取新瓷泥': 'Take fresh clay',
  '保留作品': 'Keep this piece',
  '瓷泥已领取，去工作台开始制作吧。': 'Clay collected — head to a bench.',
  '请先到取泥台领取瓷泥。': 'Collect clay at the clay station first.',
  '请到取泥台领取新瓷泥。': 'Collect fresh clay at the clay station.',
  '重新制作': 'Start over',
  '换一块新瓷泥？': 'Swap in a new lump?',
  '当前作品会重置，已通过的关卡、藏品与硬币会保留。':
    'This piece resets; passed levels, collection and coins stay.',
  '走到取泥台，可以换一块新瓷泥。': 'Walk to the clay station to swap clay.',
  '到取泥台更换瓷泥': 'Swap clay at the clay station',

  // ——— kiln ———
  '让窑火温暖你的作品': 'Let the kiln warm your piece',
  '开始烧制': 'Start firing',
  '{} 秒': '{} s',
  '烧制完成 ✦': 'Firing complete ✦',
  '随时可以开始': 'Ready when you are',
  '烧制期间可以离开窑炉，继续制作。': 'You can walk away and keep working while it fires.',
  '烧制完成后，到交付台根据形状和上色评分。': 'When it is done, get scored at the counter.',
  '烧制中…': 'Firing…',
  '完成 · 返回工坊': 'Done · back to the workshop',
  '落款 · 封窑': 'Seal the kiln',
  '火候 {}%': 'Kiln heat {}%',
  '火候已封 · {}': 'Kiln sealed · {}',
  '火候判定': 'Kiln verdict',
  '一般': 'Fair',
  '成功': 'Success',
  '完美': 'Perfect',
  '在扇环里按下空格，锁定火候。': 'Press Space while the needle is in the glowing arc.',
  '按空格或点击“落款 · 封窑”。': 'Press Space, or click “Seal the kiln”.',
  '金币 ×{}': 'coins ×{}',
  '火候完美，金币 ×1.25！': 'Perfect heat — coins ×1.25!',

  // ——— review & result ———
  '先带上你制作的瓷器，再到这里评分。': 'Bring a finished piece here to be scored.',
  '看看这件作品吧': 'Let’s look at this piece',
  '评分由形状 65% 和上色 35% 组成。达到 80% 通过本关；低于 80% 重试，60% 起仍可获得硬币。':
    'Score = 65% shape + 35% paint. 80% passes; below that you retry, and coins start at 60%.',
  '你的作品': 'Your piece',
  '参考作品': 'Reference',
  '继续完善': 'Keep working',
  '提交评分': 'Submit for scoring',
  '前往贴画台': 'Go to the decal table',
  '查看下一关': 'Next level',
  '再试一次': 'Try again',
  '作品通过啦！': 'Your piece passed!',
  '再完善一点，就更好了': 'A little more work and it’s there',
  '本次得分与硬币已保存。': 'Score and coins saved.',
  '本关需要达到 80%。这次获得的硬币保留，领取新瓷泥后继续尝试。':
    'This level needs 80%. Coins earned now are kept; take fresh clay and try again.',
  '订单参考': 'Order reference',
  '相似度': 'Similarity',
  '已通过': 'Passed',
  '未通过 · 重新尝试': 'Not passed · try again',
  '通关标准 80%': 'Pass mark 80%',
  '形状 · 权重 65%': 'Shape · weight 65%',
  '上色 · 权重 35%': 'Paint · weight 35%',

  // ——— decal shop & collection ———
  '场景 {} / 4 · 贴画工坊': 'Scene {} / 4 · decal workshop',
  '成品预览 · 拖动旋转': 'Finished preview · drag to rotate',
  '参考图 {} · 按上传顺序': 'Reference {} · upload order',
  '完成本场景五关，用 400 硬币购买贴画；亲手贴到白瓷碗上，开启下一场景。':
    'Clear this scene’s five levels, buy the decal for 400 coins, then apply it yourself to open the next scene.',
  '五关通过': 'Five levels cleared',
  '硬币余额': 'Coin balance',
  '购买贴画 · {} 币': 'Buy decal · {} coins',
  '余额不足，可以完成练习订单获得硬币。': 'Not enough coins — take a practice order.',
  '先完成本场景的五个订单。': 'Finish this scene’s five orders first.',
  '达到 400 币即可购买 · 贴好后进入下一场景 · 每个场景限购一次':
    '400 coins to buy · applying it opens the next scene · one per scene',
  '接一个练习订单': 'Take a practice order',
  '继续当前订单': 'Back to the current order',
  '{}，完成！': '{}, finished!',
  '为白瓷碗贴上新纹样': 'Apply a new pattern to the white bowl',
  '这件瓷器已经收进你的藏品。准备去下一处工坊吧。':
    'This piece is in your collection. On to the next workshop.',
  '先选择右侧贴画，再点击白瓷碗或“贴到碗上”。拖动瓷碗可以旋转查看。':
    'Pick the decal on the right, then tap the bowl or “Apply to bowl”. Drag the bowl to rotate it.',
  '完成旅程 · 查看四件藏品': 'Finish · view all four pieces',
  '进入下一场景：': 'Next scene: ',
  '贴到碗上': 'Apply to bowl',
  '贴画已选中 · 点击瓷碗完成贴花': 'Decal selected · tap the bowl to apply',
  '白瓷素胎 · 等待贴画': 'Plain white bowl · waiting for a decal',
  '已贴好 · 拖动欣赏': 'Applied · drag to admire',
  '四方瓷韵，圆满收藏': 'Four stories, fully collected',
  '你的瓷器藏品': 'Your porcelain collection',
  '四个场景、二十个订单，四张贴画都成为了你亲手完成的瓷碗。':
    'Four scenes, twenty orders — four decals became bowls you made yourself.',
  '按参考图的顺序，走过四个工坊，收集四种瓷器。':
    'Follow the references through four workshops and collect four porcelains.',
  '待收藏': 'Locked',
  '✓ 已贴花 · 已收藏': '✓ Applied · collected',
  '五关通关 + 400 硬币': 'Five levels + 400 coins',
  '我的藏品': 'My collection',
  '拖动旋转 · 查看环绕纹样': 'Drag to rotate · see the wrap pattern',
  '返回藏品': 'Back to collection',

  // ——— map & restart ———
  '景德镇 · 四站游历图': 'Jingdezhen · four-stop journey map',
  '循着地图，走向下一站': 'Follow the map to the next stop',
  '你的瓷都足迹': 'Your footprints in the porcelain capital',
  '沿地图上的 1—4 号地点，完成五关、收集贴画，把每一站做成一件纪念。':
    'Visit stops 1—4, clear five levels each, collect the decals, and turn every stop into a keepsake.',
  '游戏探索路线 · 当前关卡、硬币与瓷器进度自动保存':
    'Exploration route · levels, coins and porcelain progress save automatically',
  '瓷都游历手记': 'Notes from the porcelain capital',
  '一件瓷器完成 · 新的一站启程': 'A piece finished · a new stop begins',
  '返回当前站': 'Back to this stop',
  '重播地图开场 ↗': 'Replay the map opening ↗',
  '重新开启旅程': 'Restart the journey',
  '从第一间工坊重新开始？': 'Start over from the first workshop?',
  '会清空本次旅程的关卡、硬币和四件藏品。': 'This clears levels, coins and all four pieces.',
  '取消': 'Cancel',
  '重新开始': 'Restart',

  // ——— stations ———
  '取泥与订单': 'Clay & orders',
  '瓷器窑炉': 'The kiln',
  '评分与交付': 'Score & delivery',
  '领取完整瓷泥': 'Take a full lump of clay',
  '推压瓷泥，调整形状': 'Press the clay into shape',
  '用刻刀去除多余瓷泥': 'Cut away excess clay',
  '选择颜色，亲手绘制': 'Pick a colour and paint',
  '提交作品并评分': 'Submit for scoring',
  '购买贴画与制作成品': 'Buy the decal and finish the piece',
  '再坚持一下…': 'Almost…',
  '按 F 开始操作': 'Press F to start',

  // ——— presets ———
  '一抹青花罐': 'A Stroke of Blue Jar',
  '把瓷泥做成圆润的罐子，在中间画一条宽宽的蓝色横带，其余保持白色。':
    'Make a round jar and paint one broad blue band around the middle, leaving the rest white.',
  '横带保持平整，上下留出白色。': 'Keep the band level, with white above and below.',
  '双环青花瓶': 'Double Ring Vase',
  '做一个细高、短颈的白瓷瓶，在瓶身画两条宽蓝色横带。':
    'Make a tall, slim vase with a short neck and paint two broad blue bands around it.',
  '两条横带中间留出清楚的白色间隔。': 'Leave a clean white gap between the two bands.',
  '三点青花坛': 'Three Dot Jar',
  '做一个宽肚瓷坛，在白色瓶身的中间画三个大蓝点。':
    'Make a wide-bellied jar and paint three big blue dots across the middle.',
  '用中等画笔，分别画出三个圆点。': 'Use a medium brush and paint three separate dots.',
  '蓝沿瓷罐': 'Blue Rim Jar',
  '把罐口做宽、底部收窄，再沿顶部画一圈宽蓝边。':
    'Widen the mouth, narrow the base, then paint a thick blue rim.',
  '只需要在宽罐口上画一条厚实的蓝边。': 'Just one generous blue band along the wide rim.',
  '青带月光罐': 'Moon Jar with Blue Bands',
  '做一个短颈的圆形月光罐，在瓶身画两条宽的竖向蓝带。':
    'Make a round moon jar with a short neck and paint two wide vertical blue bands.',
  '两条蓝带中间留出一条白色区域。': 'Keep a white strip between the two bands.',

  // ——— hero carousel ———
  '四件藏品 · 拖动旋转': 'Four keepsakes · drag to spin',
  '拖动旋转 · 悬停查看': 'Drag to spin · hover for details',
  '青花缠枝 · 第一站': 'Blue-and-white vine · stop 1',
  '玲珑白瓷 · 第二站': 'Linglong white · stop 2',
  '红金窑变 · 第三站': 'Copper-red flambé · stop 3',
  '粉彩花瓣 · 第四站': 'Famille-rose petals · stop 4',
  '四件成品瓷碗，可拖动旋转，悬停查看简介':
    'Four finished bowls — drag to spin, hover for a short introduction',
};

const EXTRA_RULES = [
  [/^继续旅程 · (.+)$/, (m) => `Continue · ${m[1]}`],
  [/^抵达 (.+)$/, (m) => `Arrive at ${m[1]}`],
  [/^当前站 · (\d+)\/5 关$/, (m) => `Current stop · ${m[1]}/5 levels`],
  [/^(\d+)\/5 关 · (\d+)\/400 币$/, (m) => `${m[1]}/5 levels · ${m[2]}/400 coins`],
  [/^(.+?)参考图$/, (m) => `${m[1]} reference`],
  [/^(.+?)贴画$/, (m) => `${m[1]} decal`],
  [/^(.+?)环绕贴图$/, (m) => `${m[1]} wrap texture`],
  [/^(.+?)成品预览，可拖动旋转$/, (m) => `${m[1]} · drag to rotate`],
  [/^待贴花的白瓷碗，拖动旋转$/, () => 'White bowl waiting for a decal · drag to rotate'],
  [/^已收藏瓷碗，可拖动旋转$/, () => 'Collected bowl · drag to rotate'],
  [/^用户提供的第 (\d+) 张陶瓷参考图$/, (m) => `Uploaded porcelain reference ${m[1]}`],
  [/^第 (\d+) 关 \/ 5$/, (m) => `Level ${m[1]} / 5`],
  [/^场景 (\d+) \/ 4$/, (m) => `Scene ${m[1]} / 4`],
  [/^(\d+) 秒$/, (m) => `${m[1]} s`],
  [/^\+(\d+) 硬币$/, (m) => `+${m[1]} coins`],
  [/^(\d+) 硬币$/, (m) => `${m[1]} coins`],
  [/^火候 (\d+)%$/, (m) => `Kiln heat ${m[1]}%`],
  [/^金币 ×([\d.]+)$/, (m) => `coins ×${m[1]}`],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slotRules = [];
for (const [zh, en] of Object.entries(EN)) {
  if (!zh.includes('{}')) continue;
  const parts = zh.split('{}').map(escapeRe);
  slotRules.push({re: new RegExp(`^${parts.join('(.+?)')}$`), en});
}
slotRules.sort((a, b) => b.en.length - a.en.length);

const dict = EN;
const CJK_TEST = CJK;

function fillSlots(template, values) {
  let i = 0;
  return template.replace(/\{(\d*)\}/g, (_, index) => {
    const value = index ? values[Number(index) - 1] : values[i++];
    return value ?? '';
  });
}

/** Translate one string. Returns null when nothing is known (caller keeps the original). */
export function translateText(value) {
  const core = value.trim();
  if (!core || !CJK_TEST.test(core)) return null;
  if (Object.prototype.hasOwnProperty.call(dict, core)) return dict[core];
  for (const rule of slotRules) {
    const match = rule.re.exec(core);
    if (match) return fillSlots(rule.en, match.slice(1).map((m) => translateText(m) ?? m));
  }
  for (const [re, build] of EXTRA_RULES) {
    const match = re.exec(core);
    if (match) return build(match.map((m, i) => (i ? translateText(m) ?? m : m)));
  }
  return null;
}

let lang = 'zh';
let observer = null;
const textOrigin = new WeakMap();
const textWritten = new WeakMap();
const attrOrigin = new WeakMap();
const attrWritten = new WeakMap();
const listeners = new Set();

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CANVAS', 'CODE', 'PRE', 'svg', 'SVG', 'PATH']);
const ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];

function isSkipped(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (!el) return true;
  if (el.closest('[data-no-i18n]')) return true;
  for (let n = el; n; n = n.parentElement) if (SKIP.has(n.tagName)) return true;
  return false;
}

function translateTextNode(node) {
  const current = node.nodeValue;
  if (current === null || current === undefined) return;
  let origin = textOrigin.get(node);
  if (origin === undefined || current !== textWritten.get(node)) {
    origin = current;
    textOrigin.set(node, origin);
  }
  if (!CJK_TEST.test(origin)) return;
  let next = origin;
  if (lang === 'en') {
    const lead = origin.match(/^\s*/)[0];
    const tail = origin.match(/\s*$/)[0];
    const translated = translateText(origin);
    if (translated !== null) next = lead + translated + tail;
  }
  if (next !== current) node.nodeValue = next;
  textWritten.set(node, node.nodeValue);
}

function translateAttrs(el) {
  for (const attr of ATTRS) {
    const current = el.getAttribute(attr);
    if (!current || !CJK_TEST.test(current)) continue;
    let store = attrOrigin.get(el);
    if (!store) attrOrigin.set(el, (store = {}));
    let written = attrWritten.get(el);
    if (!written) attrWritten.set(el, (written = {}));
    if (store[attr] === undefined || current !== written[attr]) store[attr] = current;
    let next = store[attr];
    if (lang === 'en') {
      const translated = translateText(store[attr]);
      if (translated !== null) next = translated;
    }
    if (next !== current) el.setAttribute(attr, next);
    written[attr] = el.getAttribute(attr);
  }
}

function walkText(root) {
  if (!root) return;
  if (root.nodeType === 3) {
    if (!isSkipped(root)) translateTextNode(root);
    return;
  }
  if (root.nodeType !== 1) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (isSkipped(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  for (const n of nodes) translateTextNode(n);
  translateAttrs(root);
  if (root.querySelectorAll) for (const el of root.querySelectorAll('[title],[aria-label],[alt],[placeholder]')) translateAttrs(el);
}

/** Translate the whole document (or a subtree) into the current language. */
export function applyLanguage(root = document.body) {
  if (!root) return;
  walkText(root);
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        const node = record.target;
        if (!isSkipped(node)) translateTextNode(node);
      } else if (record.type === 'attributes') {
        translateAttrs(record.target);
      } else {
        for (const node of record.addedNodes) {
          if (node.nodeType === 3) {
            if (!isSkipped(node)) translateTextNode(node);
          } else if (node.nodeType === 1) walkText(node);
        }
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}

export function getLang() {
  return lang;
}

export function setLang(next, {silent = false} = {}) {
  lang = next === 'en' ? 'en' : 'zh';
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  if (lang === 'en') startObserver();
  else if (observer) {
    observer.disconnect();
    observer = null;
  }
  applyLanguage(document.body);
  document.dispatchEvent(new CustomEvent('terra:lang', {detail: lang}));
  if (!silent) for (const fn of listeners) fn(lang);
  return lang;
}

export function toggleLang() {
  return setLang(lang === 'en' ? 'zh' : 'en');
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function langButtonLabel() {
  return lang === 'en' ? '中文' : 'EN';
}

export function initI18n() {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {}
  const target = stored === 'en' || stored === 'zh' ? stored : 'zh';
  setLang(target, {silent: true});
}
