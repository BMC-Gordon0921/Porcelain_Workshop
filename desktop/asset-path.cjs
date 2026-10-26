const path=require('node:path');

// Resolve only packaged game assets, including filenames with spaces/non-ASCII.
function resolveGameAsset(root,requestUrl){
 try{
  const url=new URL(requestUrl);
  if(url.protocol!=='terra:'||url.host!=='app'||url.username||url.password)return null;
  const pathname=decodeURIComponent(url.pathname);
  if(pathname.includes('\0'))return null;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=path.relative(root,file);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return null;
  return file;
 }catch{return null;}
}
module.exports={resolveGameAsset};
