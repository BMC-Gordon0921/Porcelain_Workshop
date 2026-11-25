import {PLACES} from './places.js';
export const DECAL_PRICE = 400;
export const ORDERS_PER_SCENE = 3;
export const SAVE_KEY = 'terra-porcelain-journey-v6';
export const SCENES = [
  {id:'blue-floral', name:PLACES[0].name, decal:'青花缠枝纹', product:'青花瓷碗', accent:'#254e8a', light:'#dfeaf4', wall:0xc6d6e1, floor:0xdce4e8, sun:0xe5f0ff, description:'钴蓝花朵、舒展的藤蔓与双线边饰，自绘于碗身。'},
  {id:'linglong', name:PLACES[1].name, decal:'玲珑白瓷纹', product:'玲珑白瓷碗', accent:'#617e85', light:'#e9f0ec', wall:0xdbe7df, floor:0xe6e9dc, sun:0xf5ffed, description:'米粒状花瓣在淡青白釉上透出柔光，纹样全部程序生成。'},
  {id:'kiln-flame', name:PLACES[2].name, decal:'红金窑变纹', product:'红金窑变碗', accent:'#a4442e', light:'#f6e3d3', wall:0xcc9d7a, floor:0xdec4ab, sun:0xffcb91, description:'金黄、朱红与深紫化作向下流淌的釉色，程序生成。'},
  {id:'pink-petals', name:PLACES[3].name, decal:'粉彩花瓣纹', product:'粉彩花瓣碗', accent:'#a0577a', light:'#f5e5ed', wall:0xe7cddd, floor:0xe8dece, sun:0xffe1f0, description:'粉色花瓣、纤细脉络与嫩绿花萼环绕碗身，程序生成。'},
];

export function rewardForScore(score) {
  if (!Number.isFinite(score) || score < 60) return 0;
  return Math.min(100, Math.floor(score / 10) * 10);
}
