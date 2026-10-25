import {C,SITE,scene,rect,text,line,ellipse,image,svg,chip,number,screen,card,header,note,gaugeSvg,asset} from './layout.mjs';
import {wireframe} from './prototypes.mjs';

export function makePresentation(){
 const slides=[];
 {
  const s=scene('01_封面');image(s,asset('logo'),88,51,242,75);text(s,'课程汇报 / 作品展示',1360,68,470,27,{align:'right',color:C.muted});
  ellipse(s,985,160,784,784,C.sageLight);ellipse(s,1053,228,648,648,C.white);
  image(s,asset('bowl-1'),867,223,993,647);
  chip(s,'可交互的文化体验',92,237,340);
  text(s,'一抔泥，\n一城瓷。',88,344,920,127,{bold:true,font:'SimSun',h:363});
  text(s,'Terra · 景德镇瓷器之旅',97,736,830,44,{bold:true,color:C.blue});
  text(s,'把城市的故事，做成可以收藏的瓷器。',98,817,780,35,{color:C.muted});
  line(s,88,957,1832,957,C.line,2);text(s,'网页游戏  /  探索 · 手作 · 收藏',90,986,1250,27,{color:C.muted});text(s,'2026.10',1580,986,248,27,{align:'right',color:C.muted});
  s.notes='大家好，今天展示的作品是 Terra，景德镇瓷器之旅。它是一款可以直接在浏览器中打开的轻量手作游戏。我们想尝试的事情很具体：让玩家不是只看一张瓷器图片，而是沿着景德镇的地点故事，亲手完成塑形、上色和烧窑，再把每一站变成一件可以收藏的成品。接下来我会介绍设计思路、核心交互以及目前的实现成果。';slides.push(s);
 }
 {
  const s=scene('02_设计目标');header(s,2,'01 / DESIGN GOAL','让文化从观看，变成动手','设计出发点：降低进入门槛，让操作、反馈与文化主题产生联系。');
  const cols=[['看','先产生兴趣','地点故事和 3D 成品\n帮助玩家知道：\n我将做出什么。',C.blue],['做','获得可理解的反馈','推拉、绘画、火候判定\n把制作过程变成\n玩家自己的动作。',C.clay],['带走','留下可见的完成感','每站收集一件场景成品\n让一次短体验\n形成完整的旅程。',C.sage]];
  cols.forEach(([big,title,body,color],i)=>{const x=88+i*595;rect(s,x,316,554,586,C.white,{radius:22});ellipse(s,x+32,350,116,116,color);text(s,big,x+32,big.length>1?379:359,116,big.length>1?44:75,{color:'FFFFFF',align:'center',bold:true});text(s,title,x+33,515,483,49,{bold:true});text(s,body,x+35,616,476,37,{color:C.muted});});
  s.notes='这次设计没有从堆砌知识点开始，而是把体验拆成三个目标。第一，先让玩家看见成品，产生制作意愿。第二，让手部操作能够得到清楚反馈，比如边缘怎么变化，火候什么时候最好。第三，让过程有一个可以带走的结果，也就是四件场景藏品。这是本项目的设计目标；目前我们完成了可运行的作品，实际学习效果还需要后续用户测试来验证。';slides.push(s);
 }
 {
  const s=scene('03_四站四瓷');header(s,3,'02 / CULTURAL JOURNEY','一张地图，四种瓷韵','地点决定场景气质，纹样决定玩家最终收藏的纪念。');
  image(s,asset('map-art'),88,296,734,677);
  const places=[['古窑民俗博览区','青花缠枝纹 · 青花瓷碗',C.blue],['中国陶瓷博物馆','玲珑白瓷纹 · 玲珑白瓷碗',C.sage],['御窑厂国家考古遗址公园','红金窑变纹 · 红金窑变碗',C.clay],['陶溪川文创街区','粉彩花瓣纹 · 粉彩花瓣碗',C.pink]];
  places.forEach(([name,desc,color],i)=>{const y=292+i*172;rect(s,882,y,950,150,C.white,{radius:16});number(s,String(i+1).padStart(2,'0'),905,y+30,color,58);text(s,name,994,y+28,629,38,{bold:true});text(s,desc,998,y+93,608,29,{color:C.muted});image(s,asset('bowl-'+(i+1)),1609,y+3,203,144);});
  s.notes='游戏把景德镇的四个地点组织成一条游历路线：古窑、中国陶瓷博物馆、御窑厂遗址和陶溪川。每站有不同的建筑、光线与界面主题，并对应青花、玲珑、窑变和粉彩四种成品风格。这里的地图与建筑是游戏化表达，目的是让地点、视觉和制作奖励建立联系。玩家不需要先理解复杂的瓷器分类，也可以从探索和收集进入主题。';slides.push(s);
 }
 {
  const s=scene('04_玩法闭环');header(s,4,'03 / CORE LOOP','20 个订单，串成一段可完成的旅程','四个地点，每站五关；制作反馈推动下一次尝试，收藏推动下一站探索。');
  const top=[['领取瓷泥',88,282],['自由制作',434,628],['烧窑判定',1128,282],['提交评分',1476,356]];
  top.forEach(([label,x,w],i)=>{rect(s,x,357,w,192,i===2?C.clayLight:C.white,{radius:18});number(s,i+1,x+22,379,i===2?C.clay:C.blue,42);text(s,label,x+22,449,w-44,43,{bold:true});});
  chip(s,'塑形',457,570,174);chip(s,'雕刻',646,570,174);chip(s,'上色',835,570,174);
  [[377,420],[1073,1116],[1421,1464]].forEach(([a,b])=>line(s,a,455,b,455,C.sage,4,true));
  line(s,1654,566,1654,689,C.sage,4,true);
  const bottom=[['积累金币',1282,'低于 80% 可重试，金币保留'],['购买贴画',685,'本站五关通过 + 400 币'],['收藏并前进',88,'贴好纹样后进入下一场景']];
  bottom.forEach(([label,x,sub])=>{rect(s,x,712,550,175,C.white,{radius:16});text(s,label,x+25,741,499,42,{bold:true});text(s,sub,x+25,821,499,27,{color:C.muted});});
  line(s,672,798,649,798,C.sage,4,true);line(s,1269,798,1246,798,C.sage,4,true);
  text(s,'制作阶段可以自由往返工位；烧窑完成后，作品才具备提交资格。',95,934,1732,32,{color:C.blue});
  s.notes='整体结构是四个地点，每个地点沿用五个手作订单，一共二十次关卡任务。单件作品先领取瓷泥，然后在塑形、雕刻和上色之间自由往返，不强迫固定制作顺序。烧窑是提交前的必经环节，提交后得到相似度和金币。五关全部通过并且余额达到四百币，就能购买场景贴画。贴花完成后收藏成品，再进入下一站，构成探索、制作、反馈和收藏的循环。';slides.push(s);
 }
 {
  const s=scene('05_进入与探索');header(s,5,'04 / ONBOARDING','先被成品吸引，再走进工坊','首页负责建立期待，工坊负责把玩家带到可以动手的位置。');
  screen(s,asset('home-hover'),92,337,824,515);screen(s,asset('workshop'),998,337,824,515);
  chip(s,'首页：展示目标成品',96,277,443);chip(s,'工坊：靠近工作台按 F',1004,277,508,C.sageLight,'526E5B');
  text(s,'单件轮播 / 悬停简介 / 闲置 5 秒切换',97,889,817,30,{color:C.blue});text(s,'WASD 移动 / 左键旋转 / 滚轮缩放',1007,889,817,30,{color:C.blue});
  s.notes='进入游戏时，玩家首先看到的是最终成品。首页每次只展示一件瓷器，可以水平拖动观察，悬停时阅读简要介绍。离开后闲置五秒才切换，给观察留出时间。玩家可以进入地图介绍，也可以直接去工坊。工坊采用角色探索的方式，走近工作台按 F 就能操作；同时提供相机旋转、滚轮缩放与恢复视角，方便观察不同工位。';slides.push(s);
 }
 {
  const s=scene('06_原型到界面');header(s,6,'05 / INTERACTION PROTOTYPE','先明确结构，再完成视觉表达','原型围绕三个问题：在哪里操作、参照什么、如何撤回与离开。');
  chip(s,'线框：动作与信息层级',96,286,452);chip(s,'界面：沿用同一套操作结构',998,286,642,C.sageLight,'526E5B');
  wireframe(s,'shape',96,378,815,509);screen(s,asset('shaping'),1011,358,805,548);
  text(s,'制作区  →  独立参考  →  工具与撤销  →  保存返回',96,952,1730,31,{color:C.blue});
  s.notes='原型设计重点不是画出很多页面，而是先明确动作和信息的关系。以塑形为例，左侧是制作区，右侧是独立参考，下方保留工具大小、撤销重做和保存离开。这样玩家始终知道自己在操作什么、应该对照什么，以及做错后如何恢复。配套原型图集中还整理了首页、地图、工坊、烧窑、结算、贴花和移动端的交互规则，可以与实际界面一一对照。';slides.push(s);
 }
 {
  const s=scene('07_塑形与上色');header(s,7,'06 / HANDS-ON CRAFT','把塑形做成可理解的推拉','宽手掌负责粗塑，刻刀负责减材，画笔负责已有表面的颜色。');
  screen(s,asset('shaping'),93,299,1021,640);
  number(s,'1',1202,339,C.blue,54);note(s,'从边缘开始','明确可抓取的位置，\n显示作用范围与拖动方向。',1281,333,529);
  number(s,'2',1202,547,C.blue,54);note(s,'保持一笔连续','固定本笔变形方向，\n减少斜向拖动时的跳变。',1281,542,529);
  number(s,'3',1202,756,C.sage,54);note(s,'允许试错','颜色随形状移动，\n支持撤销、重做和保存。',1281,750,529,C.sage);
  s.notes='塑形是这次交互优化的重点。最初的问题是，斜向拖动可能让变形方向突然切换，玩家难以判断手掌究竟在影响哪里。现在会先抓住边缘，在同一笔中保持稳定方向，配合作用范围和箭头提示。同时，颜色会跟着瓷泥一起移动，拖回起点也能正确恢复。雕刻和上色各有自己的工具，玩家可以自由尝试，再通过撤销和重做控制修改。';slides.push(s);
 }
 {
  const s=scene('08_烧窑判定',C.dark);text(s,'TERRA / 景德镇瓷器之旅',88,35,1000,22,{color:'AFC2CC'});text(s,'07 / KILN TIMING',1370,35,460,22,{align:'right',color:'AFC2CC'});
  text(s,'让烧窑成为一次有节奏的决定',88,111,1740,70,{bold:true,color:'FFFDF7'});text(s,'观察指针进入火候区间，按一次空格，锁定这一件作品的结果。',92,213,1732,32,{color:'B8CBD4'});
  svg(s,gaugeSvg(),122,339,733,631);text(s,'9',344,592,286,128,{bold:true,color:'FFFDF7',align:'center'});text(s,'秒 · 单轮判定',307,755,360,35,{color:'D6E1E4',align:'center'});
  const rows=[['一般','×1','提前、错过或超时，保留基础奖励。','DDD9C8'],['成功','×1.1','指针位于 50%—80% 区间。','EAB16D'],['完美','×1.25','指针位于 62%—70% 区间。','CE6433']];
  rows.forEach(([grade,multi,desc,color],i)=>{const y=354+i*183;rect(s,987,y,846,159,'23465B',{radius:17});rect(s,987,y,9,159,color);text(s,grade,1020,y+27,199,48,{bold:true,color:'FFFDF7'});text(s,multi,1468,y+21,314,64,{bold:true,color,align:'right'});text(s,desc,1020,y+100,756,29,{color:'C3D3DB'});});
  text(s,'离开面板暂停 · 已完成判定保存 · 实际修改作品后需重烧',99,972,1718,27,{color:'B8CBD4'});
  s.notes='烧窑从观看动画变成了一次小型节奏挑战。指针在九秒内走过扇环，玩家按一次空格锁定火候，触屏也有等效按钮。成功区间比较宽，完美区间更窄，对应不同金币倍率。一般结果不会扣减基础奖励，因此失误不会破坏正常通关节奏。离开面板会暂停，完成的判定可以保存；如果之后实际修改了作品，就需要重新烧制，保证火候与当前作品对应。';slides.push(s);
 }
 {
  const s=scene('09_评分反馈');header(s,9,'08 / FEEDBACK & REWARD','分数解释质量，金币体现火候','通关看相似度，奖励再乘火候倍率；两种反馈分别说明。');
  screen(s,asset('result'),99,301,943,662);
  text(s,'相似度构成',1145,320,643,42,{bold:true});rect(s,1148,405,435,40,C.blue);rect(s,1583,405,234,40,C.sage);text(s,'形状 65%',1147,467,367,34,{color:C.blue,bold:true});text(s,'上色 35%',1544,467,280,34,{color:'557360',bold:true});
  chip(s,'80% 达到通关标准',1147,551,585,C.blueLight,C.blue,32);
  text(s,'奖励示例',1146,658,639,39,{bold:true});text(s,'100 × 1.25 = 125 币',1146,737,659,49,{bold:true,color:C.clay});text(s,'满分作品 + 完美火候\n基础奖励与额外加成分开展示。',1148,826,652,31,{color:C.muted});
  s.notes='评分由形状轮廓和上色共同组成，权重分别是百分之六十五和百分之三十五，达到百分之八十通过关卡。金币先根据相似度取得基础奖励，再乘以火候倍率并取整。这里展示的是满分作品加完美火候，一百枚基础金币变成一百二十五枚。我们把基础和加成分开显示，避免玩家误以为烧窑能改变相似度。未通过时可以重试，已经获得的金币保留。';slides.push(s);
 }
 {
  const s=scene('10_四件收藏');header(s,10,'09 / COLLECTION','每一站，都带走一件成品','让抽象的进度，变成能够旋转欣赏的纪念。');
  const names=['青花瓷碗','玲珑白瓷碗','红金窑变碗','粉彩花瓣碗'],colors=[C.blue,C.sage,C.clay,C.pink];
  names.forEach((name,i)=>{const x=88+i*447;rect(s,x,316,408,465,C.white,{radius:20});text(s,'0'+(i+1),x+28,344,344,29,{color:colors[i],bold:true});image(s,asset('bowl-'+(i+1)),x+1,402,407,276);text(s,name,x+24,697,361,39,{bold:true,align:'center',color:colors[i]});});
  const actions=['完成本站五关','400 币购买贴画','选择并贴到碗上','收藏后进入下一站'];actions.forEach((label,i)=>{const x=88+i*447;chip(s,label,x,861,408,i===2?C.clayLight:C.blueLight,i===2?C.clay:C.blue,28);if(i<3)line(s,x+414,885,x+438,885,C.sage,3,true);});
  s.notes='每个场景结束时，玩家会用积累的金币购买一张专属贴画。购买后还需要亲自选择纹样，再点击白瓷碗完成贴花，这一步把奖励变成最后一个制作动作。四件成品分别对应四站主题，收藏后还能再次打开三维预览。这里的成品使用统一的碗形和不同纹样，强调的是场景纪念与视觉收集，而不是声称已经实现了四套独立的三维拉坯系统。';slides.push(s);
 }
 {
  const s=scene('11_实现与验证');header(s,11,'10 / IMPLEMENTATION','用清楚的状态，连接每一次操作','网页端完成制作、渲染、结算与保存，已部署到 GitHub Pages。');
  const layers=[['输入与界面','鼠标 / 键盘 / 触屏\nDOM 与 CSS',C.blue],['作品与规则','112 × 112 正面编辑\n关卡、火候与奖励状态',C.sage],['视觉与保存','Three.js + Canvas\n浏览器本地存档',C.clay]];
  layers.forEach(([title,body,color],i)=>{const x=88+i*596;rect(s,x,333,552,326,C.white,{radius:20});number(s,i+1,x+28,362,color,52);text(s,title,x+30,446,492,44,{bold:true});text(s,body,x+32,527,488,33,{color:C.muted});if(i<2)line(s,x+562,495,x+586,495,C.sage,4,true);});
  const stats=[['4','主题地点'],['20','关卡订单'],['6','制作工位'],['30','逻辑测试']];stats.forEach(([n,label],i)=>{const x=91+i*448;text(s,n,x,740,404,94,{bold:true,color:i===3?C.clay:C.blue});text(s,label,x+3,872,391,31,{color:C.muted});});
  text(s,'已完成桌面、窄屏、触屏及完整四场景流程检查。',93,958,1730,30,{color:C.blue});
  s.notes='实现上，我们把输入界面、作品规则和渲染保存分开组织。工坊和成品预览用 Three.js，制作过程用正面像素数据和 Canvas 表现，作品、金币、关卡和火候结果保存在浏览器中。目前完成了四个场景、每站五关、六个工位，以及三十项逻辑测试。还检查了桌面、窄屏、触屏和四场景完整流程。这里的编辑本质上仍是正面二维数据，并不是体积陶泥物理模拟。';slides.push(s);
 }
 {
  const s=scene('12_迭代重点');header(s,12,'11 / ITERATION','这一轮迭代，围绕体验中的具体阻力','重点是让玩家更容易看清目标、开始操作，并理解结果。');
  const rows=[['首页展示','多件同时旋转，观察焦点分散','单件展示 + 悬停暂停 + 闲置切换',C.blue],['工坊操作','长按 E，进入工位需要等待','单次 F + 可旋转与缩放的视角',C.sage],['烧窑反馈','烧制与最终奖励联系较弱','必经判定 + 三档火候 + 金币加成',C.clay]];
  rows.forEach(([label,before,after,color],i)=>{const y=330+i*204;rect(s,88,y,1744,176,C.white,{radius:18});text(s,label,119,y+38,306,46,{bold:true,color});text(s,'原先',474,y+27,510,25,{color:C.muted});text(s,before,474,y+80,526,32,{color:C.muted});line(s,1034,y+89,1094,y+89,color,4,true);text(s,'现在',1141,y+27,626,25,{color});text(s,after,1141,y+80,626,34,{bold:true,color});});
  s.notes='回顾这轮迭代，我们优先解决具体的体验阻力。首页从四件一起转动改为单件展示，让观看有明确焦点。工位交互从长按 E 改成单次 F，相机也能自由观察。烧窑则从与结果关联较弱的步骤，变成有判定、有奖励反馈的必经环节。同时还调整了小字号、窄屏排版和塑形的方向稳定性。这些改动都围绕同一个目标：让玩家更清楚自己正在做什么。';slides.push(s);
 }
 {
  const s=scene('13_局限与下一步');header(s,13,'12 / REFLECTION','完成可玩的闭环，继续验证体验','当前成果与后续计划分开呈现，避免把设想当作已经完成。');
  card(s,'当前边界','正面编辑，非体积拉坯','用 112 × 112 正面数据\n记录形状与颜色，\n通过渲染与成品预览\n表现立体感。',88,336,548,521,C.blue);
  card(s,'内容边界','四站共享五类订单','场景、建筑和纹样有变化，但任务结构复用。后续可增加器型与文化讲解的关联。',686,336,548,521,C.sage);
  card(s,'下一步计划','用新手测试寻找改进点','重点观察边缘抓取、烧窑时机和地图理解；再迭代引导、工具手感与内容层次。',1284,336,548,521,C.clay);
  text(s,'拟观察：首次成功操作 / 首次通关过程 / 火候规则理解。尚未开展正式用户研究。',94,927,1726,31,{color:C.muted});
  s.notes='当前作品已经形成完整可玩的闭环，但也有明确边界。首先，塑形还不是三维体积模拟。其次，四站共享五类订单，内容变化更多体现在场景和纹样上。接下来最有价值的事情，是让第一次接触的同学实际游玩，观察他们能否找到边缘、理解烧窑时机，以及顺利完成第一关。我们尚未开展正式用户研究，因此不会把测试通过数量当作学习效果或用户满意度的证明。';slides.push(s);
 }
 {
  const s=scene('14_体验入口');image(s,asset('logo'),89,57,244,77);text(s,'课程作品展示 / 谢谢观看',1286,74,545,29,{align:'right',color:C.muted});
  text(s,'打开链接，\n亲手做一件瓷器。',88,259,1190,94,{bold:true,h:267});
  text(s,'现场演示建议 · 约 60 秒',95,622,1120,37,{color:C.blue,bold:true});
  const demos=['首页观察成品','地图进入工坊','塑形与烧窑','展示结算藏品'];demos.forEach((label,i)=>{number(s,i+1,98+i*282,718,C.blue,38);text(s,label,98+i*282,783,251,31,{bold:true});});
  rect(s,1376,291,450,490,C.white,{radius:22});image(s,asset('qr'),1424,328,354,354,{href:SITE});text(s,'扫码体验在线版本',1407,710,389,31,{align:'center',color:C.blue,bold:true,href:SITE});
  line(s,89,922,1830,922,C.line,2);text(s,SITE,95,955,1733,28,{color:C.blue,href:SITE});
  s.notes='最后可以打开页面做一段简短演示。建议先展示首页的成品旋转和悬停介绍，再用地图进入工坊，说明移动与 F 键交互。接着演示一次边缘推压和一次烧窑判定，最后用结算和藏品说明完整目标。正式课堂演示前，可以提前打开网页；如果网络不稳定，也可以使用配套截图和原型图完成讲解。感谢大家，欢迎直接扫码体验，并反馈最难理解的一个操作。';slides.push(s);
 }
 return slides;
}
