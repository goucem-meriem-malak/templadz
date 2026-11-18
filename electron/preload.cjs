const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('templadz', {
  tplList: call('tpl:list'), tplLoad: call('tpl:load'), tplSave: call('tpl:save'),
  tplDelete: call('tpl:delete'), tplExport: call('tpl:export'), tplImport: call('tpl:import'),
  fileSave: call('file:save'), fileWrite: call('file:write'), dirPick: call('dir:pick'), csvPick: call('csv:pick'),
  printDoc: call('doc:print'), fullscreen: call('win:fullscreen'), paste: call('edit:paste'),
  licStatus: call('lic:status'), licActivate: call('lic:activate'),
});
