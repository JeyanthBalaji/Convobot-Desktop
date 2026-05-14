// ConvoBot Clinic — Electron Main Process
// Wraps the deployed React app in a desktop window with auto-update support.

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// ────────────────────────────────────────────────────────────
// Configuration — change this URL to point to a different
// backend/frontend deployment (e.g. client's own Render account).
// ────────────────────────────────────────────────────────────
const APP_URL = process.env.CONVOBOT_URL || 'https://convobot-frontend-8ybs.onrender.com';

// ────────────────────────────────────────────────────────────
// Logger setup — writes to user's AppData so we can debug
// problems remotely if a client hits an issue.
// ────────────────────────────────────────────────────────────
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;            // download silently in background
autoUpdater.autoInstallOnAppQuit = true;    // install when user closes app
log.info('ConvoBot Clinic starting…');

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'ConvoBot Clinic',
    icon: path.join(__dirname, '..', 'build', 'icon.png'), // dev/run; .ico is used by the installer
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // No preload needed — the wrapped web app is the entire UI.
    },
    show: false, // don't flash an empty window — show after the page loads
  });

  // Use a clean menu (File / Help) instead of Electron's default dev menu.
  Menu.setApplicationMenu(buildAppMenu());

  // Load the deployed web app.
  mainWindow.loadURL(APP_URL);

  // Show the window once the page is rendered, to avoid a blank flash.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links (mailto, http) in the user's real browser, not inside our window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  // Friendly error if the page fails to load (eg client offline).
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    log.error('Page failed to load', { errorCode, errorDescription, validatedURL });
    if (errorCode === -106 || errorCode === -105 || errorCode === -2) {
      // No internet / DNS failure / server unreachable
      dialog.showErrorBox(
        'Cannot reach ConvoBot servers',
        'ConvoBot Clinic could not connect to the server.\n\n' +
        'Please check your internet connection and try again.\n\n' +
        'If the problem continues, contact support.'
      );
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  return Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow && mainWindow.reload() },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for updates…',
          click: () => {
            autoUpdater.checkForUpdates().catch(err => log.error('Manual update check failed', err));
          },
        },
        {
          label: 'About ConvoBot Clinic',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About ConvoBot Clinic',
              message: 'ConvoBot Clinic',
              detail:
                `Version ${app.getVersion()}\n` +
                'Copyright © 2026 RiteTech Technologies\n\n' +
                `Connected to: ${APP_URL}`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ]);
}

// ────────────────────────────────────────────────────────────
// Auto-updater wiring
//   - Checks GitHub Releases on startup (and every 4 hours after).
//   - Downloads silently. Installs on next quit.
// ────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => log.info('Checking for updates…'));
  autoUpdater.on('update-available', (info) => log.info('Update available', info && info.version));
  autoUpdater.on('update-not-available', () => log.info('App is up to date'));
  autoUpdater.on('error', (err) => log.error('Auto-updater error', err));
  autoUpdater.on('download-progress', (p) =>
    log.info(`Download ${Math.round(p.percent)}% (${Math.round(p.bytesPerSecond / 1024)} KB/s)`)
  );
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded — will install on next quit', info && info.version);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update ready',
        message: `ConvoBot Clinic ${info.version} is ready to install.`,
        detail: 'The update will be applied automatically the next time you close the app.',
        buttons: ['OK'],
      });
    }
  });

  // Initial check, then every 4 hours.
  autoUpdater.checkForUpdates().catch(err => log.error('Initial update check failed', err));
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => log.error('Scheduled update check failed', err));
  }, 4 * 60 * 60 * 1000);
}

// ────────────────────────────────────────────────────────────
// App lifecycle
// ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow();

  // Auto-update only runs in production (packaged app), not when running `npm start`.
  if (app.isPackaged) {
    setupAutoUpdater();
  } else {
    log.info('Dev mode — auto-updater disabled.');
  }

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked and no windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
