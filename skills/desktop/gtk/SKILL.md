---
name: desktop-gtk
description: >
  Use when the user asks about GTK (GTK3, GTK4) application development, GtkWidget, GtkBuilder UI files, CSS styling for GTK, or cross-platform GTK development. Do NOT use for: GNOME-specific patterns (desktop-gnome), or KDE/Qt (desktop-kde, desktop-qt).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, gtk, linux, cross-platform]
---

# GTK

## Purpose
Build applications using GTK (GIMP Toolkit) — the primary widget toolkit for GNOME and a cross-platform toolkit supporting Linux, Windows, and macOS. GTK4 provides a modern rendering model with CSS styling, hardware-accelerated rendering via Vulkan/OpenGL, and a robust widget hierarchy.

## Agent Protocol

### Trigger
Exact user phrases: "GTK", "GTK3", "GTK4", "GtkWidget", "GtkBuilder", "Gtk CSS", "gtk-rs", "PyGObject", "GTK application", "GtkWindow", "GtkBox", "GtkListView".

### Input Context
- GTK version (3.x or 4.x — 4.x preferred for new projects)
- Language (C, Rust via gtk4-rs, Python via PyGObject, Vala, JS via GJS)
- Display backend (Wayland, X11, Windows GDK, macOS Quartz)
- CSS styling approach (Adwaita theme, custom CSS, libadwaita)
- Performance needs (heavy rendering via GtkGLArea, large data via GtkListView)
- Platform target (Linux native, cross-platform)

### Output Artifact
GTK application architecture with widget tree, signal flow, data binding, and styling strategy.

### Completion Criteria
- [ ] Widget hierarchy designed (container types, layout management)
- [ ] UI definition format chosen (GtkBuilder XML vs programmatic)
- [ ] Signal and callback architecture established
- [ ] Data display strategy (GtkListView/ColumnView vs GtkTreeView)
- [ ] CSS styling approach defined (Adwaita + custom CSS)
- [ ] GtkApplication startup flow configured
- [ ] Keyboard navigation and mnemonics enabled
- [ ] Accessibility (ATK/AT-SPI) integrated
- [ ] Internationalization via gettext configured
- [ ] Window geometry and state persistence implemented

### Max Response Length
250 lines.

## Framework/Methodology

### GTK Version Decision

| Feature | GTK3 | GTK4 |
|---------|------|------|
| Widget hierarchy | GtkBox, GtkGrid, GtkPaned | Same + GtkListView, GtkColumnView |
| Event handling | signal_connect per event | Event controllers (GtkEventControllerKey) |
| Rendering | Cairo (CPU) | Vulkan/OpenGL (GPU, ngl subsystem) |
| CSS animation | Limited | Full CSS transitions + animations |
| Accessibility | ATK | AT-SPI directly integrated |
| List widgets | GtkTreeView (complex, outdated) | GtkListView, GtkColumnView (modern, flexible) |
| OpenGL | GtkGLArea | GtkGLArea + GtkMediaFile |
| File chooser | GtkFileChooser | GtkFileDialog (portal-based, async) |
| Lifecycle | Manual dispose | GObject ref-counted, easier memory management |

**Recommendation**: GTK4 for all new projects. GTK3 only for legacy maintenance.

### GTK App Architecture
```
GtkApplication
  ├── activate() → create windows
  ├── GActionMap (menus, shortcuts)
  ├── GMenuModel (app menu)
  └── GSimpleAction (actions)
      ↓
GtkApplicationWindow
  ├── Title bar (CSD or SSD)
  ├── GtkBox layout
  │   ├── GtkHeaderBar / GtkMenuBar
  │   ├── Content area (GtkListView, GtkBox, GtkNotebook)
  │   └── GtkStatusBar / Footer
  ├── GtkOverlay (popovers, tooltips)
  └── GtkShortcutsWindow
```

## Workflow

### Step 1: Set Up GtkApplication

```rust
// Rust with gtk4-rs
use gtk::prelude::*;
use gtk::{Application, ApplicationWindow, Button, Box, Orientation};

fn main() {
    let app = Application::builder()
        .application_id("com.example.app")
        .build();

    app.connect_activate(|app| {
        let window = ApplicationWindow::builder()
            .application(app)
            .title("My GTK App")
            .default_width(600)
            .default_height(400)
            .build();

        let vbox = Box::new(Orientation::Vertical, 8);
        let button = Button::with_label("Click Me");
        button.connect_clicked(|_| {
            println!("Clicked!");
        });
        vbox.append(&button);

        window.set_child(Some(&vbox));
        window.present();
    });

    app.run();
}
```

```python
# Python with PyGObject
import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib, Gio

class MyApp(Gtk.Application):
    def __init__(self):
        super().__init__(application_id='com.example.app')
    def do_activate(self):
        window = Gtk.ApplicationWindow(application=self)
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        button = Gtk.Button(label='Click Me')
        button.connect('clicked', lambda b: print('Clicked!'))
        box.append(button)
        window.set_child(box)
        window.present()

app = MyApp()
app.run(None)
```

