# Tauri Architecture Reference

## Rust Backend

```
src-tauri/src/
├── lib.rs            # Tauri builder, command registration
├── main.rs           # Entry point
├── commands/
│   ├── mod.rs
│   ├── filesystem.rs
│   └── settings.rs
├── state/
│   ├── mod.rs
│   └── app_state.rs  # Managed state
└── tray.rs           # System tray
```

```rust
// lib.rs — core Tauri setup
use tauri::Manager;

#[tauri::command]
fn get_app_info(state: tauri::State<'_, AppState>) -> Result<AppInfo, String> {
    let info = state.info.lock().map_err(|e| e.to_string())?;
    Ok(info.clone())
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![get_app_info, write_file])
        .setup(|app| {
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                // Background initialization
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Webview Frontend

```
src/                  # Frontend source
├── main.ts           # Entry point
├── App.svelte        # Root component
├── lib/
│   ├── api.ts        # invoke() wrappers
│   └── stores.ts     # State management
└── components/       # UI components
```

```typescript
// lib/api.ts — typed invoke wrappers
import { invoke } from '@tauri-apps/api/core';

interface AppInfo {
  version: string;
  name: string;
  platform: string;
}

export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>('get_app_info');
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content });
}
```

## IPC Commands

```rust
// Command patterns
#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

// Async command
#[tauri::command]
async fn fetch_data(url: String) -> Result<String, String> {
    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

// Command with managed state
#[tauri::command]
fn set_theme(
    theme: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.theme = theme;
    state.save_config()?;
    Ok(())
}
```

## File System Access

```rust
// Using tauri-plugin-fs
use tauri_plugin_fs::{FsExt, OpenOptions};

#[tauri::command]
async fn read_user_file(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let full = base.join(&path);
    // Security: validate path is within base
    if !full.starts_with(&base) {
        return Err("Path traversal detected".into());
    }
    std::fs::read_to_string(&full).map_err(|e| e.to_string())
}
```

## System Tray

```rust
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => { /* restore window */ }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up, ..
            } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
```

## Window Management

```rust
use tauri::Manager;

// Create additional windows
app.get_webview_window("main").unwrap().close();
let _ = tauri::WebviewWindowBuilder::new(
    app,
    "settings",
    tauri::WebviewUrl::App("settings.html".into()),
)
.title("Settings")
.inner_size(600.0, 400.0)
.build();
```

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "url": "index.html",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "decorations": true,
        "focus": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

## Architecture Patterns

- Rust backend owns all business logic and I/O
- Frontend is pure UI — state lives in Rust via managed state
- Commands are stateless or use managed state
- Plugin system extends capabilities (fs, shell, dialog)
- Capabilities file controls permission scoping per window
- Events can flow frontend→backend and backend→frontend
