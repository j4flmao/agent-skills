# Electron Architecture Reference

## Process Model

| Process | Role | Runtime | Access |
|---------|------|---------|--------|
| Main | Window management, native APIs, system tray | Node.js | Full OS access, no DOM |
| Renderer | UI rendering, user interaction | Chromium | DOM, limited Node via preload |
| Preload | Bridge script between main and renderer | Node.js + DOM | Selected APIs via contextBridge |
| Utility | Background computation, offload work | Node.js | No window, no DOM |

## Context Isolation (Required)

```javascript
// preload.js — only bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  greet: (name) => ipcRenderer.invoke('greet', name),
});
```

```javascript
// renderer.js — no direct Node access
window.api.greet('World').then(console.log);
```

## IPC Communication Patterns

### Pattern 1: Invoke/Handle (Request-Response)
```javascript
// Main
ipcMain.handle('calculate-sum', async (_event, a, b) => a + b);

// Preload
contextBridge.exposeInMainWorld('api', {
  sum: (a, b) => ipcRenderer.invoke('calculate-sum', a, b),
});
```

### Pattern 2: On/Send (Push Events)
```javascript
// Main pushes to renderer
mainWindow.webContents.send('download-complete', { path: '/tmp/file.pdf' });

// Preload
contextBridge.exposeInMainWorld('api', {
  onDownloadComplete: (cb) => ipcRenderer.on('download-complete', (_e, data) => cb(data)),
});
```

### Pattern 3: Message Ports (Streaming)
```javascript
// Main
const { MessageChannelMain } = require('electron');
const { port1, port2 } = new MessageChannelMain();
mainWindow.webContents.postMessage('port', null, [port1]);
port2.postMessage({ type: 'stream-start' });
```

## Window Management

```javascript
// Multiple window types
const mainWin = new BrowserWindow({ width: 1200, height: 800 });
const modalWin = new BrowserWindow({ parent: mainWin, modal: true, width: 400, height: 300 });
const framelessWin = new BrowserWindow({ frame: false, transparent: true });

// Window states
if (mainWin.isMaximized()) mainWin.unmaximize();
mainWin.setAlwaysOnTop(true, 'normal');
mainWin.setSkipTaskbar(true);
```

## Native Modules via node-gyp

```bash
npm install --save-dev @electron/rebuild
npx electron-rebuild -f -w my-native-module
```

```json
{
  "scripts": {
    "postinstall": "electron-builder install-app-deps"
  }
}
```

## Menu and Tray

```javascript
const { Menu, Tray, nativeImage } = require('electron');

const tray = new Tray(nativeImage.createFromPath('icon.png'));
const contextMenu = Menu.buildFromTemplate([
  { label: 'Show', click: () => mainWindow.show() },
  { label: 'Quit', click: () => app.quit() },
]);
tray.setContextMenu(contextMenu);

const menu = Menu.buildFromTemplate([
  { role: 'appMenu', submenu: [{ role: 'about' }, { role: 'quit' }] },
  { role: 'editMenu' },
  { role: 'windowMenu' },
]);
Menu.setApplicationMenu(menu);
```

## Security Best Practices

```javascript
// Main process
app.whenReady().then(() => {
  // Disable GPU acceleration for headless
  if (process.env.HEADLESS) app.disableHardwareAcceleration();

  // Block unused permissions
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => {
    cb(perm === 'clipboard-read' || perm === 'fullscreen');
  });

  // Set CSP
  session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    cb({ responseHeaders: { ...d.responseHeaders, 'Content-Security-Policy': ["default-src 'self'"] } });
  });
});
```

## DevTools Protocol

```javascript
const { BrowserWindow } = require('electron');
const win = new BrowserWindow();

// Open DevTools in production (debug builds only)
if (process.env.DEBUG) win.webContents.openDevTools();

// Capture page
const image = await win.webContents.capturePage();
fs.writeFileSync('screenshot.png', image.toPNG());
```

## Renderer Process Sandbox

```javascript
// main.js
const win = new BrowserWindow({
  webPreferences: {
    sandbox: true,             // Enables Chromium sandbox
    contextIsolation: true,    // Separate JS contexts
    nodeIntegration: false,    // No require() in renderer
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,         // Same-origin policy
    allowRunningInsecureContent: false,
  },
});
```
