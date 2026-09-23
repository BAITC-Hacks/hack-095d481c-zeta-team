'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('PFDesktop',Object.freeze({
 isDesktop:true,
 info:()=>ipcRenderer.invoke('pf:info'),
 setLanguage:language=>ipcRenderer.invoke('pf:language',language),
 saveProject:text=>ipcRenderer.invoke('pf:save-project',text),
 openProject:()=>ipcRenderer.invoke('pf:open-project'),
 onCommand:callback=>{const listener=(_event,command)=>callback(command);ipcRenderer.on('pf:command',listener);return()=>ipcRenderer.removeListener('pf:command',listener);}
}));
