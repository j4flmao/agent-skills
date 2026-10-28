---
name: desktop-tauri
description: >
  Use this skill when the user says 'Tauri', 'Tauri v2', 'tauri command', 'invoke from frontend', 'tauri capabilities', 'tauri permissions', 'tauri plugin', 'tauri updater', 'Rust desktop app with web UI'. It builds secure Tauri 2 desktop (and mobile) apps: Rust commands, typed IPC, capability/permission files, plugins, events, state and bundling. Do NOT use for: Electron apps (use desktop-electron), pure Rust backends (use the rust backend skill), or native toolkit UIs like Qt/GTK (use desktop-qt / desktop-gtk).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [desktop, tauri, rust, ipc, capabilities, security, webview]
---

# Tauri 2 Desktop Development

## Purpose
Tauri builds desktop (Windows, macOS, Linux) and mobile (iOS, Android) apps from a web frontend rendered in the OS webview (WebView2, WKWebView, WebKitGTK) and a Rust core. Tauri 2 replaced the v1 allowlist with a capability/permission system: the frontend can call nothing unless a capability grants it. This skill produces secure command, permission and plugin setups.

## Agent Protocol

### Trigger
"tauri", "src-tauri", "#[tauri::command]", "invoke", "capabilities", "permissions", "tauri plugin", "tauri updater", "tauri.conf.json".

### Input Context
- Tauri major version (`tauri` crate in `src-tauri/Cargo.toml`, `@tauri-apps/api` in package.json).
- Frontend framework and bundler; target platforms (desktop/mobile).
- Native capabilities needed (fs, shell, dialogs, notifications, updater).

### Output Artifact
Rust commands, `lib.rs` builder setup, capability JSON, frontend IPC wrappers.

### Response Format
```
Command: {name}({args}) -> Result<{T}, {Error}>
Permission: {capability file} grants {plugin:permission | allow-<command>}
Frontend: invoke<{T}>('{name}', { ... })
Windows/webviews: {labels}
Risk: {what the frontend can now do}
```

## Project Layout (v2)
```
src-tauri/
  Cargo.toml
  tauri.conf.json          # app identifier, windows, bundle, security.csp
  capabilities/default.json# which windows get which permissions
  src/main.rs              # desktop entry: calls app_lib::run()
  src/lib.rs               # shared entry for desktop + mobile
```

## Commands (Rust)

```rust
// src-tauri/src/lib.rs
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("note title must not be empty")]
    EmptyTitle,
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

// Errors must be serializable to reach the frontend.
impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

#[derive(Default)]
struct Notes(Mutex<Vec<String>>);

#[tauri::command]
fn add_note(title: String, notes: State<'_, Notes>) -> Result<usize, AppError> {
    let title = title.trim();
    if title.is_empty() {
        return Err(AppError::EmptyTitle);
    }
    let mut list = notes.0.lock().expect("notes mutex poisoned");
    list.push(title.to_owned());
    Ok(list.len())
}

#[tauri::command]
async fn read_config(app: tauri::AppHandle) -> Result<String, AppError> {
    use tauri::Manager;
    let dir = app.path().app_config_dir().map_err(|e| std::io::Error::other(e.to_string()))?;
    Ok(tokio::fs::read_to_string(dir.join("config.json")).await?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Notes::default())
        .invoke_handler(tauri::generate_handler![add_note, read_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```
Rules: async commands run on the async runtime (use them for I/O); sync commands run on the main thread unless declared `async`. Async commands cannot take borrowed args like `&str` (use `String`). Command arguments are camelCase on the JS side by default (`#[tauri::command(rename_all = "snake_case")]` to change).

## Frontend IPC

```ts
// v2 path is @tauri-apps/api/core (v1 used @tauri-apps/api/tauri)
import { invoke } from '@tauri-apps/api/core';

export async function addNote(title: string): Promise<number> {
  try {
    return await invoke<number>('add_note', { title });
  } catch (err) {
    throw new Error(`add_note failed for title "${title}": ${String(err)}`);
  }
}
```

