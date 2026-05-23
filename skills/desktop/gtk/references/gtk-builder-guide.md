# GTK Builder Guide Reference

## GtkBuilder UI File Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <requires lib="gtk" version="4.0"/>

  <!-- Define a template widget class -->
  <template class="MyAppWindow" parent="GtkApplicationWindow">
    <property name="title">My Application</property>
    <property name="default-width">800</property>
    <property name="default-height">600</property>

    <child>
      <object class="GtkBox" id="main_box">
        <property name="orientation">vertical</property>
        <property name="spacing">12</property>
        <property name="margin-top">12</property>
        <property name="margin-bottom">12</property>
        <property name="margin-start">12</property>
        <property name="margin-end">12</property>

        <child>
          <object class="GtkHeaderBar" id="header">
            <property name="show-title-buttons">true</property>
            <child type="title">
              <object class="GtkLabel">
                <property name="label">My App</property>
              </object>
            </child>
            <child type="end">
              <object class="GtkMenuButton" id="menu_btn">
                <property name="icon-name">open-menu-symbolic</property>
              </object>
            </child>
          </object>
        </child>

        <child>
          <object class="GtkPaned" id="paned">
            <property name="wide-handle">true</property>
            <property name="position">250</property>

            <!-- Sidebar -->
            <child>
              <object class="GtkScrolledWindow">
                <child>
                  <object class="GtkListView" id="item_list"/>
                </child>
              </object>
            </child>

            <!-- Content -->
            <child>
              <object class="GtkScrolledWindow">
                <child>
                  <object class="GtkStack" id="content_stack">
                    <child>
                      <object class="GtkLabel">
                        <property name="label">Select an item</property>
                      </object>
                    </child>
                  </object>
                </child>
              </object>
            </child>
          </object>
        </child>
      </object>
    </child>
  </template>
</interface>
```

## Loading GtkBuilder UI

```python
import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk

# Load from file
builder = Gtk.Builder()
builder.add_from_file('ui/window.ui')

# Get objects
window = builder.get_object('MyAppWindow')
header = builder.get_object('header')
item_list = builder.get_object('item_list')

# Connect signals declared in UI
builder.connect_signals(MyAppHandler())

window.present()
```

## Signal Declarations in UI

```xml
<object class="GtkButton" id="submit_btn">
  <property name="label">Submit</property>
  <property name="halign">center</property>
  <signal name="clicked" handler="on_submit_clicked"
          object="MyAppWindow" after="yes"/>
</object>
```

```python
class MyAppHandler:
    def on_submit_clicked(self, button, user_data):
        print("Submit clicked!")
```

## Blueprint Language (Modern Alternative to XML)

```blueprint
// window.blp — Blueprint file, compiles to .ui
using Gtk 4.0;
using Adw 1;

template $MyAppWindow: Adw.ApplicationWindow {
  default-width: 800;
  default-height: 600;
  title: "My App";

  Box {
    orientation: vertical;
    spacing: 12;

    Adw.HeaderBar { }

    ListView items {
      model: Bind.items_model;
    }
  }
}
```

```bash
# Compile Blueprint to .ui
blueprint-compiler compile window.blp > window.ui
# Watch for changes
blueprint-compiler compile --watch window.blp > window.ui
```

## Common Widgets Reference

| Widget | XML Tag | Purpose |
|--------|---------|---------|
| Button | `<object class="GtkButton">` | Clickable action button |
| Label | `<object class="GtkLabel">` | Text display |
| Entry | `<object class="GtkEntry">` | Single-line text input |
| TextView | `<object class="GtkTextView">` | Multi-line text editing |
| Image | `<object class="GtkImage">` | Display icon/image |
| Spinner | `<object class="GtkSpinner">` | Loading indicator |
| ProgressBar | `<object class="GtkProgressBar">` | Progress display |
| Switch | `<object class="GtkSwitch">` | On/off toggle |
| CheckButton | `<object class="GtkCheckButton">` | Checkbox |
| DropDown | `<object class="GtkDropDown">` | Selection dropdown |
| ListView | `<object class="GtkListView">` | Scrolling list of items |
| GridView | `<object class="GtkGridView">` | Grid of items |
| ScrolledWindow | `<object class="GtkScrolledWindow">` | Scrollable container |

## GtkStringList + GtkListView Pattern

```python
from gi.repository import Gtk, GObject, GLib

# Create data model
items = Gtk.StringList.new(["Apple", "Banana", "Cherry"])

# Create list view
list_view = Gtk.ListView.new(
    Gtk.NoSelection.new(Gtk.SingleSelection.new(items)),
    Gtk.SignalListItemFactory()
)

# Connect factory signals
factory = list_view.get_factory()

def on_setup(factory, list_item):
    label = Gtk.Label()
    list_item.set_child(label)

def on_bind(factory, list_item):
    item = list_item.get_item()
    list_item.get_child().set_label(item.string)

factory.connect("setup", on_setup)
factory.connect("bind", on_bind)
```

## Responsive Layout with GtkStack

```python
stack = GtkStack()

# Wide mode: sidebar + content
wide_box = GtkBox(orientation=Gtk.Orientation.HORIZONTAL)
wide_box.append(sidebar)
wide_box.append(content)
stack.add_named(wide_box, "wide")

# Narrow mode: stack of pages
narrow_box = GtkBox(orientation=Gtk.Orientation.VERTICAL)
narrow_box.append(nav_bar)
narrow_box.append(content_stack)
stack.add_named(narrow_box, "narrow")

# Switch based on width
def on_size_allocate(window, width, height):
    if width >= 800:
        stack.set_visible_child_name("wide")
    else:
        stack.set_visible_child_name("narrow")
```

## Adw Preferences Window

```xml
<object class="AdwPreferencesWindow">
  <child>
    <object class="AdwPreferencesPage">
      <child>
        <object class="AdwPreferencesGroup">
          <property name="title">General</property>
          <child>
            <object class="AdwActionRow">
              <property name="title">Dark Mode</property>
              <property name="subtitle">Use dark color scheme</property>
              <child>
                <object class="GtkSwitch" id="dark_mode_switch"/>
              </child>
            </object>
          </child>
        </object>
      </child>
    </object>
  </child>
</object>
```

## Custom CSS Classes in UI

```xml
<object class="GtkButton">
  <property name="label">Primary Action</property>
  <!-- Apply CSS class name -->
  <layout>
    <property name="css-classes">suggested-action</property>
  </layout>
</object>
```

```css
/* app.css */
.suggested-action {
  background-color: #3584e4;
  color: white;
}

.destructive-action {
  background-color: #e05151;
  color: white;
}
```
