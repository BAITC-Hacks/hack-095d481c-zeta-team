(function(root){'use strict';
let keyPromise,cache=new Map();
function key(){return keyPromise??=(crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign']));}
async function anonymous(value){const v=String(value??'').trim();if(!v)return '';if(/^anon-[a-f0-9]{64}$/.test(v))return v;if(!cache.has(v))cache.set(v,crypto.subtle.sign('HMAC',await key(),new TextEncoder().encode(v)).then(b=>'anon-'+[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')));return cache.get(v);}
async function sanitize(sheets){for(const s of sheets){const c=PF.classify(s);if(c.header==null)continue;const h=s.rows[c.header];const ci=h.findIndex(x=>['clientid','обезличенныйклиент','обезличенныйidклиента','idклиента','клиент','контрагент','покупатель','фио'].includes(PF.norm(x)));if(ci>=0){h[ci]='client_id';for(const r of s.rows.slice(c.header+1))r[ci]=await anonymous(r[ci]);}
const personal=h.map((x,i)=>['телефон','email','емейл','адресклиента','иин','бинклиента','паспорт'].includes(PF.norm(x))?i:-1).filter(i=>i>=0);for(const r of s.rows.slice(c.header+1))for(const i of personal)r[i]=null;}return sheets;}
async function build(sheets){if(location.protocol==='file:')return PF.build(sheets);return new Promise((resolve,reject)=>{let worker;try{worker=new Worker('./assets/engine-worker.js');}catch(e){resolve(PF.build(sheets));return;}const timer=setTimeout(()=>{worker.terminate();reject(Error('Импорт превышает лимит времени. Разделите данные.'));},180000);worker.onmessage=e=>{clearTimeout(timer);worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data.data);};worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Не удалось выполнить импорт. Откройте Desktop или запустите локальный сервер.'));};worker.postMessage({sheets});});}
root.PFPrivacy={sanitize,build,anonymous};
})(window);

