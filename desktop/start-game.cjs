const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.join(__dirname,'game'),port=49173,url=`http://127.0.0.1:${port}/`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.woff2':'font/woff2'};
function openGame(){
 if(process.argv.includes('--no-open'))return;
 const edge=[process.env['ProgramFiles(x86)'],process.env.ProgramFiles].filter(Boolean).map(p=>path.join(p,'Microsoft/Edge/Application/msedge.exe')).find(p=>fs.existsSync(p));
 if(edge){const child=spawn(edge,['--app='+url,'--new-window'],{detached:true,stdio:'ignore'});child.unref();}
 else{const child=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,stdio:'ignore'});child.unref();}
}
const server=http.createServer((req,res)=>{
 if(req.url==='/__terra_runtime'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({game:'terra-porcelain-offline'}));return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 let file;
 try{const pathname=decodeURIComponent(new URL(req.url,url).pathname);file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));const rel=path.relative(root,file);if(rel.startsWith('..')||path.isAbsolute(rel)||file.includes('\0'))throw Error();}catch{res.writeHead(403).end();return;}
 fs.stat(file,(error,info)=>{
  if(error||!info.isFile()){res.writeHead(404).end();return;}
  const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416).end();return;}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}
  const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 });
});
server.on('error',error=>{
 if(error.code!=='EADDRINUSE'){console.error(error.message);process.exitCode=1;return;}
 const request=http.get(url+'__terra_runtime',response=>{let body='';response.on('data',chunk=>body+=chunk);response.on('end',()=>{if(body.includes('terra-porcelain-offline'))openGame();else{console.error('启动端口被其他程序占用，请关闭占用 49173 端口的程序后重试。');process.exitCode=1;}});});request.on('error',()=>{console.error('无法启动本地游戏，请关闭旧启动窗口后重试。');process.exitCode=1;});
});
server.listen(port,'127.0.0.1',()=>{console.log('开窑啦！游戏已启动：'+url+'\n请保留此窗口，游玩结束后关闭即可。');openGame();});
