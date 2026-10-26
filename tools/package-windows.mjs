import {build} from 'vite';
import {resedit} from '@electron/packager/resedit';
import {createPackage,getRawHeader} from '@electron/asar';
import {downloadArtifact} from '@electron/get';
import pngToIco from 'png-to-ico';
import {cp,mkdir,mkdtemp,readFile,readdir,writeFile,stat,lstat,rm,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

if(process.platform!=='win32')throw new Error('Run this packaging command on Windows.');
const root=fileURLToPath(new URL('../',import.meta.url));
const release=path.join(root,'release'),scratch=path.join(root,'.desktop-build');
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const electronVersion=JSON.parse(await readFile(path.join(root,'node_modules/electron/package.json'),'utf8')).version;
const cache=path.join(root,'qa/electron-cache');
async function cachedRuntime(dir){
 for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){
  const file=path.join(dir,entry.name);
  if(entry.isFile()&&entry.name===`electron-v${electronVersion}-win32-x64.zip`)return file;
  if(entry.isDirectory()){const found=await cachedRuntime(file);if(found)return found;}
 }
}
const checksums=JSON.parse(await readFile(path.join(root,'node_modules/electron/checksums.json'),'utf8'));
const runtimeZip=await cachedRuntime(cache)||await downloadArtifact({version:electronVersion,artifactName:'electron',platform:'win32',arch:'x64',cacheRoot:cache,checksums});
const runtimeHash=createHash('sha256').update(await readFile(runtimeZip)).digest('hex');
if(runtimeHash!==checksums[path.basename(runtimeZip)])throw new Error('Electron runtime checksum mismatch');
await mkdir(release,{recursive:true});await mkdir(scratch,{recursive:true});
const stage=await mkdtemp(path.join(scratch,'app-'));
console.log('Building the offline game…');await build({root});
await cp(path.join(root,'dist'),path.join(stage,'web'),{recursive:true});
for(const name of ['main.cjs','asset-path.cjs'])await cp(path.join(root,'desktop',name),path.join(stage,name));
await writeFile(path.join(stage,'package.json'),JSON.stringify({name:'terra-porcelain-desktop',productName:'开窑啦！',version:pkg.version,private:true,main:'main.cjs'},null,2));
await writeFile(path.join(stage,'icon.ico'),await pngToIco(path.join(root,'src/assets/logo-mark.png')));
// Extract directly to the final directory. On Windows the native ZIP extractor
// can retain handles that prevent Packager's directory rename in the same process.
const bundle=path.resolve(release,'KaiYaoLa-win32-x64');
if(path.dirname(bundle)!==path.resolve(release))throw new Error('Invalid package output path');
if((await lstat(bundle).catch(()=>null))?.isSymbolicLink())throw new Error('Refusing to replace a linked output directory');
await rm(bundle,{recursive:true,force:true,maxRetries:5,retryDelay:500});
const extracted=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','$ErrorActionPreference = "Stop"; Expand-Archive -LiteralPath $env:TERRA_RUNTIME_ZIP -DestinationPath $env:TERRA_RUNTIME_DEST'],{stdio:'inherit',windowsHide:true,env:{...process.env,TERRA_RUNTIME_ZIP:runtimeZip,TERRA_RUNTIME_DEST:bundle}});
if(extracted.error||extracted.status!==0)throw extracted.error||new Error('Runtime extraction failed');
const asar=path.join(bundle,'resources/app.asar');
await createPackage(stage,asar);
await unlink(path.join(bundle,'resources/default_app.asar'));
const executable=path.join(bundle,'开窑啦.exe');
await rename(path.join(bundle,'electron.exe'),executable);
const headerHash=createHash('sha256').update(getRawHeader(asar).headerString).digest('hex');
await resedit(executable,{iconPath:path.join(stage,'icon.ico'),fileVersion:pkg.version,productVersion:pkg.version,productName:'开窑啦！',win32Metadata:{CompanyName:'Terra',FileDescription:'Terra · 景德镇瓷器工坊',OriginalFilename:'开窑啦.exe',InternalName:'KaiYaoLa','requested-execution-level':'asInvoker'},asarIntegrity:{'resources\\app.asar':{algorithm:'SHA256',hash:headerHash}}});
await mkdir(path.join(bundle,'Licenses'),{recursive:true});
await cp(path.join(root,'node_modules/three/LICENSE'),path.join(bundle,'Licenses/THREE.txt'));
await cp(path.join(root,'src/assets/fonts/OFL-ZCOOL-KuaiLe.txt'),path.join(bundle,'Licenses/ZCOOL-KuaiLe.txt'));
const instructions=`开窑啦！ · Terra 景德镇瓷器工坊\r\n版本 ${pkg.version} · Windows 10 / 11 64 位免安装版\r\n\r\n开始游戏\r\n1. 将 ZIP 中的整个 KaiYaoLa-win32-x64 文件夹解压到电脑。\r\n2. 打开文件夹，双击“开窑啦.exe”。\r\n3. 不需要安装 Node.js、Python、浏览器或其他依赖，也不需要联网。\r\n请保留文件夹内的 resources、locales、DLL 等文件，不要单独移动 EXE。\r\n\r\n操作\r\nWASD / 方向键：移动；F：操作；Esc：退出面板；鼠标拖动：旋转。\r\n烧窑时按住空格或鼓风按钮；F11：切换全屏；Alt+F4：关闭游戏。\r\n点击首页任意按钮后开始播放背景音乐，可用声音按钮关闭。\r\n\r\n存档\r\n进度、语言和声音设置自动保存在当前 Windows 用户的：\r\n%APPDATA%\\TerraPorcelainWorkshop\r\n关闭游戏后可复制整个目录备份。更新或移动游戏运行包不会清除这里的存档。\r\n该独立版本与网页版本分别保存进度。\r\n\r\n运行包内含全部四个场景、音乐与字体。\r\nElectron / Chromium 许可见 LICENSE 与 LICENSES.chromium.html，其他许可见 Licenses。\r\n`;
await writeFile(path.join(bundle,'开始游戏.txt'),'\ufeff'+instructions,'utf8');
await writeFile(path.join(bundle,'build-info.json'),JSON.stringify({game:pkg.name,version:pkg.version,electron:electronVersion,platform:'win32',arch:'x64',builtAt:new Date().toISOString(),entry:'开窑啦.exe'},null,2));
const zip=path.join(release,'开窑啦-Windows-x64.zip');
console.log('Compressing the complete runtime…');
const compressed=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','$ErrorActionPreference = "Stop"; Compress-Archive -LiteralPath $env:TERRA_PACKAGE_SOURCE -DestinationPath $env:TERRA_PACKAGE_ZIP -CompressionLevel Optimal -Force'],{stdio:'inherit',windowsHide:true,env:{...process.env,TERRA_PACKAGE_SOURCE:bundle,TERRA_PACKAGE_ZIP:zip}});
if(compressed.error||compressed.status!==0)throw compressed.error||new Error('ZIP creation failed');
const hash=createHash('sha256').update(await readFile(zip)).digest('hex');
await writeFile(zip+'.sha256',`${hash}  ${path.basename(zip)}\n`);
console.log(JSON.stringify({folder:bundle,zip,bytes:(await stat(zip)).size,sha256:hash},null,2));
