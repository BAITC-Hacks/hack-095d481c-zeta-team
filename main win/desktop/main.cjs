'use strict';
const {app,BrowserWindow,Menu,protocol,session,dialog,ipcMain}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {assetPath,localPage,allowDownload}=require('./security.cjs');
const Project=require('../assets/project.js');
const smoke=process.argv.includes('--smoke-test');
let win,dialogBusy=false;
app.setName('ProcureFlow');app.disableHardwareAcceleration();
// No updater, analytics, external browser links, Node fetch, or crash upload is configured.
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('no-proxy-server');
protocol.registerSchemesAsPrivileged([{scheme:'procureflow',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
if(smoke)app.setPath('userData',path.join(os.tmpdir(),'procureflow-smoke-'+process.pid));
if(!smoke&&!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
function trusted(event){if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||!localPage(event.senderFrame.url))throw new Error('Недоверенный источник запроса.');}
function send(command){if(win&&!win.isDestroyed())win.webContents.send('pf:command',command);}
function createMenu(){Menu.setApplicationMenu(Menu.buildFromTemplate([
 {label:'Файл',submenu:[{label:'Загрузить Excel',accelerator:'CmdOrCtrl+I',click:()=>send('import')},{label:'Открыть проект…',accelerator:'CmdOrCtrl+O',click:()=>send('open')},{label:'Сохранить проект как…',accelerator:'CmdOrCtrl+S',click:()=>send('save')},{type:'separator'},{label:'Экспортировать рекомендации в Excel',accelerator:'CmdOrCtrl+E',click:()=>send('export')},{type:'separator'},{role:'quit',label:'Выход'}]},
 {label:'Правка',submenu:[{role:'undo',label:'Отменить'},{role:'redo',label:'Повторить'},{type:'separator'},{role:'cut',label:'Вырезать'},{role:'copy',label:'Копировать'},{role:'paste',label:'Вставить'},{role:'selectAll',label:'Выделить всё'}]},
 {label:'Вид',submenu:[{role:'resetZoom',label:'Масштаб 100%'},{role:'zoomIn',label:'Увеличить'},{role:'zoomOut',label:'Уменьшить'},{role:'togglefullscreen',label:'Полный экран'}]},
 {label:'Помощь',submenu:[{label:'Офлайн-режим и приватность',click:()=>send('privacy')},{label:'Методология расчёта',click:()=>send('method')}]}]));}
async function guardedDialog(event,action){trusted(event);if(dialogBusy)return{ok:false,error:'Уже открыто другое диалоговое окно.'};dialogBusy=true;try{return await action();}catch(e){return{ok:false,error:e.message};}finally{dialogBusy=false;}}
app.whenReady().then(async()=>{
 app.setAppUserModelId('kz.procureflow.desktop');
 const root=app.getAppPath(),ses=session.defaultSession;
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
 protocol.handle('procureflow',async request=>{
  const file=assetPath(root,request.url);if(!file||request.method!=='GET')return new Response('Forbidden',{status:403});
  try{return new Response(await fs.readFile(file),{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}
 });
 // The renderer has no network access, including HTTP, WebSockets, and remote file navigation.
 ses.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*','ftp://*/*','file://*/*']},(_details,callback)=>callback({cancel:true}));
 ses.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 ses.setPermissionCheckHandler(()=>false);
 ses.on('will-download',(_event,item)=>{
  if(!allowDownload(item.getURL())||!/\.(xlsx|csv|pfproject)$/i.test(item.getFilename())){item.cancel();return;}
  item.setSaveDialogOptions({title:'Сохранить файл на компьютере',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename())),buttonLabel:'Сохранить'});
 });
 win=new BrowserWindow({width:1440,height:960,minWidth:850,minHeight:620,show:false,title:'ProcureFlow — Offline Desktop',backgroundColor:'#f4f6f0',icon:path.join(root,'build','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false,spellcheck:false,devTools:!app.isPackaged||smoke}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!localPage(url))event.preventDefault();});
 win.webContents.on('will-redirect',event=>event.preventDefault());
 win.webContents.on('will-attach-webview',event=>event.preventDefault());
 win.webContents.on('page-title-updated',event=>event.preventDefault());
 win.webContents.on('will-prevent-unload',event=>{
  const response=dialog.showMessageBoxSync(win,{type:'warning',buttons:['Отмена','Закрыть без сохранения'],defaultId:0,cancelId:0,noLink:true,title:'Несохранённый проект',message:'Есть несохранённые изменения.',detail:'Нажмите «Отмена», затем «Сохранить проект», чтобы продолжить работу позже.'});
  if(response===1)event.preventDefault();
 });
 win.on('closed',()=>{win=null;});
 ipcMain.handle('pf:info',event=>{trusted(event);return{version:app.getVersion(),platform:process.platform,offline:true,storage:'Проекты сохраняются только в выбранные пользователем файлы. Автосохранения и облачной синхронизации нет.'};});
 ipcMain.handle('pf:save-project',(event,text)=>guardedDialog(event,async()=>{
  Project.decode(text);
  const pick=await dialog.showSaveDialog(win,{title:'Сохранить рабочий проект',defaultPath:path.join(app.getPath('documents'),'ProcureFlow-'+new Date().toISOString().slice(0,10)+'.pfproject'),filters:[{name:'Проект ProcureFlow',extensions:['pfproject']}]});
  if(pick.canceled||!pick.filePath)return{ok:false,canceled:true};
  const target=pick.filePath,temporary=target+'.'+process.pid+'.tmp';
  try{await fs.writeFile(temporary,text,{encoding:'utf8',mode:0o600});await fs.rename(temporary,target);}catch(e){await fs.rm(temporary,{force:true}).catch(()=>{});throw e;}
  return{ok:true,name:path.basename(target)};
 }));
 ipcMain.handle('pf:open-project',(event)=>guardedDialog(event,async()=>{
  const pick=await dialog.showOpenDialog(win,{title:'Открыть рабочий проект',properties:['openFile'],filters:[{name:'Проект ProcureFlow',extensions:['pfproject']}]});
  if(pick.canceled||!pick.filePaths[0])return{ok:false,canceled:true};
  const file=pick.filePaths[0];if((await fs.stat(file)).size>Project.MAX_BYTES)throw new Error('Файл больше 80 МБ.');
  const text=await fs.readFile(file,'utf8');Project.decode(text);return{ok:true,text,name:path.basename(file)};
 }));
 createMenu();
 if(smoke){setTimeout(()=>{console.error('Desktop smoke test timeout');app.exit(2);},300000).unref();}
 await win.loadURL('procureflow://app/index.html');
 if(smoke){const report=await require('./smoke.cjs').run(win);console.log(JSON.stringify(report,null,2));if(process.env.PF_SMOKE_OUTPUT)await fs.writeFile(process.env.PF_SMOKE_OUTPUT,JSON.stringify(report,null,2));await fs.rm(app.getPath('userData'),{recursive:true,force:true}).catch(()=>{});app.exit(report.ok?0:1);}
 else win.show();
}).catch(error=>{console.error(error);if(!smoke)dialog.showErrorBox('ProcureFlow: ошибка запуска',error.message);app.exit(1);});
app.on('window-all-closed',()=>app.quit());

