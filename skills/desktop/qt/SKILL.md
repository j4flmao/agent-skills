---
name: desktop-qt
description: >
  Use when the user asks about cross-platform Qt application development with QtWidgets, QtQuick/QML, Qt Creator, signals and slots, or Qt deployment. Do NOT use for: KDE-specific (desktop-kde), or non-Qt desktop frameworks.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, qt, cross-platform]
---

# Qt

## Purpose
Build cross-platform desktop (and embedded) applications using the Qt framework — QtWidgets for traditional desktop UIs, QtQuick/QML for fluid modern interfaces, with built-in networking, SQL, multimedia, and internationalization.

## Agent Protocol

### Trigger
Exact user phrases: "Qt", "QtWidgets", "QtQuick", "QML", "QObject", "signals and slots", "QMake", "CMake Qt", "QML application", "Qt Creator", "QML UI", "cross-platform Qt".

### Input Context
- Qt version (Qt5 vs Qt6 — Qt6 for new projects)
- UI technology (QtWidgets vs QtQuick/QML)
- Build system (CMake with Qt6, qmake legacy)
- Platform targets (Windows, macOS, Linux, Android, iOS, embedded)
- Language (C++ primarily, Python via PySide6)
- Module requirements (QtCore, QtWidgets, QtQuick, QtNetwork, QtSql, QtMultimedia, QtCharts, QtWebEngine)
- Performance requirements (real-time rendering, large data models)

### Output Artifact
Qt application architecture with widget/QML tree, signal-slot graph, data model, and deployment configuration.

### Completion Criteria
- [ ] Qt version and modules selected
- [ ] UI technology chosen (QtWidgets vs QtQuick vs hybrid)
- [ ] Application and main window class hierarchy defined
- [ ] Signal-slot connections mapped for data flow
- [ ] Model-View architecture (QAbstractItemModel, QSortFilterProxyModel)
- [ ] Settings and state persistence (QSettings)
- [ ] Internationalization setup (tr(), .ts/.qm files)
- [ ] Build system configured (CMake with Qt6)
- [ ] Deployment/packaging planned (windeployqt, macdeployqt, linuxdeployqt)
- [ ] Styling approach (Qt stylesheets, QML theming, platform-native look)

### Max Response Length
250 lines.

## Framework/Methodology

### Qt UI Technology Decision Tree
```
What is the application type?
├── Traditional desktop (forms, dialogs, complex widgets)
│   → QtWidgets — mature, accessible, native look
│   → QMainWindow, QDialog, QFormLayout, QTableView
├── Modern fluid UI (animations, touch, customization)
│   → QtQuick/QML — GPU-accelerated, declarative
│   → QQC2 (Qt Quick Controls 2), animations, shader effects
├── Data-heavy (spreadsheets, financial, scientific)
│   → QtWidgets with QTableView + custom delegates
│   → OR QtQuick with TableView (Qt6) + custom models
├── Embedded (IoT, kiosk, in-vehicle)
│   → QtQuick with Qt Quick Ultralite (for MCUs)
│   └ Or QtWidgets for more complex interaction
└── Hybrid (some QML, some widgets)
    → QWidget::createWindowContainer for embedding QML
    └ QQuickWidget for embedding into QtWidgets
```

### Qt Object Model
```
QObject (base for all Qt objects)
├── Signals + Slots (type-safe communication)
├── Q_PROPERTY (property system for QML + data binding)
├── Q_INVOKABLE (methods callable from QML)
├── Event system (QEvent, eventFilter, QTimer)
├── QObject hierarchy (parent-child memory management)
└── Meta-object compiler (MOC) for introspection
    ↓
Inherited by:
├── QWidget / QMainWindow / QDialog (QtWidgets)
├── QQuickItem / QQuickWindow (QtQuick)
├── QAbstractItemModel / QAbstractListModel (Model/View)
└── QThread / QObject worker (concurrency)
```

## Workflow

### Step 1: Set Up CMake + Qt6 Project

```cmake
cmake_minimum_required(VERSION 3.16)
project(MyApp VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS
    Core Widgets Sql Network Quick QuickControls2
)

add_executable(myapp
    src/main.cpp
    src/mainwindow.cpp src/mainwindow.h
    src/mainwindow.ui
    src/model.cpp src/model.h
    resources.qrc
)

target_link_libraries(myapp PRIVATE
    Qt6::Core Qt6::Widgets Qt6::Sql Qt6::Network
    Qt6::Quick Qt6::QuickControls2
)

# QML module registration
qt_target_qml_sources(myapp
    URI "org.example.myapp"
    VERSION 1.0
    QML_FILES
        qml/Main.qml
        qml/MyComponent.qml
)
```

### Step 2: QtWidgets Application

