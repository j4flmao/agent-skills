# GNOME Development Reference

## GTK4

```python
import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib, Gio

class MyApp(Gtk.Application):
    def __init__(self):
        super().__init__(application_id='com.example.myapp')
        self.connect('activate', self.on_activate)

    def on_activate(self, app):
        win = Gtk.ApplicationWindow(application=app, title='My App',
                                     default_width=800, default_height=600)
        win.set_child(self.build_ui())
        win.present()

    def build_ui(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        box.set_margin_top(16)
        box.set_margin_bottom(16)
        box.set_margin_start(16)
        box.set_margin_end(16)

        label = Gtk.Label(label='Hello, GNOME!')
        button = Gtk.Button(label='Click')
        button.connect('clicked', lambda b: b.set_label('Clicked!'))

        box.append(label)
        box.append(button)
        return box
```

## libadwaita

```python
import gi
gi.require_version('Adw', '1')
from gi.repository import Adw, Gtk, Gio

class MyApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id='com.example.myapp')
        self.connect('activate', self.on_activate)

    def on_activate(self, app):
        win = Adw.ApplicationWindow(application=app)
        win.set_default_size(800, 600)

        # Navigation
        nav = Adw.NavigationView()
        win.set_content(nav)

        # Main page
        page = Adw.ToolbarView()
        nav.push(Adw.NavigationPage(child=page, title='My App'))

        # Header bar
        header = Adw.HeaderBar()
        page.add_top_bar(header)

        # Content with clamp
        clamp = Adw.Clamp(maximum_size=600)
        page.set_content(clamp)

        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        box.set_margin_top(24)
        box.set_margin_bottom(24)
        box.set_margin_start(16)
        box.set_margin_end(16)
        clamp.set_child(box)

        # Preferences group
        group = Adw.PreferencesGroup(title='Settings')
        box.append(group)

        row = Adw.ActionRow(title='Dark Mode',
                            subtitle='Use dark color scheme')
        toggle = Gtk.Switch()
        row.add_suffix(toggle)
        row.set_activatable_widget(toggle)
        group.add(row)
        win.present()
```

## Blueprint UI Language

```blueprint
// ui/main.blp — Blueprint compiled to XML
using Gtk 4.0;
using Adw 1;

template $MyWindow: Adw.ApplicationWindow {
  default-width: 800;
  default-height: 600;

  Adw.NavigationView nav_view {
    Adw.NavigationPage {
      title: "My App";
      child: Adw.ToolbarView {
        [top]
        Adw.HeaderBar {}

        [content]
        Adw.Clamp {
          maximum-size: 600;
          child: Box {
            orientation: vertical;
            spacing: 16;
            margin-top: 24;
            margin-bottom: 24;
            margin-start: 16;
            margin-end: 16;

            Adw.PreferencesGroup {
              title: "Settings";
              Adw.ActionRow {
                title: "Dark Mode";
                subtitle: "Use dark color scheme";
                activatable-widget: toggle;
                Switch toggle {}
              }
            }
          }
        }
      };
    }
  }
}
```

```bash
# Compile Blueprint to XML
blueprint-compiler compile ui/main.blp > ui/main.ui

# Or use build system integration
# meson.build:
blueprint_files = files('ui/main.blp')
blueprint_targets = gnome.compile_resources(
  'resources', 'resources.gresource.xml',
  dependencies: blueprint_files,
)
```

## GNOME Builder

- Project wizard with GNOME templates
- Built-in Flatpak integration (build + test in sandbox)
- Integrated Vala/C/Python support
- Built-in profiler (sysprof integration)
- Live preview of GTK widgets
- One-click Flatpak export
- Pattern: open GNOME Builder → create Flatpak project → develop → test → export

## Extensions

```javascript
// GNOME Shell extension (GJS)
// extension.js
const { St, Shell, Meta, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

let indicator;

function init() {
    log('Initializing my extension');
}

function enable() {
    indicator = new PanelMenu.Button(0, 'My Indicator', false);
    indicator.add_child(new St.Icon({
        icon_name: 'face-smile-symbolic',
        style_class: 'system-status-icon'
    }));

    const item = new PopupMenu.PopupMenuItem('Hello!');
    indicator.menu.addMenuItem(item);

    Main.panel.addToStatusArea('my-indicator', indicator, 0);
}

function disable() {
    indicator.destroy();
    indicator = null;
}
```

```json
// metadata.json
{
  "name": "My Extension",
  "description": "A GNOME Shell extension",
  "uuid": "my-extension@example.com",
  "shell-version": ["45", "46", "47"]
}
```

## Flatpak

```yaml
# build-aux/com.example.myapp.yml
id: com.example.myapp
runtime: org.gnome.Platform
runtime-version: '47'
sdk: org.gnome.Sdk
command: myapp
finish-args:
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri

modules:
  - name: myapp
    buildsystem: meson
    sources:
      - type: dir
        path: .
```

## Key Development Rules

- Adw.Application for libadwaita apps (not Gtk.Application)
- Adw.NavigationView for page stack navigation
- Adw.Clamp for responsive content width limits
- AdwBreakpoint for adaptive layout changes
- Blueprint compiler for UI files (preferred over raw XML)
- Flatpak as primary distribution format
- GNOME HIG for spacing, typography, interaction patterns
- GResource for embedding assets in binary
- Shell extensions use GJS (JavaScript/GObject introspection)
- Meson build system with GNOME module
