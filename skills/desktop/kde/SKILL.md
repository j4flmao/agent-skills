---
name: kde
description: >
  Use this skill when building KDE desktop applications — Qt 6, Kirigami convergent UI, KDE Frameworks, Plasma extensions. Covers KDevelop, CMake, KPlugin, KConfig, KIO, Plasma UI. Do NOT use for: GNOME-specific apps, non-KDE Qt projects, cross-platform mobile-only apps.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, linux, kde, qt, kirigami, plasma, phase-4]
---

# KDE

## Purpose
Build KDE desktop applications using Qt 6, Kirigami convergen UI, KDE Frameworks (KConfig, KIO, KPlugin), and Plasma extensions.

## Agent Protocol

### Trigger
User request includes: `kde`, `plasma`, `kirigami`, `kde framework`, `kconfig`, `kio`, `kplugin`, `plasmoid`, `kde app`, `kdevelop`.

### Input Context
- Language (C++, QML, Python)
- KDE Frameworks version (6.x)
- Project type (Plasma applet, Kirigami app, KCM module, KRunner plugin)
- Build system (CMake + KDE extra-cmake-modules)
- Qt version (6.5+)

### Output Artifact
A markdown document containing:
- CMakeLists.txt with KDE dependencies
- Kirigami application shell (ApplicationWindow + PageRouter)
- KConfig XT settings definitions
- KAction collection for keyboard shortcuts
- KIO worker or file operations
- Plasma applet/plasmoid structure
- KPackage metadata
- Icon theme integration

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- CMakeLists.txt uses find_package with KF6 components.
- Kirigami.ApplicationWindow with PageRouter and page stack.
- KConfig XT file defines settings with defaults.
- KActionCollection created with standard keyboard shortcuts.
- Plasma applet .desktop file with ServiceTypes=Plasma/Applet.
- App installable via KPackage.

### Max Response Length
4096 tokens

## Workflow

### Step 1: CMake Project
```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.22)
project(MyApp VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(ECM REQUIRED NO_MODULE)
set(CMAKE_MODULE_PATH ${ECM_MODULE_PATH})

find_package(Qt6 REQUIRED COMPONENTS Core Qml Quick QuickControls2)
find_package(KF6 REQUIRED COMPONENTS
    Kirigami
    KConfig
    KCoreAddons
    KIO
    I18n
    Notifications
    XmlGui
)

qt_add_executable(myapp
    src/main.cpp
    src/mainwindow.cpp src/mainwindow.h
    resources/resources.qrc
)

target_link_libraries(myapp PRIVATE
    Qt6::Core Qt6::Qml Qt6::Quick Qt6::QuickControls2
    KF6::Kirigami
    KF6::KConfig
    KF6::KCoreAddons
    KF6::KIO
    KF6::I18n
    KF6::Notifications
)

install(TARGETS myapp ${KDE_INSTALL_TARGETS_DEFAULT_ARGS})
```

### Step 2: Kirigami App Shell
```qml
// src/main.qml
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

Kirigami.ApplicationWindow {
    id: root
    title: "My App"
    width: 800
    height: 600

    // Global drawer (hamburger menu)
    globalDrawer: Kirigami.GlobalDrawer {
        actions: [
            Kirigami.Action {
                text: "Home"
                icon.name: "go-home"
                onTriggered: pageRouter.currentIndex = 0
            },
            Kirigami.Action {
                text: "Settings"
                icon.name: "settings-configure"
                onTriggered: pageRouter.currentIndex = 1
            },
            Kirigami.Action {
                text: "About"
                icon.name: "help-about"
                onTriggered: pageRouter.currentIndex = 2
            }
        ]
    }

    // Page router for navigation
    pageStack.initialPage: [
        mainPage,
        settingsPage,
        aboutPage
    ][pageRouter.currentIndex]
}
```

### Step 3: KConfig XT Settings
```ini
# src/settings.kcfg
<?xml version="1.0" encoding="UTF-8"?>
<kcfg xmlns="http://www.kde.org/standards/kcfg/1.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.kde.org/standards/kcfg/1.0
                          http://www.kde.org/standards/kcfg/1.0/kcfg.xsd">
  <kcfgfile name="myapprc"/>
  <group name="General">
    <entry name="theme" type="String">
      <default>auto</default>
      <label>Color scheme</label>
    </entry>
    <entry name="autoSave" type="Bool">
      <default>true</default>
      <label>Auto-save documents</label>
    </entry>
    <entry name="maxItems" type="Int">
      <default>100</default>
      <min>10</min>
      <max>1000</max>
      <label>Maximum items in list</label>
    </entry>
  </group>
</kcfg>
```

### Step 4: Plasma Applet Structure
```
myplasmoid/
├── metadata.desktop
├── contents/
│   ├── ui/
│   │   └── main.qml
│   └── config/
│       └── config.qml
└── CMakeLists.txt
```

```desktop
# metadata.desktop
[Desktop Entry]
Name=My Plasmoid
Comment=A KDE Plasma applet
Icon=applications-system
Type=Service
ServiceTypes=Plasma/Applet
X-Plasma-API=javascript
X-Plasma-MainScript=ui/main.qml
X-KDE-PluginInfo-Author=My Name
X-KDE-PluginInfo-Email=my@email.com
X-KDE-PluginInfo-Name=myplasmoid
X-KDE-PluginInfo-Version=1.0
X-KDE-PluginInfo-License=MIT
X-KDE-PluginInfo-EnabledByDefault=true
```

## Rules
- Kirigami.ApplicationWindow for convergent desktop/mobile apps.
- KConfig XT for all user-configurable settings.
- KActionCollection for keyboard shortcuts — never manual key bindings.
- KIO for file operations (network transparent).
- Plasma applets use metadata.desktop with correct ServiceTypes.
- ECM (Extra CMake Modules) required for KDE CMake helpers.
- Breeze icon theme naming conventions for icons.
- KPackage for installable app module distribution.

## References
  - references/kde-advanced.md — Kde Advanced Topics
  - references/kde-dev-setup.md — KDE Dev Setup Reference
  - references/kde-development.md — KDE Development Reference
  - references/kde-framework.md — KDE Frameworks Reference
  - references/kde-fundamentals.md — Kde Fundamentals
  - references/kirigami-guide.md — Kirigami Guide Reference
## Handoff
Hand off to `desktop/qt/SKILL.md` for generic Qt 6 apps without KDE Frameworks. Hand off to `desktop/gnome/SKILL.md` when targeting GNOME desktop.
