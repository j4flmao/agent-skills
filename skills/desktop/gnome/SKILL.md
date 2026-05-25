---
name: gnome
description: >
  Use this skill when building GNOME desktop applications — GTK 4, libadwaita, GNOME Shell extensions, GNOME Builder, Python/JavaScript. Covers adaptive UI, GNOME HIG, Flatpak distribution. Do NOT use for: Qt/KDE apps, CLI-only tools, Windows/macOS-only apps.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, linux, gnome, gtk, libadwaita, phase-4]
---

# GNOME

## Purpose
Build GNOME desktop applications using GTK 4, libadwaita, and GNOME platform libraries, following GNOME Human Interface Guidelines.

## Agent Protocol

### Trigger
User request includes: `gnome`, `gnome app`, `libadwaita`, `adwaita widget`, `gnome builder`, `gnome shell extension`, `gnome platform`, `gtk4 gnome`, `flatpak gnome`.

### Input Context
- Language (Python/PyGObject, JavaScript/GJS, C, Vala)
- UI toolkit (GTK 4 + libadwaita, GTK 3, legacy)
- Project type (application, Shell extension, background service)
- Build system (Meson, GNOME Builder, Flatpak)
- GNOME version (44, 45, 46, 47)

### Output Artifact
A markdown document containing:
- Meson build definition
- Application subclass of Adw.Application
- Main window with AdwNavigationView
- Page structure with AdwToolbarView
- Adaptive breakpoints with AdwBreakpoint
- Preferences via AdwPreferencesDialog
- Flatpak manifest
- Shell extension structure (if applicable)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Adw.Application subclass with activate signal handler.
- Adw.NavigationView with at least two pages.
- Adaptive layout with AdwBreakpoint.
- libadwaita widgets used (AdwEntryRow, AdwActionRow, etc.).
- Flatpak manifest for distribution.
- App runs within GNOME desktop environment.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup (Python)
```bash
# Requirements
sudo apt install python3-gi python3-gi-cairo gir1.2-gtk-4.0 gir1.2-adw-1

# Or install via Flatpak SDK
flatpak install org.gnome.Sdk//47
```

### Step 2: Application Bootstrap
```python
#!/usr/bin/env python3
import sys
import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw, GLib, Gio

class MyApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id='com.example.myapp',
                         flags=Gio.ApplicationFlags.DEFAULT_FLAGS)
        self.connect('activate', self.on_activate)

    def on_activate(self, app):
        # Main window
        win = Adw.ApplicationWindow(application=app)
        win.set_default_size(800, 600)

        # Navigation view (stack-based routing)
        nav = Adw.NavigationView()
        win.set_content(nav)

        # Main page
        main_page = Adw.ToolbarView()
        nav.push(Adw.NavigationPage(child=main_page, title='My App'))

        # Header bar
        header = Adw.HeaderBar()
        main_page.add_top_bar(header)

        # Content area
        clamp = Adw.Clamp(maximum_size=600)
        main_page.set_content(clamp)

        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        box.set_margin_top(24)
        box.set_margin_bottom(24)
        box.set_margin_start(16)
        box.set_margin_end(16)
        clamp.set_child(box)

        # Adw widgets
        group = Adw.PreferencesGroup(title='Settings')
        box.append(group)

        row = Adw.ActionRow(title='Dark Mode', subtitle='Use dark color scheme')
        toggle = Gtk.Switch()
        row.add_suffix(toggle)
        row.set_activatable_widget(toggle)
        group.add(row)

        # Adaptive breakpoint
        bp = Adw.Breakpoint(condition=Adw.BreakpointCondition.parse('max-width: 500px'))
        bp.add_setter(box, 'orientation', Gtk.Orientation.VERTICAL)
        win.add_breakpoint(bp)

        win.present()

if __name__ == '__main__':
    app = MyApp()
    app.run(sys.argv)
```

### Step 3: Meson Build
```meson
# meson.build
project('myapp', 'vala', 'c',
  version: '1.0.0',
  meson_version: '>= 0.60.0'
)

dependency('glib-2.0')
dependency('gtk4')
dependency('libadwaita-1')

sources = files('src/main.vala')
executable('myapp', sources, dependencies: [dependency('gtk4'), dependency('libadwaita-1')])
```

### Step 4: Flatpak Manifest
```yaml
# build-aux/com.example.myapp.yml
id: com.example.myapp
runtime: org.gnome.Platform
runtime-version: '47'
sdk: org.gnome.Sdk
command: myapp

finish-args:
  - '--share=ipc'
  - '--socket=fallback-x11'
  - '--socket=wayland'
  - '--device=dri'

modules:
  - name: myapp
    buildsystem: meson
    sources:
      - type: dir
        path: .
```

## Rules
- Adw.Application used instead of Gtk.Application for libadwaita features.
- Adw.NavigationView for page-based navigation.
- Adw.Clamp for responsive content width.
- AdwBreakpoint for adaptive layout changes.
- Adw.PreferencesGroup + Adw.ActionRow for settings UI.
- Flatpak as primary distribution format.
- GNOME HIG followed for spacing, typography, and interaction patterns.
- SVGs for icons and artwork.

## References

### Reference Files
- `references/gnome-architecture.md` — GNOME Shell, Mutter, GSettings, D-Bus, portals, GNOME Circle, HIG guidelines
- `references/gnome-dev-setup.md` — GNOME Builder, Flatpak, GJS, debugging
- `references/gnome-development.md` — GTK4, libadwaita, Blueprint UI language, GNOME Builder, extensions, Flatpak
- `references/libadwaita-guide.md` — libadwaita widgets, adaptive patterns, HIG

### Related Skills
- `desktop/gtk/SKILL.md` — GTK 4 foundational toolkit skill
- `desktop/kde/SKILL.md` — KDE alternative with Qt/Kirigami

## Handoff
Hand off to `desktop/gtk/SKILL.md` for generic GTK 4 cross-platform apps without GNOME dependencies. Hand off to `desktop/kde/SKILL.md` when targeting KDE Plasma.
