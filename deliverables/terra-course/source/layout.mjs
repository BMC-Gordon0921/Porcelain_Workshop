import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

export const OUT=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const runtime=process.env.PRESENTATION_RUNTIME||path.join(OUT,'source/runtime');
const require=createRequire(path.join(runtime,'package.json'));
export const PptxGenJS=require('pptxgenjs');
export const QRCode=require('qrcode');
export const C={paper:'F5F1E7',white:'FFFDF7',ink:'243E50',muted:'65767B',blue:'285487',blueLight:'E2EBF2',sage:'7C9483',sageLight:'E7EDE3',gold:'B48C52',clay:'BB6842',clayLight:'F5E4D6',line:'D5DCD8',dark:'183448',pink:'B984A0'};
export const SITE='https://bmc-gordon0921.github.io/Porcelain_Workshop/';
const W=1920,H=1080,S=144;
export const asset=n=>path.join(OUT,'assets',n+'.png');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const widthOf=(s,size)=>[...s].reduce((n,c)=>n+(c.charCodeAt(0)>255?1:/[MW@]/.test(c)?.85:/[il., :;!|]/.test(c)?.3:.56),0)*size;
export function wrap(str,w,size){
 return String(str).split('\n').flatMap(paragraph=>{const lines=[];let line='';for(const char of paragraph){if(line&&widthOf(line+char,size)>w){lines.push(line.trim());line=char;}else line+=char;}lines.push(line.trim());return lines;});
}
export function scene(name,bg=C.paper){return {name,bg,elements:[],notes:''};}
export function rect(s,x,y,w,h,fill=C.white,options={}){s.elements.push({type:'rect',x,y,w,h,fill,...options});}
export function ellipse(s,x,y,w,h,fill,options={}){s.elements.push({type:'ellipse',x,y,w,h,fill,...options});}
export function text(s,str,x,y,w,size=36,options={}){
 const lines=wrap(str,w,size),h=options.h||lines.length*size*1.34+size*.15;
 s.elements.push({type:'text',x,y,w,h,size,lines,color:C.ink,font:'Microsoft YaHei',...options});
}
export function line(s,x1,y1,x2,y2,color=C.line,width=2,arrow=false){s.elements.push({type:'line',x1,y1,x2,y2,color,width,arrow});}
export function image(s,file,x,y,w,h,options={}){s.elements.push({type:'image',file,x,y,w,h,...options});}
export function svg(s,data,x,y,w,h){s.elements.push({type:'svg',data,x,y,w,h});}
export function chip(s,label,x,y,w,fill=C.blueLight,color=C.blue,size=25){rect(s,x,y,w,48,fill,{radius:24});text(s,label,x+12,y+6,w-24,size,{align:'center',color,h:36,bold:true});}
export function number(s,n,x,y,color=C.blue,size=48){ellipse(s,x,y,size,size,color);text(s,n,x,y+size*.11,size,size*.5,{align:'center',color:'FFFFFF',bold:true,h:size*.76});}
export function screen(s,file,x,y,w,h){rect(s,x-8,y-8,w+16,h+16,C.white,{radius:16,stroke:C.line});image(s,file,x,y,w,h);}
export function card(s,kicker,title,body,x,y,w,h,accent=C.blue){rect(s,x,y,w,h,C.white,{radius:18});rect(s,x,y,6,h,accent);text(s,kicker,x+30,y+28,w-60,25,{color:accent,bold:true});text(s,title,x+30,y+87,w-60,43,{bold:true});text(s,body,x+30,y+167,w-60,32,{color:C.muted});}
export function header(s,n,kicker,title,subtitle=''){
 text(s,'TERRA / 景德镇瓷器之旅',88,35,1000,22,{color:C.muted});text(s,kicker,1390,35,442,22,{align:'right',color:C.muted});
 text(s,title,88,109,1730,70,{bold:true});if(subtitle)text(s,subtitle,92,210,1700,32,{color:C.muted});
 line(s,88,1018,1832,1018,C.line,1);text(s,'课程作品展示 · 2026.10',88,1034,1400,21,{color:C.muted});text(s,String(n).padStart(2,'0'),1760,1031,70,24,{color:C.blue,align:'right'});
}
export function note(s,title,body,x,y,w=470,color=C.blue){text(s,title,x,y,w,39,{bold:true,color});text(s,body,x,y+64,w,32,{color:C.muted});}
export function vessel(s,x,y,w,h,color=C.line){
 const data=`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="300" viewBox="0 0 320 300"><path d="M28 54 Q160 95 292 54 Q274 184 204 228 L196 248 L124 248 L116 228 Q46 184 28 54Z" fill="#FFFDF7" stroke="#${color}" stroke-width="6"/><ellipse cx="160" cy="54" rx="132" ry="36" fill="#F5F1E7" stroke="#${color}" stroke-width="6"/><path d="M80 155 Q160 190 240 155" fill="none" stroke="#${color}" stroke-width="8"/></svg>`;
 svg(s,data,x,y,w,h);
}
export function gaugeSvg({colored=true,needle=.66}={}){
 const p=(t,r)=>{const a=(-120+t*240)*Math.PI/180;return [250+r*Math.sin(a),245-r*Math.cos(a)];};
 const arc=(a,b,color)=>{const A=p(a,207),B=p(b,207),D=p(b,147),E=p(a,147),big=b-a>.75?1:0;return `<path d="M${A} A207 207 0 ${big} 1 ${B} L${D} A147 147 0 ${big} 0 ${E}Z" fill="#${color}"/>`;};
 const A=p(needle,140),B=p(needle,211);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="430" viewBox="0 0 500 430">${arc(0,1,colored?'DDD9C8':'E5E8E6')}${arc(.5,.8,colored?'EAB16D':'C2CCCB')}${arc(.62,.7,colored?'CE6433':'8D9F9F')}<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#${colored?'CE6433':'596D71'}" stroke-width="12" stroke-linecap="round"/><circle cx="${B[0]}" cy="${B[1]}" r="9" fill="#${colored?'904827':'596D71'}"/></svg>`;
}
function imageData(file){return 'data:image/png;base64,'+fs.readFileSync(file).toString('base64');}
function pngSize(file){const b=fs.readFileSync(file);return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)};}
function fit(file,x,y,w,h){const dim=pngSize(file),scale=Math.min(w/dim.w,h/dim.h);return {x:x+(w-dim.w*scale)/2,y:y+(h-dim.h*scale)/2,w:dim.w*scale,h:dim.h*scale};}
export function renderSVG(s){
 const output=[`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker></defs><rect width="1920" height="1080" fill="#${s.bg}"/>`];
 for(const e of s.elements){
  if(e.type==='rect')output.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.radius||0}" fill="#${e.fill}" ${e.stroke?`stroke="#${e.stroke}" stroke-width="${e.strokeWidth||2}"`:''}/>`);
  if(e.type==='ellipse')output.push(`<ellipse cx="${e.x+e.w/2}" cy="${e.y+e.h/2}" rx="${e.w/2}" ry="${e.h/2}" fill="#${e.fill}" ${e.stroke?`stroke="#${e.stroke}" stroke-width="${e.strokeWidth||2}"`:''}/>`);
  if(e.type==='line')output.push(`<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="#${e.color}" stroke-width="${e.width}" ${e.arrow?'marker-end="url(#arrow)"':''}/>`);
  if(e.type==='text'){const anchor=e.align==='center'?'middle':e.align==='right'?'end':'start',x=e.align==='center'?e.x+e.w/2:e.align==='right'?e.x+e.w:e.x;output.push(`<text fill="#${e.color}" font-family="${e.font},Microsoft YaHei,sans-serif" font-size="${e.size}" font-weight="${e.bold?700:400}" text-anchor="${anchor}">${e.lines.map((t,i)=>`<tspan x="${x}" y="${e.y+e.size*.99+i*e.size*1.34}">${esc(t)}</tspan>`).join('')}</text>`);}
  if(e.type==='image'){const f=fit(e.file,e.x,e.y,e.w,e.h);output.push(`<image x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" xlink:href="${imageData(e.file)}"/>`);}
  if(e.type==='svg')output.push(`<image x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" xlink:href="data:image/svg+xml;base64,${Buffer.from(e.data).toString('base64')}"/>`);
 }
 output.push('</svg>');return output.join('');
}
export async function deck(slides,name,subject){
 const pptx=new PptxGenJS();pptx.defineLayout({name:'TERRA',width:W/S,height:H/S});pptx.layout='TERRA';pptx.author='Terra · 景德镇瓷器之旅';pptx.subject=subject;pptx.title=name;pptx.company='课程作品';pptx.lang='zh-CN';pptx.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei',lang:'zh-CN'};
 for(const s of slides){
  const slide=pptx.addSlide();slide.background={color:s.bg};
  for(const e of s.elements){
   if(['rect','ellipse'].includes(e.type))slide.addShape(e.type==='ellipse'?pptx.ShapeType.ellipse:e.radius?pptx.ShapeType.roundRect:pptx.ShapeType.rect,{x:e.x/S,y:e.y/S,w:e.w/S,h:e.h/S,rectRadius:(e.radius||0)/S,radius:(e.radius||0)/S,fill:{color:e.fill},line:{color:e.stroke||e.fill,width:e.stroke?(e.strokeWidth||2)*.5:0,transparency:e.stroke?0:100},rotate:e.rotate||0});
   if(e.type==='text')slide.addText(e.lines.join('\n'),{x:e.x/S,y:e.y/S,w:e.w/S,h:e.h/S,fontFace:e.font,fontSize:e.size/2,color:e.color,bold:!!e.bold,align:e.align||'left',valign:'top',margin:0,breakLine:false,lineSpacingMultiple:1.05,paraSpaceAfter:0,fit:'shrink',hyperlink:e.href?{url:e.href}:undefined});
   if(e.type==='line'){const left=e.x2<e.x1,up=e.y2<e.y1;slide.addShape(pptx.ShapeType.line,{x:Math.min(e.x1,e.x2)/S,y:Math.min(e.y1,e.y2)/S,w:Math.max(.2,Math.abs(e.x2-e.x1))/S,h:Math.max(.2,Math.abs(e.y2-e.y1))/S,flipH:left,flipV:up,line:{color:e.color,width:e.width/2,endArrowType:e.arrow?'triangle':undefined}});}
   if(e.type==='image'){const f=fit(e.file,e.x,e.y,e.w,e.h);slide.addImage({path:e.file,x:f.x/S,y:f.y/S,w:f.w/S,h:f.h/S,hyperlink:e.href?{url:e.href}:undefined});}
   if(e.type==='svg')slide.addImage({data:'image/svg+xml;base64,'+Buffer.from(e.data).toString('base64'),x:e.x/S,y:e.y/S,w:e.w/S,h:e.h/S});
  }
  if(s.notes)slide.addNotes(s.notes);
 }
 await pptx.writeFile({fileName:path.join(OUT,name+'.pptx')});
}
export function audit(slides){
 const issues=[];
 for(const s of slides)for(const e of s.elements){if(e.type==='line')continue;if(e.x<0||e.y<0||e.x+e.w>1921||e.y+e.h>1081)issues.push(`${s.name}: ${e.type} outside canvas ${e.x},${e.y},${e.w},${e.h}`);}
 if(issues.length)throw new Error(issues.join('\n'));
}
