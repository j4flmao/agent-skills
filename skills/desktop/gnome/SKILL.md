---
name: desktop-gnome
description: >
  Use when the user asks about GNOME desktop development, GNOME Shell extensions, GTK under GNOME, GNOME Builder, or GNOME platform libraries (GLib, GIO, GSettings, GNOME Settings). Do NOT use for: GTK itself (desktop-gtk), or KDE (desktop-kde).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, gnome, linux, gtk]
---

# GNOME

## Purpose
Build applications and extensions for the GNOME desktop environment using GNOME platform libraries — GLib, GIO, GSettings, libadwaita, and GNOME Shell extensions. GNOME emphasizes simplicity, accessibility, and adherence to the GNOME Human Interface Guidelines (HIG).

## Agent Protocol

### Trigger
Exact user phrases: "GNOME app", "GNOME Shell extension", "libadwaita", "GSettings", "GIO", "GNOME Builder", "GNOME HIG", "GNOME Circle", "GNOME platform", "adwaita", "GNOME design".

### Input Context
- App type (application, shell extension, background service)
- Language (C, Vala, Rust via gtk-rs, Python via PyGObject)
- GNOME version target (44+, 46+, 48+)
- Target distribution (Flatpak, distro packages, GNOME Circle)
- libadwaita usage (pure GTK vs libadwaita widgets)
- Design language requirements (Adwaita, custom styling)

### Output Artifact
GNOME application architecture with widget hierarchy, data flow, settings storage, and Flatpak distribution.

### Completion Criteria
- [ ] App architecture defined (GApplication, GtkApplication, AdwApplication)
- [ ] Widget hierarchy designed (AdwNavigationView, AdwBreakpointBin, AdwToolbarView)
- [ ] Data model defined (GObject properties, signals, GIO async operations)
- [ ] Settings and state management (GSettings for preferences, state for runtime)
- [ ] Localization strategy (gettext .po files, .pot generation)
- [ ] Flatpak manifest created (with required permissions, runtime, SDK)
- [ ] GNOME HIG compliance reviewed (header bar, sidebar, dialogs, about)
- [ ] Accessibility integrated (AT-SPI, keyboard navigation, focus)
- [ ] Adaptive design (AdwBreakpoint, responsive layouts)
- [ ] Dark mode and style support (Adwaita theme, libadwaita styles)

### Max Response Length
250 lines.

## Framework/Methodology

### GNOME App Decision Tree
```
What type of GNOME project?
├── Standard GTK application → GtkApplication + libadwaita
│   → AdwApplication, AdwWindow, AdwNavigationView
│   → GSettings for preferences, .gresource for assets
├── GNOME Shell extension → GJS (JavaScript) + GNOME Shell APIs
│   → Extension class, ExtensionState, PanelMenu.Button
│   → GObject-based, prefs.ui for settings
├── Background service → GApplication without GUI
│   → GApplication with flags: IS_SERVICE
│   → D-Bus interface for IPC
└── GNOME Builder plugin → GObject + template
    → IdePlugin, IdeObject, GObject signals + properties
```

### GNOME Platform Stack
```
Application (libadwaita widgets)
    ↕
libadwaita (AdwApplication, AdwWindow, AdwNavigationView)
    ↕
GTK4 (widgets, CSS styling, rendering)
    ↕
GDK (windowing system, Wayland/X11 abstraction)
    ↕
GLib (main loop, GObject system, GIO async I/O, GSettings)
    ↕
Linux Kernel (Wayland, udev, systemd)
```

## Workflow

### Step 1: Set Up GApplication + libadwaita

```rust
// Rust with gtk4-rs and libadwaita-rs
use adw::prelude::*;
use gtk::prelude::*;

fn main() {
    glib::set_application_name("My App");

    let app = adw::Application::builder()
        .application_id("com.example.MyApp")
        .resource_base_path("/com/example/MyApp")
        .build();

    app.connect_activate(build_ui);
    app.run();
}

fn build_ui(app: &adw::Application) {
    // Create main window
    let window = adw::ApplicationWindow::new(app);
    window.set_default_size(800, 600);
    window.set_title(Some("My App"));

    // Build content with libadwaita widgets
    let main_content = create_main_content();
    window.set_content(Some(&main_content));
    window.present();
}
```

```python
# Python with PyGObject
import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw, GLib, Gio

class MyApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id='com.example.MyApp')
        self.connect('activate', self.on_activate)

    def on_activate(self, app):
        window = Adw.ApplicationWindow(application=app)
        window.set_default_size(800, 600)
        # ... build UI
        window.present()

app = MyApp()
app.run(None)
```

### Step 2: Build UI with libadwaita Widgets

