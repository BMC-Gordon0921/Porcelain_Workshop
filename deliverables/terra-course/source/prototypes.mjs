import {C,scene,rect,text,line,ellipse,image,svg,chip,number,screen,vessel,gaugeSvg,asset} from './layout.mjs';

export function wireframe(s,kind,x,y,w,h){
 const sx=w/1000,sy=h/620,sc=Math.min(sx,sy);
 const r=(a,b,c,d,fill=C.white,o={})=>rect(s,x+a*sx,y+b*sy,c*sx,d*sy,fill,{stroke:C.line,...o});
 const t=(label,a,b,c,size=31,o={})=>text(s,label,x+a*sx,y+b*sy,c*sx,size*sc,o);
 const l=(a,b,c,d,color=C.line,width=2,arrow=false)=>line(s,x+a*sx,y+b*sy,x+c*sx,y+d*sy,color,width,arrow);
 const btn=(label,a,b,c=240,fill=C.blueLight)=>{r(a,b,c,57,fill,{radius:10,stroke:C.line});t(label,a+10,b+11,c-20,28,{align:'center',color:C.blue,bold:true});};
 const dots=(a,b,label)=>{number(s,label,x+a*sx,y+b*sy,C.blue,40*sc);};
 r(0,0,1000,620,C.white,{radius:16});r(0,0,1000,64,C.blueLight,{radius:10});t('terra · 景德镇瓷器之旅',24,15,720,26,{bold:true});
 if(kind==='home'){
  t('跳过介绍',794,20,180,24);t('景德镇',64,156,420,70,{bold:true});t('千年瓷都 · 窑火不息',66,260,420,29,{color:C.muted});
  for(let i=0;i<3;i++)r(66,325+i*26,300-i*38,9,'E3E7E3',{stroke:null});
  vessel(s,x+590*sx,y+150*sy,330*sx,280*sy,C.sage);btn('进入地图介绍',66,460,290);r(565,462,370,99,C.paper);t('器物名称 / 悬停简介',588,485,330,29);dots(837,100,'1');dots(535,468,'2');dots(30,460,'3');
 }else if(kind==='map'){
  t('一张地图，四处瓷韵',38,130,335,48,{bold:true});t('地点故事\n当前章节与路线提示',42,275,300,30,{color:C.muted});btn('从古窑出发',42,476,300);
  r(422,102,535,443,C.paper);const points=[[742,160],[851,333],[509,360],[649,457]];points.forEach((p,i)=>{if(i)l(points[i-1][0]+15,points[i-1][1]+15,p[0]+15,p[1]+15,C.sage,4);dots(p[0],p[1],String(i+1));});t('景德镇手绘地图',530,112,350,28,{color:C.muted});t('暂停 / 跳过路线 / 重播',450,565,490,25);
 }else if(kind==='world'){
  t('地图 / 声音 / 帮助',677,19,310,26);r(24,94,696,438,C.paper);r(742,94,235,438,C.blueLight);t('当前订单',764,118,190,31,{bold:true});r(771,180,175,150,C.white);t('目标参考',784,232,150,28);t('关卡 / 金币\n贴画目标',762,370,192,29);const stations=[['取泥',60,145],['塑形',270,126],['雕刻',480,146],['窑炉',63,340],['上色',286,345],['交付',506,339]];for(const [name,a,b] of stations){r(a,b,145,100,C.white);t(name,a+15,b+29,115,31,{align:'center'});}ellipse(s,x+340*sx,y+260*sy,52*sc,52*sc,C.sage);t('角色',401,270,140,26);btn('靠近工位按 F',303,461,300);t('WASD 移动 · 左键旋转 · 滚轮缩放',32,567,930,28);dots(665,111,'1');dots(934,104,'2');
 }else if(kind==='shape'||kind==='paint'){
  t(kind==='shape'?'粗塑成形 / 宽手掌':'手绘上色 / 瓷白与钴蓝',32,91,880,36,{bold:true});r(32,157,572,330,C.paper);for(let i=1;i<8;i++)l(32+i*71,157,32+i*71,487,'DEE0D9',1);for(let i=1;i<5;i++)l(32,157+i*65,604,157+i*65,'DEE0D9',1);
  r(158,183,322,266,C.white,{radius:85,stroke:'AAB8B5'});if(kind==='paint')r(160,316,318,46,C.blue,{stroke:null});else{ellipse(s,x+100*sx,y+260*sy,142*sc,142*sc,C.blueLight,{stroke:C.blue});l(138,331,258,331,C.blue,5,true);}
  r(654,158,306,217,C.paper);t('独立参考图',704,246,223,31);t('观察轮廓与纹样',648,405,315,29,{color:C.muted});
  if(kind==='paint'){ellipse(s,x+700*sx,y+466*sy,44*sc,44*sc,C.white,{stroke:C.sage});ellipse(s,x+788*sx,y+466*sy,44*sc,44*sc,C.blue);t('色板',853,471,115,25);}else t('边缘提示 / 拖动方向',647,465,317,27,{color:C.blue});
  t('工具大小',37,522,160,26);l(197,537,423,537,C.sage,6);ellipse(s,x+287*sx,y+526*sy,22*sc,22*sc,C.sage);btn('撤销 / 重做',449,513,210);btn('保存并离开',706,547,254);dots(31,177,'1');dots(610,171,'2');
 }else if(kind==='kiln'){
  t('烧制前准备',53,102,420,36,{bold:true});vessel(s,x+85*sx,y+233*sy,280*sx,225*sy);t('当前作品',100,453,240,28,{align:'center'});
  svg(s,gaugeSvg({colored:false}),x+465*sx,y+123*sy,444*sx,362*sy);t('火候判定',545,316,270,36,{align:'center',bold:true});t('一般 / 成功 / 完美',500,475,408,28,{align:'center'});btn('开始烧制',57,540,275);btn('空格 · 锁定火候',473,540,414);dots(860,203,'1');dots(899,546,'2');
 }else if(kind==='result'){
  t('作品结算',42,96,800,39,{bold:true});r(43,179,265,259,C.paper);r(330,179,265,259,C.paper);t('我的作品',88,284,190,31,{align:'center'});t('订单参考',367,284,190,31,{align:'center'});
  r(630,176,319,264,C.blueLight);t('相似度',680,210,216,30,{align:'center'});t('100%',665,270,248,75,{align:'center',bold:true,color:C.blue});t('形状 65% + 上色 35%',651,375,290,24,{align:'center'});
  r(45,470,902,62,C.sageLight);t('基础奖励 100  +  完美加成 25  =  125 币',80,484,833,31,{align:'center',bold:true});btn('继续下一关 / 重试',623,550,324);dots(905,178,'1');dots(36,478,'2');
 }else if(kind==='decal'){
  t('为白瓷碗贴上新纹样',38,101,906,40,{bold:true});r(38,168,540,360,C.paper);vessel(s,x+142*sx,y+204*sy,337*sx,293*sy,C.sage);
  r(616,169,337,171,C.blueLight);t('已购买的场景贴画',651,227,278,31,{align:'center',color:C.blue});t('① 选择纹样\n② 点击瓷碗或贴花按钮\n③ 收入藏品',621,372,320,28);btn('贴到碗上',619,538,335);t('可拖动查看成品',89,554,470,28);dots(931,170,'1');dots(565,362,'2');
 }else if(kind==='mobile'){
  r(345,81,310,514,C.paper,{radius:28,stroke:'8EA0A3'});t('terra     地图 / 帮助',365,103,266,23,{bold:true});r(365,146,268,86,C.white);t('订单与进度',399,174,210,25);r(365,249,268,199,C.sageLight);t('3D 工坊',411,325,180,37,{align:'center'});btn('方向键',364,467,126);btn('操作 F',506,467,126);t('烧窑提供触屏判定按钮',232,552,556,26,{align:'center'});
  t('竖屏布局',44,240,258,39,{bold:true});t('关键动作\n使用可点击控件',42,314,255,31,{color:C.muted});t('面板可滚动',714,246,252,37,{bold:true});t('保留制作区、\n参考图和操作入口',714,314,257,29,{color:C.muted});
 }
}

