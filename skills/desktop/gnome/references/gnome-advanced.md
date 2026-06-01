# GNOME Advanced Topics

## Overview
Advanced GNOME covers complex GObject subclassing, GStreamer integration, Flatpak packaging, GNOME Builder plugin development, performance profiling, and shell extension testing.

## Advanced Concepts

### Concept 1: Complex GObject Subclassing
Creating GObject subclasses in Rust (gtk-rs) or C: define properties with ParamSpec, implement interfaces, override virtual methods, use signals for communication. In Rust: ObjectSubclass derive macro with RefCell interior mutability.

### Concept 2: GStreamer Integration
Embed video/audio playback in GNOME apps: Gtk4PaintableSink for GTK4 integration, playbin for simple playback, custom pipelines for advanced processing. Use GStreamer editing services for timeline-based media.

### Concept 3: Flatpak Packaging
Flatpak manifest: app-id, runtime (org.gnome.Platform), SDK (org.gnome.Sdk), modules (application + dependencies), finish-args (filesystem, network, device permissions), and cleanup commands. Use Flathub for distribution.

### Concept 4: Performance Profiling
Sysprof for CPU profiling, GTK Inspector for widget tree and rendering, GLib main loop analysis, memory profiling with Valgrind. Profile on actual target hardware (can vary significantly from development machine).

### Concept 5: Shell Extension Testing
GJS (GNOME JavaScript) extensions: test with looking glass (Meta -> LG), automated testing with gnome-shell extension tool, mutter-perf for compositing performance, and EWMH/NetWM compliance testing.

## Advanced Techniques

### Custom GtkListView Factory
```rust
factory.connect_setup(|_, item| {
    let label = gtk::Label::new(None);
    item.set_child(Some(&label));
});
factory.connect_bind(|_, item| {
    let label = item.child().unwrap().downcast::<gtk::Label>().unwrap();
    label.set_text(&item.item().unwrap().downcast::<MyItem>().unwrap().name());
});
```

### GResource for Bundled Assets
Embed UI files, CSS, icons, and data into the binary. Resource path: /com/example/app/ui/main.ui. Access with resource:///com/example/app/... Works offline, no file system dependencies.

## Anti-Patterns

- Heavy GObject subclassing when simple closures suffice
- Synchronous GStreamer pipeline handling (blocks main loop)
- Flatpak with overly broad permissions (//––filesystem=home)
- Shell extensions that don't handle disable/enable cycles
- GtkTreeView in GTK4 projects
- Custom widget rendering without measuring performance
- Ignoring Adwaita theme compliance
- No i18n for shell extension strings
