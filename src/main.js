const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let overlayWindow;

function createMainWindow() {
  // Get primary display info for better 4K/HiDPI support
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const scaleFactor = primaryDisplay.scaleFactor;
  
  // Calculate optimal window size based on screen size and scale factor
  const windowWidth = Math.min(1400, Math.floor(screenWidth * 0.8));
  const windowHeight = Math.min(900, Math.floor(screenHeight * 0.8));
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      disableBlinkFeatures: 'Auxclick',
      backgroundThrottling: false,
      offscreen: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    titleBarStyle: 'default',
    backgroundColor: '#1a1a1a',
    thickFrame: false,
    hasShadow: false,
    skipTaskbar: false,
    resizable: true,
    movable: true
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Add DevTools toggle shortcut
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

function createOverlayWindow() {
  // Get primary display info for overlay sizing
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;
  
  overlayWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false // Allow audio to work properly
    },
    show: false
  });

  overlayWindow.loadFile(path.join(__dirname, 'desktop-overlay.html'));
  
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setVisibleOnAllWorkspaces(true);
  overlayWindow.setFullScreenable(false);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools();
  }
}


// Add command line switches to reduce cache errors
app.commandLine.appendSwitch('disable-gpu-blacklist');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('ignore-gpu-blacklist');

app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();
  
  Menu.setApplicationMenu(null);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createOverlayWindow();
    }
  });

  registerGlobalShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});


function registerGlobalShortcuts() {
  const settings = store.get('settings', {});
  const hotkeys = settings.hotkeys || {
    spinWheel: 'F1',
    progressUp: 'F2',
    progressDown: 'F3',
    challengeFailed: 'F4',
    pauseResume: 'F5'
  };

  Object.keys(hotkeys).forEach(action => {
    if (hotkeys[action]) {
      globalShortcut.register(hotkeys[action], () => {
        if (mainWindow) {
          mainWindow.webContents.send('hotkey-pressed', action);
        }
      });
    }
  });
}

ipcMain.handle('get-store-data', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-data', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('update-hotkeys', (event, hotkeys) => {
  globalShortcut.unregisterAll();
  const settings = store.get('settings', {});
  settings.hotkeys = hotkeys;
  store.set('settings', settings);
  registerGlobalShortcuts();
  return true;
});

// Overlay window management
ipcMain.handle('show-overlay', (event, data) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('start-animation', data);
    overlayWindow.show();
  }
  return true;
});

ipcMain.handle('hide-overlay', () => {
  if (overlayWindow) {
    // Send message to overlay to start fade-out animation instead of hiding immediately
    overlayWindow.webContents.send('hide-overlay');
  }
  return true;
});

ipcMain.handle('overlay-fade-complete', () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
  return true;
});

ipcMain.handle('update-overlay', (event, data) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('update-display', data);
  }
  return true;
});