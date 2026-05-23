# GNOME Dev Setup Reference

## Prerequisites

```bash
# Ubuntu/Debian
sudo apt install gnome-builder meson flatpak flatpak-builder \
  python3-gi python3-gi-cairo gir1.2-gtk-4.0 gir1.2-adw-1 \
  libgtk-4-dev libadwaita-1-dev

# Flatpak runtimes
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install org.gnome.Sdk//47
flatpak install org.gnome.Platform//47
```

## GNOME Builder

```bash
# Install GNOME Builder
flatpak install flathub org.gnome.Builder

# Launch
flatpak run org.gnome.Builder

# Open project
# Builder auto-detects Meson projects
# Key features:
# - Integrated build (Ctrl+B)
# - Run (Ctrl+F5)
# - Debug (F5)
# - Profiler in sidebar
# - Flatpak manifest generation
# - Built-in Vala/Python support
```

## Python App Template

```python
#!/usr/bin/env python3
import sys
import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
gi.require_version('Gio', '2.0')
from gi.repository import Gtk, Adw, Gio, GLib

class MyAppWindow(Adw.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app)
        self.set_default_size(800, 600)
        self.set_title('My GNOME App')

        nav = Adw.NavigationView()
        self.set_content(nav)

        page = Adw.ToolbarView()
        nav.push(Adw.NavigationPage(child=page, title='Home'))

        header = Adw.HeaderBar()
        page.add_top_bar(header)

        toast_overlay = Adw.ToastOverlay()
        page.set_content(toast_overlay)

        clamp = Adw.Clamp(maximum_size=600)
        toast_overlay.set_child(clamp)

        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        box.set_margin_top(24)
        box.set_margin_bottom(24)
        box.set_margin_start(16)
        box.set_margin_end(16)
        clamp.set_child(box)

        btn = Gtk.Button(label='Show Toast')
        btn.connect('clicked', self.on_show_toast, toast_overlay)
        box.append(btn)

        self.toast_overlay = toast_overlay

    def on_show_toast(self, button, toast_overlay):
        toast = Adw.Toast(title='Hello from GNOME!')
        toast_overlay.add_toast(toast)

class MyApplication(Adw.Application):
    def __init__(self):
        super().__init__(application_id='com.example.myapp',
                         flags=Gio.ApplicationFlags.DEFAULT_FLAGS)
        self.connect('activate', self.on_activate)

    def on_activate(self, app):
        win = MyAppWindow(app)
        win.present()

if __name__ == '__main__':
    app = MyApplication()
    app.run(sys.argv)
```

## Shell Extension Development

### Structure
```
my-extension/
├── extension.js           # Main extension code
├── metadata.json          # Extension metadata
├── prefs.js               # Preferences dialog
├── schemas/               # GSettings schemas
│   └── org.gnome.shell.extensions.my-extension.gschema.xml
└── locale/                # Translations
```

### metadata.json
```json
{
  "name": "My Extension",
  "description": "A GNOME Shell extension",
  "uuid": "my-extension@example.com",
  "shell-version": ["45", "46", "47"],
  "version": 1,
  "session-modes": ["user", "unlock-dialog"],
  "url": "https://github.com/example/my-extension"
}
```

### extension.js
```javascript
const { St, Shell, Main, PanelMenu, Panel } = imports.ui;

class MyExtension {
    constructor() {
        this._indicator = null;
    }

    enable() {
        this._indicator = new PanelMenu.Button(0.0, 'My Extension', false);

        const icon = new St.Icon({
            icon_name: 'applications-system-symbolic',
            style_class: 'system-status-icon'
        });
        this._indicator.add_child(icon);

        const menuItem = new PopupMenu.PopupMenuItem('Click me');
        this._indicator.menu.addMenuItem(menuItem);

        Main.panel.addToStatusArea('my-extension', this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}

function init() { return new MyExtension(); }
```

## Debugging Tools

```bash
# Look at widget tree
GTK_DEBUG=interactive python3 myapp.py

# Check GTK inspector key
gsettings set org.gtk.Debug enable-inspector-key true
# Then press Ctrl+Shift+I or Ctrl+Shift+D in the app

# Env vars for debugging
GTK_DEBUG=interactive    # GTK inspector
GTK_DEBUG=geometry       # Draw widget rectangles
GTK_DEBUG=size-allocate  # Print allocation info
GSETTINGS_DEBUG=1        # Settings debugging
G_MESSAGES_DEBUG=all     # GLib debug output
```

## Build with Meson

```bash
meson setup build
ninja -C build
ninja -C build install

# Or use run-in-tree for testing
ninja -C build run
```

## Flatpak Build

```bash
flatpak-builder build build-aux/com.example.myapp.yml
flatpak-builder --user --install build build-aux/com.example.myapp.yml
flatpak run com.example.myapp

# Create bundle
flatpak build-bundle ~/flatpak-repo com.example.myapp.flatpak com.example.myapp
```

## Resource Compilation

```bash
# Compile .gresource XML
glib-compile-resources --target=src/resources.gresource src/resources.gresource.xml

# In meson.build
gnome = import('gnome')
resources = gnome.compile_resources('resources', 'src/resources.gresource.xml')
```

## GSettings Schema

```xml
<schemalist>
  <schema id="com.example.myapp"
          path="/com/example/myapp/">
    <key name="theme" type="s">
      <default>'auto'</default>
      <summary>Color theme</summary>
      <description>Appearance: light, dark, or auto</description>
    </key>
  </schema>
</schemalist>
```

```bash
# Compile schema
glib-compile-schemas src/schemas/
```
