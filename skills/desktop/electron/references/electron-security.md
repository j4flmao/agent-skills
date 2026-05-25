# Electron Security Reference

## Context Isolation & Preload Scripts

```javascript
// main.js — secure WebPreferences
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,   // REQUIRED — isolates renderer from Node
    nodeIntegration: false,   // REQUIRED — no Node in renderer
    sandbox: true,            // Sandbox renderer process
    webSecurity: true,
    allowRunningInsecureContent: false,
  }
});
```

```javascript
// preload.js — minimal bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('config:read'),
  writeConfig: (data) => ipcRenderer.invoke('config:write', data),
  onEvent: (cb) => ipcRenderer.on('push-event', (_e, d) => cb(d)),
});
```

## Content Security Policy

```javascript
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "connect-src 'self' https://api.example.com; " +
        "font-src 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none';"
      ],
    },
  });
});
```

## IPC Hardening

```javascript
// main.js — validate ALL IPC inputs
ipcMain.handle('config:write', async (_event, data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid payload');
  }
  const allowed = ['theme', 'language', 'autosave'];
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) {
      throw new Error(`Unknown setting: ${key}`);
    }
  }
  return saveConfig(data);
});

// Validate sender is from expected window
ipcMain.handle('db:query', (event, query) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.id !== mainWindow.id) {
    throw new Error('Unauthorized');
  }
  return databaseQuery(query);
});
```

## Sandbox

```javascript
// Enable sandbox per-window or globally
app.enableSandbox(); // all renderers

// Or per-window:
new BrowserWindow({
  webPreferences: {
    sandbox: true,
    preload: path.join(__dirname, 'preload-sandbox.js'),
  }
});

// Sandboxed preload has limited API:
// NO: require(), process.cwd(), __dirname, child_process
// YES: contextBridge, ipcRenderer, clipboard, screen, webFrame
```

## Auto-Update Security

```javascript
// Verify update server TLS
const { autoUpdater } = require('electron-updater');

autoUpdater.setFeedURL({
  provider: 'github',
  repo: 'myapp',
  owner: 'myorg',
  private: false,
});

// Validate signature (macOS)
autoUpdater.on('update-downloaded', (info) => {
  if (process.platform === 'darwin') {
    // Verify code signature before install
    autoUpdater.quitAndInstall();
  }
});
```

## Session Permissions

```javascript
session.defaultSession.setPermissionRequestHandler(
  (webContents, permission, callback) => {
    const allowed = new Set(['clipboard-read', 'clipboard-write', 'fullscreen']);
    callback(allowed.has(permission));
  }
);

// Revoke unused permissions
session.defaultSession.setPermissionCheckHandler(
  (webContents, permission, origin) => {
    return false; // deny all permission checks
  }
);
```

## Security Checklist

- contextIsolation: true
- nodeIntegration: false
- sandbox: true
- CSP set on all loaded resources
- IPC validates all inputs on main process
- Preload is only bridge — no `remote` module
- `webSecurity: true`
- `allowRunningInsecureContent: false`
- Session permissions restricted to minimum set
- Auto-update uses HTTPS feed with signature verification
- `--no-sandbox` flag never passed in production
- `app.isPackaged` checks for dev/prod behavior separation
- Native module versions match Electron Node.js version
- Regular `npm audit` and `electron-rebuild` checks
