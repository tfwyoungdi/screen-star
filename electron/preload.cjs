const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Cinema configuration
  getCinemaConfig: () => ipcRenderer.invoke('get-cinema-config'),
  saveCinemaConfig: (config) => ipcRenderer.invoke('save-cinema-config', config),
  clearCinemaConfig: () => ipcRenderer.invoke('clear-cinema-config'),
  
  // Navigation
  navigateToBoxOffice: (slug) => ipcRenderer.invoke('navigate-to-box-office', slug),
  showCinemaSelector: () => ipcRenderer.invoke('show-cinema-selector'),
  retryLoad: () => ipcRenderer.invoke('retry-load'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
