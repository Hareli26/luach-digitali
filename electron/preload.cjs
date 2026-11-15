// Minimal bridge. The board is a self-contained web app; the only privileged thing it may read
// is the shared settings file for multi-PC deployment (C:\ProgramData\LuachDigitali\settings.json).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('luach', {
  isElectron: true,
  version: '1.0.0',
  /** { json, mtime } of the shared settings file, or null when there is none */
  seed: () => {
    try {
      return ipcRenderer.sendSync('luach:seed')
    } catch {
      return null
    }
  },
})
