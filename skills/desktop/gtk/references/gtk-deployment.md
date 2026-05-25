# GTK Deployment Reference

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
  - --filesystem=home
  - --talk-name=org.freedesktop.Notifications
  - --talk-name=org.gtk.vfs

modules:
  - name: myapp
    buildsystem: meson
    sources:
      - type: dir
        path: .
```

```bash
# Build Flatpak
flatpak-builder --force-clean build-dir build-aux/com.example.myapp.yml
flatpak-builder --run build-dir myapp

# Export to local repo
flatpak build-export repo build-dir

# Install locally
flatpak --user install repo com.example.myapp

# Create bundle
flatpak build-bundle repo myapp.flatpak com.example.myapp
```

## Snap

```yaml
# snapcraft.yaml
name: myapp
version: '1.0'
summary: My GTK Application
description: |
  Full description of my application.

confinement: strict
base: core22
grade: stable

apps:
  myapp:
    command: bin/myapp
    extensions: [gnome]
    plugs:
      - home
      - network
      - removable-media

parts:
  myapp:
    plugin: meson
    source: .
    build-packages:
      - libgtk-4-dev
      - libadwaita-1-dev
    stage-packages:
      - libgtk-4-1
      - libadwaita-1-0
```

```bash
# Build Snap
snapcraft
snap install myapp_1.0_amd64.snap --dangerous
snapcraft upload myapp_1.0_amd64.snap
```

## AppImage

```bash
# Build with linuxdeploy
wget -c "https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage"
chmod +x linuxdeploy-x86_64.AppImage

# Prepare AppDir
mkdir -p AppDir/usr/bin
cp build/myapp AppDir/usr/bin/
cp -r share AppDir/usr/share/

# Run linuxdeploy
./linuxdeploy-x86_64.AppImage --appdir AppDir \
  --plugin gtk \
  --output appimage
```

## Cross-Compilation

```bash
# Cross-compile for Windows from Linux
meson setup build-win --cross-file cross-windows.conf
ninja -C build-win

# cross-windows.conf
[host_machine]
system = 'windows'
cpu_family = 'x86_64'
cpu = 'x86_64'
endian = 'little'

[binaries]
c = 'x86_64-w64-mingw32-gcc'
cpp = 'x86_64-w64-mingw32-g++'
pkgconfig = 'x86_64-w64-mingw32-pkg-config'
```

## Theming

```python
# Detect system theme
settings = Gtk.Settings.get_default()
current_theme = settings.get_property('gtk-theme-name')

# Force Adwaita
settings.set_property('gtk-theme-name', 'Adwaita')

# Dark mode preference
import subprocess
result = subprocess.run(
    ['gsettings', 'get', 'org.gnome.desktop.interface', 'color-scheme'],
    capture_output=True, text=True)
is_dark = 'prefer-dark' in result.stdout
```

## Accessibility

```python
# Enable a11y features
Gtk.Settings.get_default().set_property(
    'gtk-enable-animations', False)  # Reduce motion

# Add a11y descriptions
button = Gtk.Button(label='Save')
button.set_tooltip_text('Save current document')
button.set_accessible_label('Save')
button.set_accessible_description('Saves the currently open file')

# Focus management
widget.grab_focus()
widget.set_can_focus(True)

# Keyboard navigation
entry.set_activates_default(True)
```

## Distribution Checklist

- Flatpak manifest with correct runtime version
- Snapcraft.yaml for Snap Store distribution
- AppImage build script for portable Linux binary
- All 3 formats tested on target distros
- Icon in hicolor theme directory
- Desktop file with correct categories and MIME types
- D-Bus service file if using D-Bus activation
- AppStream metadata for software centers
- Accessibility support enabled
- GTK_THEME detection for cross-app theming
- Wayland and X11 socket access
- Minimum GLib/GTK version documented
