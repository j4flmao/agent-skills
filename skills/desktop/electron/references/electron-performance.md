# Electron Performance Reference

## V8 Memory Management

```javascript
// Monitor memory usage
const { app, BrowserWindow } = require('electron');

app.on('web-contents-created', (_event, wc) => {
  wc.on('console-message', (_event, level, msg) => {
    if (msg.includes('heap')) {
      const usage = process.getProcessMemoryInfo();
      console.log(`RSS: ${usage.rss} | Heap: ${usage.heapUsed}`);
    }
  });
});

// Periodic GC hint
setInterval(() => {
  if (global.gc) {
    global.gc(); // requires --expose-gc flag
  }
}, 30000);

// Avoid memory leaks:
// - Remove IPC listeners when window closes
// - Nullify large object references
// - Use WeakRef for cache entries
```

## Window Management

```javascript
// Lazy window creation
function getMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = new BrowserWindow({ /* ... */ });
  }
  return mainWindow;
}

// Window pooling for performance
class WindowPool {
  constructor(options, size = 3) {
    this.pool = [];
    this.options = options;
    for (let i = 0; i < size; i++) {
      this.pool.push(this.createWindow());
    }
  }
  createWindow() {
    const win = new BrowserWindow(this.options);
    win.loadURL('about:blank');
    win.on('close', (e) => { e.preventDefault(); win.hide(); });
    return win;
  }
  acquire(url) {
    const win = this.pool.find(w => !w.isVisible());
    if (win) { win.loadURL(url); win.show(); return win; }
    return this.createWindow();
  }
}

// Hide instead of destroy for reuse
mainWindow.on('close', (e) => {
  if (!app.isQuitting) {
    e.preventDefault();
    mainWindow.hide();
  }
});
```

## GPU Acceleration

```javascript
// Disable GPU if problematic
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Use angle with specific backend
app.commandLine.appendSwitch('use-angle', 'swiftshader');
// Options: 'default', 'gl', 'd3d11', 'd3d9', 'swiftshader'

// Hardware acceleration per-window
const win = new BrowserWindow({
  webPreferences: {
    enableWebGL: true,
    offscreen: false, // offscreen rendering disabled for performance
  }
});

// Determine GPU status
const gpuInfo = app.getGPUFeatureStatus();
if (gpuInfo.gpu_compositing === 'disabled') {
  console.warn('GPU compositing disabled — using software fallback');
}
```

## Lazy Loading

```javascript
// Code splitting in renderer (Webpack/Vite)
// dynamic import() for route-based chunks
const SettingsPage = () => import('./pages/SettingsPage');

// Lazy load native modules
let nativeModule;
function getNativeModule() {
  if (!nativeModule) {
    nativeModule = require('my-native-module');
  }
  return nativeModule;
}

// Deferred window creation
app.whenReady().then(() => {
  // Show splash screen first
  splashWindow = new BrowserWindow({ width: 400, height: 300 });
  splashWindow.loadFile('splash.html');

  // Load main app in background
  setTimeout(() => {
    createMainWindow();
    if (splashWindow) splashWindow.close();
  }, 500);
});
```

## Profiling

```bash
# Enable Chrome DevTools on production
# Use --inspect for Node.js debugging
electron . --inspect=9222

# Memory profiling
# DevTools > Memory > Take heap snapshot
# Compare snapshots before/after operations

# Performance monitoring
const { performance } = require('perf_hooks');

const start = performance.now();
await performExpensiveOperation();
console.log(`Operation took ${performance.now() - start}ms`);
```

## Renderer Performance

```javascript
// Use requestAnimationFrame for animations
function animate() {
  // animation logic
  requestAnimationFrame(animate);
}

// Throttle IPC in hot paths
let lastCall = 0;
function throttledSend(channel, data) {
  const now = Date.now();
  if (now - lastCall > 16) { // ~60fps
    wc.send(channel, data);
    lastCall = now;
  }
}

// Virtual scrolling for large lists
// Use libraries like react-window or virtual-scroller
```

## Checklist

- Window pooling for frequently reused windows
- Dynamic imports for code splitting
- Lazy require for native modules
- Memory monitoring with heap snapshots
- GPU acceleration configured per environment
- Renderer throttled at 60fps for IPC
- Global references cleaned up on window close
- DevTools Memory tab for leak detection
- `--expose-gc` with periodic collection
- `perf_hooks` for measuring critical paths
