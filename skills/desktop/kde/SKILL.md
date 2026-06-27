---
name: desktop-kde
description: >
  Use when the user asks about KDE Plasma development, KDE Frameworks, KConfig, KXMLGUI, KIO, KService, Kirigami, or KDE Plasma applets. Do NOT use for: Qt (desktop-qt), or GNOME (desktop-gnome).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, kde, linux, qt]
---

# KDE

## Purpose
Build applications and Plasma extensions for the KDE desktop environment using KDE Frameworks — Kirigami (adaptive UI), KConfig (settings), KIO (network-transparent file access), KXMLGUI (menus/toolbars), and Plasma applet APIs.

## Agent Protocol

### Trigger
Exact user phrases: "KDE app", "KDE Plasma", "Kirigami", "KConfig", "KIO", "KXMLGUI", "Plasma applet", "KDE Frameworks", "KService", "KAboutData", "KStatusNotifierItem".

### Input Context
- App type (Kirigami adaptive app, traditional QtWidgets/KDE, Plasma applet)
- KDE Frameworks version (KF5 vs KF6 — KF6 for new projects)
- Qt version (Qt6 with KF6, Qt5 with KF5)
- Display backend (X11, Wayland, both)
- Target form factor (desktop, mobile, convergent)
- Distribution (Flatpak via KDE Flatpak runtime, distro packages, Snap)

### Output Artifact
KDE application architecture with Kirigami layout, data model with KConfig, and Plasma integration.

### Completion Criteria
- [ ] App type selected (Kirigami vs traditional QtWidgets)
- [ ] Application class derived (KirigamiApplication or KAboutData + QApplication)
- [ ] UI layout designed (Kirigami.Page, Action, OverlaySheet; or KXMLGUI)
- [ ] Settings architecture (KConfig XT for type-safe settings)
- [ ] Data model and storage (KIO for files, KConfig for preferences, Qt SQL for data)
- [ ] Plasma integration (KStatusNotifierItem, MPRIS, KRunner)
- [ ] Notifications and jobs (KNotification, KJob)
- [ ] Localization (KLocalizedString, ki18n)
- [ ] CMakeLists.txt with KDE Framework dependencies
- [ ] Flatpak manifest (org.kde.Platform runtime)

### Max Response Length
250 lines.

## Framework/Methodology

### KDE App Decision Tree
```
What type of KDE application?
├── Adaptive/Convergent (mobile + desktop) → Kirigami
│   → Kirigami.Application, Kirigami.Page, Kirigami.Card
│   → KConfig XT, KIO, KNotifications
├── Traditional desktop application → QtWidgets + KDE Frameworks
│   → KMainWindow, KXMLGUI, KConfig, KIO
│   → Full control over widget layout
├── Plasma applet (widget on desktop/panel) → Plasma Framework
│   → Plasma::Applet, Plasma::Containment
│   → QML-based UI with Plasma components
├── KRunner plugin → KRunner Framework
│   → KRunner::AbstractRunner
│   → Match results, actions, configuration
└── Background service → KDE Daemon pattern
    → KDEDModule, D-Bus interfaces
    → No UI, system-level integration
```

### KDE Framework Stack
```
Application
├── Kirigami (adaptive UI) | QtWidgets (traditional)
├── KConfig (settings) | KIO (file I/O) | KNotify (notifications)
├── KXMLGUI (menus) | KService (plugin system) | KAboutData (about dialog)
├── KWallet (secrets) | KStatusNotifierItem (system tray)
└── Qt6 (QtWidgets, QtQuick, QtCore)
    ↓
KDE Plasma (if applet: Plasma::Applet, Plasma::Containment)
```

## Workflow

### Step 1: Set Up Kirigami Application

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(MyApp VERSION 1.0.0 LANGUAGES CXX)

find_package(ECM REQUIRED NO_MODULE)
set(CMAKE_MODULE_PATH ${ECM_MODULE_PATH})

