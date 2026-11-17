const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('templadz', {
  tplList: call('tpl:list'), tplLoad: call('tpl:load'), tplSave: call('tpl:save'),
  tplDelete: call('tpl:delete'), tplExport: call('tpl:export'), tplImport: call('tpl:import'),
  pdfSave: call('pdf:save'), pdfWrite: call('pdf:write'), csvPick: call('csv:pick'), dirPick: call('dir:pick'),
  licStatus: call('lic:status'), licActivate: call('lic:activate'),
});
