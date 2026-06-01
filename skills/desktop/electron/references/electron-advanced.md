# Electron Advanced Topics

## Overview
Advanced Electron covers performance optimization, native module development, multi-window management, Electron Fuses, process sandboxing, automated testing, and CI/CD pipeline setup.

## Advanced Concepts

### Concept 1: Performance Optimization
Reduce renderer processes (--renderer-process-limit), use BrowserView for in-app web content, lazy-create BrowserWindows, use requestIdleCallback for non-critical work, implement virtual scrolling for large lists, use OffscreenCanvas for heavy rendering, and monitor with Electron Fuses.

### Concept 2: Native Modules (N-API)
N-API (napi-rs for Rust) native modules don't require rebuilding per Node version — they're ABI-stable. Use @electron/rebuild for traditional native modules. Avoid native modules when JS/TS alternatives exist (they complicate builds and testing).

### Concept 3: Electron Fuses
Package-level feature toggles applied at build time: RUN_AS_NODE, ENABLE_NODE_OPTIONS, COOKIE_ENCRYPTION, and EMBEDDED_ASAR_INTEGRITY. Fuses are irreversible after packaging — they reduce attack surface by disabling unused features.

### Concept 4: Automated Testing
Spectron (end-to-end), Playwright (Chromium automation), Jest (unit tests for main process), React Testing Library (renderer unit tests). Test: window creation, IPC communication, menu actions, dialog interactions, and auto-update flows.

### Concept 5: CI/CD Pipeline
Multi-platform builds: GitHub Actions matrix (macOS, Windows, Linux). Code signing (macOS hardened runtime, Windows EV cert). Notarization (macOS). Auto-update infrastructure (S3 or GitHub Releases). Test on all OS versions in CI.

## Advanced Techniques

### Custom Protocol Handler
```javascript
// Register custom protocol
app.setAsDefaultProtocolClient('myapp');
// Handle deep links
app.on('open-url', (event, url) => { ... });
```

### Context Isolation with Proxy
```javascript
// preload.js - fine-grained API
contextBridge.exposeInMainWorld('api', new Proxy({}, {
  get: (target, prop) => (...args) =>
    ipcRenderer.invoke(`api:${prop}`, ...args)
}));
```

### Background Processing
```javascript
// Use hidden window for background processing
const bgWindow = new BrowserWindow({ show: false });
// Or worker_threads
const { Worker } = require('worker_threads');
```

## Anti-Patterns

- Too many renderer processes (high memory usage)
- Native modules for trivial operations (npm packages work)
- Not using Fuses (leaving attack surface open)
- Manual testing only (no CI automation)
- Blocking main process with sync operations
- No crash reporting (untracked production failures)
- Not signing installers (users see security warnings)
- Large asar bundles (code splitting improves load time)
