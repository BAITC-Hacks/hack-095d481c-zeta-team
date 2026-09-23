/* ProcureFlow deterministic planning engine. No network, no model API. */
(function(root){
'use strict';
const DAY=86400000, MONTHS=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const clean=x=>String(x??'').trim().replace(/\s+/g,' ');
const norm=x=>clean(x).toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]/g,'');
const id=x=>clean(x).toUpperCase().replace(/\s/g,'').replace(/_+$/,'');
const num=x=>{if(x===null||x===undefined||clean(x)==='')return null;let s=clean(x).replace(/[\s\u00a0]/g,'').replace(',','.').replace('%','');const n=Number(s);return Number.isFinite(n)?n:null;};
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const median=a=>{a=[...a].sort((x,y)=>x-y);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:0;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function date(x){
 if(typeof x==='number'&&x>20000&&x<100000)return new Date(Date.UTC(1899,11,30)+x*DAY).toISOString().slice(0,10);
 const s=clean(x);let m=s.match(/(20\d{2})-(\d{2})-(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
 m=s.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null;
}
function month(x){const s=clean(x).toLowerCase();const d=date(x);if(d)return d.slice(0,7);const y=s.match(/20\d{2}/);let mi=MONTHS.findIndex(m=>s.includes(m));if(s.includes('мая'))mi=4;return y&&mi>=0?`${y[0]}-${String(mi+1).padStart(2,'0')}`:null;}
const days=m=>new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).getUTCDate();
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
function monthsBefore(asOf,count){let d=new Date(asOf+'T00:00:00Z');d.setUTCDate(1);const out=[];for(let i=0;i<count;i++){d.setUTCMonth(d.getUTCMonth()-1);out.unshift(d.toISOString().slice(0,7));}return out;}
const aliases={
 code:['код','номенклатуракод','код1с','code','internalcode'],sku:['артикул','артикулпоставщика','sku','article'],name:['номенклатура','наименование','name','productname'],
 qty:['количество','qty','quantity'],date:['дата','date','датапродажи'],stock:['свободныйостаток','stock','currentstock','остаток'],cost:['ссреал','cost','purchaseprice','себестоимость','закупочнаяцена'],
 supplier:['поставщик','supplier'],category:['категория2026','категория','category'],multiple:['кратность','multiple','packsize'],minimum:['moq','minqty','минимальнаяпартия'],
 lead:['leaddays','срокпоставкидней','срокпоставки'],growth:['growthpct','плановыйрост','прогнозприроста'],client:['clientid','обезличенныйклиент','обезличенныйidклиента','idклиента'],
 order:['номер','orderid','документid'],start:['startdate','начало','датаначала'],end:['enddate','конец','датаокончания'],eta:['eta','датапоставки','ожидаемаядата'],factor:['factor','коэффициент','сезонность'],
 mon:['месяц','month'],reported:['кэфроста','коэфроста']
};
function cols(headers){const h=headers.map(norm),c={};for(const [k,a]of Object.entries(aliases))c[k]=h.findIndex(x=>a.includes(x));return c;}
function classify(s){
 let best=null;
 s.rows.slice(0,25).forEach((r,ri)=>{
  const h=r.map(norm),c=cols(r),ms=r.map(month).filter(Boolean);let kind='',score=0;
  if(c.mon>=0&&c.factor>=0){kind='seasonality';score=100;}
  else if(h.includes('год')&&r.filter(x=>MONTHS.some(m=>clean(x).toLowerCase().startsWith(m))).length>=10){kind='season-years';score=50;}
  else if(c.start>=0&&c.end>=0&&(c.sku>=0||c.code>=0)){kind='stockouts';score=80;}
  else if(c.eta>=0&&c.qty>=0&&(c.sku>=0||c.code>=0)){kind='transit';score=80;}
  else if(c.date>=0&&c.qty>=0&&(c.sku>=0||c.code>=0)){kind='transactions';score=70;}
  else if(ms.length>=3&&(c.code>=0||c.sku>=0)){
   kind=h.includes('свободныйостаток')?'consolidated':(h.includes('едизм')||/остат|stocks/i.test(s.name+' '+s.file))?'monthly-stock':'monthly-sales';score=60+ms.length;
  }else if((c.sku>=0||c.code>=0)&&(c.multiple>=0||c.minimum>=0||c.stock>=0||c.supplier>=0||c.name>=0)){kind='catalog';score=45;}
  if(kind&&(!best||score>best.score))best={...s,kind,header:ri,c,score,monthCols:r.map((v,i)=>({m:month(v),i})).filter(x=>x.m)};
 });
 return best||{...s,kind:'unknown'};
}
function empty(){return {products:{},files:[],warnings:[],seasonality:null,seasonSource:'',seasonPriority:0,snapshot:null,latestSale:null,demo:false};}
function build(sheets){
 const data=empty(),lookup=new Map();let next=0;
 const descriptors=sheets.map(classify);
 function product(row,c){
  const code=c.code>=0?id(row[c.code]):'',sku=c.sku>=0?id(row[c.sku]):'';if(!code&&!sku)return null;
  if(['ИТОГО','ВСЕГО','TOTAL'].includes(code||sku))return null;
  let key=(code&&lookup.get('c:'+code))||(sku&&lookup.get('s:'+sku));
  if(!key){key='p'+(++next);data.products[key]={key,code,sku:sku||code,name:'',category:'',supplier:'',cost:null,stock:null,stockPriority:0,multiple:1,minQty:0,leadDays:null,plannedGrowth:null,reportedGrowth:null,sales:{},salesPriority:{},stockHistory:{},transit:[],transactions:[],stockouts:[],sources:[]};}
  if(code)lookup.set('c:'+code,key);if(sku)lookup.set('s:'+sku,key);
  const p=data.products[key];if(code)p.code=code;if(sku)p.sku=sku;if(c.name>=0&&clean(row[c.name]))p.name=clean(row[c.name]);return p;
 }
 // Master-data pass establishes code <-> article joins before transaction-only records.
 for(const s of descriptors.filter(s=>['catalog','consolidated','monthly-sales'].includes(s.kind)))for(const r of s.rows.slice(s.header+1))product(r,s.c);
 for(const s of descriptors){
  let imported=0;
  if(s.kind==='unknown'){data.files.push({file:s.file,sheet:s.name,kind:s.kind,rows:0});continue;}
  const snapshot=date(s.file);if(snapshot&&(!data.snapshot||snapshot>data.snapshot))data.snapshot=snapshot;
  if(s.kind==='seasonality'){
   const arr=Array(12).fill(1);let valid=0;
   for(const r of s.rows.slice(s.header+1)){const mn=clean(r[s.c.mon]).toLowerCase();let mi=MONTHS.findIndex(m=>mn.startsWith(m));if(mi<0&&num(mn)>=1&&num(mn)<=12)mi=num(mn)-1;const f=num(r[s.c.factor]);if(mi>=0&&f>0){arr[mi]=f;valid++;}}
   if(valid>=6){const avg=mean(arr);data.seasonality=arr.map(x=>x/avg);data.seasonPriority=2;data.seasonSource=s.file;imported=valid;}
  }else if(s.kind==='season-years'){
   if(data.seasonPriority<2){const years=s.rows.slice(s.header+1).filter(r=>num(r[0])>=2000&&num(r[0])<2100&&r.slice(1,13).filter(x=>num(x)!==null).length===12);if(years.length){const arr=Array.from({length:12},(_,i)=>mean(years.map(r=>num(r[i+1])/mean(r.slice(1,13).map(num)))));data.seasonality=arr.map(x=>x/mean(arr));data.seasonSource=s.file+' (полные годы)';data.seasonPriority=1;imported=12;}}
  }else{
   for(const r of s.rows.slice(s.header+1)){
    const p=product(r,s.c);if(!p)continue;const c=s.c;imported++;
    if(!p.sources.includes(s.kind))p.sources.push(s.kind);
    for(const [field,col]of [['category','category'],['supplier','supplier']])if(c[col]>=0&&clean(r[c[col]]))p[field]=clean(r[c[col]]);
    for(const [field,col]of [['cost','cost'],['leadDays','lead'],['minQty','minimum'],['plannedGrowth','growth'],['reportedGrowth','reported']])if(c[col]>=0&&num(r[c[col]])!==null)p[field]=num(r[c[col]]);
    if(c.multiple>=0&&num(r[c.multiple])>0)p.multiple=num(r[c.multiple]);
    if(s.kind==='catalog'&&c.stock>=0){p.stock=num(r[c.stock]);p.stockPriority=4;}
    if(s.kind==='consolidated'){
     p.stock=num(r[c.stock]);p.stockPriority=5;
     const transitCols=s.rows[s.header].map((x,i)=>({x:clean(x),i})).filter(o=>/в пути/i.test(o.x));
     p.transit=p.transit.filter(t=>t.source!=='consolidated');
     for(const t of transitCols){const q=num(r[t.i]);if(q>0){const short=t.x.match(/(\d{1,2})[.](\d{1,2})/);const year=+(snapshot||'2026').slice(0,4);p.transit.push({qty:q,eta:short?`${year}-${short[2].padStart(2,'0')}-${short[1].padStart(2,'0')}`:null,source:'consolidated'});}}
    }
    if(s.kind==='monthly-sales'||s.kind==='consolidated'){
     const priority=s.kind==='monthly-sales'?3:2;
     for(const {m,i}of s.monthCols)if((p.salesPriority[m]||0)<=priority){p.sales[m]=num(r[i])??0;p.salesPriority[m]=priority;}
    }
    if(s.kind==='monthly-stock'){
     for(const {m,i}of s.monthCols)p.stockHistory[m]=num(r[i]);
     if(p.stockPriority<4){p.stock=num(r[s.monthCols[s.monthCols.length-1].i]);p.stockPriority=3;}
    }
    if(s.kind==='transactions'){
     const d=date(r[c.date]),q=num(r[c.qty]);if(!d||q===null){imported--;continue;}
     const docCol=s.rows[s.header].map(norm).indexOf('документ');if(docCol>=0&&/^заказ/i.test(clean(r[docCol]))){imported--;continue;}
     p.transactions.push({date:d,qty:q,order:c.order>=0?clean(r[c.order]):'',client:c.client>=0?clean(r[c.client]):''});
     if(!data.latestSale||d>data.latestSale)data.latestSale=d;
    }
    if(s.kind==='stockouts'){const start=date(r[c.start]),end=date(r[c.end]);if(start&&end&&start<=end)p.stockouts.push({start,end});}
    if(s.kind==='transit'){const q=num(r[c.qty]);if(q>0)p.transit.push({qty:q,eta:date(r[c.eta]),source:'transit'});}
   }
  }
  data.files.push({file:s.file,sheet:s.name,kind:s.kind,rows:imported});
 }
 // Detailed sales are a fallback, never a second copy of the monthly report.
 for(const p of Object.values(data.products)){
  const txMonth={};for(const t of p.transactions){const m=t.date.slice(0,7);txMonth[m]=(txMonth[m]||0)+t.qty;}
  for(const [m,v]of Object.entries(txMonth))if(!(m in p.sales)){p.sales[m]=v;p.salesPriority[m]=1;}
  if(!p.name)p.name=p.sku;
  if(!p.category){const quoted=p.name.match(/["«]([^"»]+)["»]/);p.category=quoted?quoted[1].toUpperCase():'Без категории';}
 }
 data.snapshot=data.snapshot||data.latestSale||new Date().toISOString().slice(0,10);
 if(!Object.keys(data.products).length)throw new Error('Не найдены товарные строки. Используйте исходные файлы кейса или шаблон из сервиса.');
 const ps=Object.values(data.products);
 if(!ps.some(p=>p.transactions.some(t=>t.client)))data.warnings.push('В данных нет обезличенного ID клиента. Крупные заказы проверяются по документам, а не по клиентам.');
 if(!ps.some(p=>p.stockouts.length))data.warnings.push('Нет точных периодов отсутствия товара. Компенсация stockout доступна по отдельному шаблону; оценка по остаткам включается вручную.');
 if(ps.some(p=>!p.supplier))data.warnings.push('Поставщик для строк без справочника берётся из настроек. Это допущение, а не поле выгрузки.');
 if(ps.some(p=>p.leadDays===null))data.warnings.push('Срок поставки отсутствует у части товаров: используется значение из настроек.');
 if(data.seasonality)data.warnings.push('Общая сезонность из предоставленного отчёта используется как прокси для спроса в штуках. Это не индивидуальная сезонность каждого артикула.');
 if(data.files.some(f=>f.kind==='unknown'))data.warnings.push('Часть листов не распознана: они перечислены в отчёте загрузки и не участвуют в расчёте.');
 return data;
}
const defaults={lead:30,review:30,safety:14,growth:0,asOf:'2026-09-22',supplier:'System Electric',currency:'₸',outliers:true,seasonality:true,reportedGrowth:false,stockoutProxy:false,blanksZero:false,includeUndated:false,categories:{}};
function season(data,settings){return settings.seasonality&&data.seasonality?data.seasonality:Array(12).fill(1);}
function threshold(values){const a=values.filter(x=>x>0).sort((a,b)=>a-b),med=median(a),mad=median(a.map(x=>Math.abs(x-med))),q1=a[Math.floor(a.length*.25)]||0,q3=a[Math.floor(a.length*.75)]||0;return Math.max(med*8,med+8*mad,q3+6*(q3-q1),10);}
function outages(p,settings,months){
 const counts={};const valid=new Set(months),dates=new Set();
 for(const o of p.stockouts){const from=o.start<months[0]+'-01'?months[0]+'-01':o.start;let d=from;for(let i=0;i<1100&&d<=o.end&&d<=settings.asOf;i++,d=addDays(d,1)){if(valid.has(d.slice(0,7)))dates.add(d);}}
 for(const d of dates)counts[d.slice(0,7)]=(counts[d.slice(0,7)]||0)+1;
 if(settings.stockoutProxy)for(let i=1;i<months.length;i++){
  const m=months[i],prev=months[i-1],s=p.stockHistory[m],b=p.stockHistory[prev];
  const zero=x=>x===0||(settings.blanksZero&&x===null);
  if(!counts[m]&&zero(s)&&zero(b)&&(p.sales[m]||0)<=0)counts[m]=days(m);
 }
 return counts;
}
function calculateOne(p,data,settings,override={}){
 const cfg={...defaults,...settings},cat=cfg.categories[p.category]||{};
 const lead=clamp(num(override.lead)??p.leadDays??num(cat.lead)??cfg.lead,1,365),review=clamp(cfg.review,1,365),safety=clamp(num(cat.safety)??cfg.safety,0,180),horizon=lead+review;
 const mult=clamp(num(cat.multiplier)??1,0,5),seas=season(data,cfg),months=monthsBefore(cfg.asOf,12);
 const raw={},cleaned={},excluded={},anomalies=[];
 for(const m of months){raw[m]=Math.max(0,p.sales[m]||0);cleaned[m]=raw[m];}
 const groups=new Map();let txCount=0;
 for(const t of p.transactions){if(t.date>=months[0]+'-01'&&t.date<=cfg.asOf&&t.qty>0){txCount++;const key=t.date+'|'+(t.client?'client:'+t.client:t.order||('row'+txCount));const g=groups.get(key)||{date:t.date,qty:0,client:!!t.client,order:t.order};g.qty+=t.qty;groups.set(key,g);}}
 const orders=[...groups.values()];
 if(orders.length>=8){const limit=threshold(orders.map(o=>o.qty));for(const o of orders)if(o.qty>limit){const m=o.date.slice(0,7);anomalies.push({date:o.date,qty:o.qty,reason:o.client?'Крупный дневной объём одному обезличенному клиенту':'Крупный объём по документу',type:'order'});excluded[m]=(excluded[m]||0)+o.qty;}}
 for(const m of months)if(cfg.outliers)cleaned[m]=Math.max(0,cleaned[m]-(excluded[m]||0));
 // Monthly clipping is only a fallback when detailed order history is absent.
 if(orders.length<8){const vals=months.map(m=>raw[m]/seas[+m.slice(5)-1]);const limit=threshold(vals);if(vals.filter(x=>x>0).length>=6)months.forEach((m,i)=>{if(vals[i]>limit){const replacement=median(vals.filter(x=>x<=limit))*seas[+m.slice(5)-1];const excess=Math.max(0,raw[m]-replacement);anomalies.push({date:m+'-01',qty:excess,reason:'Аномальный месяц: оценка без детализации заказов',type:'month'});if(cfg.outliers)cleaned[m]=replacement;}});}
 const outage=outages(p,cfg,months),baseRates=months.filter(m=>(outage[m]||0)<days(m)&&cleaned[m]>0).map(m=>cleaned[m]/Math.max(1,days(m)-(outage[m]||0))/seas[+m.slice(5)-1]);
 const reference=median(baseRates),corrected={},lost={};
 for(const m of months){const off=outage[m]||0,avail=days(m)-off;const q=cleaned[m];let value=q;
  if(off>0)value=avail>0?q*days(m)/avail:Math.max(q,reference*seas[+m.slice(5)-1]*days(m));
  corrected[m]=value;lost[m]=Math.max(0,value-q);
 }
 const rates=months.map(m=>corrected[m]/days(m)/seas[+m.slice(5)-1]);
 // Missing pre-launch history is not manufactured; trailing zero months remain meaningful.
 const first=months.findIndex(m=>m in p.sales);const effective=rates.slice(Math.max(0,first));
 const recent=effective.slice(-6),prior=effective.slice(-6,-3),last=effective.slice(-3);
 const baseline=mean(recent),a=median(prior),b=median(last);
 let trend=(a>0&&prior.length>=3&&last.length>=3)?clamp(b/a-1,-.5,.5):0;
 if(cfg.reportedGrowth&&p.reportedGrowth!==null)trend=clamp(p.reportedGrowth,-.8,1);
 // Baseline already includes recent months; half of observed shift is projected forward.
 const trendFactor=1+trend*.5,planned=clamp((cfg.growth+(p.plannedGrowth||0))/100,-.9,3);
 const rate=baseline*trendFactor*(1+planned)*mult;
 let seasonalDays=0,leadSeasonDays=0;const daily=[];
 for(let i=1;i<=horizon+safety;i++){const d=addDays(cfg.asOf,i),v=seas[+d.slice(5,7)-1];daily.push({date:d,qty:rate*v});if(i<=horizon)seasonalDays+=v;if(i<=lead)leadSeasonDays+=v;}
 const demand=rate*seasonalDays,buffer=daily.slice(horizon).reduce((s,x)=>s+x.qty,0),target=demand+buffer;
 const stock=num(override.stock)??p.stock??(cfg.blanksZero?0:null);
 const incoming=p.transit.filter(t=>t.qty>0);let transit=0,uncertain=0,late=0,overdue=0;
 const end=addDays(cfg.asOf,horizon);
 for(const t of incoming){if(!t.eta){uncertain+=t.qty;if(cfg.includeUndated)transit+=t.qty;}else if(t.eta<=cfg.asOf){overdue+=t.qty;}else if(t.eta<=end){transit+=t.qty;}else late+=t.qty;}
 if(num(override.transit)!==null)transit=Math.max(0,num(override.transit));
 const net=stock===null?null:Math.max(0,target-stock-transit),multiple=Math.max(1,p.multiple||1),minQty=Math.max(0,p.minQty||0);
 const order=net===null?null:net>0?Math.ceil(Math.max(net,minQty)/multiple)*multiple:0;
 let running=stock??0,deficitDate=null;
 for(let i=0;i<lead;i++){const d=daily[i].date;running+=incoming.filter(t=>t.eta===d).reduce((s,t)=>s+t.qty,0);running-=daily[i].qty;if(running<0&&!deficitDate)deficitDate=d;}
 const avgRate=horizon?demand/horizon:0,cover=stock===null?null:avgRate>0?Math.max(0,stock)/avgRate:null;
 const risk=stock===null?'data':deficitDate&&rate>0?'critical':order>0?'order':avgRate>0&&stock>avgRate*(horizon+safety)*2?'excess':'ok';
 const quality=[];if(stock===null)quality.push('Нет текущего остатка');if(!p.supplier)quality.push('Поставщик задан в настройках');if(p.leadDays===null)quality.push('Срок поставки — допущение');if(effective.filter(x=>x>0).length<4)quality.push('Мало ненулевой истории');if(uncertain)quality.push('Поставка без даты');if(overdue)quality.push('Просроченная поставка: подтвердите получение');if(!p.stockouts.length)quality.push('Нет точных stockout');
 const excludedQty=months.reduce((s,m)=>s+raw[m]-cleaned[m],0),lostQty=months.reduce((s,m)=>s+lost[m],0);
 const seasonalFactor=horizon?seasonalDays/horizon:1;
 const why=stock===null?'Нет подтверждённого текущего остатка: рекомендация требует уточнения.':`Спрос ${demand.toFixed(1)} + страховой запас ${buffer.toFixed(1)} − остаток ${stock.toFixed(1)} − ожидаемые поставки ${transit.toFixed(1)} = ${Math.max(0,net).toFixed(1)}. Минимальная партия ${minQty}; кратность ${multiple}; заказ ${order} шт. Горизонт ${horizon} дн., сезонность ×${seasonalFactor.toFixed(2)}, тренд ${(trend*100).toFixed(0)}%, плановый рост ${(planned*100).toFixed(0)}%.`;
 return {...p,stock,order,net,demand,buffer,target,transit,uncertain,late,overdue,cover,risk,lead,review,safety,horizon,baseline,rate,trend,planned,seasonalFactor,mult,anomalies,excludedQty,lostQty,quality,months,raw,cleaned,corrected,lost,daily,deficitDate,supplier:p.supplier||cfg.supplier,cost:p.cost>0?p.cost:null,total:p.cost>0&&order!==null?order*p.cost:null,why};
}
function calculate(data,settings){return Object.values(data.products).map(p=>calculateOne(p,data,settings)).sort((a,b)=>{const order={critical:0,order:1,data:2,excess:3,ok:4};return order[a.risk]-order[b.risk]||(b.total||b.order||0)-(a.total||a.order||0);});}
function demo(){
 const d=empty();d.demo=true;d.snapshot='2026-09-22';d.seasonality=[.76,.79,.91,1.03,1.08,1.14,1.12,1.13,1.18,1.09,.96,.81];d.seasonality=d.seasonality.map(x=>x/mean(d.seasonality));d.seasonSource='Синтетический сценарий';
 const kinds=['Розетка двойная','Выключатель одноклавишный','Рамка на 3 поста','Автоматический выключатель','Розетка с заземлением','Переключатель с подсветкой'];
 for(let i=0;i<42;i++){
  const key='demo'+i,base=60+(i*97)%740;const p={key,code:'DEMO'+String(i+1).padStart(4,'0'),sku:'SP-'+String(1000+i),name:kinds[i%6]+' · '+['ATLAS','ART','WESSEN'][i%3]+' / демо',category:['Розетки','Выключатели','Рамки'][i%3],supplier:['Поставщик А','Поставщик Б','Поставщик В'][i%3],cost:450+(i*193)%5400,stock:i%7===0?0:Math.round(base*(i%5)*.55),multiple:[10,12,20,6][i%4],minQty:i%4===0?50:0,leadDays:20+(i%3)*10,plannedGrowth:0,reportedGrowth:null,sales:{},salesPriority:{},stockHistory:{},transit:[],transactions:[],stockouts:[],sources:['demo']};
  for(let y=2024;y<=2026;y++)for(let m=1;m<=12;m++){
   const ym=`${y}-${String(m).padStart(2,'0')}`;if(ym>'2026-09')continue;
   const q=Math.round(base*d.seasonality[m-1]*(1+(y-2024)*.06)*(1+Math.sin(i*2+m)*.1)*(ym==='2026-09'?.73:1));p.sales[ym]=q;p.stockHistory[ym]=Math.round(base*1.4);
   for(let day=1;day<=20;day++)p.transactions.push({date:ym+'-'+String(day).padStart(2,'0'),qty:q/20,order:`D-${i}-${ym}-${day}`,client:'anon-'+(day%6)});
  }
  if(i%6===0){p.sales['2026-07']+=base*12;p.transactions.push({date:'2026-07-22',qty:base*12,order:'BULK-'+i,client:'anon-bulk'});}
  if(i%5===0){p.stockouts.push({start:'2026-08-05',end:'2026-08-19'});p.sales['2026-08']=Math.round(p.sales['2026-08']*.5);p.stockHistory['2026-08']=0;}
  if(i%3===0)p.transit.push({qty:Math.round(base*.35),eta:'2026-09-28',source:'demo'});
  d.products[key]=p;
 }
 d.files=[{file:'Синтетический демонабор',sheet:'42 SKU · 3 поставщика',kind:'demo',rows:42}];d.warnings=['Демонстрационные данные вымышлены. Для расчёта по компании загрузите ваши Excel.'];return d;
}
root.PF={build,classify,calculate,calculateOne,defaults,demo,empty,clean,norm,num,date,month,monthsBefore,addDays,days,mean,median};
if(typeof module!=='undefined')module.exports=root.PF;
})(typeof window!=='undefined'?window:globalThis);
