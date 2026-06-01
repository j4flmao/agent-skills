# Electron Fundamentals

## Overview
Electron combines Chromium rendering with Node.js system access to build cross-platform desktop applications using web technologies. This reference covers fundamental concepts, security, IPC, and packaging.

## Core Concepts

### Concept 1: Process Model
Main process (Node.js) manages windows, system APIs, menus, and tray. Renderer process (Chromium) renders UI. Preload scripts bridge the two with contextBridge. Never enable nodeIntegration in renderer — always use contextBridge.

### Concept 2: IPC Communication
ipcMain.handle / ipcRenderer.invoke for request-response patterns. ipcMain.on / ipcRenderer.send for fire-and-forget. contextBridge.exposeInMainWorld exposes a minimal API. Always namespace IPC channels to prevent collisions.

### Concept 3: Security Model
contextIsolation: true (isolates preload from renderer), nodeIntegration: false (no Node.js in renderer), sandbox: true (OS-level sandbox), and Content-Security-Policy header. Use Fuses to disable unused features at package time.

### Concept 4: Window Management
BrowserWindow manages window creation: size, position, frame style, web preferences. Track window state programmatically. Use show: false + ready-to-show event to prevent white flash. Restore window bounds on restart.

### Concept 5: Packaging and Distribution
electron-builder or electron-forge for packaging. Code signing for macOS (Gatekeeper) and Windows (SmartScreen). Auto-update via electron-updater (built on Squirrel). Test on all target platforms in CI.

## Best Practices

- contextIsolation: true, nodeIntegration: false (non-negotiable)
- Use contextBridge for all renderer-to-main communication
- Pin Electron version and generator version
- Keep main process thin (heavy logic in worker threads)
- Use @electron/rebuild for native modules
- Separate hand-written code from generated code
- Handle SIGTERM gracefully for auto-update
- Lazy-create BrowserWindows
- Test on all platforms in CI
- Use Fuses to disable unused features

## Anti-Patterns

- nodeIntegration: true (massive security hole)
- IPC channel name collisions
- IPC listeners not cleaned up (memory leaks)
- Window shown before ready-to-show (white flash)
- Native modules not rebuilt for Electron's Node version
- Dev vs prod URL hardcoded (use environment variable)
- Large bundle size (no tree-shaking, no code splitting)
- Direct file system access from renderer
