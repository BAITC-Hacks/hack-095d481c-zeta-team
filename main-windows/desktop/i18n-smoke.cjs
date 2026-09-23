'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function run(win){
 const result=await win.webContents.executeJavaScript('('+ (async function(){
  const A=ProcureFlowApp,S=A.state,L=PFLang,tests=[],untranslated=[];
  function check(name,value){tests.push({name,ok:!!value});if(!value)throw Error(name);}
  const change=async code=>{const select=document.querySelector('#language-select');select.value=code;select.dispatchEvent(new Event('change',{bubbles:true}));await PFDesktop.setLanguage(code);};
  const snapshot=()=>JSON.stringify({data:S.data,cfg:S.cfg,edits:S.edits,approved:[...S.approved],audit:S.audit});
  const original=snapshot(),originalRows=JSON.stringify(S.rows.map(r=>[r.key,r.order]));
  function scan(view,selector='#main'){
   const userValues=new Set(Object.values(S.data.products).flatMap(p=>[p.name,p.sku,p.supplier,p.category,p.code]).filter(Boolean));
   const tree=document.createTreeWalker(document.querySelector(selector),NodeFilter.SHOW_TEXT);
   while(tree.nextNode()){const text=tree.currentNode.nodeValue.trim();if(/[А-Яа-яЁё]/.test([...userValues].reduce((v,user)=>v.split(user).join(''),text))&&!text.includes('₽ / ₸'))untranslated.push({view,text});}
  }
  for(const code of ['en','kk','ru']){
   await change(code);check('HTML language '+code,document.documentElement.lang===code);
   check('Navigation translated '+code,document.querySelector('[data-nav=dashboard]').textContent.trim()===L.s('Обзор'));
   check('Selection persisted '+code,localStorage.getItem('procureflow.language')===code);
   check('Project unchanged '+code,snapshot()===original&&JSON.stringify(S.rows.map(r=>[r.key,r.order]))===originalRows);
   for(const view of ['dashboard','recommendations','suppliers','import','method']){A.nav(view);check('View renders '+view+' '+code,document.querySelector('#main').textContent.length>100);if(code==='en')scan(view);}
  }
  await change('en');A.settings();scan('settings','#drawer-content');
  document.querySelector('[name=lead]').value='67';
  document.querySelector('[name=currency]').value='₽ / ₸ не указано';
  await change('kk');
  check('Pending settings preserved',document.querySelector('[name=lead]').value==='67'&&document.querySelector('[name=currency]').value==='₽ / ₸ не указано');
  document.querySelector('#drawer').close();
  A.openSKU(S.rows[0].key);document.querySelector('#master-supplier').value='Рекомендации {0}';document.querySelector('#manual-qty').value='120';
  await change('en');
  scan('product','#drawer-content');check('Product form user values preserved',document.querySelector('#master-supplier').value==='Рекомендации {0}'&&document.querySelector('#manual-qty').value==='120');
  check('Unknown stock placeholder translated',document.querySelector('#master-stock').placeholder===L.s('Неизвестен'));
  document.querySelector('#drawer').close();
  const warehouses=S.data.warehouses;S.data.warehouses=['Основной'];A.settings();document.querySelector('[name=warehouse]').value='Основной';
  await change('kk');check('Warehouse source key remains stable',document.querySelector('[name=warehouse]').value==='Основной');document.querySelector('#drawer').close();
  if(warehouses===undefined)delete S.data.warehouses;else S.data.warehouses=warehouses;
  A.nav('suppliers');document.querySelector('[data-approve]').click();
  document.querySelector('#approval-manager').value='Reviewer Тест';document.querySelector('#approval-reviewed').checked=true;
  await change('en');scan('approval','#drawer-content');check('Approval draft preserved',document.querySelector('#approval-manager').value==='Reviewer Тест'&&document.querySelector('#approval-reviewed').checked);
  document.querySelector('#drawer').close();
  A.exchangeDialog();scan('exchange','#drawer-content');document.querySelector('[name=organization]').value='Тест Company';document.querySelector('[name=column-sku]').value='Артикул_ERP';
  await change('kk');check('1C field mapping preserved',document.querySelector('[name=organization]').value==='Тест Company'&&document.querySelector('[name=column-sku]').value==='Артикул_ERP'&&document.querySelector('[name=column-code]').value==='Код1С');
  document.querySelector('#drawer').close();
  check('Pending forms did not change business state',snapshot()===original);
  check('Explanation language',!/[А-Яа-яЁё]/.test((await change('en'),L.message(S.rows[0].why))));
  await change('ru');A.nav('dashboard');
  check('No untranslated English UI text',untranslated.length===0);return {ok:tests.every(x=>x.ok),tests,untranslatedEnglish:[...new Map(untranslated.map(x=>[x.text,x])).values()]};
 }).toString()+')()');
 if(process.env.PF_QA_DIR){win.webContents.setBackgroundThrottling(false);
  await fs.mkdir(process.env.PF_QA_DIR,{recursive:true});
  for(const code of ['en','kk','ru']){
   await win.webContents.executeJavaScript("PFLang.setLanguage('"+code+"');ProcureFlowApp.nav('dashboard');");
   await new Promise(resolve=>setTimeout(resolve,700));
   await fs.writeFile(path.join(process.env.PF_QA_DIR,'dashboard-'+code+'.png'),(await win.webContents.capturePage()).toPNG());
  }
 }
 return result;
}
module.exports={run};
