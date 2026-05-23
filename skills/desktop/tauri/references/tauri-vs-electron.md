# Tauri vs Electron Reference

## Size and Performance Comparison

| Metric | Electron | Tauri |
|--------|----------|-------|
| Binary size (minimal) | ~150 MB | ~3 MB |
| Memory usage (idle) | ~100-200 MB | ~30-50 MB |
| Startup time | ~1-3 seconds | ~0.3-0.8 seconds |
| Runtime | Node.js + Chromium | OS WebView + Rust |
| Language (backend) | JavaScript/TS | Rust |
| GPU acceleration | Chromium GPU | OS WebView native |

## Feature Comparison

| Feature | Electron | Tauri |
|---------|----------|-------|
| Multi-window | Native | Native |
| System tray | Built-in | via plugin |
| Auto-update | electron-updater | built-in |
| File system access | Full Node.js | Capabilities-gated |
| Shell execution | Child process | Plugin with scope |
| Native dialogs | Built-in | Plugin |
| Menu/tray | Built-in | via plugin + Rust |
| Global shortcuts | `globalShortcut` | Plugin |
| Notification | HTML5 + Notification API | Plugin |
| Clipboard | Built-in | Plugin |
| SQLite | npm sqlite3 | tauri-plugin-sql |
| Hot reload | Custom setup | Built-in dev |

## Security Comparison

| Aspect | Electron | Tauri |
|--------|----------|-------|
| Default nodeIntegration | false (recommended) | N/A |
| Context isolation | Required | Built-in |
| CSP enforcement | Manual | Config in tauri.conf.json |
| Capability system | None (all or nothing) | Per-window permissions |
| Process sandbox | Chromium sandbox | OS WebView sandbox |
| Frontend-backend bridge | preload script | Auto-generated bindings |
| Arbitrary code execution | Possible via Node | Restricted by capabilities |

## When to Choose Electron

- Need Chromium DevTools in production
- Large existing web app to desktop-ify
- Team knows JavaScript/TypeScript, not Rust
- Need npm native modules (sharp, puppeteer, etc.)
- Require Chrome-specific rendering features
- Need extensive third-party Electron plugins

## When to Choose Tauri

- Binary size under 10 MB critical
- Memory-constrained environments
- Rust knowledge in team
- Security-sensitive applications
- Startup time critical (< 1 second)
- Battery-conscious (laptop users)

## Migration: Web App to Tauri

```typescript
// Before (web app)
const response = await fetch('/api/data');
const data = await response.json();

// After (Tauri)
import { invoke } from '@tauri-apps/api/core';
const data = await invoke<MyData>('fetch-data', { query: '...' });
```

```rust
// Rust command
#[tauri::command]
fn fetch_data(query: String) -> Result<MyData, String> {
    // Query database or make HTTP request via reqwest
    get_data_from_db(&query).map_err(|e| e.to_string())
}
```

## Migration: Electron to Tauri

| Electron Concept | Tauri Equivalent |
|-----------------|------------------|
| main.js | src-tauri/src/lib.rs |
| preload.js | Auto-generated bindings |
| ipcMain.handle() | #[tauri::command] |
| ipcRenderer.invoke() | invoke() from @tauri-apps/api |
| BrowserWindow | Window config in tauri.conf.json |
| contextBridge | Capabilities system |
| electron-builder | Built-in bundler |
| electron-updater | Built-in updater |
| webpack/vite config | Remove (WebView handles it) |

## Build and CI Comparison

```yaml
# Electron (GA): ~8-15 min per OS
# Tauri (GA): ~3-5 min per OS (no Chromium compile)

# Tauri CI uses prebuilt system WebView:
# Windows: WebView2 (OS-included)
# macOS: WKWebView (OS-included)
# Linux: libwebkit2gtk (apt install)
```

## Binary Size Breakdown

```
Electron app:
  electron.asar:       ~50 MB
  libchromium:         ~80 MB
  Node.js runtime:     ~20 MB
  App code:            ~1 MB
  Total:              ~151 MB

Tauri app:
  Rust binary:         ~2 MB (stripped)
  App code (dist):     ~0.5 MB
  WebView runtime:     OS-provided (0 additional)
  Total:              ~2.5 MB
```
