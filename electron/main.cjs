const { app, BrowserWindow, globalShortcut, powerSaveBlocker, Menu, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// Load the built bundle when packaged (or when ELECTRON_LOAD_DIST=1), else the dev server.
const loadDist = app.isPackaged || process.env.ELECTRON_LOAD_DIST === '1'
const DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:4040'

/**
 * Settings for many machines at once: copy a backup file (exported from the board's settings)
 * to this path on each PC. The board applies it on start whenever the file is newer than the last one applied.
 */
const SEED_FILE = path.join(process.env.ProgramData || 'C:\\ProgramData', 'LuachDigitali', 'settings.json')

let win = null
let blockerId = null
let quitting = false

// One board per machine: a second launch (e.g. startup + a click on the shortcut) just focuses the first.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
}

ipcMain.on('luach:seed', (e) => {
  try {
    const stat = fs.statSync(SEED_FILE)
    e.returnValue = { json: fs.readFileSync(SEED_FILE, 'utf8'), mtime: stat.mtimeMs }
  } catch {
    e.returnValue = null
  }
})

function load() {
  if (!win) return
  if (loadDist) win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  else win.loadURL(DEV_URL)
}

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    backgroundColor: '#0a0e1a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
    },
  })

  Menu.setApplicationMenu(null)
  load()
  win.once('ready-to-show', () => win.show())

  // Kiosk: Alt+F4 or the window's own close does nothing. Only the exit shortcut (or Windows shutdown) closes the board.
  win.on('close', (e) => {
    if (!quitting) e.preventDefault()
  })

  // Self-healing: if the page crashes, hangs or fails to load, reload it instead of leaving a dead screen.
  win.webContents.on('render-process-gone', () => setTimeout(load, 2000))
  win.on('unresponsive', () => setTimeout(() => win && win.webContents.reload(), 10000))
  win.webContents.on('did-fail-load', () => setTimeout(load, loadDist ? 5000 : 1500))

  // Links never open inside the kiosk.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith(DEV_URL)) e.preventDefault()
  })
}

/** A fresh start every night at 03:00 keeps a board that runs for months light and current. */
function scheduleNightlyReload() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(3, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  setTimeout(() => {
    if (win) win.webContents.reloadIgnoringCache()
    scheduleNightlyReload()
  }, next.getTime() - now.getTime())
}

// Headless smoke test: load the built bundle offscreen, report, and quit.
function runSelfTest() {
  const w = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') },
  })
  let done = false
  const finish = (code, msg) => {
    if (done) return
    done = true
    console.log(msg)
    app.exit(code)
  }
  w.webContents.on('did-finish-load', async () => {
    try {
      const count = await w.webContents.executeJavaScript("document.querySelectorAll('.dots .dot').length")
      finish(count > 0 ? 0 : 1, count > 0 ? `SELFTEST_OK screens=${count}` : 'SELFTEST_FAIL no screens rendered')
    } catch (e) {
      finish(1, 'SELFTEST_FAIL ' + e)
    }
  })
  w.webContents.on('did-fail-load', (_e, ec, desc) => finish(1, `SELFTEST_FAIL load ${ec} ${desc}`))
  w.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  setTimeout(() => finish(1, 'SELFTEST_FAIL timeout'), 15000)
}

app.whenReady().then(() => {
  if (process.env.ELECTRON_TEST === '1') {
    runSelfTest()
    return
  }

  // Keep the synagogue display awake — never sleep or dim.
  try {
    blockerId = powerSaveBlocker.start('prevent-display-sleep')
  } catch {
    /* ignore */
  }

  createWindow()
  scheduleNightlyReload()

  // Exit the kiosk: Ctrl+Shift+Q. Leave / return to kiosk (e.g. to reach Windows): F11.
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    quitting = true
    app.quit()
  })
  globalShortcut.register('F11', () => {
    if (!win) return
    const on = win.isKiosk()
    win.setKiosk(!on)
    win.setFullScreen(!on)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Windows shutdown / logoff must not be blocked by the kiosk close guard.
app.on('before-quit', () => {
  quitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) powerSaveBlocker.stop(blockerId)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