```cpp
// main.cpp
#include <QApplication>
#include <QMainWindow>
#include <QPushButton>
#include <QVBoxLayout>
#include <QLabel>
#include <QSettings>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    app.setApplicationName("My App");
    app.setOrganizationName("My Org");
    app.setApplicationVersion("1.0.0");

    // Qt6 high-DPI is automatic
    QMainWindow window;
    window.setWindowTitle("My Qt App");
    window.resize(800, 600);

    auto *centralWidget = new QWidget(&window);
    auto *layout = new QVBoxLayout(centralWidget);

    auto *label = new QLabel("Hello, Qt!");
    auto *button = new QPushButton("Click Me");

    // Signal-slot connection
    QObject::connect(button, &QPushButton::clicked, [label]() {
        label->setText("Button clicked!");
    });

    layout->addWidget(label);
    layout->addWidget(button);
    window.setCentralWidget(centralWidget);

    // Restore window geometry
    QSettings settings;
    if (settings.contains("window/geometry")) {
        window.restoreGeometry(settings.value("window/geometry").toByteArray());
    }

    window.show();
    return app.exec();
}

// Save geometry on close (in MainWindow destructor or closeEvent)
void MainWindow::closeEvent(QCloseEvent *event) {
    QSettings settings;
    settings.setValue("window/geometry", saveGeometry());
    QMainWindow::closeEvent(event);
}
```

### Step 3: Model-View Architecture (QtWidgets)

```cpp
// model.h
#include <QAbstractTableModel>
#include <QVector>
#include <QDateTime>

struct Record {
    int id;
    QString name;
    double value;
    QDateTime timestamp;
};

class MyModel : public QAbstractTableModel {
    Q_OBJECT
public:
    enum Roles {
        IdRole = Qt::UserRole + 1,
        NameRole,
        ValueRole,
        TimestampRole
    };

    explicit MyModel(QObject *parent = nullptr);

    // Required overrides
    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role) const override;

    // Editable model
    Qt::ItemFlags flags(const QModelIndex &index) const override;
    bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole) override;

    // Data modification
    bool insertRows(int row, int count, const QModelIndex &parent = QModelIndex()) override;
    bool removeRows(int row, int count, const QModelIndex &parent = QModelIndex()) override;

    // Sorting support
    void sort(int column, Qt::SortOrder order = Qt::AscendingOrder) override;

private:
    QVector<Record> m_records;
};
```

```cpp
// Usage in view
auto *tableView = new QTableView;
auto *model = new MyModel(this);

// Sort proxy for click-to-sort headers
auto *proxyModel = new QSortFilterProxyModel(this);
proxyModel->setSourceModel(model);
tableView->setModel(proxyModel);
tableView->setSortingEnabled(true);

// Custom delegate for rendering
tableView->setItemDelegateForColumn(2, new CustomDelegate(this));
```

### Step 4: QtQuick/QML Application

```qml
// qml/Main.qml
import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.example.myapp 1.0

QQC2.ApplicationWindow {
    id: root
    visible: true
    width: 800
    height: 600
    title: qsTr("My QML App")

    // Header bar
    header: QQC2.ToolBar {
        RowLayout {
            anchors.fill: parent
            QQC2.Label {
                text: qsTr("My App")
                font.pointSize: 14
                font.bold: true
                Layout.leftMargin: 8
            }
            Item { Layout.fillWidth: true }
            QQC2.Button {
                text: qsTr("Settings")
                onClicked: settingsDialog.open()
            }
        }
    }

    // Main content with split layout
    RowLayout {
        anchors.fill: parent
        anchors.margins: 8

        ListView {
            id: listView
            Layout.preferredWidth: 250
            Layout.fillHeight: true
            model: myModel  // C++ model exposed to QML
            delegate: ItemDelegate {
                width: parent.width
                text: model.name
                onClicked: detailView.setData(model)
            }
        }

        // Detail panel
        Loader {
            id: detailView
            Layout.fillWidth: true
            Layout.fillHeight: true
            sourceComponent: detailComponent
        }
    }

    Component {
        id: detailComponent
        ColumnLayout {
            property var currentData: null
            function setData(data) { currentData = data; }

            QQC2.Label { text: qsTr("Name:") + " " + (currentData?.name || "") }
            QQC2.Label { text: qsTr("Value:") + " " + (currentData?.value || "") }
        }
    }
}
```

### Step 5: C++ Model Exposed to QML

