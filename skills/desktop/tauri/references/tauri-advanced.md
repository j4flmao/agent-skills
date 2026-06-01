# Tauri Advanced Topics

## Overview
Advanced Tauri covers custom plugin development, multi-window management, file system access patterns, database integration, tray and menu bar apps, mobile build targets, and automated testing.

## Advanced Concepts

### Concept 1: Custom Plugin Development
Tauri plugin as a Rust crate: implement Plugin trait, register commands, handle configuration, manage state, and emit events. Package as npm + Cargo. Plugins encapsulate related functionality and can be shared across projects.

### Concept 2: Multi-Window Management
Dynamic window creation, tracking window state, window-to-window communication, window events (close, focus, resize), and custom window decorations. Use WindowBuilder or Tauri's Window API for programmatic window management.

### Concept 3: File System Access Patterns
Read/write files with tauri-plugin-fs, path resolution with app_dir, home_dir, resolve_path APIs, file dialogs with tauri-plugin-dialog, drag-and-drop file handling, and security-scoped bookmarks (macOS) for persistent access.

### Concept 4: Database Integration
tauri-plugin-sql for SQLite/MySQL/PostgreSQL: migrations, prepared statements, async queries, and transaction support. Alternatively, use Rust SDKs (sqlx, diesel, rusqlite) directly in custom commands for more control.

### Concept 5: Mobile Build Targets
Tauri v2 supports iOS and Android: configure mobile targets in tauri config, Xcode project for iOS, Android Studio project for Android, platform-specific plugins (camera, GPS, sensors), and device testing.

## Advanced Techniques

### Plugin with Config
```rust
pub struct MyPlugin {
    config: MyConfig,
}
impl Plugin for MyPlugin {
    fn initialize(&self, _app: &AppHandle, config: Config) -> PluginResult<()> {
        self.config = config.into();
        Ok(())
    }
    fn commands(&self) -> Vec<Command> {
        vec![]
    }
}
```

### Multi-Window Communication
```rust
// Window A emits
app_handle.emit("window-a-event", payload);

// Window B listens
use tauri::Listener;
app_handle.listen("window-a-event", |event| {
    // Handle event
});
```

### Testing Tauri Apps
```rust
#[cfg(test)]
mod tests {
    use tauri::{test::mock_builder, Manager};
    #[test]
    fn test_my_command() {
        let app = mock_builder().build();
        let result = app.handle().run_on_main(|app_handle| {
            // Test your command
        });
    }
}
```

## Anti-Patterns

- Plugin duplication (multiple plugins for same concern)
- Window references stored without cleanup
- No path resolution (hardcoded paths)
- Database queries without prepared statements (SQL injection)
- Blocking commands for synchronous I/O
- Mobile configuration as afterthought
- Not handling window close events (state loss)
- Ignoring platform-specific differences
