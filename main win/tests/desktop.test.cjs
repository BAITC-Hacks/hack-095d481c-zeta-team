'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {assetPath,localPage,allowDownload}=require('../desktop/security.cjs');
const root=path.resolve(__dirname,'..');let count=0;function test(n,f){f();console.log('PASS',n);count++;}
test('Local entry point is allowed',()=>assert.equal(assetPath(root,'procureflow://app/index.html'),path.join(root,'index.html')));
test('Local assets are allowed',()=>assert.equal(assetPath(root,'procureflow://app/assets/engine.js'),path.join(root,'assets','engine.js')));
test('Remote sites cannot be served',()=>assert.equal(assetPath(root,'https://example.com/index.html'),null));
test('Arbitrary local files cannot be served',()=>assert.equal(assetPath(root,'file:///etc/passwd'),null));
test('Path traversal is rejected',()=>assert.equal(assetPath(root,'procureflow://app/assets/%2e%2e/%2e%2e/secrets.txt'),null));
test('Untrusted subdomains cannot call IPC',()=>assert.equal(localPage('procureflow://app.evil/index.html'),false));
test('Trusted hash navigation can call IPC',()=>assert.equal(localPage('procureflow://app/index.html#dashboard'),true));
test('User info in URL is rejected',()=>assert.equal(localPage('procureflow://test@app/index.html'),false));
test('Only local blob exports are accepted',()=>{assert(allowDownload('blob:procureflow://app/1234'));assert(!allowDownload('https://example.com/a.exe'));assert(!allowDownload('blob:https://example.com/123'));});
test('Renderer security features are explicitly enabled',()=>{const main=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');for(const v of ['nodeIntegration:false','contextIsolation:true','sandbox:true','webSecurity:true'])assert(main.includes(v));});
test('Build has portable and installer targets',()=>{const p=require('../package.json');assert(p.build.win.target.some(x=>x.target==='portable'));assert(p.build.win.target.some(x=>x.target==='nsis'));assert.equal(p.build.publish,null);});
console.log(`\n${count} desktop static tests passed.`);
