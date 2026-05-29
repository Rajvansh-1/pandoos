import './require-polyfill';
import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, Notification, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startLocalApiServer } from './api-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-updater (only active in packaged builds, not in dev)
let autoUpdater: any = null;
if (app.isPackaged) {
  import('electron-updater').then(({ autoUpdater: updater }) => {
    autoUpdater = updater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    
    autoUpdater.on('update-available', () => {
      mainWindow?.webContents.send('update-available');
    });
    autoUpdater.on('update-downloaded', () => {
      const choice = dialog.showMessageBoxSync(mainWindow!, {
        type: 'info',
        title: 'Update Ready',
        message: '🐼 A new version of Pandoos is ready! Restart to install.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      });
      if (choice === 0) autoUpdater.quitAndInstall();
    });
    
    // Check for updates 5 seconds after launch
    setTimeout(() => autoUpdater.checkForUpdates(), 5000);
    // Then every hour
    setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000);
  }).catch(() => { /* updater not available */ });
}


// app.disableHardwareAcceleration();
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// ── Deep Linking: Register pandoos:// as the custom protocol ────────────────
// This enables the "Spotify-style" OAuth flow:
//  1. App opens system browser → Google login → Supabase redirects to pandoos://login-callback#access_token=...
//  2. OS hands the URL back to this app via 'open-url' (macOS) or 'second-instance' (Windows/Linux)
//  3. We extract the tokens and send them to the renderer via IPC
//
// CRITICAL for dev mode on Windows:
//   Without passing execPath + [mainScript], Windows registers ONLY the electron binary.
//   When the URL returns, Electron gets:  electron.exe "pandoos://login-callback#token..."
//   and tries to LOAD the URL as the app entry point → "Unable to find Electron app" error.
//   Passing the main script ensures Windows registers:
//     electron.exe "path/to/main.js" "pandoos://..."
//   so the URL is correctly passed as argv[2] to the second-instance handler.
if (app.isPackaged) {
  // Production: just register the .exe — no extra args needed
  if (!app.isDefaultProtocolClient('pandoos')) {
    app.setAsDefaultProtocolClient('pandoos');
  }
} else {
  // Dev: must pass execPath + [main script] so Windows knows where the app is
  const mainScript = path.resolve(process.argv[1]);
  app.setAsDefaultProtocolClient('pandoos', process.execPath, [mainScript]);
}

/** Parse and forward a deep-link URL to the renderer */
function handleDeepLink(url: string) {
  if (!mainWindow) return;
  console.log('[DeepLink] Received URL:', url);
  // Bring the window to the front
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  // Forward the full URL to the React app — it will parse tokens itself
  mainWindow.webContents.send('oauth-callback', url);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// CRITICAL: Set userData to a local path BEFORE app.whenReady()
// The project lives on OneDrive Desktop, which locks files during sync.
// This causes Electron's GPU/network disk cache to fail with "Access is denied".
// Pointing userData to local AppData fixes all cache errors.
if (app.isPackaged) {
  // In production: use the standard AppData location (set automatically by Electron)
  // but ensure it's not overridden by a sync folder
  const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
  if (localAppData) {
    app.setPath('userData', path.join(localAppData, 'Pandoos Music'));
  }
} else {
  // In dev: also avoid OneDrive by using a temp cache dir in AppData
  const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
  if (localAppData) {
    app.setPath('userData', path.join(localAppData, 'Pandoos Music Dev'));
  }
}

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    // Restored native frame for standard window controls
    backgroundColor: '#0a0a0f',
    webPreferences: {
      // In packaged app, preload.cjs is extracted to app.asar.unpacked/ by asarUnpack.
      // In dev, __dirname is the real dist-electron/ folder.
      preload: app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist-electron', 'preload.cjs')
        : path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Keep playing music when minimized!
    },
    icon: path.join(__dirname, '../public/logo.png'),
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // In production, load from our local HTTP server instead of file://
    mainWindow.loadURL((global as any).apiUrl || 'http://127.0.0.1:15432');
  }

  // ── Diagnostics ────────────────────────────────────────────────────────────
  // Press F12 in the packaged app to open DevTools and see any console errors.
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') mainWindow?.webContents.openDevTools();
  });

  // If the page completely fails to load, show the actual error so we can debug
  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error(`[Window] Failed to load: ${url} — ${code} ${desc}`);
    mainWindow?.webContents.openDevTools();
  });
  // ───────────────────────────────────────────────────────────────────────────

  // Completely close the app when the main window is closed
  mainWindow.on('close', () => {
    app.isQuitting = true;
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/logo.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Pandoos', click: () => mainWindow?.show() },
    { label: 'Play / Pause', click: () => mainWindow?.webContents.send('media-play-pause') },
    { label: 'Next Track', click: () => mainWindow?.webContents.send('media-next') },
    { label: 'Previous Track', click: () => mainWindow?.webContents.send('media-prev') },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('Pandoos Music');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

function registerShortcuts() {
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('media-play-pause');
  });
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('media-next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow?.webContents.send('media-prev');
  });
}

// Ensure app.isQuitting flag is available
declare global {
  namespace Electron {
    interface App {
      isQuitting: boolean;
    }
  }
}
app.isQuitting = false;

// Single-instance lock: if another instance is already running, focus it and quit this one
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // Someone tried to run a second instance — focus our existing window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    // On Windows/Linux: deep link URL is passed as the last argv argument
    const deepLinkUrl = argv.find(arg => arg.startsWith('pandoos://'));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl);
  });
}

app.whenReady().then(async () => {
  // Start the embedded local API server
  const apiPort = await startLocalApiServer();
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  (global as any).apiUrl = apiUrl;
  
  // Expose it to the frontend synchronous IPC
  ipcMain.on('get-api-url', (event) => {
    event.returnValue = apiUrl;
  });

  // Open a URL in the system's default browser (for deep-link OAuth)
  ipcMain.on('open-external', (_event, url: string) => {
    shell.openExternal(url).catch(err => console.error('[IPC] open-external error:', err));
  });

  // macOS: deep link URL arrives via 'open-url' event
  app.on('open-url', (_event, url) => {
    handleDeepLink(url);
  });

  createWindow();
  createTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC listeners for the custom title bar
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.restore();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => {
  app.isQuitting = true;
  app.quit();
});

// OS Notification for Song Change
ipcMain.on('notify-song', (_, track) => {
  if (Notification.isSupported() && track) {
    new Notification({
      title: 'Now Playing',
      body: `${track.title} • ${track.artist}`,
      silent: true, // No annoying ding sound
    }).show();
  }
});
