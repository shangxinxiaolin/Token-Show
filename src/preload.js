const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getUsage: (range) => ipcRenderer.invoke('usage:get', range),
  refresh: () => ipcRenderer.invoke('usage:refresh'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
  chooseDb: (clientId) => ipcRenderer.invoke('config:chooseDb', clientId),
  showDb: (clientId) => ipcRenderer.invoke('shell:showDb', clientId),
  onChanged: (cb) => {
    const h = () => cb();
    ipcRenderer.on('usage:changed', h);
    return () => ipcRenderer.removeListener('usage:changed', h);
  },
});