### Step 2: Build UI with GtkBuilder XML

```xml
<!-- interface.ui -->
<interface>
  <template class="MyAppWindow" parent="GtkApplicationWindow">
    <property name="title">My GTK App</property>
    <property name="default-width">600</property>
    <property name="default-height">400</property>
    <child>
      <object class="GtkBox">
        <property name="orientation">vertical</property>
        <property name="spacing">8</property>
        <property name="margin-top">12</property>
        <property name="margin-bottom">12</property>
        <property name="margin-start">12</property>
        <property name="margin-end">12</property>
        <child>
          <object class="GtkLabel" id="main_label">
            <property name="label">Hello, World!</property>
            <property name="xalign">0.0</property>
          </object>
        </child>
        <child>
          <object class="GtkButton" id="action_button">
            <property name="label">_Click Me</property>
            <property name="use-underline">True</property>
            <signal name="clicked" handler="on_button_clicked"/>
          </object>
        </child>
      </object>
    </child>
  </template>
</interface>
```

```rust
// Load UI from builder
let builder = gtk::Builder::from_resource("/com/example/app/ui/interface.ui");
let window: ApplicationWindow = builder.object("my_app_window").expect("Window not found");
window.set_application(Some(&app));
window.present();
```

### Step 3: Modern Lists with GtkListView

```rust
// GTK4's GtkListView replaces GtkTreeView
// 1. Create model
let model = gio::ListStore::new::<MyItem>();

// Add items
model.append(&MyItem::new("Item 1", "Description 1"));
model.append(&MyItem::new("Item 2", "Description 2"));

// 2. Create factory for item widgets
let factory = gtk::SignalListItemFactory::new();
factory.connect_setup(|_, list_item| {
    let hbox = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    let label = gtk::Label::new(Some(""));
    label.set_xalign(0.0);
    label.set_hexpand(true);
    hbox.append(&label);
    list_item.set_child(Some(&hbox));
});
factory.connect_bind(|_, list_item| {
    let item = list_item.item().unwrap().downcast::<MyItem>().unwrap();
    let child = list_item.child().unwrap();
    let label = child.first_child().unwrap().downcast::<gtk::Label>().unwrap();
    label.set_text(&item.name());
});

// 3. Create view
let list_view = gtk::ListView::new(Some(gtk::SingleSelection::new(Some(model))), Some(factory));
```

### Step 4: Event Controllers (GTK4)

```rust
// GTK4 uses event controllers instead of direct signal connections
// Key controller
let key_controller = gtk::EventControllerKey::new();
key_controller.connect_key_pressed(|_, keyval, _code, _state| {
    if keyval == gdk::Key::Escape {
        // Handle escape
        return glib::Propagation::Stop;
    }
    glib::Propagation::Proceed
});
window.add_controller(&key_controller);

// Click controller (replaces button-press-event)
let click_controller = gtk::GestureClick::new();
click_controller.connect_pressed(|_, _n_press, x, y| {
    println!("Clicked at {}, {}", x, y);
});
widget.add_controller(&click_controller);

// Scroll controller
let scroll_controller = gtk::EventControllerScroll::new();
scroll_controller.set_flags(gtk::EventControllerScrollFlags::BOTH_AXES);
scroll_controller.connect_scroll(|_, _dx, dy| {
    println!("Scrolled {}", dy);
    glib::Propagation::Stop
});
widget.add_controller(&scroll_controller);
```

### Step 5: CSS Styling in GTK4

```css
/* style.css */
window {
    background-color: @theme_bg_color;
}

.important-label {
    font-weight: bold;
    font-size: 18px;
    color: @theme_fg_color;
}

.card-style {
    background-color: @theme_base_color;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

button.suggested-action {
    background-color: @accent_bg_color;
    color: @accent_fg_color;
    border-radius: 6px;
}

button.suggested-action:hover {
    background-color: shade(@accent_bg_color, 1.2);
}
```

```rust
// Load CSS
let provider = gtk::CssProvider::new();
provider.load_from_resource("/com/example/app/css/style.css");

gtk::style_context_add_provider_for_display(
    &gdk::Display::default().unwrap(),
    &provider,
    gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
);
```

### Step 6: GTK Actions and Menus

```xml
<!-- menus.ui -->
<interface>
  <menu id="app-menu">
    <section>
      <item>
        <attribute name="label">_Preferences</attribute>
        <attribute name="action">app.preferences</attribute>
      </item>
      <item>
        <attribute name="label">_About</attribute>
        <attribute name="action">app.about</attribute>
      </item>
    </section>
  </menu>
</interface>
```

