# KDE Development Reference

## CMake Build System

```cmake
cmake_minimum_required(VERSION 3.22)
project(MyApp VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

# Extra CMake Modules (ECM)
find_package(ECM REQUIRED NO_MODULE)
set(CMAKE_MODULE_PATH ${ECM_MODULE_PATH})

# KDE Frameworks 6
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
    src/mainwindow.h src/mainwindow.cpp
    src/general.h src/general.cpp
    resources/resources.qrc
)

# KConfig XT settings
kconfig_add_kcfg_files(myapp_sources settings.kcfg)

target_link_libraries(myapp PRIVATE
    Qt6::Core Qt6::Qml Qt6::Quick Qt6::QuickControls2
    KF6::Kirigami
    KF6::KConfig
    KF6::KCoreAddons
    KF6::KIO
    KF6::I18n
    KF6::Notifications
    KF6::XmlGui
)

# Install with KDE conventions
install(TARGETS myapp ${KDE_INSTALL_TARGETS_DEFAULT_ARGS})
install(FILES org.kde.myapp.desktop
    DESTINATION ${KDE_INSTALL_APPDIR})
```

## KDevelop IDE

- Built-in CMake project manager with KDE-specific support
- Qt Assistant integration for API docs
- KDE debugging via GDB with custom pretty-printers
- Code completion with KDE includes
- Built-in KDE application templates (Kirigami, Plasma applet)
- KDE commit policy hooks integration

## Plasma Applet Development

```
myplasmoid/
├── metadata.desktop        # Applet metadata
├── contents/
│   ├── ui/
│   │   └── main.qml        # Applet UI
│   ├── config/
│   │   └── config.qml      # Configuration UI
│   └── data/                # Optional data files
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

## KPackage

```cmake
# CMakeLists.txt for KPackage module
find_package(KF6 REQUIRED COMPONENTS KPackage)

kpackage_add_package(myplasmoid
    DESTINATION ${KDE_INSTALL_PLUGINDIR}/plasma/applets
)
```

```bash
# Install plasmoid
kpackagetool6 --install myplasmoid/
kpackagetool6 --upgrade myplasmoid/
kpackagetool6 --remove myplasmoid

# List installed
kpackagetool6 --list --type Plasma/Applet
```

## CI with KDE Infrastructure

```yaml
# .kde-ci.yml
Dependencies:
- 'on': ['Linux/Qt6', 'FreeBSD/Qt6']
  'require':
    'frameworks/extra-cmake-modules': '@latest'
    'frameworks/kirigami': '@latest'
    'frameworks/kconfig': '@latest'
    'frameworks/kio': '@latest'
    'frameworks/ki18n': '@latest'
```

KDE CI pipeline:
1. KDE GitLab instance hosts repositories
2. .kde-ci.yml defines dependencies and build matrix
3. Jenkins builds on Linux (Qt6) and FreeBSD (Qt6)
4. Artifacts: binary packages, AppImage, Flatpak
5. Unit tests run with CTest
6. Clazy + clang-tidy static analysis
7. i18n string extraction via extractrc + xgettext

## Development Workflow

```bash
# Clone KDE module
git clone kde:myapp
# or
git clone https://invent.kde.org/plasma/myapp.git

# Build
cd myapp
cmake -B build -DCMAKE_INSTALL_PREFIX=/usr
cmake --build build

# Install for testing (not system-wide)
cmake --install build --prefix ~/.local
```

## Key Development Rules

- ECM for KDE-specific CMake helpers and install paths
- KConfig XT for all user-configurable settings
- KActionCollection for shortcuts, never manual keybindings
- KIO for file operations (transparently handles local + remote)
- Plasma applets use metadata.desktop with correct ServiceTypes
- KPackage for installable module distribution
- i18n() for all user-facing strings
- KDE CI with proper .kde-ci.yml configuration
- Breeze icon naming for all icon references
- Follow KDE Human Interface Guidelines for UX
