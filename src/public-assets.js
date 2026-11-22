// 小工具包里位图统一是 WebP（tools/minitool/prepare_assets.py 转换），
// 这里把同一套逻辑路径改写到 .webp；桌面/原生构建保持原扩展名。
const MINITOOL = typeof __MINITOOL__ !== 'undefined' && __MINITOOL__;

export function publicAsset(path){
 const clean = path.replace(/^\/+/, '');
 const resolved = MINITOOL ? clean.replace(/\.(png|jpe?g)$/i, '.webp') : clean;
 return (import.meta.env?.BASE_URL ?? '/') + resolved;
}
