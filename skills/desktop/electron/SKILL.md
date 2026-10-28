---
name: desktop-electron
description: >
  Use when the user asks about Electron app development, Chromium-based desktop apps, main/renderer process architecture, IPC communication, or packaging Electron apps. Do NOT use for: Tauri (desktop-tauri), or web app frontend (non-desktop skills).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, electron, cross-platform]
---

# Electron

## Purpose
Build cross-platform desktop applications using Electron — combining Chromium (for rendering) and Node.js (for system access). Electron enables web technologies (HTML, CSS, JavaScript/TypeScript) to deliver native-capable desktop experiences with access to the file system, operating system APIs, native menus, and auto-updating.

## Agent Protocol

### Trigger
Exact user phrases: "Electron app", "main process", "renderer process", "IPC", "preload script", "contextBridge", "electron-builder", "electron-forge", "native module", "auto-updater", "BrowserWindow".

### Input Context
- Electron version (>= 28 recommended for security)
- Framework (React, Vue, Svelte, Angular, vanilla)
- Build tool (Vite, webpack, esbuild)
- Required OS APIs (file system, notifications, clipboard, USB/serial, native dialogs)
- Distribution needs (Windows, macOS, Linux; auto-update; code signing)
- Performance constraints (memory, startup time, renderer count)

### Output Artifact
Electron architecture plan with process model, IPC strategy, security configuration, build pipeline, and distribution setup.

### Response Format
```
Processes: main {responsibilities} | preload {exposed API} | renderer {framework}
Security: contextIsolation, sandbox, nodeIntegration=false, CSP, fuses
IPC: {channel -> invoke/handle signature, validation}
Build/Update: {Electron Forge|electron-builder}, signing, autoUpdater
Code: {files}
```

### Completion Criteria
- [ ] Main process architecture defined (BrowserWindow creation, lifecycle)
- [ ] IPC communication pattern selected (contextBridge + ipcRenderer/ipcMain)
- [ ] Security best practices applied (contextIsolation, sandbox, CSP)
- [ ] Window management strategy (single, multi-window, tray)
- [ ] Native module strategy (node-addon, N-API, Rust via napi-rs)
- [ ] Build pipeline configured (electron-builder or electron-forge)
- [ ] Auto-update mechanism planned (electron-updater or Squirrel)
- [ ] Code signing configured for macOS + Windows
- [ ] Performance optimization plan (preload, lazy loading, worker threads)

### Max Response Length
250 lines.

## Framework/Methodology

### Electron Architecture Decision Tree
```
What is the primary app architecture?
├── Single-window app (simple, chat, media player)
│   → One BrowserWindow → preload.js → renderer MVC
│   → Menu bar optional, tray optional
├── Multi-window MDI (image editor, IDE, dashboard)
│   → Window manager in main process → per-window state
│   → Shared data via main process (not localStorage)
├── Hidden background app (menubar/tray utility)
│   → No visible window on start → Tray → Show on demand
│   → `LSUIElement` in Info.plist / `app.dock.hide()` on macOS
└── Kiosk / fullscreen display app
    → BrowserWindow with fullscreen, frame: false
    → No dev tools, locked-down IPC, remote kill switch
```

### Process Model
```
Main Process (Node.js)
├── BrowserWindow management
├── IPC handlers (ipcMain.handle)
├── Native menu, tray, dialog, notifications
├── File system, shell, child_process
├── Auto-updater
└── App lifecycle (ready, window-all-closed, activate)
        ↕ contextBridge (preload.js)
Renderer Process (Chromium)
├── DOM and rendering
├── IPC to main (ipcRenderer.invoke)
├── Limited Node.js (via preload)
└── Web APIs (no direct fs, OS access)
```

## Workflow

### Step 1: Configure Security (Mandatory)

```javascript
// main.js - Security-focused BrowserWindow
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    // These are the defaults in current Electron (contextIsolation since 12, sandbox since 20,
    // nodeIntegration=false since 5) - set them explicitly so nobody flips them by accident.
    contextIsolation: true,    // isolate preload/Electron internals from page scripts
    nodeIntegration: false,    // no Node.js in the renderer
    sandbox: true,             // Chromium OS-level sandbox for the renderer
    webSecurity: true,         // keep same-origin policy (never disable)
    disableBlinkFeatures: 'Auxclick', // Disable unused features
  }
});

// Content Security Policy (set via meta tag or response header)
// <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">

// Block unexpected navigation and new windows in every webContents
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (!(devUrl && url.startsWith(devUrl)) && !url.startsWith('file://')) event.preventDefault();
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url); // open web links in the system browser
    return { action: 'deny' };
  });
});
```

### Step 2: Set Up IPC with contextBridge