export function makePrototypes(){
 const slides=[];
 const overview=scene('00_交互流程总览');
 text(overview,'TERRA · 游戏原型图集',88,38,1400,24,{color:C.muted});text(overview,'从一抔泥，到四件藏品',88,110,1740,66,{bold:true});text(overview,'主流程、返回路径与关键门槛｜对应当前已实现版本',92,210,1720,32,{color:C.muted});
 const nodes=[['首页',88,350,'单件展示 / 选择入口'],['地图介绍',440,350,'可进入，也可跳过'],['工坊',792,350,'移动到对应工作台'],['自由制作',1144,350,'塑形 / 雕刻 / 上色'],['烧窑判定',1496,350,'9 秒内按一次空格'],['作品结算',1496,660,'80% 通关'],['贴花',1144,660,'五关完成 + 400 币'],['场景成品',792,660,'贴好后收入藏品'],['换站 / 完成',440,660,'按已完成站数继续'],['四件集齐',88,660,'终站贴花后完成游历']];
 nodes.forEach(([title,x,y,sub],i)=>{rect(overview,x,y,304,173,C.white,{radius:18});number(overview,String(i+1).padStart(2,'0'),x+22,y+20,i===4?C.clay:C.blue,40);text(overview,title,x+24,y+70,260,41,{bold:true});text(overview,sub,x+24,y+125,262,24,{color:C.muted});});
 for(let i=0;i<4;i++)line(overview,nodes[i][1]+310,437,nodes[i+1][1]-12,437,C.sage,4,true);
 line(overview,1648,531,1648,645,C.clay,4,true);
 line(overview,240,339,240,302,C.blue,2);line(overview,240,302,944,302,C.blue,2);line(overview,944,302,944,339,C.blue,2,true);text(overview,'跳过地图介绍，按存档进入',350,264,540,24,{color:C.blue});
 line(overview,592,649,592,602,C.blue,2);line(overview,592,602,944,602,C.blue,2);line(overview,944,602,944,535,C.blue,2,true);text(overview,'前 3 站：继续下一站制作',608,559,455,24,{color:C.blue});
 for(let i=5;i<9;i++)line(overview,nodes[i][1]-10,748,nodes[i+1][1]+316,748,C.sage,4,true);
 text(overview,'本站未满五关：返回工坊继续订单；未达 80% 可重试，已获金币保留。',92,912,1725,31,{color:C.blue});
 text(overview,'注：实际修改作品后需重新烧窑；贴花与场景收藏在本站五关全部通过后开放。',92,968,1725,26,{color:C.muted});slides.push(overview);
 const specs=[
  ['01_主页','首页｜先看到成品，再决定出发','home','home-hover', [['展示','单件 3D 成品，按青花、玲珑、窑变、粉彩循环。'],['操作','左键水平拖动；悬停显示简介并暂停。'],['跳转','离开后闲置 5 秒切换；按钮进入地图或工坊。']]],
  ['02_地图','地图｜把地点故事连接成旅程','map','map',[['内容','按 1—4 号地点介绍场景与瓷器主题。'],['控制','可暂停、跳过路线动画、选择章节或重播。'],['约束','查看未解锁地点不会越过关卡；重播保留进度。']]],
  ['03_工坊','工坊｜场景探索与制作入口','world','workshop',[['移动','WASD / 方向键移动，走近工位按 F。'],['视角','左键旋转、滚轮缩放；仰角 0°—66°。'],['信息','右侧显示订单、金币、关卡与本场景贴画目标。']]],
  ['04_塑形','塑形｜抓住边缘，连续推压或拉伸','shape','shaping',[['抓取','左右及上下外边缘可抓取；远离边缘时提示。'],['变形','本笔方向固定，作用范围平滑，颜色随形状移动。'],['容错','支持撤销 / 重做；拖回起点不新增撤销记录。']]],
  ['05_上色','上色｜参照纹样，完成自己的作品','paint','painting',[['工具','瓷白与钴蓝画笔；滑块或 [ / ] 改变大小。'],['规则','上色只改变已有表面的颜色，不补回被刻去的瓷泥。'],['保存','保存并离开或按 Esc，带着作品返回工坊。']]],
  ['06_烧窑','烧窑｜在目标区间锁定火候','kiln','kiln',[['判定','单轮 9 秒：50%—80% 成功；\n62%—70% 完美（边界计入）。'],['输入','按一次空格或触屏按钮；超时记为一般。'],['状态','面板关闭即暂停；结果会保存。\n实际修改作品后需重新烧制。']]],
  ['07_结算','结算｜看懂分数，也看懂奖励','result','result',[['评分','形状 65% + 上色 35%，达到 80% 通关。'],['奖励','基础金币 × 火候倍率：1 / 1.1 / 1.25。'],['反馈','展示基础奖励与加成；未通过可重试，金币保留。']]],
  ['08_贴花收藏','贴花与收藏｜把完成感留在瓷器上','decal','decal',[['解锁','本场景五关通过，且余额达到 400 币。'],['贴花','购买后先选贴画，再点击瓷碗或“贴到碗上”。'],['旅程','完成贴花后才可进入下一站；最终集齐四件成品。']]],
  ['09_移动端','移动端｜保留关键操作，适配竖屏','mobile','mobile-workshop',[['布局','订单、工坊、操作键分区；制作面板支持滚动。'],['输入','屏幕方向键与“操作 F”；烧窑提供点击按钮。'],['阅读','辅助信息至少 12px；触屏直接显示器物简介。']]],
 ];
 specs.forEach(([name,title,kind,shot,rules],index)=>{
  const s=scene(name);text(s,'TERRA · 游戏原型图集',88,38,1200,24,{color:C.muted});text(s,`${index+1} / 9`,1630,38,202,24,{align:'right',color:C.muted});text(s,title,88,102,1740,58,{bold:true});
  chip(s,'线框结构 · 可编辑',88,198,340);chip(s,'当前版本 · 实际界面',1009,198,360,C.sageLight,'526E5B');
  wireframe(s,kind,88,278,846,530);
  if(kind==='mobile'){image(s,asset('mobile-home'),1025,264,367,559);image(s,asset('mobile-kiln'),1426,264,367,559);}else screen(s,asset(shot),1020,278,812,530);
  rules.forEach(([label,body],i)=>{const x=88+i*587;rect(s,x,864,568,158,C.white,{radius:14});number(s,i+1,x+18,884,C.blue,37);text(s,label,x+75,884,470,29,{bold:true});text(s,body,x+22,939,523,26,{color:C.muted});});
  s.notes=rules.map(r=>r.join('：')).join('\n');slides.push(s);
 });
 return slides;
}
