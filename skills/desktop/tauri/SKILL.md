---
name: desktop-tauri
description: >
  Use when the user asks about Tauri desktop app development, Rust backend, WebView frontend, Tauri commands, Tauri plugins, or Tauri packaging. Do NOT use for: Electron (desktop-electron), or web-only frontend development.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, tauri, rust, cross-platform]
---

# Tauri

## Purpose
Build secure, performant, lightweight desktop applications using Tauri — combining a Rust backend with a WebView frontend (HTML/CSS/JS/TypeScript). Tauri produces significantly smaller binaries than Electron (often 3-50 MB vs 150+ MB), uses less memory, and enforces security through capability-based permissions.

## Agent Protocol

### Trigger
Exact user phrases: "Tauri", "Tauri app", "Tauri v2", "Rust backend", "Tauri commands", "Tauri plugin", "Tauri IPC", "Tauri packaging", "Tauri bundle", "Tauri CLI", "create-tauri-app".

### Input Context
- Tauri version (v1 vs v2 — v2 for new projects)
- Frontend framework (React, Vue, Svelte, Solid, vanilla)
- Build tool (Vite, webpack)
- Rust backend requirements (file system, shell, database, serial)
- Desktop targets (Windows, macOS, Linux, mobile)
- Security requirements (capability-based permissions, CSP)
- Bundle format (MSI, DMG, AppImage, deb)

### Output Artifact
Tauri application architecture with Rust backend structure, IPC command definitions, frontend setup, and bundling configuration.

### Completion Criteria
- [ ] Tauri v2 project scaffolded (create-tauri-app or manual)
- [ ] Cargo.toml with tauri dependencies and plugins
- [ ] Rust backend with #[tauri::command] functions
- [ ] IPC commands registered in .invoke_handler()
- [ ] Frontend with Tauri JS API calls (@tauri-apps/api)
- [ ] Tauri configuration (tauri.conf.json) with windows, permissions, bundle
- [ ] Capabilities defined (permissions for commands, plugins, and features)
- [ ] Platform-specific configuration (macOS entitlements, Windows sign)
- [ ] Plugins for needed capabilities (fs, shell, dialog, notification)
- [ ] Bundling configuration (icons, installer, updater)

### Max Response Length
250 lines.

## Framework/Methodology

### Tauri vs Electron Decision Tree
```
Why choose Tauri over Electron?
├── Binary size matters → Tauri (3-50 MB vs 150+ MB)
├── Memory consumption → Tauri (uses system WebView, not Chromium)
├── Security first → Tauri (capability model, no Node in renderer)
├── Rust codebase → Tauri (native Rust backend)
├── Need Chromium DevTools → Electron (Tauri uses system WebView)
├── Need Node.js ecosystem → Electron (Tauri uses Rust crates)
└── Need sandboxing → Both (Tauri capabilities, Electron contextBridge)
```

### Tauri Architecture
```
Frontend (WebView)
├── HTML/CSS/JS (React, Vue, Svelte, Solid)
├── @tauri-apps/api (JS bindings)
├── invoke() → IPC to Rust backend
└── listen() → Events from Rust backend
        ↕ IPC (JSON serialization)
Rust Backend (Core)
├── #[tauri::command] functions
├── Plugins (fs, shell, dialog, notification, sql, http)
├── State management (tauri::State<T>)
├── Event emission (AppHandle::emit)
└── File system, OS APIs, native code
```

## Workflow

### Step 1: Scaffold Project

```bash
# Using create-tauri-app (recommended)
npm create tauri-app@latest my-app -- --template react-ts --manager npm

# Or manual setup
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm install -D @tauri-apps/cli@latest
npm install @tauri-apps/api@latest
npx tauri init
```

### Step 2: Define Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://raw.githubusercontent.com/nicedoc/schemas/refs/heads/main/schema.json",
  "productName": "My App",
  "version": "0.1.0",
  "identifier": "com.example.myapp",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "My App",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "minWidth": 600,
        "minHeight": 400
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https://asset.localhost data:"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "wix": null,
      "nsis": null
    },
    "macOS": {
      "minimumSystemVersion": "12.0",
      "entitlements": "entitlements.plist"
    },
    "linux": {
      "deb": {
        "depends": []
      }
    }
  }
}
```

### Step 3: Implement Rust Backend Commands

```rust
// src-tauri/src/main.rs (or lib.rs)
use tauri::State;
use std::sync::Mutex;

