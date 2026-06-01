# Qt Fundamentals

## Overview
Qt is a cross-platform C++ framework for desktop, mobile, and embedded applications, providing QtWidgets (traditional desktop UI), QtQuick/QML (declarative fluid UI), and extensive module libraries. This reference covers fundamental Qt concepts.

## Core Concepts

### Concept 1: QObject and Meta-Object System
QObject is the base class for all Qt objects. It provides: signals and slots (type-safe communication), Q_PROPERTY (property system for QML/data binding), Q_INVOKABLE (methods callable from QML), event system, and parent-child memory management. The Meta-Object Compiler (MOC) generates introspection code.

### Concept 2: Signals and Slots
Qt's type-safe communication mechanism: signals (events emitted by objects), slots (functions that respond), connections (QObject::connect). New Qt6 syntax uses function pointers for compile-time checking. Supports queued connections for thread safety.

### Concept 3: Model-View Architecture
QAbstractItemModel provides data to views (QTableView, QTreeView, QListView) without copying. Custom models implement rowCount, columnCount, data, and flags. QSortFilterProxyModel adds sorting and filtering without modifying the source model.

### Concept 4: QtQuick/QML
Declarative UI language: components are composed in QML, JavaScript for logic, C++ for performance. Qt Quick Controls 2 (QQC2) provides standard components. QML modules (QtQuick, QtQuick.Controls, QtQuick.Layouts) form the building blocks.

### Concept 5: Qt Modules
QtCore (foundation, containers, threads), QtWidgets (desktop UI), QtQuick (declarative UI), QtSql (database), QtNetwork (HTTP, TCP/UDP, WebSocket), QtMultimedia (audio/video), QtCharts, QtWebEngine, QtSvg, QtPdf. Select modules based on application needs.

## Best Practices

- Qt6 for new projects (modern C++17, removed deprecated APIs)
- CMake over qmake
- Model-View for all list data
- Signals/slots over callbacks
- Q_PROPERTY for QML interop
- QRC for embedded resources (single binary)
- Async everywhere (non-blocking I/O)
- Asan/tsan in CI for memory safety

## Anti-Patterns

- Synchronous I/O on main thread (blocks UI)
- Direct UI updates from worker threads
- Qt5 patterns in Qt6 projects
- Multiple QML engines in one application
- Hardcoded strings (no translation)
- QML engine ownership leaks
- Missing platform plugins (deployment failure)
- Ignoring high-DPI
