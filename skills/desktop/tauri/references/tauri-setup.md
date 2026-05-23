# Tauri Setup Reference

## Prerequisites

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Platform-specific dependencies
# Windows: Install WebView2 (included in Win 11, Win 10 with updates)
# macOS: Xcode Command Line Tools
xcode-select --install

# Linux
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Project Scaffold

```bash
npm create tauri-app@latest my-app -- --template react-ts
cd my-app
npm install
```

## Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "productName": "MyApp",
  "version": "0.1.0",
  "identifier": "com.myorg.myapp",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "My App",
        "width": 1200,
        "height": 800,
        "center": true,
        "minWidth": 800,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset:"
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
    ]
  }
}
```

## Rust Commands with State

```rust
// src-tauri/src/lib.rs
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize, Deserialize, Default)]
struct AppState {
    count: i32,
}

struct Counter(Mutex<AppState>);

#[tauri::command]
fn increment(state: State<Counter>) -> Result<i32, String> {
    let mut s = state.0.lock().map_err(|e| e.to_string())?;
    s.count += 1;
    Ok(s.count)
}

#[tauri::command]
fn get_count(state: State<Counter>) -> Result<i32, String> {
    let s = state.0.lock().map_err(|e| e.to_string())?;
    Ok(s.count)
}

pub fn run() {
    tauri::Builder::default()
        .manage(Counter(Mutex::new(AppState::default())))
        .invoke_handler(tauri::generate_handler![increment, get_count])
        .run(tauri::generate_context!())
        .expect("error");
}
```

## Plugin Setup

```bash
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-shell
```

```rust
// src-tauri/src/lib.rs
use tauri_plugin_dialog;
use tauri_plugin_fs;
use tauri_plugin_shell;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
        .expect("error");
}
```

```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write",
    "shell:default",
    "shell:allow-open"
  ]
}
```

## Frontend Invoke Examples

```typescript
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';

// Simple command
const result = await invoke<string>('greet', { name: 'Tauri' });

// With error handling
try {
  const data = await invoke<{ id: number; name: string }>('get-user', { userId: 42 });
} catch (err) {
  console.error('Failed to get user:', err);
}

// Dialog
const file = await open({ filters: [{ name: 'Text', extensions: ['txt'] }] });
if (file) {
  const content = await readTextFile(file);
  console.log(content);
}
```

## Debugging

```bash
# Run with DevTools
tauri dev

# Run with release build
tauri build

# Enable debug logs
# src-tauri/tauri.conf.json
{
  "bundle": { "debug": true }
}

# Rust logging
RUST_LOG=debug tauri dev

# Frontend console.log appears in WebView DevTools (Ctrl+Shift+I)
```

## Testing Rust Commands

```rust
// src-tauri/src/lib.rs (with test module)
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet() {
        assert_eq!(greet("World"), "Hello, World!");
    }

    #[test]
    fn test_increment_state() {
        let app = tauri::test::mock_builder()
            .manage(Counter(Mutex::new(AppState::default())))
            .build();
        // Use tauri::test helpers to invoke commands
    }
}
```

## Build for Distribution

```bash
# Build for current platform
tauri build

# Output locations:
# Windows: src-tauri/target/release/bundle/nsis/MyApp_0.1.0_x64-setup.exe
# macOS: src-tauri/target/release/bundle/dmg/MyApp_0.1.0_x64.dmg
# Linux: src-tauri/target/release/bundle/appimage/MyApp_0.1.0_amd64.AppImage
```
