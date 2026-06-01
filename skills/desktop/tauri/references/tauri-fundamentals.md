# Tauri Fundamentals

## Overview
Tauri is a framework for building desktop applications with a Rust backend and a web-based frontend using the system WebView. It provides security, performance, and small binary size advantages over Electron. This reference covers fundamental Tauri concepts.

## Core Concepts

### Concept 1: Architecture
Tauri consists of a Rust core process and a WebView renderer process. The Rust backend handles system access, file I/O, and native APIs. The frontend (HTML/CSS/JS/TS) handles UI rendering. Communication between them uses IPC via JSON serialization.

### Concept 2: IPC and Commands
#[tauri::command] functions in Rust are callable from the frontend via invoke(). Frontend uses @tauri-apps/api/core invoke() function. Commands can accept parameters, return values, access state, and be async. Error handling returns Result<T, String> from Rust.

### Concept 3: Security Model
Capability-based permissions define what each window can access. Capabilities are defined in JSON files under src-tauri/capabilities/. Core security: contextIsolation (not applicable, no Node), CSP headers, sandboxed WebView, and minimal IPC surface.

### Concept 4: Plugins
Official plugins extend Tauri capabilities: dialog (file open/save), fs (file system), shell (execute commands), sql (database), http (HTTP requests), notification, clipboard, process. Plugins are Rust crates + JavaScript packages.

### Concept 5: Bundling
Tauri bundler creates platform installers: DMG (macOS), MSI/NSIS (Windows), AppImage/deb (Linux). Features: code signing, auto-update (via built-in updater), custom icons, and localized installer messages.

## Best Practices

- TypeScript frontend (type safety for IPC)
- Async commands for all I/O
- Capability-based permissions (granular, auditable)
- Custom protocols over localhost server
- Plugin ecosystem for common needs
- State with Mutex/RwLock (thread-safe)
- LTO in Cargo.toml for smaller binaries
- CI with cargo test

## Anti-Patterns

- Unnecessary large binary (debug symbols, unused crates)
- Missing capabilities (calls fail silently)
- Blocking main thread (sync I/O in commands)
- No CSP (XSS vulnerabilities)
- Hardcoded paths (platform-specific issues)
- Old v1 patterns in v2
- Not handling Rust errors (panics crash app)
- No code signing (Gatekeeper/SmartScreen warnings)
