const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Store cinema config in user data directory
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'cinema-config.json');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'Box Office',
    autoHideMenuBar: true,
  });

  // Check if cinema is already configured
  const config = loadConfig();
  
  if (config && config.cinemaSlug) {
    // Load the Box Office for the configured cinema
    const boxOfficeUrl = `https://cinitix.com/cinema/${config.cinemaSlug}/staff`;
    mainWindow.loadURL(boxOfficeUrl);
  } else {
    // Show cinema selector
    mainWindow.loadFile(path.join(__dirname, 'cinema-selector.html'));
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return null;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// IPC handlers for cinema configuration
ipcMain.handle('get-cinema-config', () => {
  return loadConfig();
});

ipcMain.handle('save-cinema-config', (event, config) => {
  return saveConfig(config);
});

ipcMain.handle('clear-cinema-config', () => {
  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    return true;
  } catch (error) {
    console.error('Error clearing config:', error);
    return false;
  }
});

ipcMain.handle('navigate-to-box-office', (event, slug) => {
  const boxOfficeUrl = `https://cinitix.com/cinema/${slug}/staff`;
  mainWindow.loadURL(boxOfficeUrl);
});

ipcMain.handle('show-cinema-selector', () => {
  mainWindow.loadFile(path.join(__dirname, 'cinema-selector.html'));
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
