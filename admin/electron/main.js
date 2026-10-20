const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const isProd = process.argv.includes('--prod');
const DEV_SERVER_URL = 'http://localhost:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#101D2C', // matches the app's navy — avoids a flash on load
    show: false,
    title: 'Sky Optics Admin',
    autoHideMenuBar: true, // belt-and-braces in case the menu reappears on some platforms
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (isProd) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// Remove the default Electron application menu (File / Edit / View / Window / Help).
// The admin has no use for it, and it takes up vertical space at the top of
// the window. Menus can still be re-enabled later if a need arises.
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});