# libadwaita Guide Reference

## Widget Hierarchy

```
Adw.Application
└── Adw.ApplicationWindow
    └── Adw.NavigationView
        └── Adw.NavigationPage
            └── Adw.ToolbarView
                ├── Adw.HeaderBar (top bar)
                ├── Adw.ToolbarView (bottom bar, optional)
                └── Content (Adw.Clamp, Gtk.Box, etc.)
```

## Adw.ApplicationWindow

```python
from gi.repository import Adw, Gtk

win = Adw.ApplicationWindow(application=app)
win.set_default_size(900, 700)
win.set_title('My App')

# Set content
nav = Adw.NavigationView()
win.set_content(nav)
```

## Adw.NavigationView (Page Stack)

```python
# Push pages
nav.push(Adw.NavigationPage(
    child=main_content,
    title='Home'
))

# Push with custom tag for routing
nav.push_with_tag(Adw.NavigationPage(
    child=detail_page,
    title='Detail'
), tag='detail')

# Pop back
nav.pop()
nav.pop_to_tag('home')

# Navigation signals
nav.connect('pushed', on_page_pushed)
nav.connect('popped', on_page_popped)
```

## Adw.ToolbarView and Adw.HeaderBar

```python
# Page with toolbar
toolbar_view = Adw.ToolbarView()

# Top header bar
header = Adw.HeaderBar()
header.set_title_widget(Adw.WindowTitle(title='My App', subtitle='Subtitle'))

# Add buttons to header
menu_btn = Gtk.MenuButton(icon_name='open-menu-symbolic')
header.pack_end(menu_btn)

back_btn = Gtk.Button(icon_name='go-previous-symbolic')
header.pack_start(back_btn)

toolbar_view.add_top_bar(header)

# Bottom bar (optional)
bottom_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
toolbar_view.add_bottom_bar(bottom_bar)

# Content in middle
toolbar_view.set_content(content_widget)

# Add to navigation page
nav.push(Adw.NavigationPage(child=toolbar_view, title='Page'))
```

## Adw.Clamp (Responsive Width)

```python
# Constrains content to max width for readability
clamp = Adw.Clamp(maximum_size=680, tightening_threshold=480)
clamp.set_child(content_box)

# Use in toolbar view
toolbar_view.set_content(clamp)
```

## Adw.PreferencesPage

```python
page = Adw.PreferencesPage()
group = Adw.PreferencesGroup(
    title='General',
    description='Application settings'
)
page.add(group)

# Entry row
entry = Adw.EntryRow(title='Display Name')
entry.set_text('Default')
entry.connect('changed', on_name_changed)
group.add(entry)

# Action row with switch
action = Adw.ActionRow(
    title='Dark Mode',
    subtitle='Use dark color scheme'
)
switch = Gtk.Switch()
switch.set_valign(Gtk.Align.CENTER)
action.add_suffix(switch)
action.set_activatable_widget(switch)
group.add(action)

# Combo row
combo = Adw.ComboRow(
    title='Language',
    subtitle='Select display language',
    model=Gtk.StringList.new(['English', 'German', 'French'])
)
combo.set_selected(0)
group.add(combo)

# Spin row
spin = Adw.SpinRow(
    title='Auto-save interval',
    subtitle='Minutes between saves',
    adjustment=Gtk.Adjustment(
        value=5, lower=1, upper=60, step_increment=1
    )
)
group.add(spin)

# Switch row
switch_row = Adw.SwitchRow(
    title='Notifications',
    subtitle='Show desktop notifications'
)
group.add(switch_row)

# Expander row
expander = Adw.ExpanderRow(title='Advanced')
expander.add_row(Adw.ActionRow(title='Option 1', subtitle='Advanced option'))
expander.add_row(Adw.ActionRow(title='Option 2'))
group.add(expander)
```

## Adw.ToastOverlay

```python
toast_overlay = Adw.ToastOverlay()
toast_overlay.set_child(content)

# Show toast
toast = Adw.Toast(title='Item saved')
toast.set_button_label('Undo')
toast.connect('button-clicked', on_undo)
toast_overlay.add_toast(toast)

// With timeout
toast = Adw.Toast(title='Action completed')
toast.set_timeout(3)  # seconds
```

## Adw.Breakpoint (Adaptive Layout)

```python
from gi.repository import Adw, Gtk

win = Adw.ApplicationWindow()
box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)

# Vertical layout for narrow width
bp = Adw.Breakpoint(
    condition=Adw.BreakpointCondition.parse('max-width: 600px')
)
bp.add_setter(box, 'orientation', Gtk.Orientation.VERTICAL)
win.add_breakpoint(bp)
```

## Adw.StatusPage

```python
status = Adw.StatusPage()
status.set_title('No Items')
status.set_description('Add your first item to get started')
status.set_icon_name('folder-symbolic')

# Action button
btn = Gtk.Button(label='Add Item')
btn.set_halign(Gtk.Align.CENTER)
status.set_child(btn)

toolbar_view.set_content(status)
```

## Adw.Carousel

```python
carousel = Adw.Carousel()
carousel.set_allow_scroll_wheel(True)
carousel.set_allow_long_swipe(True)

for i in range(5):
    label = Gtk.Label(label=f'Page {i + 1}')
    label.set_size_request(300, 200)
    carousel.append(label)

# Dot indicators
dots = Adw.CarouselIndicatorDots()
dots.set_carousel(carousel)

# Or line indicators
lines = Adw.CarouselIndicatorLines()
lines.set_carousel(carousel)
```

## Adw.Banner

```python
banner = Adw.Banner(title='Your trial expires in 3 days')
banner.set_button_label('Upgrade')
banner.connect('button-clicked', on_upgrade)
banner.set_revealed(True)

# Reveal/hide
banner.set_revealed(False)
```

## Color Scheme

```python
# Set dark mode
Adw.StyleManager.get_default().set_color_scheme(
    Adw.ColorScheme.FORCE_DARK
)

# Options: DEFAULT, PREFER_LIGHT, PREFER_DARK, FORCE_LIGHT, FORCE_DARK

# Listen for changes
manager = Adw.StyleManager.get_default()
manager.connect('notify::color-scheme', on_scheme_changed)
```

## GNOME HIG Key Values

| Property | Value | Notes |
|----------|-------|-------|
| Window default margin | 12px | Gtk.Box margin |
| Group spacing | 24px | Between preference groups |
| Row spacing | 16px | Between action rows |
| Icon size (menu) | 16px | -symbolic icons |
| Icon size (button) | 16px | -symbolic icons |
| Max content width | 680px | Adw.Clamp maximum_size |
| Border radius | 12px | Adw style widgets |
| Button min height | 36px | Touch-target comfortable |
| Font | Cantarell | Default GNOME font |