// Shared state
struct AppState {
    count: Mutex<i32>,
    db: Mutex<rusqlite::Connection>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn increment(state: State<AppState>) -> Result<i32, String> {
    let mut count = state.count.lock().map_err(|e| e.to_string())?;
    *count += 1;
    Ok(*count)
}

#[tauri::command]
fn read_file(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_directory(path: &str) -> Result<Vec<String>, String> {
    let entries = std::fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    Ok(entries)
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            count: Mutex::new(0),
            db: Mutex::new(rusqlite::Connection::open_in_memory().unwrap()),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            increment,
            read_file,
            list_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 4: Frontend IPC Calls

```typescript
// src/App.tsx
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { useEffect, useState } from 'react';

function App() {
  const [greeting, setGreeting] = useState('');
  const [count, setCount] = useState(0);

  // Invoke commands (request-response)
  const handleGreet = async () => {
    const result = await invoke<string>('greet', { name: 'World' });
    setGreeting(result);
  };

  const handleIncrement = async () => {
    const newCount = await invoke<number>('increment');
    setCount(newCount);
  };

  // React to events from Rust backend
  useEffect(() => {
    const unlisten = listen<string>('backend-event', (event) => {
      console.log('Event from Rust:', event.payload);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Use Tauri plugins
  const handleOpenFile = async () => {
    const file = await open({
      multiple: false,
      filters: [{ name: 'Documents', extensions: ['txt', 'md'] }]
    });
    if (file) {
      const content = await readTextFile(file);
      console.log('File content:', content);
    }
  };

  return (
    <div>
      <button onClick={handleGreet}>Greet</button>
      <p>{greeting}</p>
      <button onClick={handleIncrement}>Count: {count}</button>
      <button onClick={handleOpenFile}>Open File</button>
    </div>
  );
}
```

### Step 5: Capability-Based Permissions (Tauri v2)

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "description": "Default capabilities for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-close",
    "core:window:allow-set-size",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    {
      "identifier": "fs:allow-read-text-file",
      "allow": [{ "path": "$HOME/Documents/**" }]
    },
    {
      "identifier": "fs:allow-write-text-file",
      "allow": [{ "path": "$HOME/Documents/**" }]
    }
  ]
}
```

### Step 6: Install and Configure Plugins

```bash
# CLI
cargo add tauri-plugin-dialog tauri-plugin-fs tauri-plugin-shell tauri-plugin-sql
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-shell
```

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
}
```

### Step 7: Build and Bundle

```bash
# Development
npm run tauri dev

# Build for production
npm run tauri build

# Build for specific target
npm run tauri build -- --target universal-apple-darwin

# Output: src-tauri/target/release/bundle/
# ├── dmg/AppName.dmg (macOS)
# ├── msi/AppName.msi (Windows)
# └── deb/appname.deb (Linux)
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Unnecessary large Rust binary | Debug symbols, unused crates | Build --release, opt-level=3, strip symbols |
| Missing capabilities | Frontend calls fail silently | Define all required permissions in capabilities |
| Blocking main thread | Sync I/O in commands freezes UI | Use tokio async, #[tauri::command] with async |
| No CSP | XSS vulnerabilities | Always set Content-Security-Policy |
| Hardcoded paths | App breaks on different platforms | Use app_dir, home_dir, resolve_path API |
| Old v1 patterns | tauri::command without async | Use Tauri v2 conventions |
| Not handling errors | Panics in Rust crash the app | Return Result<T, String> from all commands |
| Ignoring entitlements | macOS notarization fails | Set hardened runtime entitlements |
| No icon set | Default icons, CI fails | Generate icons for all platforms |
| Mobile not configured | Can't test on mobile | Add mobile targets in tauri config |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| TypeScript frontend | Type safety for IPC invoke calls |
| Async commands for I/O | Non-blocking, responsive UI |
| Capability-based permissions | Granular security, auditable |
| Custom protocols over port | Use Tauri's IPC, not localhost server |
| Plugin ecosystem | Official plugins for common needs |
| State management with Mutex/RwLock | Thread-safe shared state in Rust |
| Webview DevTools for debugging | But disable for production builds |
| Error handling with anyhow | Idiomatic Rust error propagation |
| Small binary via LTO | lto = true in Cargo.toml |
| CI with cargo test | Rust tests alongside frontend tests |

## Architecture Patterns

### State Management
```rust
use tauri::Manager;

#[tauri::command]
async fn greet(state: State<'_, AppState>) -> Result<String, String> {
    let count = state.count.lock().map_err(|e| e.to_string())?;
    *count += 1;
    Ok(format!("Hello! Count: {}", *count))
}
```

### Event Emission
```rust
// Rust: emit event to frontend
fn emit_event(app: &tauri::AppHandle, message: &str) {
    app.emit("backend-event", message).unwrap();
}

// Frontend: listen
import { listen } from '@tauri-apps/api/event';
listen('backend-event', (event) => {
  console.log(event.payload);
});
```

### Plugin Creation
```rust
// Custom plugin structure
pub struct MyPlugin;
impl tauri::plugin::Plugin for MyPlugin {
    fn name(&self) -> &'static str {
        "my-plugin"
    }

    fn initialize(&self, app: &tauri::AppHandle, config: serde_json::Value) -> tauri::plugin::Result<()> {
        // Plugin initialization
        Ok(())
    }
}
```

## References
  - references/tauri-advanced.md — Tauri Advanced Topics
  - references/tauri-fundamentals.md — Tauri Fundamentals
  - references/tauri-plugins.md — Tauri Plugin Reference
  - references/tauri-security.md — Tauri Security Reference
## Handoff
Hand off to `dev-loop-code-review` for security audit of Rust backend. Hand off to `desktop-electron` if web ecosystem dependencies are needed.
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

### Tauri v1 vs Tauri v2

| Decision | Tauri v1 | Tauri v2 |
|---|---|---|
| Mobile support | Desktop only | iOS + Android |
| Plugin system | Custom build | Official plugin registry |
| IPC | Call-based | Event + call system |
| WebView | WKWebView / WebView2 | Same + mobile WebViews |
| Permissions | Manual | Capability-based (granular) |
| Best for | Stable desktop apps | Cross-platform (desktop+mobile) |

### Rust Backend vs Sidecar Node.js

| Aspect | Rust Commands | Sidecar (Node.js/Python) |
|---|---|---|
| Performance | Native, fast | Process overhead |
| Security | Sandboxed, no shell | Full system access |
| Bundle size | Minimal | Includes runtime |
| Development | Rust knowledge needed | Familiar to JS devs |
| Debugging | Tauri devtools | Process logs |
| Best for | Core logic, file I/O | Legacy scripts, npm ecosystem |