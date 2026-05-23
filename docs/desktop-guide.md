# Desktop Skills Guide

Skills covering desktop application development across all major platforms: cross-platform frameworks, Windows-native, macOS-native, and Linux-native toolkits.

## Skill Map

### Cross-Platform Frameworks

| Skill | Directory | Tech Stack | Targets |
|-------|-----------|------------|---------|
| Electron | `skills/desktop/electron/` | JS/TS, Chromium, Node.js | Windows, macOS, Linux |
| Tauri | `skills/desktop/tauri/` | Rust + web frontend | Windows, macOS, Linux |
| Qt | `skills/desktop/qt/` | C++, QML, PySide | Windows, macOS, Linux, embedded |
| GTK | `skills/desktop/gtk/` | C, Python (PyGObject), Rust (gtk-rs) | Linux, Windows, macOS |
| Flutter Desktop | `skills/mobile/flutter/` | Dart, Skia | Windows, macOS, Linux |
| .NET MAUI | `skills/mobile/dotnet-maui/` | C#, XAML | Windows, macOS, Android, iOS |

### Windows-Native

| Skill | Directory | Tech Stack | Targets |
|-------|-----------|------------|---------|
| WPF | `skills/desktop/wpf/` | .NET, C#, XAML, MVVM | Windows only |
| WinUI 3 | `skills/desktop/winui3/` | .NET, C#, WinAppSDK, modern XAML | Windows 10+ |
| UWP | `skills/desktop/uwp/` | .NET, C#, XAML | Windows 10+, Xbox, HoloLens |
| Windows Forms | `skills/desktop/winforms/` | .NET, C#, drag-drop designer | Windows only |

### macOS-Native

| Skill | Directory | Tech Stack | Targets |
|-------|-----------|------------|---------|
| SwiftUI | `skills/desktop/swiftui/` | Swift, declarative UI | macOS, iOS, watchOS, tvOS |
| AppKit | `skills/desktop/appkit/` | Swift, Objective-C, nibs | macOS only |

### Linux-Native

| Skill | Directory | Tech Stack | Targets |
|-------|-----------|------------|---------|
| GNOME (GTK) | `skills/desktop/gnome/` | C, Python, Rust, GTK 4 | Linux (GNOME desktop) |
| KDE (Qt) | `skills/desktop/kde/` | C++, QML, Kirigami | Linux (KDE desktop) |

## Decision Framework

```
Need cross-platform with web skills?
  ├─ Electron — mature, full Chrome, large bundles
  ├─ Tauri — smaller, faster, Rust backend
  └─ Qt (with QML or WebEngine)

Need native Windows look and feel?
  ├─ WPF — mature, .NET Framework/.NET, MVVM
  ├─ WinUI 3 — modern, Fluent Design, WinAppSDK
  └─ Windows Forms — legacy, quick forms

Need native macOS look and feel?
  ├─ SwiftUI — modern, Swift, App Intents
  └─ AppKit — mature, full control, Objective-C/Swift

Need Linux-first?
  ├─ GTK — GNOME standard, C/Python/Rust
  ├─ Qt — KDE standard, C++/Python
  └─ Tauri — Linux bundles, web UI

Need maximum performance?
  ├─ Qt (C++) — native, OpenGL/Vulkan
  ├─ GTK (C) — lightweight, native
  └─ Tauri (Rust) — zero-cost abstractions
```

## Architecture Layers

```
┌──────────────────────────────────────────┐
│              UI Layer                      │
│  XAML / QML / SwiftUI / HTML / GTK        │
│  Controls, Layouts, Styles                │
├──────────────────────────────────────────┤
│           View Logic / ViewModel          │
│  MVVM / MVC / Redux / Signals             │
├──────────────────────────────────────────┤
│            Application Logic              │
│  Services, Commands, State               │
├──────────────────────────────────────────┤
│            Platform Layer                 │
│  IPC, File System, Notifications, Menu   │
├──────────────────────────────────────────┤
│            Native Integration             │
│  WinRT / Cocoa / D-Bus / FS, Registry    │
└──────────────────────────────────────────┘
```

## Skills List

### Cross-Platform
- `skills/desktop/electron/SKILL.md`
- `skills/desktop/tauri/SKILL.md`
- `skills/desktop/qt/SKILL.md`
- `skills/desktop/gtk/SKILL.md`

### Windows
- `skills/desktop/wpf/SKILL.md`
- `skills/desktop/winui3/SKILL.md`
- `skills/desktop/uwp/SKILL.md`
- `skills/desktop/winforms/SKILL.md`

### macOS
- `skills/desktop/swiftui/SKILL.md`
- `skills/desktop/appkit/SKILL.md`

### Linux
- `skills/desktop/gnome/SKILL.md`
- `skills/desktop/kde/SKILL.md`