find_package(Qt6 REQUIRED COMPONENTS Quick QuickControls2 Widgets)
find_package(KF6 REQUIRED COMPONENTS Kirigami CoreAddons I18n ConfigWidgets Notifications)

add_executable(myapp
    src/main.cpp
    src/app.cpp
    src/Settings.qml
    resources.qrc
)

target_link_libraries(myapp PRIVATE
    Qt6::Quick Qt6::QuickControls2 Qt6::Widgets
    KF6::Kirigami KF6::CoreAddons KF6::I18n KF6::ConfigWidgets KF6::Notifications
)

install(TARGETS myapp DESTINATION ${KDE_INSTALL_TARGETS_DESTINATION})
```

```cpp
// src/main.cpp
#include <QApplication>
#include <KAboutData>
#include <KLocalizedString>
#include <KDBusService>
#include <QQmlApplicationEngine>
#include <QQuickStyle>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    KLocalizedString::setApplicationDomain("myapp");

    KAboutData aboutData(
        QStringLiteral("myapp"),
        i18n("My App"),
        QStringLiteral("1.0.0"),
        i18n("A KDE Kirigami Application"),
        KAboutLicense::GPL_V3,
        i18n("(c) 2026 Author")
    );
    aboutData.addAuthor(i18n("Author"), i18n("Developer"));
    KAboutData::setApplicationData(aboutData);

    QQuickStyle::setStyle(QStringLiteral("org.kde.desktop"));

    QQmlApplicationEngine engine;
    engine.loadFromModule("org.kde.myapp", "Main");

    KDBusService service(KDBusService::Unique);

    return app.exec();
}
```

### Step 2: Build Kirigami QML UI

```qml
// qml/Main.qml
import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

Kirigami.ApplicationWindow {
    id: root
    title: i18n("My App")
    width: 800
    height: 600

    // Global drawer (navigation sidebar)
    globalDrawer: Kirigami.GlobalDrawer {
        isCollapsible: true
        actions: [
            Kirigami.Action {
                text: i18n("Home")
                icon.name: "go-home"
                onTriggered: pageStack.layers.clear()
            },
            Kirigami.Action {
                text: i18n("Settings")
                icon.name: "settings-configure"
                onTriggered: pageStack.push("qrc:/qml/Settings.qml")
            }
        ]
    }

    pageStack.initialPage: Kirigami.ScrollablePage {
        title: i18n("Home")

        Kirigami.Card {
            banner.title: i18n("Welcome")
            banner.source: "qrc:/images/banner.png"
            content: Item {
                implicitWidth: delegate.implicitWidth
                implicitHeight: delegate.implicitHeight
                QQC2.Label {
                    id: delegate
                    text: i18n("Welcome to My KDE App!")
                    wrapMode: Text.WordWrap
                }
            }
        }
    }
}
```

```qml
// qml/Settings.qml
import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.kconfig as KConfig

Kirigami.ScrollablePage {
    title: i18n("Settings")

    Kirigami.FormLayout {
        anchors.left: parent.left
        anchors.right: parent.right

        QQC2.TextField {
            id: nameField
            Kirigami.FormData.label: i18n("Name:")
            text: settings.name
        }

        QQC2.CheckBox {
            id: autoSaveCheck
            Kirigami.FormData.label: i18n("Auto-save:")
            checked: settings.autoSave
        }

        QQC2.ComboBox {
            id: themeCombo
            Kirigami.FormData.label: i18n("Theme:")
            model: [i18n("System"), i18n("Light"), i18n("Dark")]
            currentIndex: settings.theme
        }

        QQC2.Button {
            text: i18n("Save")
            onClicked: {
                settings.name = nameField.text
                settings.autoSave = autoSaveCheck.checked
                settings.theme = themeCombo.currentIndex
                settings.save()
            }
        }
    }
}
```

### Step 3: Type-Safe Settings with KConfig XT

```kcfg
<?xml version="1.0" encoding="UTF-8"?>
<kcfg xmlns="http://www.kde.org/standards/kcfg/1.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.kde.org/standards/kcfg/1.0
                          http://www.kde.org/standards/kcfg/1.0/kcfg.xsd">
  <kcfgfile name="myapprc"/>
  <group name="General">
    <entry name="Name" type="String">
      <default></default>
    </entry>
    <entry name="AutoSave" type="Bool">
      <default>true</default>
    </entry>
    <entry name="Theme" type="Enum">
      <default>0</default>
      <choices>
        <choice name="System"/>
        <choice name="Light"/>
        <choice name="Dark"/>
      </choices>
    </entry>
    <entry name="WindowWidth" type="Int">
      <default>800</default>
    </entry>
    <entry name="WindowHeight" type="Int">
      <default>600</default>
    </entry>
  </group>
