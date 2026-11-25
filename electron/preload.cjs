// Minimal bridge. The board is a self-contained web app; the only privileged thing it may read
// is the shared settings file for multi-PC deployment (C:\ProgramData\LuachDigitali\settings.json),
// and the Home Front Command alerts feed, fetched by the main process.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('luach', {
  isElectron: true,
  version: '1.0.0',
  /** { json, mtime } of the shared settings file, or null when there is none */
  /** One poll of the Home Front Command alerts feed (or a relay URL), done by the main process. */
  oref: (url) => ipcRenderer.invoke('luach:oref', url),
  seed: () => {
    try {
      return ipcRenderer.sendSync('luach:seed')
    } catch {
      return null
    }
  },
})
