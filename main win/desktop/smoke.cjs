'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function run(win){
 const errors=[];win.webContents.on('console-message',(_e,_level,message)=>{if(String(message).includes('Uncaught'))errors.push(message);});
 const report=await win.webContents.executeJavaScript("(async()=>{"+
 "const tests=[];const check=(name,ok)=>{tests.push({name,ok:!!ok});if(!ok)throw Error(name);};"+
 "const A=ProcureFlowApp,S=A.state;check('Local custom protocol',location.protocol==='procureflow:');check('Desktop bridge',PFDesktop.isDesktop);check('No Node in renderer',typeof require==='undefined'&&typeof process==='undefined');check('Trusted IPC',(await PFDesktop.info()).offline);"+
 "check('Demo calculations',S.rows.length===42&&S.rows.every(r=>Number.isFinite(r.order)));A.nav('recommendations');check('Recommendations render',document.querySelectorAll('tbody tr').length>0);A.openSKU(S.rows[0].key);check('Explanation dialog',document.querySelector('#drawer').open);document.querySelector('#drawer').close();"+
 "A.settings();check('Warehouse and supplier settings',!!document.querySelector('select[name=warehouse]')&&document.querySelectorAll('[data-supplier-rule]').length===3);document.querySelector('#drawer').close();"+
 "A.openSKU(S.rows.find(r=>r.order>0).key);check('Editable master data',!!document.querySelector('#master-stock'));document.querySelector('#master-stock').value='123';document.querySelector('[data-master]').click();check('Master data updates and recalculates',S.audit.some(x=>x.action==='Уточнение данных'&&x.stock===123));"+
 "let blocked=false;try{await fetch('https://example.com/');}catch(e){blocked=true;}check('Network denied',blocked);"+
 "const normalized=await PFPrivacy.sanitize([{file:'test.csv',name:'Sales',rows:[['sku','date','qty','client_id'],['A','2026-08-01',1,'Synthetic Person']]}]);check('Client anonymized',/^anon-[a-f0-9]{64}$/.test(normalized[0].rows[1][3]));"+
 "const originalSave=ExcelIO.save;window.__exports=[];ExcelIO.save=(blob,name)=>window.__exports.push({blob,name});A.exportRows(S.rows);const exported=await ExcelIO.readFile(new File([window.__exports[0].blob],'orders.xlsx'));check('XLSX roundtrip',exported.length===3&&exported[0].rows.length===43);"+
 "A.template();const templateSheets=await PFPrivacy.sanitize(await ExcelIO.readFile(new File([window.__exports.at(-1).blob],'template.xlsx')));const templateData=PF.build(templateSheets);check('Universal template imports both suppliers',Object.keys(templateData.products).length===2&&new Set(Object.values(templateData.products).map(p=>p.supplier)).size===2);"+
 "A.nav('suppliers');document.querySelector('[data-approve]').click();check('Approval asks for reviewer',!!document.querySelector('#approval-manager'));document.querySelector('#approval-manager').value='QA';document.querySelector('#approval-reviewed').checked=true;document.querySelector('[data-confirm-order]').click();check('Approval recorded',S.approved.size===1&&S.audit.some(x=>x.action==='Утверждение'&&x.manager==='QA'));"+
 "A.exchangeDialog();document.querySelector('[name=organization]').value='Test organization';document.querySelector('[name=warehouse]').value='Test warehouse';A.exportExchange('csv');check('1C CSV created',window.__exports.at(-1).name.endsWith('.csv')&&(await window.__exports.at(-1).blob.text()).includes('Код1С'));A.exportExchange('xlsx');const onec=await ExcelIO.readFile(new File([window.__exports.at(-1).blob],'1c.xlsx'));check('1C XLSX typed quantity',typeof onec[0].rows[1][6]==='number');document.querySelector('#drawer').close();"+
 "A.auditDialog();check('Audit view',document.querySelector('#drawer-content').textContent.includes('Утверждение'));document.querySelector('#drawer').close();ExcelIO.save=originalSave;delete window.__exports;"+
 "const before=S.rows.map(r=>[r.key,r.order]);const saved=PFProject.encode(S);const target={};PFProject.restore(target,PFProject.decode(saved),PF);check('Project orders restored',JSON.stringify(before)===JSON.stringify(target.rows.map(r=>[r.key,r.order])));check('Approvals reset on open',target.approved.size===0);check('Sources not persisted',target.sheets.length===0);"+
 "A.nav('dashboard');await new Promise(resolve=>setTimeout(resolve,150));return {ok:tests.every(t=>t.ok),tests};})()");
 if(process.env.PF_QA_DIR){await fs.mkdir(process.env.PF_QA_DIR,{recursive:true});await fs.writeFile(path.join(process.env.PF_QA_DIR,'dashboard.png'),(await win.webContents.capturePage()).toPNG());}
 if(process.env.PF_REAL_ARCHIVES){
  const archives=JSON.parse(process.env.PF_REAL_ARCHIVES);
  for(const file of archives){
   const bytes=(await fs.readFile(file)).toString('base64'),name=path.basename(file);
   await win.webContents.executeJavaScript("(async()=>{const bytes=Uint8Array.from(atob("+JSON.stringify(bytes)+"),c=>c.charCodeAt(0));await ProcureFlowApp.loadFiles([new File([bytes],"+JSON.stringify(name)+")]);if(ProcureFlowApp.state.errors.length)throw Error(JSON.stringify(ProcureFlowApp.state.errors));return true;})()");
  }
  const actual=await win.webContents.executeJavaScript("(()=>{const S=ProcureFlowApp.state;return {products:S.rows.length,files:S.data.files.length,suppliers:[...new Set(S.rows.map(r=>r.supplier))],finite:S.rows.every(r=>Number.isFinite(r.demand)&&(r.order===null||Number.isSafeInteger(r.order))),asOf:S.cfg.asOf,missingStock:S.rows.filter(r=>r.stock===null).length,orders:S.rows.filter(r=>r.order>0).length,projectBytes:PFProject.encode(S).length};})()");
  report.realData=actual;report.tests.push({name:'Both partner ZIP archives imported',ok:actual.files===12&&actual.products>3000&&actual.finite&&actual.suppliers.includes('IEK')&&actual.suppliers.includes('Systeme Electric')});
 }
 report.consoleErrors=errors;report.ok=report.tests.every(t=>t.ok)&&!errors.length;return report;
}
module.exports={run};

