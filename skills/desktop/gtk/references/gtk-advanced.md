# GTK Advanced Topics

## Overview
Advanced GTK covers complex custom widgets with CSS styling, GSK (GTK Scene Kit) rendering, GLib main loop integration, GResource bundling, multi-threading, and accessibility integration.

## Advanced Concepts

### Concept 1: Custom Widget Development
Extend GtkWidget to create custom controls: override measure() and size_allocated() for layout, snapshot() for rendering, contains() for hit testing, and get_request_mode() for sizing. Use GtkBuildable for XML template support.

### Concept 2: GSK Rendering (GTK4)
GTK4 uses GSK (GTK Scene Kit) for GPU-accelerated rendering. Render nodes (GskRenderNode) define the scene graph: GskCairoNode, GskColorNode, GskTextureNode, GskTransformNode. Custom rendering creates a render node tree. GtkSnapshot API provides high-level rendering.

### Concept 3: GLib Main Loop Integration
Thread-safe main loop tasks: g_idle_add (run on main loop when idle), g_timeout_add (run periodically), GTask (async operation with callback), and GSource (custom event sources). Use GMainContext.push_thread_default() for thread-local main loop context.

### Concept 4: Multi-Threading
GThreadPool for parallel task execution, GTask for async operations with callbacks, GMutex/GCond for synchronization, GQueue for thread-safe work queues. Never call GTK functions from non-main threads — use g_idle_add to dispatch.

### Concept 5: AT-SPI Accessibility
AT-SPI (Assistive Technology Service Provider Interface) provides accessibility. GTK4 integrates AT-SPI directly. Set accessible-name and accessible-description on all widgets. Implement custom accessible interfaces for complex widgets. Test with Orca screen reader.

## Advanced Techniques

### Custom Snapshot Rendering
```rust
// GTK4 custom snapshot
impl WidgetImpl for MyWidget {
    fn snapshot(&self, snapshot: &gtk::Snapshot) {
        // Draw a rounded rectangle
        let rect = graphene::Rect::new(0.0, 0.0, 100.0, 100.0);
        let color = gdk::RGBA::new(0.2, 0.4, 0.8, 1.0);
        snapshot.append_color(&color, &rect);
    }
}
```

### GLib Async Operations
```rust
// GIO async operation
let file = gio::File::for_path(path);
file.read_async(gio::Cancellable::NONE, |result| {
    let stream = result.unwrap();
    // Handle data
});
```

## Anti-Patterns

- GtkWidget.present() for custom rendering (use snapshot)
- GTK functions called from background threads
- Synchronous file I/O on main thread
- No accessible-name on custom widgets
- Using GtkTreeView in GTK4
- Manual memory management without GObject references
- Deep widget hierarchies (rendering performance)
- Not testing with HighContrast theme
