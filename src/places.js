// Coordinates use the supplied 1024 × 1024 illustrated map, not a road-navigation map.
import {publicAsset} from './public-assets.js';
export const CITY_MAP=publicAsset('maps/jingdezhen.png');
export const PLACES=[
 {id:'guyao',name:'古窑民俗博览区',shortName:'古窑民俗',chapter:'第一站 · 窑火初见',tag:'古窑 · 制瓷 · 传承',point:[606,188],workshop:'古窑手作坊',story:'从老窑的烟囱下出发，让第一抹青花在瓷泥上生长。',arrival:'窑火微明，木架上摆着待烧的瓷坯。你的第一份青花订单正在这里等你。',architecture:'砖窑、烟囱、灰瓦坡顶与木制晾坯架',sticker:'青花缠枝纹',stamp:'窑火',color:'#995637'},
 {id:'museum',name:'中国陶瓷博物馆',shortName:'陶瓷博物馆',chapter:'第二站 · 瓷光入藏',tag:'展馆 · 玲珑 · 光影',point:[821,447],workshop:'博物馆体验工坊',story:'循着昌江的水色，走进收藏瓷光的展馆，寻找白瓷上的玲珑花影。',arrival:'明亮的展厅与玻璃展柜之间，观察瓷器的形与光，把玲珑纹样带回你的碗上。',architecture:'现代展馆、玻璃幕墙、陈列柜与青花大瓶',sticker:'玲珑白瓷纹',stamp:'瓷光',color:'#457b89'},
 {id:'imperial',name:'御窑厂国家考古遗址公园',shortName:'御窑厂遗址',chapter:'第三站 · 御窑寻色',tag:'遗址 · 拱券 · 流釉',point:[266,511],workshop:'御窑遗址研习坊',story:'转向御窑旧址，穿过红砖拱券，在窑火留下的颜色里寻找金与红。',arrival:'砖拱与旧窑遗迹围起新的手作课堂。完成五份订单，收集一张红金窑变贴画。',architecture:'红砖拱券、残墙、考古探方与旧窑基座',sticker:'红金窑变纹',stamp:'御色',color:'#aa553f'},
 {id:'taoxichuan',name:'陶溪川文创街区',shortName:'陶溪川',chapter:'第四站 · 花开陶溪',tag:'厂房 · 市集 · 新生',point:[452,718],workshop:'陶溪川创意工坊',story:'最后来到陶溪川，在老厂房与创意市集间，给这段旅程添上一瓣粉色。',arrival:'高烟囱旁的红砖厂房亮起灯光。把最后一张花瓣贴画贴上瓷碗，集齐景德镇四件纪念。',architecture:'红砖厂房、锯齿屋顶、高烟囱与文创市集',sticker:'粉彩花瓣纹',stamp:'花开',color:'#9d6179'},
];
export const ROUTE_SEGMENTS=[
 'M606 188 C624 263 718 300 755 360 S790 420 821 447',
 'M821 447 C729 423 679 489 555 470 S350 461 266 511',
 'M266 511 C308 581 384 552 398 614 S420 688 452 718',
];
export const INTRO_DURATION=8400;
export const INTRO_LINES=[
 '因瓷而名，因瓷而兴。\n山水之间，一座城市与泥、火相伴。',
 '千年窑火不熄，匠心代代相传。\n从一抔瓷泥，到一件温润的器物。',
 '走过古窑与展馆，穿行遗址与街巷。\n把景德镇的故事，做成属于你的瓷韵。',
];
export const OPENING_DURATION=11200;
export function openingFrame(elapsed){
 const progress=Math.min(1,Math.max(0,elapsed/OPENING_DURATION));
 return {progress,chapter:Math.min(3,Math.floor(progress*4)),complete:progress>=1};
}
