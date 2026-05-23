# KDE Dev Setup Reference

## Prerequisites

```bash
# Ubuntu/Debian
sudo apt install build-essential cmake extra-cmake-modules \
  qt6-base-dev qt6-quick-dev qt6-declarative-dev \
  libkf6kirigami-dev libkf6config-dev libkf6kio-dev \
  libkf6i18n-dev libkf6notifications-dev \
  kdevelop plasma-sdk

# Fedora
sudo dnf install cmake extra-cmake-modules \
  qt6-qtbase-devel qt6-qtdeclarative-devel \
  kf6-kirigami-devel kf6-kconfig-devel kf6-kio-devel \
  kf6-ki18n-devel kf6-knotifications-devel \
  kdevelop plasma-sdk

# Arch
sudo pacman -S cmake extra-cmake-modules \
  qt6-base qt6-declarative \
  kirigami kconfig kio ki18n knotifications \
  kdevelop plasma-sdk
```

## KDevelop Setup

```bash
# Launch KDevelop
kdevelop

# Project setup:
# 1. Project > Open/Import > select CMakeLists.txt
# 2. Select build directory (build/)
# 3. Configure via Build > Run CMake
# 4. Build: F8
# 5. Run: Shift+F9
# 6. Debug: F9

# Key shortcuts:
# F8: Build
# Shift+F9: Run
# F9: Debug
# Ctrl+Shift+P: Open file
# Ctrl+Alt+N: New class
# Ctrl+R: Rename
```

## KDE Frameworks 6 Modules

| Module | CMake Target | Purpose |
|--------|-------------|---------|
| Kirigami | KF6::Kirigami | Convergent mobile/desktop UI |
| KConfig | KF6::KConfig | Configuration system |
| KConfigWidgets | KF6::KConfigWidgets | Config dialog widgets |
| KCoreAddons | KF6::KCoreAddons | Core utilities |
| KI18n | KF6::I18n | Internationalization |
| KIO | KF6::KIO | Network-transparent file I/O |
| KService | KF6::KService | Plugin/service loading |
| KNotifications | KF6::Notifications | Desktop notifications |
| KXmlGui | KF6::XmlGui | Action-based menu/toolbar |
| KWindowSystem | KF6::WindowSystem | Window manager interaction |
| KIconThemes | KF6::IconThemes | Breeze icon loading |
| KPackage | KF6::Package | Installable package loading |
| KRunner | KF6::Runner | KRunner plugin framework |
| KCMUtils | KF6::KCMUtils | System settings modules |

## KConfig XT Example

```xml
<!-- src/settings.kcfg -->
<?xml version="1.0" encoding="UTF-8"?>
<kcfg xmlns="http://www.kde.org/standards/kcfg/1.0">
  <kcfgfile name="myapprc"/>
  <group name="General">
    <entry name="windowWidth" type="Int">
      <default>800</default>
    </entry>
    <entry name="windowHeight" type="Int">
      <default>600</default>
    </entry>
    <entry name="autoSaveInterval" type="Int">
      <default>5</default>
      <min>0</min>
      <max>60</max>
    </entry>
    <entry name="recentFiles" type="StringList">
      <default></default>
    </entry>
  </group>
</kcfg>
```

```cmake
# In CMakeLists.txt
kconfig_add_kcfg_files(myapp_SRCS src/settings.kcfg)
```

## KActionCollection

```cpp
#include <KActionCollection>
#include <KActionCollection>
#include <KStandardAction>

// In main window constructor
KActionCollection* collection = new KActionCollection(this);

auto* saveAction = collection->addAction("file_save");
saveAction->setText(i18n("&Save"));
saveAction->setIcon(QIcon::fromTheme("document-save"));
saveAction->setShortcut(QKeySequence::Save);
connect(saveAction, &QAction::triggered, this, &MainWindow::saveFile);

// Standard actions
KStandardAction::quit(this, &QApplication::quit, collection);
KStandardAction::preferences(this, &MainWindow::showSettings, collection);
KStandardAction::keyBindings(this, &MainWindow::configureShortcuts, collection);
```

## KIO Usage

```cpp
#include <KIO/Job>
#include <KIO/StatJob>
#include <KIO/CopyJob>

// Copy file (network transparent)
KIO::copy(QUrl::fromLocalFile("/tmp/source.txt"),
          QUrl::fromLocalFile("/tmp/dest.txt"));

// Stat file (works with remote too)
auto* job = KIO::stat(QUrl("https://example.com/file.txt"));
connect(job, &KJob::result, this, [job]() {
    if (job->error()) {
        qWarning() << "Error:" << job->errorString();
    } else {
        qDebug() << "File exists";
    }
});

// List directory
auto* listJob = KIO::listDir(QUrl("file:///home/user/Documents"));
connect(listJob, &KIO::ListJob::entries, this,
    [](KIO::Job*, const KIO::UDSEntryList& entries) {
        for (const auto& entry : entries) {
            qDebug() << entry.stringValue(KIO::UDSEntry::UDS_NAME);
        }
    });
```

## KRunner Plugin

```cpp
// src/krunnerplugin.cpp
#include <KRunner/AbstractRunner>
#include <KRunner/RunnerManager>

class MyRunner : public KRunner::AbstractRunner
{
    Q_OBJECT

public:
    MyRunner(QObject* parent, const KPluginMetaData& data)
        : KRunner::AbstractRunner(parent, data) {}

    void match(KRunner::RunnerContext& context) override
    {
        const QString query = context.query();
        if (query.startsWith("myapp:")) {
            KRunner::QueryMatch match(this);
            match.setText("Open My App");
            match.setSubtext("Launch with parameter: " + query);
            match.setIcon(QIcon::fromTheme("myapp"));
            match.setRelevance(0.8);
            match.setData(query.mid(6));
            context.addMatch(match);
        }
    }

    void run(const KRunner::RunnerContext& context,
             const KRunner::QueryMatch& match) override
    {
        QProcess::startDetached("myapp", {match.data().toString()});
    }
};

K_EXPORT_PLASMA_RUNNER(myrunner, MyRunner)
```

## Plasmoid Metadata

```desktop
# plasmoid/metadata.desktop
[Desktop Entry]
Name=My Plasmoid
Comment=Example KDE Plasma widget
Icon=preferences-system
Type=Service
ServiceTypes=Plasma/Applet
X-Plasma-API=javascript
X-Plasma-MainScript=ui/main.qml
X-KDE-PluginInfo-Author=Author Name
X-KDE-PluginInfo-Email=email@example.com
X-KDE-PluginInfo-Name=myplasmoid
X-KDE-PluginInfo-Version=1.0
X-KDE-PluginInfo-License=MIT
X-KDE-PluginInfo-EnabledByDefault=true
```

## Debugging KDE Apps

```bash
# KDE debug environment
export QT_LOGGING_RULES="*.debug=true"
export KDE_DEBUG=1

# KCrash backtrace
export KDE_DEBUG_GDB=1

# Run with plasma shell for plasmoid testing
plasmoidviewer myplasmoid

# QML debugging
export QML_DEBUG_SERVER_PORT=3768
export QML_DEBUG_ENABLE=true

# Profile QML
export QML_PROFILER_PORT=3729
```