```cpp
// C++ model accessible from QML
#include <QAbstractListModel>

class ItemModel : public QAbstractListModel {
    Q_OBJECT
    QML_ELEMENT  // Qt6: auto-register as QML type
public:
    enum Roles {
        NameRole = Qt::UserRole + 1,
        ValueRole
    };

    int rowCount(const QModelIndex &parent = QModelIndex()) const override {
        return m_items.count();
    }

    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override {
        if (!index.isValid() || index.row() >= m_items.count())
            return {};
        const auto &item = m_items.at(index.row());
        switch (role) {
        case NameRole: return item.name;
        case ValueRole: return item.value;
        default: return {};
        }
    }

    QHash<int, QByteArray> roleNames() const override {
        return {{NameRole, "name"}, {ValueRole, "value"}};
    }

private:
    QVector<ItemData> m_items;
};
```

```cpp
// main.cpp (QtQuick version)
QQmlApplicationEngine engine;

// Register C++ types to QML
qmlRegisterType<ItemModel>("org.example.myapp", 1, 0, "ItemModel");

// Or use context property (simpler but less modular)
// engine.rootContext()->setContextProperty("myModel", &model);

engine.loadFromModule("MyApp", "Main");
```

### Step 6: Qt Stylesheets (QtWidgets)

```cpp
// QSS (Qt Style Sheets) — similar to CSS
app.setStyleSheet(R"(
    QMainWindow {
        background-color: #f5f5f5;
    }
    QPushButton {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
    }
    QPushButton:hover {
        background-color: #2980b9;
    }
    QPushButton:pressed {
        background-color: #2471a3;
    }
    QPushButton:disabled {
        background-color: #bdc3c7;
    }
    QLineEdit {
        border: 1px solid #bdc3c7;
        border-radius: 4px;
        padding: 6px;
    }
    QTableView {
        gridline-color: #ecf0f1;
        selection-background-color: #3498db;
    }
)");
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Synchronous I/O | Network/filesystem on main thread blocks UI | Use QNetworkAccessManager, QThread, QtConcurrent |
| Direct UI from worker thread | Widget updates from non-GUI thread | Use signals to post to main thread |
| MOC not regenerated | Stale moc_*.cpp after header changes | CMAKE_AUTOMOC handles this automatically |
| Qt5 patterns in Qt6 | Deprecated APIs removed in Qt6 | Use Qt6 documentation, clazy checks |
| QML engine ownership leaks | C++ objects created in QML not freed | Use parent-child, C++ ownership properly |
| Ignoring high-DPI | Blurry UI on Retina/4K displays | Qt6 handles automatically; Qt5: AA_EnableHighDpiScaling |
| Slow QML startup | Parsing large QML files, loading assets | Lazy loading with Loader, asynchronous image loading |
| Hardcoded strings | Only English, no translation support | Always use qsTr(), tr(), generate .ts files |
| Missing platform plugin | App won't start on target machine | Deploy correct platform DLLs/bundles |
| QQmlEngine misuse | Creating multiple engines or not setting context | Single engine per application |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Qt6 for new projects | Modern C++17, better QML, removed deprecated APIs |
| CMake over qmake | Qt6 favors CMake, more flexible, cross-platform |
| Model-View for list data | Separation of concerns, sort/filter proxy, QML binding |
| Signals/slots over callbacks | Type-safe, thread-safe (queued connections), MOC-verified |
| Q_PROPERTY for QML interop | Enables QML data binding, animation, state machine |
| QSS for styling over QPalette | CSS-like syntax, per-widget customization, easier theming |
| QRC for embedded resources | Single binary, no file path issues, compression |
| Asynchronous everywhere | Network, file, database, process — non-blocking |
| tsan/asan in CI | Catch data races and memory errors early |
| Resource files (.qrc) | Bundle QML, images, fonts into executable |

## Architecture Patterns

### SQL Data Model
```cpp
QSqlDatabase db = QSqlDatabase::addDatabase("QSQLITE");
db.setDatabaseName("app.db");
db.open();

QSqlTableModel *model = new QSqlTableModel(this);
model->setTable("items");
model->setEditStrategy(QSqlTableModel::OnManualSubmit);
model->select();

QTableView *view = new QTableView;
view->setModel(model);
```

### QtConcurrent for Background Work
```cpp
QFuture<int> future = QtConcurrent::run([this]() {
    return heavyComputation();
});
auto *watcher = new QFutureWatcher<int>(this);
connect(watcher, &QFutureWatcher<int>::finished, this, [this, watcher]() {
    int result = watcher->result();
    updateUI(result);
});
watcher->setFuture(future);
```

## References
  - references/qt-advanced.md — Qt Advanced Topics
  - references/qt-deployment.md — Qt Deployment Reference
  - references/qt-fundamentals.md — Qt Fundamentals
  - references/qt-qml-patterns.md — Qt QML Architecture Patterns Reference
## Handoff
Hand off to `desktop-kde` for KDE Frameworks integration. Hand off to `design-accessibility` for Qt accessibility testing.
