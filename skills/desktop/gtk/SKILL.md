---
name: gtk
description: >
  Use this skill when building cross-platform desktop apps with GTK — C toolkit, Python (PyGObject), or Rust (gtk-rs). GNOME/Adwaita design, GObject type system, signal-based communication. Do NOT use for: Qt-specific projects, Windows-only apps, web-only UIs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, cross-platform, gtk, gnome, c, python, phase-4]
---

# GTK

## Purpose
Build cross-platform desktop applications using GTK 4 toolkit with C, Python (PyGObject), or Rust (gtk-rs), following GNOME HIG and Adwaita design language.

## Agent Protocol

### Trigger
User request includes: `gtk`, `gtk4`, `gtk-rs`, `pygobject`, `gtkmm`, `glib`, `gobject`, `adwaita`, `gnome app`, `linux desktop`.

### Input Context
- GTK version (GTK 3, GTK 4)
- Language (C, Python, Rust, C++)
- UI builder (GtkBuilder UI files, code-only)
- Project type (simple dialog, complex app, GNOME extension)
- Target environment (GNOME, cross-platform)

### Output Artifact
A markdown document containing:
- Project scaffold and build system
- Main window and application class
- Widget hierarchy
- Signal connections
- CSS styling
- Resource management
- GtkBuilder UI file (if using .ui)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- GtkApplication class defined with activate signal
- Widget tree created via code or GtkBuilder
- Signal handlers connected for user interaction
- CSS styling applied via style context or CSS provider
- Resources compiled via blueprint or gresource
- Application runs and responds to user input

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup (Python)
```python
# main.py
import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib, Gio

class MyApp(Gtk.Application):
    def __init__(self):
        super().__init__(application_id='com.example.myapp',
                         flags=Gio.ApplicationFlags.DEFAULT_FLAGS)

    def do_activate(self):
        window = Gtk.ApplicationWindow(application=self,
                                        title='My App',
                                        default_width=800,
                                        default_height=600)
        window.set_child(self.build_ui())
        window.present()

    def build_ui(self):
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        vbox.set_margin_top(16)
        vbox.set_margin_bottom(16)
        vbox.set_margin_start(16)
        vbox.set_margin_end(16)

        label = Gtk.Label(label='Hello, GTK!')
        button = Gtk.Button(label='Click me')
        button.connect('clicked', self.on_button_clicked)

        vbox.append(label)
        vbox.append(button)
        return vbox

    def on_button_clicked(self, button):
        button.set_label('Clicked!')

if __name__ == '__main__':
    app = MyApp()
    app.run(None)
```

### Step 2: GtkBuilder UI File
```xml
<!-- ui/window.ui -->
<interface>
  <template class="MyWindow" parent="GtkApplicationWindow">
    <property name="title">My App</property>
    <property name="default-width">800</property>
    <property name="default-height">600</property>
    <child>
      <object class="GtkBox">
        <property name="orientation">vertical</property>
        <property name="spacing">16</property>
        <property name="margin-top">16</property>
        <child>
          <object class="GtkEntry" id="entry">
            <property name="placeholder-text">Enter text...</property>
          </object>
        </child>
        <child>
          <object class="GtkButton" id="submit_btn">
            <property name="label">Submit</property>
            <signal name="clicked" handler="on_submit_clicked"/>
          </object>
        </child>
      </object>
    </child>
  </template>
</interface>
```

```python
# Using GtkBuilder
from gi.repository import Gtk

builder = Gtk.Builder.new_from_file('ui/window.ui')
window = builder.get_object('MyWindow')
entry = builder.get_object('entry')
submit_btn = builder.get_object('submit_btn')
submit_btn.connect('clicked', on_submit_clicked)
```

### Step 3: CSS Styling
```css
/* style.css */
window {
    background-color: #f5f5f5;
}

button {
    background-color: #3584e4;
    color: white;
    border-radius: 8px;
    padding: 8px 16px;
    font-weight: bold;
}

button:hover {
    background-color: #4a90e4;
}

entry {
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 8px;
}
```

```python
css_provider = Gtk.CssProvider()
css_provider.load_from_path('style.css')
Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    css_provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
)
```

### Step 4: gtk-rs (Rust)
```rust
// Cargo.toml
// [dependencies]
// gtk4 = "0.8"
// adw = { version = "0.6", features = ["v1_5"] }

use gtk4::prelude::*;
use gtk4::{Application, ApplicationWindow, Button, Label, Box};

fn main() {
    let app = Application::builder()
        .application_id("com.example.myapp")
        .build();

    app.connect_activate(|app| {
        let window = ApplicationWindow::builder()
            .application(app)
            .title("My App")
            .default_width(800)
            .default_height(600)
            .build();

        let vbox = Box::new(gtk4::Orientation::Vertical, 16);
        let label = Label::new(Some("Hello, GTK!"));
        let button = Button::with_label("Click me");

        vbox.append(&label);
        vbox.append(&button);
        window.set_child(Some(&vbox));
        window.present();
    });

    app.run();
}
```

## Rules
- GtkApplication used instead of direct GtkWindow creation for proper lifecycle.
- Signals connected after widget creation, never before.
- Thread safety — never call GTK functions from non-main thread.
- CSS used for visual styling, not widget API calls.
- Resources bundled via GResource for deployment.
- `gi.require_version` called before any other import.
- GTK 4 preferred — GTK 3 for legacy projects only.

## References

### Reference Files
- `references/gtk-setup.md` — Installation, build systems, debugging, deployment
- `references/gtk-builder-guide.md` — GtkBuilder XML, widgets, signals, Blueprint

### Related Skills
- `desktop/qt/SKILL.md` — Qt alternative for C++/QML
- `desktop/gnome/SKILL.md` — GNOME-specific development with libadwaita
- `desktop/kde/SKILL.md` — KDE alternative with Qt/Kirigami

## Handoff
Hand off to `desktop/gnome/SKILL.md` when building GNOME-specific apps with libadwaita or Shell extensions. Hand off to `desktop/qt/SKILL.md` when Qt ecosystem preferred.