```javascript
// preload.js - Expose minimal, typed API to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Invoke (request-response pattern)
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),

  // On (event subscription pattern)
  // Each subscription returns an unsubscribe function; never expose ipcRenderer or arbitrary channel names
  onFileOpened: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('file:opened', listener);
    return () => ipcRenderer.removeListener('file:opened', listener);
  },
  onUpdateAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update:available', listener);
    return () => ipcRenderer.removeListener('update:available', listener);
  },
});

// main.js - Handle IPC requests
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Documents', extensions: ['md', 'txt', 'json'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const content = await fs.promises.readFile(result.filePaths[0], 'utf-8');
    return { path: result.filePaths[0], content };
  }
  return null;
});

ipcMain.handle('dialog:saveFile', async (_event, data) => {
  // Validate renderer input: it is untrusted
  if (typeof data?.content !== 'string' || !/^[a-z0-9]{1,8}$/i.test(data?.extension ?? '')) {
    throw new Error('dialog:saveFile received invalid payload');
  }
  const result = await dialog.showSaveDialog({
    defaultPath: data.filename,
    filters: [{ name: 'Documents', extensions: [data.extension] }]
  });
  if (!result.canceled && result.filePath) {
    await fs.promises.writeFile(result.filePath, data.content, 'utf-8');
    return result.filePath;
  }
  return null;
});
```

### Step 3: Implement Window Management

```javascript
// Window manager with state tracking
class WindowManager {
  constructor() {
    this.windows = new Map();
  }

  createWindow(id, options) {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,  // Show after ready-to-show to prevent white flash
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      }
    });

    win.once('ready-to-show', () => win.show());

    if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
    else win.loadFile(path.join(__dirname, '../dist/index.html'));

    // Track window state
    const saveBounds = () => {
      store.set(`windowBounds.${id}`, win.getBounds()); // store = new Store() from electron-store
    };

    win.on('resize', saveBounds);
    win.on('move', saveBounds);

    this.windows.set(id, win);
    return win;
  }

  closeAll() {
    this.windows.forEach(win => win.close());
  }
}
```

### Step 4: Set Up Build Pipeline

```javascript
// electron-builder configuration
// package.json
{
  "build": {
    "appId": "com.example.myapp",
    "productName": "MyApp",
    "directories": { "output": "release" },
    "files": ["dist/**/*", "main.js", "preload.js"],
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"],
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": true
    },
    "win": {
      "target": ["nsis", "portable"],
      "signAndEditExecutable": true
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Office"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    }
  }
}
```

### Step 5: Implement Auto-Update

```javascript
const { autoUpdater } = require('electron-updater');

// Downloads start automatically by default; for a metered-network opt-in flow,
// disable automatic downloading and call autoUpdater.downloadUpdate() from an IPC handler.
autoUpdater.allowPrerelease = false;

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update:available', info);
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('update:progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
  // Let the user choose when to restart; otherwise it installs on next quit
  mainWindow.webContents.send('update:ready', info.version);
});

ipcMain.handle('update:restartNow', () => autoUpdater.quitAndInstall());

autoUpdater.on('error', (err) => {
  log.error(`Auto-update failed: ${err.message}`); // log = require('electron-log')
});

// Check on app start
app.whenReady().then(() => {
  autoUpdater.checkForUpdates();
});
```

### Step 6: Handle Native OS Features

```javascript
// Native menu
const template = [
  {
    label: 'File',
    submenu: [
      { label: 'Open', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu:open') },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// System tray
const tray = new Tray(nativeImage.createFromPath('tray-icon.png'));
tray.setToolTip('My App');
tray.setContextMenu(Menu.buildFromTemplate([
  { label: 'Show App', click: () => mainWindow.show() },
  { label: 'Quit', click: () => app.quit() }
]));
```

### Step 7: Performance Optimization

