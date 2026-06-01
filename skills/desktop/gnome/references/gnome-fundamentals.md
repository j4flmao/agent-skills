# GNOME Fundamentals

## Overview
GNOME applications use the GNOME platform stack: GLib (core), GTK (widgets), libadwaita (modern widgets), and GNOME Shell (extension API). This reference covers fundamental GNOME development concepts.

## Core Concepts

### Concept 1: GObject System
GLib's object system provides: properties (get/set with notifications), signals (event emission), inheritance, interfaces, and reference counting. All GTK and GNOME widgets are GObjects. In Rust (gtk-rs), GObject subclassing uses derive macros.

### Concept 2: GApplication Pattern
GApplication (and its subclasses GtkApplication, AdwApplication) manages application lifecycle: startup, activate (create windows), open (handle files), shutdown. Use application_id in reverse domain notation. The builder pattern configures resources and actions.

### Concept 3: libadwaita Widgets
AdwApplicationWindow, AdwNavigationView (stack navigation), AdwBreakpointBin (adaptive layout), AdwHeaderBar (title bar with window controls), AdwToolbarView (header + content + bottom bar), AdwToast (notifications). libadwaita replaces direct GTK for most apps.

### Concept 4: GSettings
Type-safe application settings backed by a keyfile or dconf. Schema defined in XML with key name, type, default value, and range. Changes emit signals. Use GSettings for all user preferences. Compile schemas with glib-compile-schemas.

### Concept 5: Adaptive Layout
AdwBreakpointBin switches between layouts at defined width breakpoints. Use AdwBreakpointCondition (MinWidth, MaxWidth) to define layouts for wide (sidebar + content) and narrow (stacked) modes. Test at multiple window sizes.

## Best Practices

- Use libadwaita, not pure GTK (GNOME HIG compliance)
- Flatpak for distribution (sandboxed, runtime-managed)
- GSettings for preferences (not custom config files)
- GResource for bundled assets (compiled into binary)
- GIO async for file I/O (non-blocking)
- GObject signals for event-based communication
- Gettext for internationalization (i18n for all strings)
- Test on both Wayland and X11

## Anti-Patterns

- Direct GtkWindow (missing CSD, header bar)
- No adaptive layout (app breaks at different sizes)
- Blocking main loop with synchronous I/O
- Missing GSchema XML (settings don't persist)
- Hardcoded strings (no gettext)
- Overly broad Flatpak permissions
- Custom config parsing (use GSettings)
- Ignoring GNOME HIG
