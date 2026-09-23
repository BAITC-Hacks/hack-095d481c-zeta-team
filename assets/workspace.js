(function(){
'use strict';
const A=window.ProcureFlowApp,$=s=>document.querySelector(s),D=window.PFDesktop;
let dirty=false,currentName='Новый проект',busy=false;
function text(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(text.timer);text.timer=setTimeout(()=>$('#toast').classList.remove('visible'),5500);}
function label(){const el=$('#project-status');el.textContent=currentName+(dirty?' · есть изменения':'');el.title=el.textContent;}
function setDirty(){dirty=true;label();}
function blobSave(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function save(){if(busy)return;busy=true;try{
 const payload=PFProject.encode(A.state),name='ProcureFlow-'+A.state.cfg.asOf+'.pfproject';
 if(D){const result=await D.saveProject(payload);if(result.canceled)return;if(!result.ok)throw new Error(result.error);currentName=result.name;}
 else{blobSave(payload,name,'application/json');currentName=name;}
 dirty=false;label();text(D?'Проект сохранён на компьютере.':'Файл проекта передан браузеру для сохранения. Проверьте загрузки.');
 }catch(e){text('Не удалось сохранить: '+e.message);}finally{busy=false;}}
function restore(payload,name){const p=PFProject.decode(payload);PFProject.restore(A.state,p,PF);$('#nav-count').textContent=A.state.rows.filter(x=>x.order>0).length;A.nav('dashboard');currentName=name;dirty=false;label();text('Проект открыт. Проверьте дату среза: '+A.state.cfg.asOf+'.');}
async function open(){if(busy)return;if(dirty&&!confirm('Открытие проекта заменит текущие данные. Несохранённые изменения будут потеряны. Продолжить?'))return;
 if(!D){$('#project-file-input').click();return;}busy=true;try{const r=await D.openProject();if(r.canceled)return;if(!r.ok)throw new Error(r.error);restore(r.text,r.name);}catch(e){text('Не удалось открыть: '+e.message);}finally{busy=false;}}
function privacy(){
 const desktop=!!D,dialog=$('#drawer');$('#drawer-content').innerHTML=`<div class="drawer-head"><div><span class="eyebrow">LOCAL-FIRST</span><h2>${desktop?'ProcureFlow Desktop':'ProcureFlow Web'}</h2></div><button class="icon-btn" data-action="close" aria-label="Закрыть">×</button></div><div class="drawer-body"><section class="card" style="padding:24px"><h3>${desktop?'Автономное рабочее место закупщика':'Расчёт на вашем устройстве'}</h3><p>Excel → расчёт → рекомендации → экспорт. Данные не передаются на сервер.</p><p>${desktop?'Приложение запускает файлы из установленного пакета, а не сайт GitHub Pages. Сетевые запросы из интерфейса заблокированы.':'Веб-версия не отправляет загруженные Excel на сервер. Для первого открытия сайта требуется интернет; для гарантированного автономного запуска используйте Desktop или локальную папку приложения.'}</p></section><section class="card" style="padding:24px"><h3>Рабочий проект .pfproject</h3><p>Сохраняет исходные листы, данные товаров, параметры, ручные количества и статусы подтверждения. Открывается в обеих версиях.</p><p><strong>Сохранение — только по вашей команде.</strong> Автосохранения, аккаунта и синхронизации нет. Перед закрытием нажмите «Сохранить проект».</p><p>Файл проекта не зашифрован и может содержать коммерческие данные. Не загружайте его в публичный репозиторий. Статусы менеджера — не электронная подпись.</p></section><section class="card" style="padding:24px"><h3>Контроль остаётся у менеджера</h3><p>Прогноз — эвристическая рекомендация. Сервис не отправляет заказы поставщикам. Подтверждение и выгрузка — отдельное действие человека.</p></section></div><div class="drawer-bottom"><button class="btn" id="privacy-open">Открыть проект</button><button class="btn btn-primary" id="privacy-save">Сохранить проект</button><button class="btn" data-action="close">Закрыть</button></div>`;if(!dialog.open)dialog.showModal();
 $('#privacy-save').addEventListener('click',()=>{dialog.close();save();});$('#privacy-open').addEventListener('click',()=>{dialog.close();open();});
}
async function command(c){if(c==='save')return save();if(c==='open')return open();if(c==='privacy')return privacy();if(c==='import')return $('#file-input').click();if(c==='export')return A.exportRows(A.state.rows);if(c==='method')return A.nav('method');}
const block=document.createElement('div');block.className='project-panel';block.innerHTML='<div class="nav-label">РАБОЧИЙ ПРОЕКТ</div><div id="project-status" class="project-status">Новый проект</div><div class="project-buttons"><button class="btn" id="save-project" title="Сохранить проект — Ctrl+S">Сохранить проект</button><button class="btn" id="open-project" title="Открыть проект — Ctrl+O">Открыть</button></div><button class="local-mode-button" id="privacy-info">'+(D?'● OFFLINE DESKTOP':'● ЛОКАЛЬНАЯ ОБРАБОТКА')+'</button><p class="project-note">Без облака. Сохраняйте проект перед закрытием.</p>';
$('.sidebar nav').after(block);
const quick=document.createElement('button');quick.className='btn project-shortcut';quick.textContent='Проект';quick.title='Сохранение, открытие и офлайн-режим';quick.addEventListener('click',privacy);$('.top-actions').prepend(quick);
const input=document.createElement('input');input.id='project-file-input';input.type='file';input.accept='.pfproject';input.hidden=true;document.body.appendChild(input);
input.addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>PFProject.MAX_BYTES)throw new Error('Файл больше 80 МБ.');restore(await f.text(),f.name);}catch(err){text('Не удалось открыть: '+err.message);}finally{input.value='';}});
$('#save-project').addEventListener('click',save);$('#open-project').addEventListener('click',open);$('#privacy-info').addEventListener('click',privacy);
window.addEventListener('pf:changed',setDirty);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
if(D){$('.local-badge').innerHTML='<svg><use href="#i-shield"/></svg>OFFLINE · Desktop';$('.version').innerHTML='<span class="online-dot"></span>Desktop edition <span>v0.2</span>';D.onCommand(command);}
else document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&['s','o'].includes(e.key.toLowerCase())){e.preventDefault();command(e.key.toLowerCase()==='s'?'save':'open');}});
window.PFWorkspace={save,open,restore,privacy,markDirty:setDirty,isDirty:()=>dirty};
})();