</kcfg>
```

```cpp
// KConfig XT generates SettingsBase class
#include "settings.h"

// Usage:
Settings::setAutoSave(true);
Settings::setName("User Name");
Settings::self()->save();

QString name = Settings::name();
bool autoSave = Settings::autoSave();
int theme = Settings::theme(); // 0=System, 1=Light, 2=Dark
```

### Step 4: File I/O with KIO

```cpp
#include <KIO/Job>
#include <KIO/OpenUrlJob>
#include <KIO/StoredTransferJob>
#include <KFileWidget>

// Open file dialog
void openFile() {
    auto *fileWidget = new KFileWidget(QUrl("kfiledialog:///myapp"), this);
    fileWidget->setOperationMode(KFileWidget::Opening);
    fileWidget->setFilter("*.txt|Text Files\n*|All Files");

    connect(fileWidget, &KFileWidget::okClicked, this, [this, fileWidget]() {
        QUrl url = fileWidget->selectedUrl();
        fileWidget->close();
        loadFile(url);
    });
    fileWidget->show();
}

// Load file asynchronously
void loadFile(const QUrl &url) {
    KIO::StoredTransferJob *job = KIO::storedGet(url, KIO::NoReload, KIO::HideProgressInfo);
    connect(job, &KJob::result, this, [this, job, url]() {
        if (job->error()) {
            KMessageBox::error(this, job->errorString());
            return;
        }
        QByteArray data = job->data();
        // Process data...
    });
}

// Network-transparent: works with file://, ftp://, sftp://, fish://, smb://
```

### Step 5: Plasma Applet (QML)

```qml
// plasma-applet/contents/ui/main.qml
import QtQuick 2.15
import QtQuick.Layouts 1.15
import org.kde.plasma.plasmoid 2.0
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.components as PlasmaComponents

PlasmoidItem {
    id: root

    // Plasmoid configuration
    Plasmoid.icon: "myapplet"
    Plasmoid.title: i18n("My Applet")
    Plasmoid.toolTipMainText: i18n("My Applet")
    Plasmoid.toolTipSubText: i18n("Shows useful information")

    // Compact representation (panel)
    compactRepresentation: MouseArea {
        implicitWidth: PlasmaCore.Units.iconSizes.small
        implicitHeight: PlasmaCore.Units.iconSizes.small
        onClicked: root.expanded = !root.expanded

        PlasmaCore.IconItem {
            anchors.centerIn: parent
            source: "myapplet"
        }
    }

    // Full representation (popup)
    fullRepresentation: Item {
        Layout.minimumWidth: PlasmaCore.Units.gridUnit * 15
        Layout.minimumHeight: PlasmaCore.Units.gridUnit * 10

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: PlasmaCore.Units.gridUnit

            PlasmaComponents.Label {
                text: i18n("Hello from Plasma!")
                font.pointSize: 16
            }

            PlasmaComponents.Button {
                text: i18n("Refresh")
                onClicked: {
                    // Update content
                }
            }
        }
    }
}
```

### Step 6: KRunner Plugin

```cpp
// krunner-myplugin.cpp
#include <KRunner/AbstractRunner.h>
#include <KRunner/RunnerManager.h>