```rust
// Register actions
let action = gio::SimpleAction::new("preferences", None);
action.connect_activate(|_, _| {
    // Show preferences
});
app.add_action(&action);

let action = gio::SimpleAction::new("about", None);
action.connect_activate(|_, _| {
    // Show about dialog
});
app.add_action(&action);

// Set accelerators
app.set_accels_for_action("app.preferences", &["<Ctrl>comma"]);
app.set_accels_for_action("app.quit", &["<Ctrl>q"]);
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| GTK3 patterns in GTK4 | Old signal connections, GtkTreeView | Use GTK4 APIs: event controllers, GtkListView |
| Main loop blocking | Synchronous I/O freezes UI | Use GIO async, spawn async tasks |
| CSS class name conflicts | Names too generic, leaking styles | Namespace: .myapp-main-box, .myapp-highlight-btn |
| GtkTreeView complexity | Too much boilerplate for simple lists | Use GtkListView (GTK4) which is simpler |
| Missing CSS provider | Widgets unstyled across themes | Use theme variables: @theme_bg_color, @accent_bg_color |
| No keyboard navigation | App not usable without mouse | Mnemonics, focus chains, keyboard shortcuts |
| Ignoring RTL | Layout broken in right-to-left locales | Use GtkAlign.START/END, not left/right |
| Direct X11 usage | App broken on Wayland | Use GDK abstractions, test on both |
| Memory leaks | Ref cycles with closures | Use weak references in signal callbacks |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| GTK4 for new projects | Modern APIs, GPU rendering, better performance |
| GtkBuilder XML for UI layout | Separates structure from logic, easier maintenance |
| CSS for styling, not widget attributes | Theme support, easier customization |
| GAction for user-initiated actions | Keyboard shortcuts, menu integration, disabled state |
| Project structure: src/, data/, po/ | Standard Meson/GTK project layout |
| GResource for embedded assets | Single binary, no file dependencies |
| GtkListView over GtkTreeView | Simpler API, better performance, type-safe |
| GIO async for I/O operations | Non-blocking, cancellable | 
| Test with both light and dark themes | Adwaita default and HighContrast |
| Use gettext from day one | Wrapping strings later is disruptive |

## Architecture Patterns

### Responsive Layout with GtkStack
```rust
let stack = gtk::Stack::new();
let sidebar_page = create_sidebar_page();
let detail_page = create_detail_page();
stack.add_titled(&sidebar_page, Some("sidebar"), "Sidebar");
stack.add_titled(&detail_page, Some("detail"), "Detail");

// Use GtkStackSwitcher or GtkStackSidebar for navigation
```

### GtkScrolledWindow + Viewport
```rust
let scrolled = gtk::ScrolledWindow::new();
scrolled.set_policy(gtk::PolicyType::Automatic, gtk::PolicyType::Automatic);
scrolled.set_child(Some(&content_widget));
// GTK4 handles viewport automatically for scrollable widgets
```

## Implementation Patterns

### GTK4 Application Template

```rust
use gtk::prelude::*;
use gtk::{Application, ApplicationWindow, Button, Box, Orientation, Label};

fn main() {
    let app = Application::builder()
        .application_id("com.example.app")
        .build();

    app.connect_activate(|app| {
        let window = ApplicationWindow::builder()
            .application(app)
            .title("My GTK4 App")
            .default_width(600)
            .default_height(400)
            .build();

        let vbox = Box::new(Orientation::Vertical, 8);
        vbox.set_margin(16);

        let label = Label::new(Some("Hello, GTK4!"));
        label.set_css_classes(&["title"]);

        let button = Button::with_label("Click Me");
        button.connect_clicked(move |_| {
            println!("Button clicked!");
        });

        vbox.append(&label);
        vbox.append(&button);
        window.set_child(Some(&vbox));
        window.present();
    });

    app.run();
}
```

### CSS Styling in GTK

```css
/* style.css — GTK CSS for app */
.title {
    font-size: 24px;
    font-weight: bold;
    color: #1a1a1a;
    margin-bottom: 12px;
}

.button {
    background-color: #3584e4;
    color: white;
    border-radius: 6px;
    padding: 8px 16px;
}

.button:hover {
    background-color: #4a90e4;
}

.destructive-button {
    background-color: #e43535;
}
```

## Architecture Decision Trees

### GTK Widget Selection

```
What UI element?
├── Show information → Label, TextView, Picture
├── User input → Entry, TextView, SpinButton, ComboBoxText
├── Selection → CheckButton, RadioButton, Switch, DropDown
├── Layout → Box, Grid, Stack, Paned, Notebook
├── Navigation → StackSidebar, StackSwitcher, HeaderBar
└── Feedback → ProgressBar, Spinner, Statusbar, Toast
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Direct rendering in expose event | Poor performance, flickering | Use cairo only when necessary, prefer widgets |
| Long operations on main thread | UI freezes | Use async tasks or GTask for background work |
| Ignoring dpi/scale factor | Blurry UI on HiDPI | Use CSS units, test at multiple scale factors |
| No CSS classes | Inline style attributes everywhere | Define CSS classes, apply via add_css_class() |
| Imperative layout code | Hard to maintain | Use Blueprint UI or GtkBuilder XML for complex UIs |

## Performance Optimization

- **List view with GtkListView (GTK4)**: Use GtkListView with GtkListItemFactory for large data sets. Only creates widgets for visible items. Recycles widgets on scroll. Handles 100K+ items smoothly.
- **Async image loading**: Load images in background thread with GTask. Update UI on main thread after load. Prevents UI freeze during decoding of large images.
