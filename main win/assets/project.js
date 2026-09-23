/* Versioned, local-only project files. Shared by browser and desktop. */
(function(root){
'use strict';
const MAX_BYTES=80*1024*1024,FORMAT='procureflow-project';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function ensure(ok,message){if(!ok)throw new Error('Проект: '+message);}
function validate(p){
 ensure(object(p)&&p.format===FORMAT&&p.schema===1,'неподдерживаемый формат или версия файла.');
 let nodes=0;
 function walk(v,depth){
  ensure(++nodes<3500000&&depth<32,'слишком сложная структура данных.');
  if(typeof v==='number')ensure(Number.isFinite(v),'обнаружено некорректное число.');
  if(typeof v==='string')ensure(v.length<=2000000,'слишком длинное текстовое поле.');
  if(v&&typeof v==='object')for(const k of Object.keys(v)){
   ensure(!['__proto__','constructor','prototype'].includes(k),'недопустимое имя поля.');walk(v[k],depth+1);
  }
 }
 walk(p,0);
 ensure(object(p.data)&&object(p.data.products),'отсутствуют данные товаров.');
 ensure(Object.keys(p.data.products).length<=20000,'более 20 000 товаров. Разделите проект.');
 ensure(p.data.seasonality===null||(Array.isArray(p.data.seasonality)&&p.data.seasonality.length===12&&p.data.seasonality.every(v=>typeof v==='number'&&v>0)),'повреждена сезонность.');
 ensure(Array.isArray(p.data.files)&&Array.isArray(p.data.warnings),'повреждён список источников.');
 for(const [key,x] of Object.entries(p.data.products)){
  ensure(object(x)&&x.key===key&&/^[A-Za-z0-9_-]{1,80}$/.test(key),'повреждён идентификатор товара.');
  for(const k of ['name','sku','code','category','supplier'])ensure(typeof x[k]==='string','нет поля '+k+' у товара.');
  for(const k of ['sales','stockHistory'])ensure(object(x[k])&&Object.values(x[k]).every(v=>v===null||typeof v==='number'),'некорректная история товара.');
  for(const k of ['transit','transactions','stockouts'])ensure(Array.isArray(x[k]),'нет массива '+k+'.');
  ensure(x.transit.every(v=>object(v)&&typeof v.qty==='number'&&(v.eta==null||date(v.eta))),'некорректные поставки.');
  ensure(x.transactions.every(v=>object(v)&&typeof v.qty==='number'&&date(v.date)),'некорректные продажи.');
  ensure(x.stockouts.every(v=>object(v)&&date(v.start)&&date(v.end)&&v.end>=v.start),'некорректные периоды отсутствия.');
  ensure(x.stock===null||typeof x.stock==='number','некорректный остаток.');
  ensure(typeof x.multiple==='number'&&x.multiple>0&&typeof x.minQty==='number'&&x.minQty>=0,'некорректная кратность.');
 }
 for(const x of Object.values(p.data.products)){for(const k of ['leadDays','plannedGrowth','reportedGrowth','cost'])ensure(x[k]==null||(typeof x[k]==='number'&&Number.isFinite(x[k])),'неверное поле '+k);if(x.seasonality)ensure(Array.isArray(x.seasonality)&&x.seasonality.length===12&&x.seasonality.every(n=>typeof n==='number'&&n>0),'неверная сезонность товара');}
 ensure(object(p.cfg)&&date(p.cfg.asOf)&&object(p.cfg.categories),'повреждены параметры расчёта.');
 const bounds={lead:[1,365],review:[1,365],safety:[0,180],growth:[-90,300]};
 for(const [k,[min,max]] of Object.entries(bounds))ensure(typeof p.cfg[k]==='number'&&p.cfg[k]>=min&&p.cfg[k]<=max,'параметр '+k+' вне диапазона.');
 for(const k of ['outliers','seasonality','reportedGrowth','stockoutProxy','blanksZero','includeUndated'])ensure(typeof p.cfg[k]==='boolean','некорректный переключатель '+k+'.');
 ensure(typeof p.cfg.supplier==='string'&&typeof p.cfg.currency==='string','нет поставщика / валюты.');
 if(p.cfg.currentMonth!=null)ensure(typeof p.cfg.currentMonth==='boolean','неверный текущий месяц');if(p.cfg.warehouse!=null)ensure(typeof p.cfg.warehouse==='string','неверный склад');if(p.cfg.suppliers!=null){ensure(object(p.cfg.suppliers),'неверные поставщики');for(const rule of Object.values(p.cfg.suppliers))ensure(object(rule)&&typeof rule.lead==='number'&&rule.lead>=1&&rule.lead<=365,'неверный срок поставщика');}
 for(const [k,x] of Object.entries(p.cfg.categories)){
  ensure(object(x),'повреждена категория.');
  for(const [f,lo,hi] of [['lead',1,365],['safety',0,180],['multiplier',0,5]])if(x[f]!=null)ensure(typeof x[f]==='number'&&x[f]>=lo&&x[f]<=hi,'неверные параметры категории '+k+'.');
 }
 ensure(Array.isArray(p.sheets)&&p.sheets.every(s=>object(s)&&typeof s.name==='string'&&typeof s.file==='string'&&Array.isArray(s.rows)&&s.rows.every(Array.isArray)),'повреждены исходные листы.');
 ensure(object(p.edits)&&Object.entries(p.edits).every(([k,v])=>Object.hasOwn(p.data.products,k)&&Number.isInteger(v)&&v>=0),'повреждены ручные количества.');
 ensure(Array.isArray(p.approved)&&p.approved.every(x=>typeof x==='string'),'повреждён список подтверждений.');
 return p;
}
function encode(S){
 const p={format:FORMAT,schema:1,appVersion:'1.0.0',savedAt:new Date().toISOString(),lastCalc:new Date(S.lastCalc).toISOString(),data:S.data,cfg:S.cfg,sheets:[],errors:S.errors,edits:S.edits,approved:[],audit:S.audit||[],exportProfile:S.exportProfile||{}};
 validate(p);const text=JSON.stringify(p);ensure(new TextEncoder().encode(text).length<=MAX_BYTES,'размер проекта превышает 80 МБ.');return text;
}
function decode(text){ensure(typeof text==='string'&&new TextEncoder().encode(text).length<=MAX_BYTES,'слишком большой файл (максимум 80 МБ).');let p;try{p=JSON.parse(text);}catch(e){throw new Error('Проект: файл повреждён или не является JSON.');}return validate(p);}
function restore(S,p,PF){
 validate(p);const rows=PF.calculate(p.data,p.cfg),map=new Map(rows.map(x=>[x.key,x]));
 for(const [key,q] of Object.entries(p.edits)){const r=map.get(key);ensure(q===0||(q>=r.minQty&&Math.abs(q/r.multiple-Math.round(q/r.multiple))<1e-8),'ручное количество не соответствует кратности.');}
 S.data=p.data;S.cfg=p.cfg;S.sheets=p.sheets;S.errors=Array.isArray(p.errors)?p.errors:[];S.rows=rows;S.edits={...p.edits};
 // Only preserve approvals made in this exact engine version; imported files are NOT authenticated approvals.
 S.approved=new Set();S.audit=Array.isArray(p.audit)?p.audit:[];S.exportProfile=p.exportProfile||{};S.lastCalc=new Date(p.lastCalc||p.savedAt);S.page=0;S.filter='all';S.search='';S.category='';S.supplier='';
 return S;
}
const api={encode,decode,validate,restore,MAX_BYTES,FORMAT};root.PFProject=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