```xml
<!-- UI file (myapp.ui) - libadwaita responsive layout -->
<interface>
  <template class="MyAppWindow" parent="AdwApplicationWindow">
    <property name="content">
      <object class="AdwToolbarView">
        <child type="top">
          <object class="AdwHeaderBar">
            <property name="title-widget">
              <object class="AdwWindowTitle"/>
            </property>
            <child type="end">
              <object class="GtkMenuButton">
                <property name="icon-name">open-menu-symbolic</property>
                <property name="menu-model">primary_menu</property>
              </object>
            </child>
          </object>
        </child>
        <child>
          <object class="AdwNavigationView">
            <!-- Pages managed programmatically -->
          </object>
        </child>
      </object>
    </property>
  </template>
</interface>
```

Key libadwaita Widgets:
- **AdwApplicationWindow**: Main window with CSD (client-side decorations)
- **AdwNavigationView**: Stack-based navigation with push/pop
- **AdwBreakpointBin**: Adaptive layout (responsive at breakpoints)
- **AdwToolbarView**: Header bar + content + bottom bar
- **AdwHeaderBar**: Title bar with window controls, navigation, menu
- **AdwSplitButton**: Split action button (main + dropdown)
- **AdwActionRow**: Settings row with title, subtitle, widget
- **AdwCarousel**: Swipeable carousel (mobile-friendly)
- **AdwToast**: Notification overlay (undo, confirmation)
- **AdwStatusPage**: Empty state / error page with illustration

### Step 3: Adaptive Layout with Breakpoints

```rust
// AdwBreakpointBin for responsive layouts
let breakpoint_bin = adw::BreakpointBin::new();

// Wide layout
let wide_bp = adw::Breakpoint::builder(800)
    .condition(adw::BreakpointCondition::new_width(
        adw::LengthUnit::Px,
        adw::BreakpointConditionType::Minimum,
    ))
    .build();

let wide_child = create_wide_layout();  // Sidebar + content
breakpoint_bin.add_child(&breakpoint_bin, &wide_child, glib::PRIORITY_DEFAULT);

// Narrow layout
let narrow_bp = adw::Breakpoint::builder(799)
    .condition(adw::BreakpointCondition::new_width(
        adw::LengthUnit::Px,
        adw::BreakpointConditionType::Maximum,
    ))
    .build();

let narrow_child = create_narrow_layout();  // Stacked
breakpoint_bin.add_child(&breakpoint_bin, &narrow_child, glib::PRIORITY_DEFAULT);
```

### Step 4: Data Model with GObject Properties

```rust
use glib::ObjectExt;
use glib::subclass::prelude::*;
use std::cell::RefCell;

// GObject subclass in Rust
mod imp {
    use super::*;

    pub struct MyModel {
        pub name: RefCell<String>,
        pub count: RefCell<u32>,
    }

    #[glib::object_subclass]
    impl ObjectSubclass for MyModel {
        const NAME: &'static str = "MyModel";
        type Type = super::MyModel;
        type ParentType = glib::Object;
    }

    impl ObjectImpl for MyModel {
        fn properties() -> &'static [glib::ParamSpec] {
            use once_cell::sync::Lazy;
            static PROPERTIES: Lazy<Vec<glib::ParamSpec>> = Lazy::new(|| {
                vec![
                    glib::ParamSpecString::builder("name").build(),
                    glib::ParamSpecUInt::builder("count")
                        .minimum(0).maximum(1000).default_value(0).build(),
                ]
            });
            PROPERTIES.as_ref()
        }

        fn set_property(&self, obj: &Self::Type, id: usize, value: &glib::Value, pspec: &glib::ParamSpec) {
            match pspec.name() {
                "name" => self.name.replace(value.get().unwrap()),
                "count" => self.count.replace(value.get().unwrap()),
                _ => unimplemented!(),
            }
        }

        fn get_property(&self, obj: &Self::Type, id: usize, pspec: &glib::ParamSpec) -> glib::Value {
            match pspec.name() {
                "name" => self.name.borrow().to_value(),
                "count" => self.count.borrow().to_value(),
                _ => unimplemented!(),
            }
        }
    }
}

glib::wrapper! {
    pub struct MyModel(ObjectSubclass<imp::MyModel>);
}
```

### Step 5: Settings with GSettings

```xml
<!-- gschema.xml -->
<schemalist>
  <schema id="com.example.MyApp" path="/com/example/MyApp/">
    <key name="window-width" type="i">
      <default>800</default>
      <summary>Window width</summary>
    </key>
    <key name="window-height" type="i">
      <default>600</default>
      <summary>Window height</summary>
    </key>
    <key name="theme" type="s">
      <default>'default'</default>
      <summary>UI theme preference</summary>
    </key>
    <key name="show-sidebar" type="b">
      <default>true</default>
      <summary>Show sidebar</summary>
    </key>
  </schema>
</schemalist>
```

```rust
// Access GSettings
let settings = glib::Settings::new("com.example.MyApp");
settings.connect_changed(Some("theme"), |settings, _key| {
    let theme = settings.string("theme");
    // Apply theme change
});
let width = settings.int("window-width");
```

### Step 6: Flatpak Distribution

