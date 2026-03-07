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

function normalizeCinemaSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

function buildStaffPortalUrls(slug) {
  const safeSlug = normalizeCinemaSlug(slug);
  const path = `/cinema/${safeSlug}/staff`;

  // Primary + fallback origin to avoid intermittent edge/domain routing issues
  return [
    `https://cinitix.com${path}`,
    `https://screen-star.lovable.app${path}`,
  ];
}

function loadBoxOfficeWithSplash(slug) {
  const safeSlug = normalizeCinemaSlug(slug);

  if (!safeSlug) {
    mainWindow.loadFile(path.join(__dirname, 'cinema-selector.html'));
    return;
  }

  // First show the splash screen
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));

  const targetUrls = buildStaffPortalUrls(safeSlug);
  let loadAttempts = 0;
  const maxAttempts = targetUrls.length * 2;

  function attemptLoad() {
    loadAttempts++;
    const targetUrl = targetUrls[(loadAttempts - 1) % targetUrls.length];

    const onFinish = () => {
      cleanup();

      // Validate rendered content and detect host-level 404 pages
      setTimeout(() => {
        mainWindow.webContents.executeJavaScript(`
          (() => {
            const bodyText = (document.body?.innerText || '').toLowerCase();
            const title = (document.title || '').toLowerCase();
            const hasRoot = !!document.querySelector('#root');
            const hasContent = (document.querySelector('#root')?.innerHTML?.length || 0) > 0 || (document.body?.innerHTML?.length || 0) > 200;
            const isNotFoundLike =
              bodyText.includes('page does not exist') ||
              bodyText.includes('page not found') ||
              title.includes('404') ||
              title.includes('not found');

            return { hasRoot, hasContent, isNotFoundLike, url: window.location.href };
          })();
        `).then((result) => {
          if (!result?.hasContent || result?.isNotFoundLike) {
            console.error(`Loaded invalid page (attempt ${loadAttempts}/${maxAttempts}):`, result?.url || targetUrl);

            if (loadAttempts < maxAttempts) {
              mainWindow.loadFile(path.join(__dirname, 'splash.html'));
              setTimeout(attemptLoad, 1500 * loadAttempts);
            } else {
              mainWindow.loadFile(path.join(__dirname, 'load-error.html'));
            }
          }
        }).catch((err) => {
          console.error('Post-load validation failed:', err?.message || err);

          if (loadAttempts < maxAttempts) {
            mainWindow.loadFile(path.join(__dirname, 'splash.html'));
            setTimeout(attemptLoad, 1500 * loadAttempts);
          } else {
            mainWindow.loadFile(path.join(__dirname, 'load-error.html'));
          }
        });
      }, 2500);
    };

    const onFail = (event, errorCode, errorDescription) => {
      cleanup();
      console.error(`Load attempt ${loadAttempts}/${maxAttempts} failed for ${targetUrl}: ${errorDescription} (${errorCode})`);

      if (loadAttempts < maxAttempts) {
        mainWindow.loadFile(path.join(__dirname, 'splash.html'));
        setTimeout(attemptLoad, 1500 * loadAttempts);
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

    mainWindow.loadURL(targetUrl);
  }

  // Start loading after splash is shown
  setTimeout(attemptLoad, 500);
}

function loadBoxOffice(slug) {
  const safeSlug = normalizeCinemaSlug(slug);
  if (!safeSlug) {
    mainWindow.loadFile(path.join(__dirname, 'cinema-selector.html'));
    return;
  }

  loadBoxOfficeWithSplash(safeSlug);
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
