'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {createServer}=require('../scripts/serve.cjs'),{build}=require('../scripts/build-web.cjs');
const files=require('../scripts/site-files.cjs'),PF=require('../assets/planner.js');
const root=path.resolve(__dirname,'..');let count=0;
async function test(name,fn){await fn();console.log('PASS',name);count++;}
async function start(server){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return server.address().port;}
function request(port,url,method='GET',host){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:url,method,headers:host?{Host:host}:{}},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString('utf8')}));});req.on('error',reject);req.end();});}
async function list(dir,prefix=''){const all=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+entry.name;if(entry.isDirectory())all.push(...await list(path.join(dir,entry.name),rel+'/'));else all.push(rel);}return all.sort();}
async function main(){
 const site=await build();
 await test('Published artifact contains only public files',async()=>assert.deepEqual(await list(site),[...files].sort()));
 const plain=createServer(),nested=createServer({root:site,base:'/procureflow-web/'});
 const port=await start(plain),nestedPort=await start(nested);
 try{
  await test('Local entry point responds with protected HTML',async()=>{const r=await request(port,'/');assert.equal(r.status,200);assert(r.text.includes('ProcureFlow'));assert(r.headers['content-security-policy'].includes("connect-src 'none'"));});
  await test('GitHub Pages subpath serves every asset',async()=>{for(const file of files){const r=await request(nestedPort,'/procureflow-web/'+file);assert.equal(r.status,200,file);assert.equal(r.text,await fs.readFile(path.join(root,file),'utf8'));}});
  await test('Relative HTML and worker URLs stay inside Pages repository',async()=>{const entry=new URL('https://example.github.io/procureflow-web/'),html=await fs.readFile(path.join(root,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){if(match[1].startsWith('#'))continue;assert(files.includes(new URL(match[1],entry).pathname.slice('/procureflow-web/'.length)));}const worker=new URL('./assets/engine-worker.js',entry);assert.equal(new URL('planner.js',worker).pathname,'/procureflow-web/assets/planner.js');});
  await test('Missing trailing slash redirects to working base URL',async()=>{const r=await request(nestedPort,'/procureflow-web');assert.equal(r.status,302);assert.equal(r.headers.location,'/procureflow-web/');});
  await test('Repository, project, keys and data files are never served',async()=>{for(const file of ['package.json','package-lock.json','README.md','.git/config','.env','data.csv','data.xlsx','IEK.zip','project.pfproject','tests/engine.test.cjs','scripts/serve.cjs'])assert.equal((await request(port,'/'+file)).status,404,file);});
  await test('Encoded traversal and malformed paths are blocked',async()=>{for(const url of ['/%2e%2e/package.json','/assets/%2e%2e/package.json','/assets%5c..%5c.env','/%ZZ','/%00'])assert.equal((await request(port,url)).status,400,url);});
  await test('Writes and arbitrary Host headers are blocked',async()=>{assert.equal((await request(port,'/','POST')).status,405);assert.equal((await request(port,'/','GET','evil.example')).status,403);});
  await test('HEAD returns headers without a response body',async()=>{const r=await request(port,'/','HEAD');assert.equal(r.status,200);assert.equal(r.text,'');assert(Number(r.headers['content-length'])>0);});
  await test('Browser privacy module anonymizes consistently before calculation',async()=>{const ctx={window:{},crypto:webcrypto,TextEncoder,PF};vm.runInNewContext(await fs.readFile(path.join(root,'assets/privacy.js'),'utf8'),ctx);const p=ctx.window.PFPrivacy,a=await p.anonymous('Synthetic Customer');assert(/^anon-[a-f0-9]{64}$/.test(a));assert.equal(a,await p.anonymous('Synthetic Customer'));assert.notEqual(a,await p.anonymous('Another Customer'));const sheets=await p.sanitize([{file:'sales.csv',name:'Sales',rows:[['sku','date','qty','client_id'],['A','2026-08-01',10,'Synthetic Customer']]}]);assert.equal(sheets[0].rows[1][3],a);assert(Object.keys(PF.build(sheets).products).length===1);});
  await test('Worker source executes a calculation and responds',async()=>{const ctx={self:{},console};vm.createContext(ctx);ctx.importScripts=(...names)=>{for(const name of names)vm.runInContext(require('node:fs').readFileSync(path.join(root,'assets',name),'utf8'),ctx);};let response;ctx.self.postMessage=x=>{response=x;};vm.runInContext(await fs.readFile(path.join(root,'assets/engine-worker.js'),'utf8'),ctx);ctx.self.onmessage({data:{sheets:[{file:'catalog.csv',name:'Catalog',rows:[['sku','stock','supplier'],['A',10,'Supplier']]}]}});assert(!response.error,response.error);assert.equal(Object.values(response.data.products)[0].stock,10);});
 }finally{await Promise.all([plain,nested].map(server=>new Promise(resolve=>server.close(resolve))));}
 console.log(count+' web packaging and HTTP tests passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
