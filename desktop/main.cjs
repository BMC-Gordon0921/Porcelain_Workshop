const {app,BrowserWindow,Menu,dialog,net,protocol,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {resolveGameAsset}=require('./asset-path.cjs');

const GAME_URL='terra://app/index.html';
const webRoot=path.join(__dirname,'web');
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.woff2':'font/woff2','.ico':'image/x-icon'};
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

// A stable secure origin keeps fetch, audio and localStorage working offline.
protocol.registerSchemesAsPrivileged([{scheme:'terra',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
const profile=app.commandLine.getSwitchValue('user-data-dir')||path.join(app.getPath('appData'),'TerraPorcelainWorkshop');
fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);
app.setAppUserModelId('Terra.PorcelainWorkshop');
let window;
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.on('window-all-closed',()=>app.quit());
 app.whenReady().then(async()=>{
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  // The distributed game has no remote services or dependency downloads.
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!['terra:','file:','data:','blob:','devtools:'].includes(new URL(details.url).protocol)}));
  protocol.handle('terra',async request=>{
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
   const file=resolveGameAsset(webRoot,request.url);
   if(!file)return new Response('Forbidden',{status:403});
   try{
    if(!fs.statSync(file).isFile())return new Response('Not found',{status:404});
    const response=await net.fetch(pathToFileURL(file).toString(),{method:request.method,headers:request.headers.has('range')?{Range:request.headers.get('range')}:undefined});
    const headers=new Headers(response.headers);headers.set('Content-Type',contentTypes[path.extname(file).toLowerCase()]||'application/octet-stream');headers.set('Content-Security-Policy',csp);headers.set('X-Content-Type-Options','nosniff');
    return new Response(response.body,{status:response.status,headers});
   }catch{return new Response('Not found',{status:404});}
  });
  window=new BrowserWindow({title:'开窑啦！ · Terra 瓷器工坊',width:1440,height:960,minWidth:960,minHeight:680,show:false,backgroundColor:'#f2ead7',icon:path.join(__dirname,'icon.ico'),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false,backgroundThrottling:!app.commandLine.hasSwitch('smoke-test')}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(url!==GAME_URL)event.preventDefault();});
  window.webContents.on('before-input-event',(event,input)=>{
   if(input.type==='keyDown'&&input.key==='F11'){event.preventDefault();window.setFullScreen(!window.isFullScreen());}
  });
  window.once('ready-to-show',()=>{if(!app.commandLine.hasSwitch('smoke-test'))window.show();});
  window.on('closed',()=>{window=null;});
  await window.loadURL(GAME_URL);
 }).catch(error=>{
  dialog.showErrorBox('开窑啦！启动失败','请先完整解压游戏运行包，再双击“开窑啦.exe”。\n\n'+error.message);app.quit();
 });
}
