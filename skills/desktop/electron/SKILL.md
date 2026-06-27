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
│   → LSUIElement or隐藏 on macOS
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
    contextIsolation: true,    // CRITICAL: isolate renderer from Node.js
    nodeIntegration: false,    // CRITICAL: no Node in renderer
    sandbox: true,             // OS-level sandbox for renderer
    webSecurity: true,         // Enforce CORS
    disableBlinkFeatures: 'Auxclick', // Disable unused features
  }
});

// Content Security Policy (set via meta tag or response header)
// <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">
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
  onFileOpened: (callback) => ipcRenderer.on('file:opened', (_event, data) => callback(data)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_event, info) => callback(info)),

  // Remove listeners on cleanup
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
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

    win.loadURL(process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`);

    // Track window state
    const saveBounds = () => {
      const bounds = win.getBounds();
      // Store to config file via electron-store
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
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "win": {
      "target": ["nsis", "portable"],
      "signAndEditExecutable": true,
      "certificateFile": "./cert.p12"
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

autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = false;

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update:available', info);
});

ipcMain.handle('update:startDownload', () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('update:progress', progress);
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
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
| Memory leaks from listeners | ipcRenderer listeners not cleaned up | Remove listeners in componentWillUnmount |
| White flash on startup | Window shown before content renders | Use show: false + ready-to-show |
| Native module rebuild failure | .node binaries mismatch Node version | Use electron-rebuild or @electron/rebuild |
| Dev vs prod URL confusion | Process.env check for Vite vs file:// | Abstract URL resolution in main.js |
| macOS menu not internationalized | Hardcoded English menu strings | Use locale files for menu items |
| Windows code signing skipped | Unnotarized builds trigger SmartScreen | Set up CI signing, EV cert for Windows |
| Large bundle size | Bundling all node_modules into renderer | Tree-shake, code-split, lazy load |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| contextIsolation: true | Mandatory — separates renderer from Node.js objects |
| contextBridge over ipcRenderer.send | Typed, minimal API surface, no arbitrary IPC |
| Use Fuses to disable unused features | `@electron/fuses` — disable node, shell, etc. at package time |
| Lazy-load BrowserWindows | Create windows on demand, not on app start |
| Use Vite for Dev Server | Fast HMR, optimized production builds |
| Prefer N-API native modules | Stable across Node versions, no rebuild needed |
| Test on all 3 platforms in CI | Platform-specific bugs (paths, fonts, HiDPI) |
| Keep main process thin | Heavy logic belongs in worker threads |
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

// App.tsx (renderer)
const { api } = window as any;

function SettingsPanel() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
    return () => { /* cleanup */ };
  }, []);

  // ...
}
```

### File Watcher (Main Process)
```javascript
const chokidar = require('chokidar');

ipcMain.handle('file:watch', async (_event, filePath) => {
  const watcher = chokidar.watch(filePath, { ignoreInitial: true });
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
  - references/electron-fundamentals.md — Electron Fundamentals
  - references/electron-ipc-patterns.md — Electron IPC Patterns Reference
  - references/electron-security.md — Electron Security Reference
## Handoff
Hand off to `dev-loop-code-review` for security audit of preload scripts. Hand off to `desktop-tauri` if native performance is critical.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.

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