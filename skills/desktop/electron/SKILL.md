---
name: electron
description: >
  Use this skill when building cross-platform desktop apps with Electron — main/renderer process architecture, IPC communication, native APIs, Chromium + Node.js. Covers window management, security hardening, auto-updates, and packaging. Do NOT use for: web-only apps, mobile development, server-side Node.js.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, cross-platform, electron, phase-4]
---

# Electron

## Purpose
Build and maintain cross-platform desktop applications using Electron's Chromium + Node.js runtime with secure IPC and process separation.

## Agent Protocol

### Trigger
User request includes: `electron`, `electron app`, `main process`, `renderer process`, `ipc`, `electron-builder`, `electron-forge`, `desktop app`.

### Input Context
- Project type (new app, migrating existing web app, feature addition)
- OS targets (Windows, macOS, Linux)
- Node.js / npm version
- Security requirements (nodeIntegration, contextIsolation)
- Build tool (electron-forge, electron-builder, electron-vite)

### Output Artifact
A markdown document containing:
- App entry point and main process setup
- Renderer process configuration
- IPC channel definitions
- Security best practices
- Build and packaging config
- Auto-update pipeline
- Native module handling

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Main/renderer processes configured with contextIsolation enabled
- IPC channels defined with type-safe handlers
- Security hardened (sandbox, CSP, session permissions)
- Packaging config targets specified platforms
- Auto-update wired to release server

### Max Response Length
4096 tokens

## Workflow

### Step 1: Scaffold Project
```bash
npm init electron-app my-app -- --template=vite
cd my-app
```

### Step 2: Main Process Entry
```javascript
// main.js
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
```

### Step 3: Preload Script (Secure Bridge)
```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
});
```

### Step 4: Register IPC Handlers
```javascript
// ipc-handlers.js
const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled) return null;
  return result.filePaths[0];
});
```

### Step 5: Security Hardening
```javascript
// main.js security config
const { session } = require('electron');

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"],
      },
    });
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['clipboard-read', 'clipboard-write', 'fullscreen'];
    callback(allowed.includes(permission));
  });
});
```

### Step 6: Package with electron-builder
```yaml
# electron-builder.yml
appId: com.example.myapp
productName: MyApp
directories:
  output: release
win:
  target:
    - target: nsis
      arch: [x64, arm64]
mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  entitlements: build/entitlements.mac.plist
linux:
  target: [AppImage, deb]
  category: Utility
publish:
  provider: github
  owner: myorg
  repo: myapp
```

### Step 7: Auto-Update
```javascript
// main.js auto-updater
const { autoUpdater } = require('electron-updater');

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('update-progress', progress);
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  if (process.env.NODE_ENV === 'production') {
    autoUpdater.checkForUpdates();
  }
});
```

## Rules
- contextIsolation MUST be true, nodeIntegration MUST be false.
- All main-renderer communication through preload bridge — never direct require.
- IPC handlers type-check arguments and validate input.
- Sandbox enabled for all renderers.
- Native modules must be compatible with Electron's Node.js version.
- Session permissions restricted to minimum required set.
- CSP headers set on all loaded resources.
- Auto-update enabled for production builds.
- Preload script is the ONLY bridge between processes.

## References

### Reference Files
- `references/electron-architecture.md` — Process model, IPC patterns, window management
- `references/electron-packaging.md` — Build configs, code signing, auto-update, CI
- `references/electron-performance.md` — V8 memory management, window management, GPU acceleration, lazy loading, profiling
- `references/electron-security.md` — Security best practices: contextIsolation, preload scripts, CSP, sandbox, IPC hardening, auto-updater security

### Related Skills
- `desktop/tauri/SKILL.md` — Lighter alternative to Electron
- `desktop/wpf/SKILL.md` — Windows-native alternative for .NET ecosystem
- `desktop/swiftui/SKILL.md` — macOS-native alternative

## Handoff
Hand off to `desktop/tauri/SKILL.md` for performance-critical apps needing smaller binary size. Hand off to `backend/nodejs/architecture/SKILL.md` if app requires complex Node.js server logic.
