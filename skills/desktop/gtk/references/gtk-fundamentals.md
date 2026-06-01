# GTK Fundamentals

## Overview
GTK is a cross-platform widget toolkit for Linux, Windows, and macOS. GTK4 provides GPU-accelerated rendering, event controllers, modern list widgets, and CSS-based styling. This reference covers fundamental GTK concepts.

## Core Concepts

### Concept 1: Widget Hierarchy
GTK uses a tree of GtkWidget subclasses. Containers (GtkBox, GtkGrid, GtkStack) hold child widgets. Leaf widgets (GtkButton, GtkLabel, GtkEntry) display content or accept input. Each widget has a parent container; the root is a GtkWindow.

### Concept 2: Signal-Based Event Handling
GTK3 uses direct signal connections (clicked, key-press-event). GTK4 uses event controllers (GtkEventControllerKey, GtkGestureClick) that are added to widgets. Event controllers can be shared, removed, and stacked, providing more flexible event handling.

### Concept 3: CSS Styling
GTK uses CSS for visual styling. Widgets have style classes, contexts, and states. Theme variables (@theme_bg_color, @accent_bg_color) adapt to system theme. Custom stylesheets are loaded via GtkCssProvider.

### Concept 4: Model-View with Lists
GTK4 uses GtkListView, GtkColumnView, GtkGridView with GListModel (typically Gio.ListStore) and GtkSignalListItemFactory. This replaces the complex GtkTreeView from GTK3. Models provide data, factories create and bind list item widgets.

### Concept 5: GtkApplication
GtkApplication manages app lifecycle, actions, menus, and window management. Use application_id, connect to activate signal. GMenuModel defines menus. GSimpleAction and GActionMap handle user-initiated actions with keyboard shortcuts.

## Best Practices

- GTK4 for new projects (GPU rendering, modern APIs)
- GtkBuilder XML for UI layout (separates structure from code)
- CSS for styling (theme support, maintainable)
- GAction for user actions (keyboard shortcuts, disabled state)
- GResource for embedded assets (single binary)
- GtkListView over GtkTreeView (simpler, faster)
- Event controllers over direct signals (GTK4)
- Test with both light and dark themes

## Anti-Patterns

- GTK3 patterns in GTK4 (old signals, GtkTreeView)
- Main loop blocking with synchronous I/O
- CSS class name conflicts (too generic)
- Missing contrast in themes (not testing HighContrast)
- Direct X11 usage (broken on Wayland)
- Memory leaks from signal closures (weak references)
- Deep widget nesting (performance impact)
- Hardcoded dimensions without CSS
