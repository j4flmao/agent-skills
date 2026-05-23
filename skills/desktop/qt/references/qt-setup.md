# Qt Setup Reference

## Installation

### Windows
```bash
# Online installer
winget install Qt.Qt
# Or download from qt.io and run:
qt-unified-windows-x64-online.exe

# Install Qt 6.7 modules:
# - Qt 6.7.0 > MSVC 2022 > Qt Quick, Qt Widgets, Qt WebEngine
# - Developer and Designer Tools > CMake, Ninja
```

### macOS
```bash
brew install qt
brew link qt
export PATH="/opt/homebrew/opt/qt/bin:$PATH"
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install qt6-base-dev qt6-quick-dev qt6-webengine-dev \
  qt6-tools-dev qt6-tools-dev-tools cmake ninja-build
```

## CMake Patterns

### Minimal Qt 6 Project
```cmake
cmake_minimum_required(VERSION 3.22)
project(App)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Quick)

qt_add_executable(App
  main.cpp
  app.qml
  resources.qrc
)

target_link_libraries(App PRIVATE Qt6::Core Qt6::Quick)
```

### With Widgets
```cmake
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets)

qt_add_executable(App
  main.cpp
  mainwindow.cpp mainwindow.h
)

target_link_libraries(App PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets)
```

### SQL and Network
```cmake
find_package(Qt6 REQUIRED COMPONENTS Core Sql Network)
target_link_libraries(App PRIVATE Qt6::Sql Qt6::Network)
```

## Qt Creator Usage

```bash
# Launch Qt Creator
qtcreator

# Project setup:
# 1. File > Open File or Project > select CMakeLists.txt
# 2. Configure kit (Desktop Qt 6.7.0 MSVC 2022)
# 3. Build: Ctrl+B
# 4. Run: Ctrl+R
# 5. Debug: F5

# Key shortcuts:
# Ctrl+K: Locate anything
# F4: Switch header/source
# Ctrl+Shift+R: Rename symbol
# Alt+Enter: Refactoring actions
```

## Qt Module Reference

| Module | Header | Purpose |
|--------|--------|---------|
| Qt6::Core | QCoreApplication | Event loop, threads, JSON, XML |
| Qt6::Gui | QGuiApplication | Windows, events, fonts, cursors |
| Qt6::Widgets | QApplication | Desktop widget toolkit |
| Qt6::Quick | QQmlEngine | QML engine and rendering |
| Qt6::Network | QTcpSocket | HTTP, TCP, UDP, SSL |
| Qt6::Sql | QSqlDatabase | SQL database connectivity |
| Qt6::WebEngine | QWebEngineView | Chromium-based web content |
| Qt6::Multimedia | QMediaPlayer | Audio/video playback |
| Qt6::Charts | QChart | 2D chart visualizations |
| Qt6::Svg | QSvgRenderer | SVG rendering |

## Debugging

```cpp
#include <QDebug>

qDebug() << "Value:" << value;
qWarning() << "Invalid state:" << state;
qCritical() << "Fatal error:" << errorMessage;

// Conditional debug
#ifdef QT_DEBUG
qDebug() << "Debug info";
#endif
```

### Console Output at Runtime
```bash
# Enable Qt logging categories
export QT_LOGGING_RULES="*.debug=true;qt.qml.connections=false"
```

## Resource File
```xml
<!-- resources.qrc -->
<RCC>
    <qresource prefix="/">
        <file>main.qml</file>
        <file>images/logo.png</file>
        <file>fonts/Roboto.ttf</file>
        <file>translations/app_de.qm</file>
    </qresource>
</RCC>
```

```cpp
// Access resources
QUrl("qrc:/main.qml")
QPixmap(":/images/logo.png")
```

## Deployment

### Windows (windeployqt)
```bash
# Copy Qt DLLs to release folder
windeployqt --release build/release/MyApp.exe
# Creates: Qt6Core.dll, Qt6Gui.dll, Qt6Widgets.dll, platforms/, styles/, etc.
```

### macOS (macdeployqt)
```bash
macdeployqt build/release/MyApp.app -dmg
# Creates distributable DMG with frameworks bundled
```

### Linux (linuxdeployqt)
```bash
linuxdeployqt build/release/MyApp -appimage
# Creates AppImage with all dependencies
```

## Translations

```cmake
find_package(Qt6 REQUIRED COMPONENTS LinguistTools)
qt_add_translations(MyApp TS_FILES app_en.ts app_de.ts app_fr.ts)
```

```xml
<!-- In QML -->
Text { text: qsTr("Hello World") }
```

```bash
# Update translations
lupdate CMakeLists.txt -ts translations/*.ts
# Edit with Linguist
linguist translations/app_de.ts
# Compile
lrelease translations/*.ts
```

## Testing

```cmake
find_package(Qt6 REQUIRED COMPONENTS Test)

qt_add_executable(AppTest
  test/test_main.cpp
  test/datamodel_test.cpp
)

target_link_libraries(AppTest PRIVATE Qt6::Test Qt6::Core)
enable_testing()
add_test(NAME AppTest COMMAND AppTest)
```
