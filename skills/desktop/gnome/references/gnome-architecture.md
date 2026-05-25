# GNOME Architecture Reference

## GNOME Shell

```
GNOME Shell Architecture:
┌───────────────────────────────────────┐
│  Mutter (Wayland compositor + X11)    │
│  ┌─────────────────────────────────┐  │
│  │  GNOME Shell (JS + Clutter)     │  │
│  │  ├── Top Bar                     │  │
│  │  ├── Activities Overview         │  │
│  │  ├── Window Manager (tiling)     │  │
│  │  ├── Notification Center         │  │
│  │  └── Extensions (GJS)           │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Applications (GTK4/libadwaita) │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

- **GNOME Shell**: compositing window manager implemented in JavaScript (GJS)
- **Mutter**: low-level compositor handling display, input, window management
- Extensions extend Shell via GJS, accessing Clutter, Meta, St APIs

## Mutter

Mutter handles:
- Wayland protocol implementation
- X11 window management (XWayland)
- Display configuration (monitor layout, scale)
- Input event routing (keyboard, mouse, touch)
- Hardware acceleration via OpenGL/EGL
- Screen casting and remote desktop (PipeWire)

```bash
# Mutter debug flags
MUTTER_DEBUG=1
MUTTER_DEBUG_ATOM=1
CLUTTER_SHOW_FPS=1
```

## GSettings

```xml
<!-- com.example.myapp.gschema.xml -->
<schemalist>
  <schema id="com.example.myapp" path="/com/example/myapp/">
    <key name="theme" type="s">
      <default>'system'</default>
      <summary>Color theme</summary>
      <description>System, light, or dark theme</description>
    </key>
    <key name="window-width" type="i">
      <default>800</default>
      <range min="400" max="3840"/>
    </key>
  </schema>
</schemalist>
```

```python
from gi.repository import Gio
settings = Gio.Settings(schema_id='com.example.myapp')
theme = settings.get_string('theme')
settings.set_int('window-width', 1024)
settings.connect('changed::theme', on_theme_changed)
```

## D-Bus

```python
# System bus (hardware, network, system services)
system_bus = Gio.bus_get_sync(Gio.BusType.SYSTEM, None)

# Session bus (desktop services)
session_bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)

# Call a D-Bus method
proxy = Gio.DBusProxy.new_sync(
    session_bus,
    Gio.DBusProxyFlags.NONE,
    None,
    'org.freedesktop.Notifications',
    '/org/freedesktop/Notifications',
    'org.freedesktop.Notifications',
    None)
proxy.call_sync('Notify', GLib.Variant('(susssasa{sv}i)',
    ('My App', 0, '', 'Title', 'Body', [], {}, 5000)), 0, 500, None)

# Own a name
Gio.bus_own_name(
    Gio.BusType.SESSION,
    'com.example.MyApp',
    Gio.BusNameOwnerFlags.NONE,
    on_bus_acquired,
    on_name_acquired,
    on_name_lost)
```

## Portals

```python
# File chooser portal
from gi.repository import Xdp
portal = Xdp.Portal()
result = portal.request_background_access(
    None, 'Run in background', None)
# Returns: 0 = granted, 1 = denied, 2 = cancelled

# Other portals:
# - org.freedesktop.portal.FileChooser (file dialogs)
# - org.freedesktop.portal.OpenURI (open URLs)
# - org.freedesktop.portal.Screenshot (screen capture)
# - org.freedesktop.portal.NetworkMonitor (network status)
# - org.freedesktop.portal.Notification (desktop notifications)
# - org.freedesktop.portal.Background (background execution)

# Portal provides sandboxed applications access to host resources
# Flatpak apps MUST use portals — direct API access is restricted
```

## GNOME Circle

GNOME Circle is the curated app ecosystem:
- Apps must meet quality: HIG compliance, libadwaita, Flatpak
- Listed on apps.gnome.org
- Categories: Productivity, Creativity, Education, Games, Utility
- CI with Flatpak builds, Flathub publishing
- Regular reviews for code quality and design

## HIG Guidelines

Key HIG rules:
- Adw.Clamp content width for readability (680px default)
- Adw.HeaderBar for window title/controls
- Adw.NavigationView for page-based navigation
- Adw.Toast for transient notifications
- Adw.StatusPage for empty states
- Adw.PreferencesGroup for settings layout
- Split header style: window title on left, controls on right
- Follow system font, spacing, and accent color
- Dark mode support via color-scheme CSS
- Keyboard navigation with Ctrl+ shortcuts
- Drag-and-drop support via GtkDragSource/GtkDropTarget
