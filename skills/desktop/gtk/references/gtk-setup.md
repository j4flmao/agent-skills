# GTK Setup Reference

## Installation

### Linux (Ubuntu/Debian)
```bash
sudo apt install libgtk-4-dev libadwaita-1-dev build-essential meson
```

### macOS
```bash
brew install gtk4 adwaita-icon-theme
```

### Windows
```bash
# MSYS2
pacman -S mingw-w64-x86_64-gtk4 mingw-w64-x86_64-adwaita-icon-theme

# Or vcpkg
vcpkg install gtk4:x64-windows
```

## Python (PyGObject) Setup

```bash
# Ubuntu/Debian
sudo apt install python3-gi python3-gi-cairo gir1.2-gtk-4.0

# macOS
brew install pygobject3 gtk4

# Windows (MSYS2)
pacman -S mingw-w64-x86_64-python-gobject mingw-w64-x86_64-gtk4
```

## Build Systems

### Meson (C)
```meson
# meson.build
project('myapp', 'c',
  version: '1.0.0',
  meson_version: '>= 0.60.0'
)

gtk4_dep = dependency('gtk4', version: '>= 4.0')

sources = files(
  'main.c',
  'window.c',
)

executable('myapp', sources,
  dependencies: [gtk4_dep],
  install: true
)
```

```bash
meson setup build
ninja -C build
./build/myapp
```

### Cargo (Rust)
```toml
# Cargo.toml
[package]
name = "myapp"
version = "1.0.0"

[dependencies]
gtk4 = "0.8"
adw = { version = "0.6", features = ["v1_5"] }
```

```bash
cargo run
cargo build --release
```

## GResource Bundle

```xml
<!-- myapp.gresource.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<gresources>
  <gresource prefix="/com/example/myapp">
    <file>ui/window.ui</file>
    <file>style/style.css</file>
    <file>icons/app.png</file>
  </gresource>
</gresources>
```

```meson
# In meson.build
gnome = import('gnome')
resources = gnome.compile_resources('resources',
  'myapp.gresource.xml',
  source_dir: '.'
)
```

## Debugging

```python
import gi
gi.require_version('Gtk', '4.0')

# Enable GTK inspector
# Run with: GTK_DEBUG=interactive python main.py
# Or press Ctrl+Shift+I or Ctrl+Shift+D in the running app

# GTK debug flags:
export GTK_DEBUG=interactive   # Open inspector
export GTK_DEBUG=geometry      # Show widget rectangles
export GTK_DEBUG=size-allocate # Print size allocations
export GSETTINGS_DEBUG=1       # Settings debugging
```

## Key GObject CLI Tools

```bash
# Inspect GTK classes, signals, properties
gobject-inspect Gtk.Window
gobject-inspect Gtk.Button

# Find GtkBuilder UI file errors
gtk-builder-tool validate ui/window.ui

# Preview UI files
gtk4-widget-factory
```

## Cross-Compilation

```bash
# Install cross-toolchain (example: aarch64)
sudo apt install gcc-aarch64-linux-gnu libgtk-4-dev:arm64

# Meson cross-file
cat > cross-arm64.ini << EOF
[binaries]
c = 'aarch64-linux-gnu-gcc'
pkgconfig = 'aarch64-linux-gnu-pkg-config'

[host_machine]
system = 'linux'
cpu_family = 'aarch64'
cpu = 'arm64'
endian = 'little'
EOF

meson setup build-arm --cross-file cross-arm64.ini
ninja -C build-arm
```

## Flatpak Building

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

modules:
  - name: myapp
    buildsystem: meson
    sources:
      - type: dir
        path: .
```

```bash
flatpak-builder build build-aux/com.example.myapp.yml
flatpak-builder --user --install build build-aux/com.example.myapp.yml
flatpak run com.example.myapp
```

## Common GTK 4 API Patterns

| Task | Function |
|------|----------|
| Set widget margin | gtk_widget_set_margin_start/widget_set_margin_end |
| Add CSS class | gtk_widget_add_css_class(widget, "class-name") |
| Replace child | gtk_box_remove/gtk_box_append |
| Async operation | g_task_run_in_thread |
| Gesture handling | GtkGestureClick, GtkGestureDrag |
| Animation | GtkSpringAnimation, GtkEasing |
| List rendering | GtkListView, GtkColumnView, GtkGridView |
| Text with markup | gtk_label_set_markup(label, "<b>bold</b> text") |

## Widget Hierarchy (GTK 4)

```
GtkWidget
├── GtkWindow
│   └── GtkApplicationWindow
├── GtkContainer (deprecated in GTK 4)
├── GtkBox
├── GtkGrid
├── GtkStack
├── GtkButton
├── GtkLabel
├── GtkEntry
├── GtkListView
├── GtkTextView
├── GtkDrawingArea
├── GtkScrolledWindow
├── GtkHeaderBar
├── GtkRevealer
└── GtkOverlay
```