```yaml
# myapp.yml - Flatpak manifest
app-id: com.example.MyApp
runtime: org.gnome.Platform
runtime-version: '47'
sdk: org.gnome.Sdk
command: myapp
finish-args:
  - --share=network
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri
  - --filesystem=home:ro
modules:
  - name: myapp
    buildsystem: meson
    sources:
      - type: dir
        path: .
```

### Step 7: GNOME Shell Extensions

```javascript
// extension.js - GNOME Shell extension
const { St, Shell, PanelMenu, Clutter } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

class MyExtension {
    constructor() {
        this._indicator = null;
    }

    enable() {
        log('Enabling MyExtension');

        // Create panel button
        this._indicator = new PanelMenu.Button(0.0, 'MyExtension', false);

        // Add icon
        const icon = new St.Icon({
            icon_name: 'my-extension-icon',
            style_class: 'system-status-icon'
        });
        this._indicator.add_child(icon);

        // Add to panel
        Main.panel.addToStatusArea('MyExtension', this._indicator, 1);
    }

    disable() {
        log('Disabling MyExtension');
        this._indicator?.destroy();
        this._indicator = null;
    }
}

function init() {
    return new MyExtension();
}
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Ignoring HIG | Custom widgets that break GNOME design patterns | Follow GNOME HIG, use libadwaita widgets |
| Direct GtkWindow | Missing CSD, header bar | Use AdwApplicationWindow with AdwHeaderBar |
| No adaptive layout | App works only at one window size | Use AdwBreakpointBin, test at mobile width |
| Blocking main loop | Synchronous I/O freezes UI | Use GIO async, async/await, or threads |
| Missing GSchema | Settings don't persist | Always define GSettings schema XML |
| Flatpak permissions too broad | --filesystem=home balloon | Minimal file system access, portals |
| Hardcoded strings | No gettext translation support | Use _() macro everywhere |
| Improper GObject memory | Reference cycles, leaks | Use weak references, bind properly |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Use libadwaita, not pure GTK | Following GNOME HIG, adaptive by default |
| Flatpak as primary distribution | Sandboxed, runtime-managed, automatic updates |
| GSettings for preferences | Native integration, no custom config parser |
| .gresource for bundling | Compiled into binary, no file-system dependencies at runtime |
| GObject signals for events | Standard GNOME pattern, integration with Builder |
| Async I/O with GIO | Non-blocking, cancellable, progress reporting |
| Test on Wayland and X11 | Both display servers are common on Linux |
| Enable accessibility by default | AT-SPI, screen readers, Orca |
| Minimize permissions | Better user trust, Flathub review requirements |
| Internationalize early | Adding _() later is tedious, .pot regeneration |

## Architecture Patterns

### NavigationView Stack
```rust
let nav = adw::NavigationView::new();
let page1 = adw::NavigationPage::new();
page1.set_title("Main");
let page2 = adw::NavigationPage::new();
page2.set_title("Detail");

nav.push(page1);
// Navigate:
nav.push(page2);    // Push detail
nav.pop();           // Back to main
```

### Toast Notifications
```rust
let toast = adw::Toast::new("Changes saved");
toast.set_timeout(3);
toast.set_button_label("Undo");
toast.connect_button_clicked(|toast| {
    // Handle undo
});
nav.add_toast(&toast);
```

### Status Page (Empty State)
```rust
let status_page = adw::StatusPage::new();
status_page.set_icon_name(Some("emblem-important-symbolic"));
status_page.set_title("No items yet");
status_page.set_description("Add your first item to get started");
```

## References
  - references/gnome-advanced.md — GNOME Advanced Topics
  - references/gnome-fundamentals.md — GNOME Fundamentals
  - references/gnome-hig.md — GNOME HIG Reference
  - references/gnome-shell-extension.md — GNOME Shell Extension Reference
## Handoff
Hand off to `desktop-gtk` for pure GTK details. Hand off to `desktop-kde` for KDE-specific integration patterns.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.

## Architecture Decision Trees

### GTK4 Widgets vs GTK3 Compatibility

| Decision | GTK4 (Native) | GTK3 (Fallback) |
|---|---|---|
| Widget API | GtkWidget, GtkListView | GtkWidget, GtkTreeView |
| CSS styling | Full CSS + transitions | Limited CSS |
| Performance | Improved rendering | Slower for complex UIs |
| Accessibility | Better AT-SPI2 support | Partial |
| Libadwaita | Required for GNOME 45+ | Not available |
| Best for | New GNOME apps | Legacy app maintenance |

### Libadwaita vs Plain GTK4

| Aspect | Libadwaita (libadwaita) | Plain GTK4 |
|---|---|---|
| HIG compliance | Automatic | Manual |
| Adaptive UI | Built-in breakpoints | Custom code needed |
| Dark mode | Auto-switch | Manual implementation |
| Animation | Built-in transitions | CSS animations |
| Dependency | Heavier | Lighter |