'use strict';
const path=require('node:path');
const ASSETS=new Set(['/index.html','/assets/locales.js','/assets/i18n.js','/assets/style.css','/assets/favicon.svg','/assets/xlsx.js','/assets/engine.js','/assets/planner.js','/assets/privacy.js','/assets/engine-worker.js','/assets/app.js','/assets/project.js','/assets/workspace.js']);
function localPage(url){try{const u=new URL(url);return u.protocol==='procureflow:'&&u.host==='app'&&!u.username&&!u.password&&u.pathname==='/index.html';}catch{return false;}}
function assetPath(root,url){
 try{const u=new URL(url);if(u.protocol!=='procureflow:'||u.host!=='app'||u.username||u.password)return null;
 const name=decodeURIComponent(u.pathname);if(!ASSETS.has(name))return null;
 return path.join(root,name.slice(1));}catch{return null;}
}
function allowDownload(url){return typeof url==='string'&&url.startsWith('blob:procureflow://app/');}
module.exports={assetPath,localPage,allowDownload,ASSETS};
