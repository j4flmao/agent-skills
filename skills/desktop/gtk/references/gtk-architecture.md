# GTK Architecture Reference

## Widget Tree

```
GtkApplicationWindow
  ├── HeaderBar (title, controls)
  ├── Box (vertical)
  │   ├── Stack (page content)
  │   └── ActionBar (contextual actions)
  └── Overlay (floating elements)
```

```python
# Building widget tree in code
import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk

def build_ui():
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
    box.set_margin_top(16)
    box.set_margin_bottom(16)
    box.set_margin_start(16)
    box.set_margin_end(16)

    label = Gtk.Label(label='Enter your name:')
    entry = Gtk.Entry()
    entry.set_placeholder_text('Name')
    button = Gtk.Button(label='Submit')
    button.add_css_class('suggested-action')

    box.append(label)
    box.append(entry)
    box.append(button)
    return box
```

## Signal System

```python
# Connect signals
button.connect('clicked', on_button_clicked)
entry.connect('activate', on_entry_activate)
window.connect('close-request', on_window_close)

# Custom signals via GObject
from gi.repository import GObject

class MyObject(GObject.GObject):
    __gsignals__ = {
        'data-loaded': (GObject.SignalFlags.RUN_FIRST, None, (str,)),
    }

    def load_data(self):
        result = perform_load()
        self.emit('data-loaded', result)

# Signal with user data
button.connect('clicked', on_click, user_data)

# Disconnect
button.disconnect(signal_id)
```

## CSS Styling

```python
# Apply CSS provider globally
css_provider = Gtk.CssProvider()
css_provider.load_from_path('style.css')

Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    css_provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
)

# Per-widget CSS
button.set_css_classes(['primary', 'rounded'])
entry.get_style_context().add_class('search-entry')
```

```css
/* style.css */
window {
  background-color: @theme_bg_color;
}

button.primary {
  background-color: #3584e4;
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: bold;
}

entry.search-entry {
  border-radius: 20px;
  padding: 8px 16px;
}
```

## GObject & GLib

```python
# GObject fundamentals
class MyWidget(Gtk.Box):
    __gtype_name__ = 'MyWidget'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Properties
        self._title = ''

    @GObject.Property
    def title(self):
        return self._title

    @title.setter
    def title(self, value):
        self._title = value
        self.queue_draw()

# GLib utilities
GLib.idle_add(deferred_function)       # Run on main loop idle
GLib.timeout_add(1000, periodic_fn)    # 1-second timer
GLib.get_user_data_dir()               # ~/.local/share
```

## Custom Widgets

```python
class ColorPicker(Gtk.Box):
    __gtype_name__ = 'ColorPicker'

    __gsignals__ = {
        'color-changed': (GObject.SignalFlags.RUN_FIRST, None,
                          (GObject.TYPE_STRING,)),
    }

    def __init__(self, **kwargs):
        super().__init__(orientation=Gtk.Orientation.HORIZONTAL, spacing=8, **kwargs)
        self._color = '#000000'

        self._preview = Gtk.DrawingArea()
        self._preview.set_size_request(32, 32)
        self._preview.set_draw_func(self._on_draw_preview)
        self.append(self._preview)

        self._entry = Gtk.Entry()
        self._entry.set_text(self._color)
        self._entry.connect('changed', self._on_entry_changed)
        self.append(self._entry)

    def _on_entry_changed(self, entry):
        self._color = entry.get_text()
        self._preview.queue_draw()
        self.emit('color-changed', self._color)

    def _on_draw_preview(self, area, cr, w, h):
        cr.set_source_rgb(0.5, 0.5, 0.5)  # Parse color
        cr.rectangle(0, 0, w, h)
        cr.fill()
```

## Layout Management

```python
# Box layout
vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
hbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)

# Grid layout
grid = Gtk.Grid()
grid.set_column_spacing(12)
grid.set_row_spacing(8)
grid.attach(label,      left=0, top=0, width=1, height=1)
grid.attach(entry,      left=1, top=0, width=2, height=1)
grid.attach(help_btn,   left=3, top=0, width=1, height=1)

# Stack + StackSwitcher (tab-like UI)
stack = Gtk.Stack()
stack.add_titled(page1, 'page1', 'General')
stack.add_titled(page2, 'page2', 'Advanced')

switcher = Gtk.StackSwitcher()
switcher.set_stack(stack)

# Paned (resizable split)
paned = Gtk.Paned(orientation=Gtk.Orientation.HORIZONTAL)
paned.set_start_child(sidebar)
paned.set_end_child(content)
paned.set_position(250)
```

## Key Architecture Rules

- GtkApplication for proper lifecycle (not standalone GtkWindow)
- Widget tree built top-down with boxes/grids for layout
- Signals connect after widget creation, never before
- All GTK calls on main thread only
- CSS for styling, not widget API calls for visuals
- GResource for bundling assets in production
- Custom widgets subclass Gtk.Widget or existing containers
- GLib.timeout_add for polling, GLib.idle_add for deferred work
- Thread safety: use GLib.idle_add to dispatch to main loop