class MyRunner : public KRunner::AbstractRunner
{
    Q_OBJECT

public:
    MyRunner(QObject *parent, const KPluginMetaData &metaData)
        : KRunner::AbstractRunner(parent, metaData) {}

    void match(KRunner::RunnerContext &context) override {
        QString query = context.query();
        if (query.startsWith("myapp ")) {
            KRunner::QueryMatch match(this);
            match.setText(i18n("My App Action"));
            match.setRelevance(0.8);
            match.setData(query.mid(6));
            context.addMatch(match);
        }
    }

    void run(const KRunner::RunnerContext &context, const KRunner::QueryMatch &match) override {
        QString action = match.data().toString();
        // Execute action
    }
};

K_EXPORT_PLASMA_RUNNER(myrunner, MyRunner)
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Hardcoded strings | No i18n support | Use i18n(), i18nc() for every user-facing string |
| Ignoring Wayland | X11-specific code (global mouse, window positioning) | Use platform-agnostic APIs |
| Missing KConfig XT | Manual QSettings, no generated accessors | Use KConfig XT for type-safe settings |
| KF5 on new projects | KF6 is the current release | Start with KF6 + Qt6 |
| Kirigami vs desktop confusion | Using desktop-only patterns in Kirigami | Use Kirigami components for adaptive UI |
| Not using KIO | Direct file I/O, no network transparency | Use KIO for all file operations |
| Plasma-specific in non-Plasma app | Using Plasma::Applet outside Plasma | Conditional includes with QT_PLASMA |
| Ignoring KService | Static plugin loading, no discoverability | Use KService + KPluginLoader |
| No D-Bus integration | App not scriptable, no IPC | Expose actions via org.kde.MyApp D-Bus interface |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| KF6 + Qt6 for all new projects | Current release, ongoing support |
| Kirigami for new apps | Adaptive, mobile-friendly, convergent |
| KConfig XT over raw QSettings | Type safety, generated code, KCM integration |
| KIO over QFile | Network transparency, progress reporting, error handling |
| KLocalizedString over QObject::tr | KDE i18n infrastructure, context support |
| Plasma-style QQC2 style | Native look in Plasma, Kirigami apps |
| CMake + ECM module system | Standard KDE build system, find modules included |
| Test on both X11 and Wayland | Both display servers in active use |
| Ship via Flatpak | KDE Flatpak runtime, automatic runtime updates |
| KNotification over QSystemTrayIcon | Modern, configurable, Do Not Disturb aware |
| D-Bus service for unique instances | Prevent duplicate app runs, CLI integration |
| KAboutData for metadata | Consistent about dialog, library dependency listing |

## References
  - references/kde-advanced.md — KDE Advanced Topics
  - references/kde-fundamentals.md — KDE Fundamentals
  - references/kde-kirigami.md — Kirigami Adaptive UI Reference
  - references/kde-plasma-applet.md — Plasma Applet Development Reference
## Handoff
Hand off to `desktop-qt` for Qt-specific widget details. Hand off to `desktop-gtk` for GTK/KDE interoperability.
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

### Kirigami vs QtWidgets

| Decision | Kirigami (QML) | QtWidgets (C++) |
|---|---|---|
| UI modernity | Modern, adaptive | Traditional desktop |
| Mobile support | Built-in adaptive | Separate layouts needed |
| Performance | GPU-accelerated | CPU-rendered |
| Learning curve | QML is easier | Traditional C++ |
| Customization | QML theming | Qt style sheets |
| Best for | Cross-platform, modern UI | Complex desktop tools |

### Plasma Integration vs Standalone App

| Aspect | Plasma-integrated | Standalone |
|---|---|---|
| Look and feel | Native Plasma theming | KDE Breeze custom |
| Notifications | KNotification | QSystemTrayIcon |
| Global menu | Automatic | Manual setup |
| KCM integration | Possible | Separate settings |
| Portability | KDE Plasma only | Desktop-agnostic |