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
    title: 'Cinitix - Box Office',
    autoHideMenuBar: true,
    show: false, // Don't show until ready
  });

  // Show window once content is ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Check if cinema is already configured
  const config = loadConfig();
  
  if (config && config.cinemaSlug) {
    loadBoxOfficeWithSplash(config.cinemaSlug);
  } else {
    // Show cinema selector
    mainWindow.loadFile(path.join(__dirname, 'cinema-selector.html'));
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function loadBoxOfficeWithSplash(slug) {
  // First show the splash screen
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  
  const boxOfficeUrl = `https://cinitix.com/cinema/${slug}/staff`;
  
  // Create a hidden BrowserView or use webContents to preload
  // We'll use a timeout-based approach: load splash, then navigate
  let loadAttempts = 0;
  const maxAttempts = 3;
  
  function attemptLoad() {
    loadAttempts++;
    
    // Set up one-time handlers for this load attempt
    const onFinish = () => {
      cleanup();
      // Successfully loaded - verify it's not a blank page
      // Give the SPA a moment to render
      setTimeout(() => {
        mainWindow.webContents.executeJavaScript(
          `document.querySelector('#root')?.innerHTML?.length > 0 || document.body?.innerHTML?.length > 100`
        ).then((hasContent) => {
          if (!hasContent) {
            console.error('Page loaded but appears blank, retrying...');
            if (loadAttempts < maxAttempts) {
              mainWindow.loadFile(path.join(__dirname, 'splash.html'));
              setTimeout(attemptLoad, 2000);
            } else {
              mainWindow.loadFile(path.join(__dirname, 'load-error.html'));
            }
          }
          // else: page loaded successfully, do nothing
        }).catch(() => {
          // JS execution failed, page is probably fine or navigating
        });
      }, 3000); // Wait 3s for SPA to hydrate
    };
    
    const onFail = (event, errorCode, errorDescription, validatedURL) => {
      cleanup();
      console.error(`Load attempt ${loadAttempts}/${maxAttempts} failed: ${errorDescription} (${errorCode})`);
      
      if (loadAttempts < maxAttempts) {
        // Show splash and retry after a delay
        mainWindow.loadFile(path.join(__dirname, 'splash.html'));
        setTimeout(attemptLoad, 2000 * loadAttempts); // Exponential backoff
      } else {
        mainWindow.loadFile(path.join(__dirname, 'load-error.html'));
      }
    };

    const onCrash = (event, details) => {
      cleanup();
      console.error('Render process gone:', details.reason);
      mainWindow.loadFile(path.join(__dirname, 'load-error.html'));
    };
    
    function cleanup() {
      mainWindow.webContents.removeListener('did-finish-load', onFinish);
      mainWindow.webContents.removeListener('did-fail-load', onFail);
      mainWindow.webContents.removeListener('render-process-gone', onCrash);
    }
    
    mainWindow.webContents.on('did-finish-load', onFinish);
    mainWindow.webContents.on('did-fail-load', onFail);
    mainWindow.webContents.on('render-process-gone', onCrash);
    
    mainWindow.loadURL(boxOfficeUrl);
  }
  
  // Start loading after splash is shown
  setTimeout(attemptLoad, 500);
}

function loadBoxOffice(slug) {
  loadBoxOfficeWithSplash(slug);
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
  loadBoxOffice(slug);
});

ipcMain.handle('retry-load', () => {
  const config = loadConfig();
  if (config && config.cinemaSlug) {
    loadBoxOffice(config.cinemaSlug);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'cinema-selector.html'));
  }
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