## Capabilities & Permissions

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Main window permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "fs:allow-read-text-file",
    { "identifier": "fs:scope", "allow": [{ "path": "$APPDATA/**" }] }
  ]
}
```
- Plugin APIs are denied until a permission is listed. Grant the narrowest `allow-*` permission, not `*:default`, when only one call is needed.
- Scope file-system and shell permissions to explicit paths/programs.
- Give remote or less-trusted windows a separate capability with fewer permissions; `remote.urls` lets a capability apply to remote origins — avoid unless necessary.
- App-defined commands are allowed for all windows by default; to restrict them, define permissions in `src-tauri/permissions/` and list commands in the build script (`tauri_build::Attributes` / app manifest).

## Events

```rust
use tauri::Emitter;
app.emit("download-progress", 42u32)?;           // to all listeners
```
```ts
import { listen } from '@tauri-apps/api/event';
const unlisten = await listen<number>('download-progress', (e) => setProgress(e.payload));
// call unlisten() on unmount
```
For high-frequency streams from Rust to JS, use `tauri::ipc::Channel<T>` as a command argument instead of global events.

## Security Settings
- Set a strict `app.security.csp` in `tauri.conf.json` (e.g. `default-src 'self'; connect-src 'self' ipc: http://ipc.localhost`); Tauri injects nonces/hashes for bundled scripts.
- Never build shell commands from frontend strings; use `tauri-plugin-shell` with scoped, validated arguments or do the work in Rust.
- Do not enable `withGlobalTauri` unless needed; it exposes `window.__TAURI__` to every script on the page.
- Validate every command argument in Rust; the webview is untrusted input.
- Use the isolation pattern (`app.security.pattern: { use: "isolation" }`) when loading third-party frontend code.

## Common Plugins (v2)
| Need | Crate / npm |
|------|-------------|
| File system | `tauri-plugin-fs` / `@tauri-apps/plugin-fs` |
| Dialogs | `tauri-plugin-dialog` |
| Shell / open URLs | `tauri-plugin-shell`, `tauri-plugin-opener` |
| Persistent key-value | `tauri-plugin-store` |
| HTTP from Rust | `tauri-plugin-http` |
| Auto-update | `tauri-plugin-updater` (signed with `tauri signer generate`) |
| Single instance | `tauri-plugin-single-instance` |

Add plugins with `npm run tauri add <name>` (or `cargo tauri add`), which wires the crate, npm package and default permission.

## Build & Distribution
- `tauri build` produces MSI/NSIS (Windows), `.app`/DMG (macOS), AppImage/deb/rpm (Linux).
- Code-sign on Windows (Authenticode) and sign + notarize on macOS, or users see OS warnings.
- Updater artifacts must be signed with the updater private key; keep it in CI secrets.
- WebView2 is preinstalled on Windows 11; choose the bundle's `webviewInstallMode` for Windows 10 targets.

## Tauri vs Electron (short)
| Factor | Tauri | Electron |
|--------|-------|----------|
| Rendering | OS webview (engine differences per OS) | Bundled Chromium (identical everywhere) |
| Binary size | Small (no bundled browser) | Large (Chromium + Node) |
| Backend language | Rust | Node.js |
| Security model | Deny-by-default capabilities | Context isolation + sandbox + preload |
See `references/tauri-vs-electron.md`.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| `import { invoke } from '@tauri-apps/api/tauri'` in v2 | `@tauri-apps/api/core` |
| Granting `fs:default` + wide scope for one file | Single `allow-*` permission + narrow scope |
| Blocking I/O in sync commands | `async` command + tokio APIs |
| Returning `String` errors everywhere | Typed error enum implementing `Serialize` |
| Passing user strings to shell | Rust-side implementation with validation |

## Checklist
- [ ] Capabilities grant least privilege per window.
- [ ] CSP set; `withGlobalTauri` off unless required.
- [ ] Commands validate input and return typed errors.
- [ ] Long work in async commands; progress via Channel/events.
- [ ] Signing, notarization and updater keys configured in CI.

## References
- `references/tauri-fundamentals.md`
- `references/tauri-setup.md`
- `references/tauri-architecture.md`
- `references/tauri-advanced.md`
- `references/tauri-deployment.md`
- `references/tauri-vs-electron.md`
