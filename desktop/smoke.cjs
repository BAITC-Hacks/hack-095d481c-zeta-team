'use strict';
async function run(win){
 const errors=[];win.webContents.on('console-message',(_e,_level,message)=>{if(String(message).includes('Uncaught'))errors.push(message);});
 const report=await win.webContents.executeJavaScript(`(async()=>{
 const results=[];const test=(name,ok)=>results.push({name,ok:!!ok});
 test('Local custom protocol',location.protocol==='procureflow:');
 test('Desktop bridge',window.PFDesktop?.isDesktop);
 test('No Node.js in renderer',typeof window.require==='undefined'&&typeof window.process==='undefined');
 const info=await PFDesktop.info();test('Validated IPC',info.offline===true);
 const A=window.ProcureFlowApp,S=A.state;test('Calculation engine',S.rows.length===42&&S.rows.every(r=>Number.isFinite(r.order)));
 const before=S.rows.map(r=>[r.key,r.order]);const serialized=PFProject.encode(S);const copy=PFProject.decode(serialized);PFProject.restore(S,copy,PF);test('Project restore',JSON.stringify(before)===JSON.stringify(S.rows.map(r=>[r.key,r.order])));
 A.nav('recommendations');test('Recommendations render',document.querySelectorAll('tbody tr').length>0);
 A.openSKU(S.rows[0].key);test('SKU explanation',document.querySelector('#drawer').open);document.querySelector('#drawer').close();
 A.nav('suppliers');test('Supplier groups',document.querySelector('#main').textContent.includes('Поставщик'));
 let denied=false;try{await fetch('https://example.com/');}catch(_){denied=true;}test('External requests denied',denied);
 test('XLSX decompression runtime',!!new DecompressionStream('deflate-raw'));
 return {ok:results.every(t=>t.ok),tests:results};
 })()`);
 report.consoleErrors=errors;report.ok=report.ok&&errors.length===0;return report;
}
module.exports={run};
