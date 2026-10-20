const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('skyOpticles', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
