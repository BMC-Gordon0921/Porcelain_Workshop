// 更新说明解析：把仓库根 CHANGELOG.md 的 Markdown 切成段落。
// 约定见 CHANGELOG.md 顶部注释：'## 版本 · 日期' 起一段，'- ' 起一条。
const HEADING=/^##\s+(.+)$/;
const BULLET=/^[-*]\s+(.+)$/;
const SEPARATOR=/[·•・]/;

export function parseChangelog(text){
  const sections=[];
  let current=null,inComment=false;
  for(const rawLine of String(text??'').split(/\r?\n/)){
    const line=rawLine.trim();
    if(inComment){if(line.includes('-->'))inComment=false;continue;}
    if(line.startsWith('<!--')){if(!line.includes('-->'))inComment=true;continue;}
    if(!line)continue;
    const heading=HEADING.exec(line);
    if(heading){
      const [version='',date='']=heading[1].split(SEPARATOR).map(part=>part.trim());
      current={version,date,items:[]};
      sections.push(current);
      continue;
    }
    if(line.startsWith('#'))continue;
    const bullet=BULLET.exec(line);
    if(bullet&&current)current.items.push(bullet[1].trim());
  }
  return sections;
}

export function latestVersion(sections){
  return sections?.[0]?.version??'';
}