```javascript
// 1. Defer renderer creation
app.whenReady().then(() => {
  // Create window after app ready (not on module load)
  createMainWindow();
});

// 2. Use BrowserView for in-app web content (not iframe)
const webView = new BrowserView();
mainWindow.setBrowserView(webView);

// 3. Disable unused features
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-gpu-vsync');

// 4. Limit renderer processes
app.commandLine.appendSwitch('renderer-process-limit', '2');

// 5. Use worker_threads for CPU-heavy tasks
const { Worker } = require('worker_threads');
const worker = new Worker('./processor.js');
worker.postMessage(data);
worker.on('message', result => mainWindow.webContents.send('processing:done', result));
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| nodeIntegration: true | Renderer has full Node access (security hole) | Always false + contextBridge |
| IPC channel collision | Multiple components use same channel name | Namespace channels (feature:action) |
| Memory leaks from listeners | ipcRenderer listeners not cleaned up | Return unsubscribe functions from preload; call them in effect cleanup |
| White flash on startup | Window shown before content renders | Use show: false + ready-to-show |
| Native module rebuild failure | .node binaries mismatch Node version | Use electron-rebuild or @electron/rebuild |
| Dev vs prod URL confusion | Process.env check for Vite vs file:// | Abstract URL resolution in main.js |
| macOS menu not internationalized | Hardcoded English menu strings | Use locale files for menu items |
| Windows code signing skipped | Unsigned builds trigger SmartScreen warnings | Sign in CI (Azure Trusted Signing or an OV/EV certificate from a secret store); notarize macOS builds |
| Large bundle size | Bundling all node_modules into renderer | Tree-shake, code-split, lazy load |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| contextIsolation: true | Mandatory — separates renderer from Node.js objects |
| contextBridge over ipcRenderer.send | Typed, minimal API surface, no arbitrary IPC |
| Use Fuses to disable unused features | `@electron/fuses` at package time: disable `RunAsNode`, `EnableNodeOptionsEnvironmentVariable`, `EnableNodeCliInspectArguments`; enable `OnlyLoadAppFromAsar` and ASAR integrity validation |
| Lazy-load BrowserWindows | Create windows on demand, not on app start |
| Use Vite for Dev Server | Fast HMR, optimized production builds |
| Prefer N-API native modules | Stable across Node versions, no rebuild needed |
| Test on all 3 platforms in CI | Platform-specific bugs (paths, fonts, HiDPI) |
| Keep main process thin | Heavy work in `utilityProcess` or worker threads; a blocked main process freezes all windows |
| Handle SIGTERM gracefully | Clean shutdown, save state on quit |
| Sign builds in CI | Gatekeeper (macOS), SmartScreen (Windows) trust |

## Architecture Patterns

### React + Electron (Typical Stack)
```typescript
// preload.ts
contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
});

// global.d.ts (renderer)
type Settings = { theme: 'light' | 'dark'; autoUpdate: boolean };
declare global {
  interface Window {
    api: { getSettings: () => Promise<Settings>; setSetting: (key: keyof Settings, value: unknown) => Promise<void> };
  }
}

// SettingsPanel.tsx (renderer)
function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    window.api.getSettings().then((s) => { if (active) setSettings(s); });
    return () => { active = false; };
  }, []);

  if (!settings) return <p>Loading...</p>;
  return (
    <label>
      <input
        type="checkbox"
        checked={settings.autoUpdate}
        onChange={(e) => {
          const autoUpdate = e.target.checked;
          setSettings({ ...settings, autoUpdate });
          void window.api.setSetting('autoUpdate', autoUpdate);
        }}
      />
      Install updates automatically
    </label>
  );
}
```

### File Watcher (Main Process)
```javascript
const chokidar = require('chokidar');

const watchers = new Map();

ipcMain.handle('file:watch', async (_event, filePath) => {
  // Only watch paths the user opened via a dialog (tracked in main as openedPaths), never arbitrary renderer input
  if (!openedPaths.has(filePath)) throw new Error(`file:watch refused for unopened path ${filePath}`);
  if (watchers.has(filePath)) return true;
  const watcher = chokidar.watch(filePath, { ignoreInitial: true });
  watchers.set(filePath, watcher);
  watcher.on('change', (path) => {
    // Send to renderer
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('file:changed', path);
    });
  });
  return true;
});
```

## References
  - references/electron-advanced.md — Electron Advanced Topics
  - references/electron-architecture.md — Electron Architecture Reference
  - references/electron-fundamentals.md — Electron Fundamentals
  - references/electron-packaging.md — Electron Packaging Reference
  - references/electron-performance.md — Electron Performance Reference
  - references/electron-security.md — Electron Security Reference
## Handoff
Hand off to `dev-loop-code-review` for security audit of preload scripts. Hand off to `desktop-tauri` if native performance is critical.
## Architecture Decision Trees

### Electron vs Tauri vs NW.js

| Decision | Electron | Tauri | NW.js |
|---|---|---|---|
| Backend | Node.js | Rust | Node.js |
| Bundle size | ~150MB+ | ~5MB | ~100MB+ |
| Memory usage | High (~200MB) | Low (~20MB) | High |
| Security | Chromium (large surface) | WebView (smaller surface) | Chromium |
| Native APIs | Node.js modules | Rust commands | Node.js modules |
| Community | Largest | Growing fast | Shrinking |
| Best for | Feature-rich desktop apps | Lightweight, secure apps | Legacy NW.js apps |

### IPC Mode: contextBridge vs preload vs remote

| Aspect | contextBridge | preload (direct) | remote module |
|---|---|---|---|
| Security | Isolated, recommended | Exposes Node.js | Deprecated, insecure |
| API surface | Explicit whitelist | Full Node.js access | Full Electron API |
| Maintenance | Well-supported | Legacy | Removed in v28+ |
