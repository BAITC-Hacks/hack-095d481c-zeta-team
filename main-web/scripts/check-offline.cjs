'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
 const src=m[1];if(src.startsWith('#'))continue;assert(!/^(?:https?:)?\/\//i.test(src),'Remote HTML asset: '+src);
 assert(fs.existsSync(path.resolve(root,src)),'Missing local asset: '+src);
}
for(const name of fs.readdirSync(path.join(root,'assets')).filter(n=>/\.(js|css)$/.test(n))){const text=fs.readFileSync(path.join(root,'assets',name),'utf8');assert(!/@import\s|url\(\s*['"]?https?:/i.test(text),'Remote CSS in '+name);assert(!/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|sendBeacon\s*\(/.test(text),'Network API in '+name);}
assert(html.includes("connect-src 'none'"),'Missing network-denial CSP');
console.log('PASS: all web resources are local; no network API in shipped UI; CSP denies connections.');
