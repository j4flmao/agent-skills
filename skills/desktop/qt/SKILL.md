---
name: qt
description: >
  Use this skill when building cross-platform desktop apps with Qt — C++ framework, QML for modern UIs, Qt Widgets for classic forms, signals/slots communication. Covers Qt 6, CMake integration, Qt Creator, model/view patterns. Do NOT use for: web-only apps, mobile-first projects, non-GUI CLIs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, cross-platform, qt, c++, qml, phase-4]
---

# Qt

## Purpose
Build cross-platform desktop applications using Qt 6 with C++ and QML, leveraging signals/slots for component communication and model/view for data presentation.

## Agent Protocol

### Trigger
User request includes: `qt`, `qt6`, `qml`, `qt widgets`, `qt creator`, `cmake qt`, `signals slots`, `qmake`, `cross-platform c++`.

### Input Context
- Qt version (Qt 5, Qt 6)
- UI approach (QML, Qt Widgets, both)
- Build system (CMake, qmake)
- Project type (desktop app, embedded UI, library)
- OS targets (Windows, macOS, Linux, Android)

### Output Artifact
A markdown document containing:
- CMakeLists.txt project setup
- Main entry point
- QML component hierarchy
- C++ model definition
- Signal/slot connections
- Resource management
- Deployment and packaging

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- CMake project configured with Qt 6 modules
- QML UI with at least one custom component
- C++ backend class with Q_PROPERTY and signals
- Signal/slot connection between C++ and QML
- Resources embedded via .qrc file
- Application packaged for target platform

### Max Response Length
4096 tokens

## Workflow

### Step 1: CMake Project Setup
```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.22)
project(MyApp VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Quick Widgets)

qt_add_executable(MyApp
  main.cpp
  src/datamodel.cpp
  src/datamodel.h
  resources/resources.qrc
)

target_link_libraries(MyApp PRIVATE
  Qt6::Core
  Qt6::Quick
  Qt6::Widgets
)
```

### Step 2: Main Entry Point
```cpp
// main.cpp
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include "datamodel.h"

int main(int argc, char *argv[]) {
    QGuiApplication app(argc, argv);
    QQmlApplicationEngine engine;

    DataModel model;
    engine.rootContext()->setContextProperty("dataModel", &model);

    engine.loadFromModule("MyApp", "Main");
    return app.exec();
}
```

### Step 3: C++ Backend with Q_PROPERTY
```cpp
// datamodel.h
#ifndef DATAMODEL_H
#define DATAMODEL_H

#include <QObject>
#include <QStringList>

class DataModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QStringList items READ items NOTIFY itemsChanged)
    Q_PROPERTY(int currentIndex READ currentIndex WRITE setCurrentIndex NOTIFY currentIndexChanged)

public:
    explicit DataModel(QObject *parent = nullptr);

    QStringList items() const;
    int currentIndex() const;
    void setCurrentIndex(int index);

    Q_INVOKABLE void addItem(const QString &item);
    Q_INVOKABLE void removeItem(int index);

signals:
    void itemsChanged();
    void currentIndexChanged();

private:
    QStringList m_items;
    int m_currentIndex = -1;
};
#endif

// datamodel.cpp
#include "datamodel.h"

DataModel::DataModel(QObject *parent) : QObject(parent) {}

QStringList DataModel::items() const { return m_items; }

int DataModel::currentIndex() const { return m_currentIndex; }

void DataModel::setCurrentIndex(int index) {
    if (m_currentIndex != index) {
        m_currentIndex = index;
        emit currentIndexChanged();
    }
}

void DataModel::addItem(const QString &item) {
    m_items.append(item);
    emit itemsChanged();
}

void DataModel::removeItem(int index) {
    if (index >= 0 && index < m_items.size()) {
        m_items.removeAt(index);
        emit itemsChanged();
    }
}
```

### Step 4: QML UI
```qml
// Main.qml
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    title: "My App"
    width: 800
    height: 600
    visible: true

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16

        RowLayout {
            Layout.fillWidth: true
            TextField {
                id: inputField
                Layout.fillWidth: true
                placeholderText: "Enter item..."
            }
            Button {
                text: "Add"
                onClicked: {
                    if (inputField.text.length > 0) {
                        dataModel.addItem(inputField.text);
                        inputField.clear();
                    }
                }
            }
        }

        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            model: dataModel.items
            delegate: ItemDelegate {
                text: modelData
                width: parent.width
                onClicked: dataModel.currentIndex = index
            }
        }
    }
}
```

## Rules
- Q_PROPERTY for all property bindings exposed to QML.
- Signals emitted only when state actually changes.
- CMake AUTOMOC enabled for moc file generation.
- QRC files used for all embedded resources.
- Qt 6 preferred over Qt 5 for new projects.
- Model/view separation — never manipulate view data directly.
- C++ objects exposed to QML via setContextProperty or qmlRegisterType.

## References
  - references/qt-advanced.md — Qt Advanced Topics
  - references/qt-architecture.md — Qt Architecture Reference
  - references/qt-fundamentals.md — Qt Fundamentals
  - references/qt-performance.md — Qt Performance Reference
  - references/qt-qml-guide.md — Qt QML Guide Reference
  - references/qt-setup.md — Qt Setup Reference
## Handoff
Hand off to `desktop/kde/SKILL.md` when building KDE Plasma extensions or Kirigami convergent apps. Hand off to `desktop/gtk/SKILL.md` when GNOME integration preferred.
