---
name: tauri
description: >
  Use this skill when building lightweight cross-platform desktop apps with Tauri — Rust backend, web frontend, security-first architecture. Covers Tauri v2 setup, Rust commands, capabilities system, window management, and bundling. Do NOT use for: web-only apps, Electron projects, mobile development.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, cross-platform, tauri, rust, phase-4]
---

# Tauri

## Purpose
Build secure, performant desktop applications using Tauri with Rust backend and web frontend, leveraging OS-native WebView instead of bundled Chromium.

## Agent Protocol

### Trigger
User request includes: `tauri`, `tauri app`, `rust desktop`, `tauri command`, `invoke`, `webview`, `small binary`, `lightweight desktop`.

### Input Context
- Frontend framework (React, Vue, Svelte, Solid)
- Rust version and toolchain
- Tauri v1 or v2
- OS targets
- Plugin requirements (fs, shell, dialog, etc.)

### Output Artifact
A markdown document containing:
- Tauri project scaffold command
- Rust command definitions with types
- Frontend invoke patterns
- Capabilities/permissions config
- Window configuration
- Plugin setup
- Build and bundling config
- CI configuration

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Tauri project scaffolded with correct frontend binding
- Rust commands defined with proper type annotations
- Invoke calls handled in frontend with error boundaries
- Capabilities/permissions configured per plugin need
- Window configuration set (title, size, decorations)
- App bundles produce expected output per platform

### Max Response Length
4096 tokens

## Workflow

### Step 1: Scaffold Project
```bash
npm create tauri-app@latest my-app -- --template react-ts
cd my-app
```

### Step 2: Define Rust Commands
```rust
// src-tauri/src/lib.rs
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
fn read_config(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, read_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 3: Frontend Invoke
```typescript
// src/App.tsx
import { invoke } from '@tauri-apps/api/core';

async function handleGreet() {
  try {
    const message = await invoke<string>('greet', { name: 'World' });
    console.log(message);
  } catch (err) {
    console.error('Command failed:', err);
  }
}
```

### Step 4: Configure Capabilities
```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "description": "Default capability set",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-close",
    "core:window:allow-set-size",
    "dialog:default",
    "fs:allow-read-text-file",
    "shell:default"
  ]
}
```

### Step 5: Window Configuration
```json
// src-tauri/tauri.conf.json (snippet)
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "My App",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis", "dmg", "appimage"],
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.ico"]
  }
}
```

## Rules
- Rust commands accept only serializable types — no complex objects without serde.
- Error handling uses Result<T, String> — never unwrap in command handlers.
- Capabilities follow principle of least privilege — grant only needed permissions.
- CSP headers set in tauri.conf.json — never use 'unsafe-inline' unless necessary.
- Frontend invoke calls wrapped in try/catch.
- Plugin permissions explicitly declared in capabilities.
- Bundle targets match CI runner OS.
- Dev mode uses `tauri dev` for hot-reload.

## References
  - references/tauri-advanced.md — Tauri Advanced Topics
  - references/tauri-architecture.md — Tauri Architecture Reference
  - references/tauri-deployment.md — Tauri Deployment Reference
  - references/tauri-fundamentals.md — Tauri Fundamentals
  - references/tauri-setup.md — Tauri Setup Reference
  - references/tauri-vs-electron.md — Tauri vs Electron Reference
## Handoff
Hand off to `desktop/electron/SKILL.md` when Chromium DevTools or extensive npm-native ecosystem required. Hand off to `backend/rust/core/SKILL.md` for complex Rust backend logic beyond Tauri commands.
