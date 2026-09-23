/* UI localization. Source data and calculation state are never translated. */
(function(root){
'use strict';
const dictionaries=root.PFLocales||(typeof require==='function'?require('./locales.js'):{});
const supported=Object.freeze(['ru','kk','en']);
let language='ru',dialogRefresh=null;
try{const saved=root.localStorage?.getItem('procureflow.language');if(supported.includes(saved))language=saved;}catch{}
const locale=()=>({ru:'ru-RU',kk:'kk-KZ',en:'en-US'}[language]);
const normalize=s=>String(s??'').trim();
const translate=source=>language==='ru'?source:(dictionaries[language]?.[source]??source);
function text(source){
 source=String(source??'');const key=normalize(source);
 return source.slice(0,source.indexOf(key))+translate(key)+source.slice(source.indexOf(key)+key.length);
}
function markup(source){
 // Only literal source markup reaches this function. Interpolated data is inserted afterwards.
 const tag=/<[^>]*>/g;let result='',end=0,match;
 while((match=tag.exec(source))){
  result+=text(source.slice(end,match.index));
  result+=match[0].replace(/\b(title|placeholder|aria-label|alt)=(["'])(.*?)\2/g,(_m,name,quote,value)=>name+'='+quote+text(value).replace(/"/g,'&quot;').replace(/'/g,'&#39;')+quote);
  end=tag.lastIndex;
 }
 return result+text(source.slice(end));
}
function s(source){source=String(source??'');return source.includes('<')?markup(source):text(source);}
function tpl(strings,...values){
 const source=strings.reduce((a,chunk,i)=>a+chunk+(i<values.length?'{'+i+'}':''),'');
 const translated=s(source);
 return translated.replace(/\{(\d+)\}/g,(token,i)=>Number(i)<values.length?String(values[Number(i)]):token);
}
function labels(obj){return new Proxy(obj,{get(target,key){const value=target[key];return typeof value==='string'?s(value):value;}});}
const escapeRegex=s=>s.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
const patterns=Object.keys(dictionaries.en||{}).filter(k=>/\{\d+\}/.test(k)&&!k.includes('<')).map(key=>{
 const indexes=[];let previous=0,source='^';for(const m of key.matchAll(/\{(\d+)\}/g)){source+=escapeRegex(key.slice(previous,m.index))+'([\\s\\S]*?)';indexes.push(+m[1]);previous=m.index+m[0].length;}
 source+=escapeRegex(key.slice(previous))+'$';
 return {key,indexes,regex:new RegExp(source),weight:key.replace(/\{\d+\}/g,'').length};
}).sort((a,b)=>b.weight-a.weight);
function message(value,depth=0){
 const source=String(value??'');if(language==='ru')return source;
 const key=normalize(source);if(dictionaries[language]?.[key]!=null)return text(source);
 for(const p of patterns){const match=p.regex.exec(key);if(!match)continue;const values={};p.indexes.forEach((n,i)=>values[n]=depth<4&&/Расчёт не утверждается|Сезонность:|История артикула/.test(p.key)?message(match[i+1],depth+1):match[i+1]);return translate(p.key).replace(/\{(\d+)\}/g,(token,n)=>values[n]??token);}
 if(source.startsWith('Проект: '))return s('Проект: ')+message(source.slice(8));
 // Compound diagnostics are generated with semicolon-delimited clauses.
 if(source.includes('; '))return source.split('; ').map(message).join('; ');
 return source;
}
function date(value){
 if(!value)return '—';
 const input=String(value),month=/^\d{4}-\d{2}$/.test(input);
 const parsed=new Date(input+(month?'-01':'')+'T00:00:00Z');
 return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat(locale(),{timeZone:'UTC',...(month?{month:'short',year:'numeric'}:{day:'2-digit',month:'2-digit',year:'numeric'})}).format(parsed):input;
}
const bindings=[];
function bind(element,source,attribute){
 if(!element)return;bindings.push({element,source,attribute});
 if(attribute)element.setAttribute(attribute,s(source));else element.textContent=s(source);
}
function captureStatic(){
 if(!root.document)return;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const node=walker.currentNode;if(/[А-Яа-яЁё]/.test(node.nodeValue)&&!node.parentElement.closest('script,style'))bindings.push({element:node,source:node.nodeValue,node:true});}
 for(const element of document.querySelectorAll('[title],[placeholder],[aria-label],meta[name=description]')){
  for(const attribute of ['title','placeholder','aria-label',...(element.tagName==='META'?['content']:[])]){
   const source=element.getAttribute(attribute);if(source&&/[А-Яа-яЁё]/.test(source))bindings.push({element,source,attribute});
  }
 }
}
function updateBindings(){
 for(const b of bindings){if(!b.element.isConnected)continue;const result=s(b.source);if(b.node)b.element.nodeValue=result;else if(b.attribute)b.element.setAttribute(b.attribute,result);else b.element.textContent=result;}
 if(root.document){document.documentElement.lang=language;document.title=s('ProcureFlow — планирование закупок');const select=document.querySelector('#language-select');if(select)select.value=language;}
}
function setLanguage(code){
 if(!supported.includes(code))throw Error('Unsupported interface language');
 language=code;
 try{root.localStorage?.setItem('procureflow.language',code);}catch{}
 updateBindings();
 if(root.document)root.dispatchEvent(new CustomEvent('pf:language',{detail:{language:code}}));
 return language;
}
function mount(){
 captureStatic();
 const actions=document.querySelector('.top-actions');
 const control=document.createElement('label');control.className='language-control';
 const label=document.createElement('span');label.className='language-label';
 const select=document.createElement('select');select.id='language-select';
 for(const [value,name] of [['kk','Қазақша'],['ru','Русский'],['en','English']]){const option=document.createElement('option');option.value=value;option.textContent=name;select.appendChild(option);}
 select.addEventListener('change',()=>setLanguage(select.value));control.append(label,select);actions.prepend(control);
 bind(label,'Язык');bind(select,'Язык интерфейса','aria-label');updateBindings();
}
const api={s,tpl,text:message,message,labels,locale,date,supported,setLanguage,bind,getLanguage:()=>language,setDialogRefresh:fn=>{dialogRefresh=fn;},refreshDialog:()=>dialogRefresh?.(),updateBindings};
root.PFLang=api;if(typeof module!=='undefined')module.exports=api;
if(root.document)mount();
})(typeof window!=='undefined'?window:globalThis);
