/* ProcureFlow 1.0: validated imports and explainable replenishment. */
(function(root){
'use strict';
const PF=root.PF||(typeof require==='function'?require('./engine.js'):null),legacyBuild=PF.build,legacyClassify=PF.classify;
const {clean,norm,num,mean,median,days,monthsBefore,addDays}=PF,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return(n>>>0).toString(36);};
function date(x){if(typeof x==='number'&&x>20000&&x<100000)x=new Date(Date.UTC(1899,11,30)+Math.floor(x)*86400000).toISOString().slice(0,10);const s=clean(x);let m=s.match(/(20\d{2})-(\d{2})-(\d{2})/),v=m&&m[0];if(!v){m=s.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);if(m)v=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');}return v&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v?v:null;}
function supplier(s){if(s.supplier)return clean(s.supplier);const desc=legacyClassify(s);if(desc.c?.supplier>=0){const names=[...new Set(s.rows.slice(desc.header+1).map(r=>clean(r[desc.c.supplier])).filter(Boolean))];if(names.length===1)return names[0];}const text=s.file+' '+s.name+' '+s.rows.slice(0,30).map(r=>r.slice(0,6).join(' ')).join(' ');return /system|syseme|систем|систэм|schneider/i.test(text)?'Systeme Electric':/iek|иэк/i.test(text)?'IEK':'';}
function classify(s){const c=legacyClassify(s);if(c.header!=null){const h=s.rows[c.header];if(h.some(x=>/поступление до/i.test(clean(x)))&&c.c.code>=0)c.kind='transit-wide';if(c.kind==='monthly-sales'&&h.some(x=>/^ед\.?$/i.test(clean(x))))c.kind='monthly-stock';}return c;}
function build(sheets){
 if(!Array.isArray(sheets)||sheets.length>100)throw Error('Не более 100 листов за один импорт.');
 const expanded=[];for(const source of sheets){const d=legacyClassify(source);if(d.c?.supplier>=0){const names=[...new Set(source.rows.slice(d.header+1).map(r=>clean(r[d.c.supplier])).filter(Boolean))];if(names.length>1){for(const vendor of names)expanded.push({...source,supplier:vendor,rows:[...source.rows.slice(0,d.header+1),...source.rows.slice(d.header+1).filter(r=>clean(r[d.c.supplier])===vendor)]});continue;}}expanded.push(source);}sheets=expanded;
﻿
 const known=new Set(sheets.map(supplier).filter(Boolean)),owners=new Map();
 const normalizeId=v=>clean(v).toUpperCase().replace(/\s/g,'').replace(/_+$/,'');
 for(const source of sheets){const vendor=supplier(source),d=classify(source);if(!vendor||!d.c)continue;for(const r of source.rows.slice(d.header+1))for(const col of [d.c.code,d.c.sku]){const id=normalizeId(r[col]);if(!id)continue;const set=owners.get(id)||new Set();set.add(vendor);owners.set(id,set);}}
 sheets=sheets.flatMap(source=>{if(supplier(source)||!known.size)return[source];if(known.size===1)return[{...source,supplier:[...known][0]}];const d=classify(source);if(['seasonality','season-years'].includes(d.kind))return [...known].map(v=>({...source,supplier:v}));if(!d.c)return[source];const parts=new Map();for(const r of source.rows.slice(d.header+1)){const found=new Set([...(owners.get(normalizeId(r[d.c.code]))||[]),...(owners.get(normalizeId(r[d.c.sku]))||[])]);const vendor=found.size===1?[...found][0]:'';if(!parts.has(vendor))parts.set(vendor,[]);parts.get(vendor).push(r);}return [...parts].map(([vendor,rows])=>({...source,supplier:vendor,rows:[...source.rows.slice(0,d.header+1),...rows]}));});


 const buckets=new Map(),seen=new Set(),warnings=[],all=PF.empty();let totalRows=0;
 for(const source of sheets){
  totalRows+=source.rows.length;if(totalRows>600000)throw Error('Более 600 000 строк. Разделите данные.');
  const sign=supplier(source)+'|'+JSON.stringify(source.rows);if(seen.has(sign)){warnings.push('Повторный лист пропущен: '+source.file);continue;}seen.add(sign);
  const vendor=supplier(source);let s={...source,rows:source.rows.map(r=>r.slice())},c=classify(s);
  if(c.header!=null){
   const headers=s.rows[c.header];
   headers.forEach((x,i)=>{const n=norm(x);if(n==='артикулиэк')headers[i]='sku';if(n==='минразркотгр')headers[i]='moq';});
   c=classify(s);
   if(c.kind==='monthly-stock')s.name='Остатки · '+s.name;
   if(c.kind==='transit-wide'){
    const rows=[['code','sku','name','qty','eta','order_id']];
    const col=legacyClassify({...s,rows:[headers.slice(0,3)]}).c||{};
    for(const row of s.rows.slice(c.header+1))for(let i=3;i<headers.length;i++){
     const q=num(row[i]),d=date(clean(headers[i]).split(/поступление до/i).pop());
     if(q>0)rows.push([row[c.c.code],row[1],row[2],q,d,clean(headers[i])]);
    }s={...s,rows};c=classify(s);
   }
   for(const r of s.rows.slice(c.header+1)){
    if(!clean(r[c.c.code])&&!clean(r[c.c.sku]))continue;
    if(c.c.date>=0&&r[c.c.date]!=null){const d=date(r[c.c.date]);if(!d)throw Error(s.file+': некорректная дата продажи.');r[c.c.date]=d;}
    for(const field of ['start','end','eta'])if(c.c[field]>=0&&clean(r[c.c[field]])){const d=date(r[c.c[field]]);if(!d)throw Error(s.file+': некорректная дата '+field);r[c.c[field]]=d;}
    if(c.c.qty>=0&&clean(r[c.c.qty])&&num(r[c.c.qty])===null)throw Error(s.file+': некорректное количество.');
   }
  }
  if(!buckets.has(vendor))buckets.set(vendor,[]);buckets.get(vendor).push(s);
 }
 let seq=0;const warehouseNames=new Set();
 for(const [vendor,ss]of buckets){
  const ds=ss.map(legacyClassify);
  if(!ds.some(d=>d.c&&(d.c.code>=0||d.c.sku>=0))){all.files.push(...ds.map(d=>({file:d.file,sheet:d.name,kind:'unknown',rows:0})));warnings.push('Нет товарных строк в источнике: '+ss[0].file);continue;}
  const data=legacyBuild(ss);
  for(const p of Object.values(data.products)){
   p.supplier=p.supplier||vendor;if(['__proto__','constructor','prototype'].includes(p.category)||['__proto__','constructor','prototype'].includes(p.supplier))throw Error('Недопустимое имя категории или поставщика.');p.warehouses=Object.create(null);p.unit='шт.';p.importIssues=[];
   p.key='sku_'+hash((p.supplier||'')+'|'+p.code+'|'+p.sku);
   if(all.products[p.key])p.key+='_'+(++seq);
  }
  const byCode=new Map(),bySku=new Map();for(const p of Object.values(data.products)){if(p.code)byCode.set(p.code,p);if(p.sku)bySku.set(p.sku,p);}
  const id=x=>clean(x).toUpperCase().replace(/\s/g,'').replace(/_+$/,'');
  const transactionDedup=new Map(),transitDedup=new Set(),catalogSeen=new Map();
  for(const p of Object.values(data.products)){p.transactions=[];p.transit=p.transit.filter(t=>t.source==='consolidated');}
  for(const desc of ds){if(desc.header==null)continue;const h=desc.rows[desc.header].map(norm),c=desc.c,wi=h.findIndex(v=>['warehouse','склад'].includes(v)),ui=h.findIndex(v=>['unit','ед','едизм','единица'].includes(v));
   for(const row of desc.rows.slice(desc.header+1)){
    const p=byCode.get(id(row[c.code]))||bySku.get(id(row[c.sku]));if(!p)continue;const warehouse=wi>=0?clean(row[wi]):'';
    if(warehouse){if(['__proto__','constructor','prototype'].includes(warehouse))throw Error('Недопустимое имя склада.');warehouseNames.add(warehouse);p.warehouses[warehouse]??={stock:null,sales:{},stockHistory:{},stockouts:[],transit:[]};}
    if(ui>=0&&clean(row[ui]))p.unit=clean(row[ui]);
﻿
    if(warehouse&&['monthly-sales','monthly-stock'].includes(desc.kind)){
     const w=p.warehouses[warehouse];for(const {m,i}of desc.monthCols){if(desc.kind==='monthly-sales'){w.sales[m]=num(row[i])??0;p.scopedSales=true;}else w.stockHistory[m]=num(row[i]);}
     if(desc.kind==='monthly-stock'&&w.stock===null)w.stock=num(row[desc.monthCols.at(-1).i]);
    }


    if(desc.kind==='catalog'&&c.stock>=0){
     const n=num(row[c.stock]),key=p.key+'|'+warehouse,previous=catalogSeen.get(key);
     if(previous!==undefined&&previous!==n)p.importIssues.push('Противоречивые остатки; уточните источник');
     catalogSeen.set(key,n);
     if(warehouse)p.warehouses[warehouse].stock=n;
    }
    if(desc.kind==='transactions'){
     const doc=h.indexOf('документ');if(doc>=0&&/^заказ/i.test(clean(row[doc])))continue;
     const d=date(row[c.date]),q=num(row[c.qty]);if(!d||q===null)continue;
     const client=c.client>=0?clean(row[c.client]):'',order=c.order>=0?clean(row[c.order]):'';
     if(client&&!/^anon-[a-f0-9]{64}$/.test(client)&&!/^anon[-_][a-z0-9_-]+$/i.test(client))throw Error('Клиентские ID должны быть обезличены перед расчётом. Используйте импорт приложения.');
     // Distinct equal lines in one document remain additive. Deduplicate overlapping sheets, not line items.
     const key=p.key+'|'+d+'|'+order+'|'+warehouse+'|'+q+'|'+client;
     const origin=desc.file+'|'+desc.name;
     const existing=transactionDedup.get(key);
     if(existing&&existing!==origin)continue;
     p.transactions.push({date:d,qty:q,order,client,warehouse});
     transactionDedup.set(key,origin);
     if(warehouse){const m=d.slice(0,7),w=p.warehouses[warehouse];w.sales[m]=(w.sales[m]||0)+q;}
    }
    if(desc.kind==='transit'){
     const qty=num(row[c.qty]),eta=date(row[c.eta]);if(!(qty>0))continue;
     const order=c.order>=0?clean(row[c.order]):'',key=[p.key,warehouse,order,qty,eta].join('|');
     if(transitDedup.has(key))continue;transitDedup.add(key);
     const t={qty,eta,source:'transit',order,warehouse};p.transit.push(t);if(warehouse)p.warehouses[warehouse].transit.push(t);
    }
    if(desc.kind==='stockouts'&&warehouse){const start=date(row[c.start]),end=date(row[c.end]);if(start&&end&&start<=end)p.warehouses[warehouse].stockouts.push({start,end});}
   }
  }
  for(const p of Object.values(data.products)){
   if(p.scopedSales){p.sales={};for(const w of Object.values(p.warehouses))for(const [m,v]of Object.entries(w.sales))p.sales[m]=(p.sales[m]||0)+v;}
   const summary=p.transit.filter(t=>t.source==='consolidated'),detail=p.transit.filter(t=>t.source==='transit');if(summary.length&&detail.length){const residual=[];for(const t of summary){const sum=detail.filter(d=>d.eta===t.eta).reduce((a,d)=>a+d.qty,0);if(t.qty>sum)residual.push({...t,qty:t.qty-sum});}p.transit=[...detail,...residual];p.importIssues.push('Сводные поставки сверены с детализацией по дате; проверьте покрытие');}
   const txMonth={};for(const t of p.transactions){const m=t.date.slice(0,7);txMonth[m]=(txMonth[m]||0)+t.qty;}for(const [m,v]of Object.entries(txMonth))if(p.salesPriority[m]===1)p.sales[m]=v;
   const warehouseStocks=Object.values(p.warehouses).map(w=>w.stock);
   if(warehouseStocks.length&&warehouseStocks.every(x=>x!==null))p.stock=warehouseStocks.reduce((a,b)=>a+b,0);
   if(p.importIssues.some(x=>x.startsWith('Противоречивые остатки')))p.stock=null;
   p.seasonality=data.seasonality;p.seasonSource=data.seasonSource;
   if(p.stockHistory&&Object.keys(p.stockHistory).length)p.stockAsOf=Object.keys(p.stockHistory).sort().at(-1);
   all.products[p.key]=p;
  }
  all.files.push(...data.files.map(f=>({...f,supplier:vendor})));all.warnings.push(...data.warnings);
  const snapshot=ss.map(s=>date(s.file)).filter(Boolean).sort().at(-1)||data.snapshot;
  if(!all.snapshot||snapshot>all.snapshot)all.snapshot=snapshot;
 }
 all.warehouses=[...warehouseNames].sort();all.warnings=[...new Set([...all.warnings,...warnings])];if(Object.values(all.products).every(p=>p.supplier))all.warnings=all.warnings.filter(w=>!w.startsWith('Поставщик для строк'));all.warnings=all.warnings.map(w=>w.startsWith('Общая сезонность')?'Сезонность: при двух полных годах используется профиль артикула (80%) и загруженная сезонность (20%); иначе — загруженные коэффициенты.':w);
 if(all.warehouses.length)all.warnings.push('Складские продажи доступны. Если остаток по выбранному складу не передан, заказ заблокирован до загрузки остатков.');
 if(!Object.values(all.products).some(p=>p.stockouts.length))all.warnings.push('Точных stockout нет в выгрузках. Загрузите Stockouts из универсального шаблона; оценка по месячным остаткам — отдельное допущение.');
 all.snapshot=all.snapshot||new Date().toISOString().slice(0,10);
 return all;
}
function threshold(v){const a=v.filter(x=>x>0).sort((a,b)=>a-b),m=median(a),mad=median(a.map(x=>Math.abs(x-m)));return Math.max(m*8,m+8*mad,10);}
function seasonal(p,data,cfg,months){
 if(!cfg.seasonality)return {f:Array(12).fill(1),source:'Отключена'};
 const external=p.seasonality||data.seasonality;
 if(external&&(!Array.isArray(external)||external.length!==12||external.some(x=>!Number.isFinite(x)||x<=0)))throw Error('Сезонность должна содержать 12 положительных конечных коэффициентов.');
 const years={};for(const [m,q]of Object.entries(p.sales)){if(m>=cfg.asOf.slice(0,7)||q<0)continue;(years[m.slice(0,4)]??={})[+m.slice(5)-1]=q/days(m);}
 const full=Object.values(years).filter(y=>Object.keys(y).length===12&&mean(Object.values(y))>0);
 if(full.length>=2){
  const f=Array.from({length:12},(_,i)=>median(full.map(y=>y[i]/mean(Object.values(y)))));
  const avg=mean(f);const own=f.map(v=>clamp(v/avg,.1,5));return {f:external?own.map((v,i)=>.8*v+.2*external[i]):own,source:'История артикула · '+full.length+' полных лет'+(external?' + 20% загруженной сезонности':'')};
 }
 return external?{f:external,source:p.seasonSource||data.seasonSource||'Загруженные коэффициенты'}:{f:Array(12).fill(1),source:'Недостаточно истории; сезонность 1'};
}
function calculateOne(product,data,settings={},override={}){
 const cfg={...PF.defaults,...settings},cat=(Object.hasOwn(cfg.categories||{},product.category)?cfg.categories[product.category]:{});if(!date(cfg.asOf))throw Error('Укажите корректную дату расчёта.');
 for(const [k,lo,hi]of [['lead',1,365],['review',1,365],['safety',0,180],['growth',-90,300]])if(!Number.isFinite(cfg[k])||cfg[k]<lo||cfg[k]>hi)throw Error('Параметр вне диапазона: '+k);
 let p=product;
 if(cfg.warehouse){const w=p.warehouses?.[cfg.warehouse];p={...p,stock:w?.stock??null,sales:w?.sales||{},stockHistory:w?.stockHistory||{},stockouts:w?.stockouts||[],transit:w?.transit||[],transactions:p.transactions.filter(t=>t.warehouse===cfg.warehouse),warehouse:cfg.warehouse};}
 const supplierRule=Object.hasOwn(cfg.suppliers||{},p.supplier)?cfg.suppliers[p.supplier]:{};
 const lead=clamp(num(override.lead)??p.leadDays??num(supplierRule.lead)??num(cat.lead)??cfg.lead,1,365),review=cfg.review,safety=clamp(num(cat.safety)??cfg.safety,0,180),horizon=lead+review;
 const mult=clamp(num(cat.multiplier)??1,0,5),months=monthsBefore(cfg.asOf,12),sea=seasonal(p,data,cfg,months),seas=sea.f;
 const current=cfg.asOf.slice(0,7),elapsed=+cfg.asOf.slice(8),useCurrent=cfg.currentMonth!==false&&elapsed>=7&&Object.hasOwn(p.sales,current);
 const historyMonths=useCurrent?[...months,current]:months,raw={},cleaned={},corrected={},lost={},anomalies=[],quality=[];
 for(const m of historyMonths){const q=p.sales[m];if(q!=null&&!Number.isFinite(q))throw Error('Некорректные продажи: '+p.sku);raw[m]=Math.max(0,q||0);cleaned[m]=raw[m];}
 const groups=new Map();for(const [i,t]of p.transactions.entries()){if(t.date<months[0]+'-01'||t.date>cfg.asOf||!(t.qty>0))continue;const key=t.date+'|'+(t.client||t.order||i);const g=groups.get(key)||{date:t.date,qty:0,client:!!t.client};g.qty+=t.qty;groups.set(key,g);}
 const orders=[...groups.values()],coverage={},excluded={};for(const o of orders)coverage[o.date.slice(0,7)]=(coverage[o.date.slice(0,7)]||0)+o.qty;
 if(orders.length>=8){const limit=threshold(orders.map(o=>o.qty));for(const o of orders)if(o.qty>limit){const m=o.date.slice(0,7);excluded[m]=(excluded[m]||0)+o.qty;anomalies.push({date:o.date,qty:o.qty,type:'order',reason:o.client?'Разовый дневной объём одного клиента':'Разовый объём документа'});}}
 if(cfg.outliers)for(const m of historyMonths)cleaned[m]=Math.max(0,raw[m]-(excluded[m]||0));
 // Detect monthly residual peaks even when only some transactions are available.
 const vals=months.map(m=>cleaned[m]/seas[+m.slice(5)-1]),limit=threshold(vals),normal=median(vals.filter(v=>v<=limit));
 if(vals.filter(v=>v>0).length>=6)for(const m of historyMonths){
  const scale=m===current?days(m)/elapsed:1,normalized=cleaned[m]*scale/seas[+m.slice(5)-1];
  const covered=coverage[m]||0,complete=raw[m]>0&&Math.abs(covered-raw[m])<=Math.max(1,raw[m]*.02);
  if(normalized>limit&&(!complete||orders.length<8)){
   const replacement=normal*seas[+m.slice(5)-1]/scale,qty=Math.max(0,cleaned[m]-replacement);
   anomalies.push({date:m+'-01',qty,type:'month',reason:'Месячный пик при неполной детализации'});
   if(cfg.outliers)cleaned[m]=replacement;
  }
 }
 const off={};for(const m of historyMonths){
  const n=m===current?elapsed:days(m),set=new Set();for(const o of p.stockouts){if(!date(o.start)||!date(o.end)||o.start>o.end)throw Error('Некорректный stockout');
   for(let day=1;day<=n;day++){const d=m+'-'+String(day).padStart(2,'0');if(d>=o.start&&d<=o.end)set.add(day);}}
  off[m]=set.size;
  if(cfg.stockoutProxy&&off[m]===0&&p.stockHistory[m]===0&&raw[m]===0){const prev=monthsBefore(m+'-01',1)[0];if(p.stockHistory[prev]===0)off[m]=n;}
 }
 const ratesRef=historyMonths.filter(m=>cleaned[m]>0&&off[m]<(m===current?elapsed:days(m))).map(m=>cleaned[m]/((m===current?elapsed:days(m))-off[m])/seas[+m.slice(5)-1]),reference=median(ratesRef);
 for(const m of historyMonths){const n=m===current?elapsed:days(m),avail=n-off[m],q=cleaned[m],f=seas[+m.slice(5)-1];
  corrected[m]=off[m]>0?(avail>0&&q>0?q*n/avail:q+reference*f*off[m]):q;lost[m]=Math.max(0,corrected[m]-q);}
 const rates=months.map(m=>corrected[m]/days(m)/seas[+m.slice(5)-1]),first=months.findIndex(m=>Object.hasOwn(p.sales,m)),effective=rates.slice(Math.max(0,first));
 const prior=effective.slice(-6,-3),last=effective.slice(-3),a=median(prior),b=median(last);
 let trend=a>0&&prior.length===3?clamp(b/a-1,-.5,.5):0;
 if(cfg.reportedGrowth&&p.reportedGrowth!=null)trend=clamp(num(p.reportedGrowth)??0,-.8,1);
 let baseline=mean(effective.slice(-6));
 if(useCurrent){const r=corrected[current]/elapsed/seas[+current.slice(5)-1],w=elapsed/days(current);baseline=(baseline*3+r*w)/(3+w);}
 const planned=clamp((cfg.growth+(num(p.plannedGrowth)||0))/100,-.9,3),rate=baseline*(1+trend*.5)*(1+planned)*mult;
 const daily=Array.from({length:horizon+safety},(_,i)=>{const d=addDays(cfg.asOf,i+1);return {date:d,qty:rate*seas[+d.slice(5,7)-1]};});
 const demand=daily.slice(0,horizon).reduce((a,d)=>a+d.qty,0),buffer=daily.slice(horizon).reduce((a,d)=>a+d.qty,0),target=demand+buffer;
 let stock=num(override.stock)??p.stock??(cfg.blanksZero?0:null),transit=0,uncertain=0,late=0,overdue=0;
 if(stock!==null&&!Number.isFinite(stock))throw Error('Некорректный остаток');
 const end=addDays(cfg.asOf,horizon),incoming=p.transit.filter(t=>Number.isFinite(t.qty)&&t.qty>0),seen=new Set();
 for(const t of incoming){const key=[t.order||'',t.eta,t.qty,t.warehouse||''].join('|');if(seen.has(key))continue;seen.add(key);
 if(!t.eta){uncertain+=t.qty;if(cfg.includeUndated)transit+=t.qty;}else if(t.eta<=cfg.asOf)overdue+=t.qty;else if(t.eta<=end)transit+=t.qty;else late+=t.qty;}
 if(num(override.transit)!==null)transit=Math.max(0,num(override.transit));
 const multiple=Math.max(1,p.multiple||1),minQty=Math.max(0,p.minQty||0),net=stock===null?null:Math.max(0,target-stock-transit);
 let order=net===null?null:net>0?Math.ceil(Math.max(net,minQty)/multiple)*multiple:0;
 if(![rate,demand,buffer,target,multiple,minQty].every(Number.isFinite)||(order!==null&&!Number.isSafeInteger(order)))throw Error('Расчёт вне допустимого числового диапазона: '+p.sku);
 let running=stock??0,deficitDate=null;for(const d of daily.slice(0,lead)){running+=incoming.filter(t=>t.eta===d.date).reduce((a,t)=>a+t.qty,0);running-=d.qty;if(running<0&&!deficitDate)deficitDate=d.date;}
 const avgRate=demand/horizon,cover=stock===null?null:avgRate>0?Math.max(0,stock)/avgRate:null;
 const missingHistory=!Object.keys(p.sales).some(m=>m<=current);
 if(missingHistory){order=null;quality.push('Нет истории продаж для выбранного склада');}
 if(stock===null)quality.push('Нет подтверждённого текущего остатка');
 if(!p.supplier)quality.push('Поставщик задан в настройках');
 if(p.leadDays==null&&!supplierRule.lead)quality.push('Срок поставки — общее допущение');
 if(!p.stockouts.length)quality.push('Нет точных stockout');
 if(uncertain)quality.push('Поставка без даты');if(overdue)quality.push('Просроченная поставка: подтвердите получение');
 if(sea.source.startsWith('Недостаточно'))quality.push(sea.source);
 if(p.importIssues)quality.push(...p.importIssues);
 const risk=order===null?'data':deficitDate&&rate>0?'critical':order>0?'order':avgRate>0&&stock>avgRate*(horizon+safety)*2?'excess':'ok';
 const excludedQty=historyMonths.reduce((a,m)=>a+raw[m]-cleaned[m],0),lostQty=historyMonths.reduce((a,m)=>a+lost[m],0),seasonalFactor=baseline?demand/(rate*horizon)||1:1;
 const why=order===null?'Расчёт не утверждается: '+quality.join('; '):'Спрос '+demand.toFixed(1)+' + страховой запас '+buffer.toFixed(1)+' − остаток '+stock.toFixed(1)+' − поставки '+transit.toFixed(1)+' = '+net.toFixed(1)+'. MOQ '+minQty+', кратность '+multiple+'; заказ '+order+'. Сезонность: '+sea.source+'. Тренд '+(trend*100).toFixed(1)+'%, плановый рост '+(planned*100).toFixed(1)+'%. Исключено '+excludedQty.toFixed(1)+', восстановлено stockout '+lostQty.toFixed(1)+'.';
 return {...p,stock,order,net,demand,buffer,target,transit,uncertain,late,overdue,cover,risk,lead,review,safety,horizon,baseline,rate,trend,planned,seasonalFactor,seasonSource:sea.source,mult,anomalies,excludedQty,lostQty,quality,months,raw,cleaned,corrected,lost,daily,deficitDate,multiple,minQty,supplier:p.supplier||cfg.supplier,cost:p.cost>0?p.cost:null,total:p.cost>0&&order!==null?order*p.cost:null,why};
}
function calculate(data,cfg){return Object.values(data.products).map(p=>calculateOne(p,data,cfg)).sort((a,b)=>({critical:0,order:1,data:2,excess:3,ok:4}[a.risk]-{critical:0,order:1,data:2,excess:3,ok:4}[b.risk])||(b.order||0)-(a.order||0));}
Object.assign(PF,{build,classify,date,calculateOne,calculate,version:'1.0.0'});Object.assign(PF.defaults,{currentMonth:true,warehouse:'',suppliers:{}});
if(typeof module!=='undefined')module.exports=PF;
})(typeof window!=='undefined'?window:globalThis);

