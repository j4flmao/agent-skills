# Qt Architecture Reference

## Signal/Slot Mechanism

```cpp
// Class with signals and slots
class Counter : public QObject {
    Q_OBJECT
public:
    Counter() { m_value = 0; }
    int value() const { return m_value; }

public slots:
    void setValue(int value) {
        if (value != m_value) {
            m_value = value;
            emit valueChanged(value);
        }
    }

signals:
    void valueChanged(int newValue);

private:
    int m_value;
};

// Connections
Counter a, b;
QObject::connect(&a, &Counter::valueChanged,
                 &b, &Counter::setValue);

// Lambda connection
connect(button, &QPushButton::clicked, [this]() {
    handleClick();
});

// Qt 6: PMF-based connections (type-safe)
// Qt 5: String-based connections (deprecated)
```

## MOC (Meta-Object Compiler)

```cmake
# CMakeLists.txt — AUTOMOC handles moc generation
set(CMAKE_AUTOMOC ON)

# Any QObject-derived class needs moc processing
# MOC generates:
// - QMetaObject with class hierarchy, signals, slots
// - qobject_cast support
// - Runtime type information
// - Property system metadata
```

```cpp
// Required macros
class MyWidget : public QWidget {
    Q_OBJECT  // Triggers MOC
    Q_PROPERTY(QString title READ title WRITE setTitle NOTIFY titleChanged)
    // ...
};
```

## QML vs Widgets

| Aspect | Qt Widgets | QML (Qt Quick) |
|--------|-----------|----------------|
| Language | C++ | QML + JavaScript |
| Performance | Native, fast | GPU-accelerated |
| UI complexity | Desktop standard | Animated, fluid |
| Custom styling | Stylesheets, QStyle | QML + delegates |
| Learning curve | Moderate | Lower |
| Best for | LOB, IDE, tools | Media, mobile, embedded |

```cpp
// Mixing both
QQmlApplicationEngine engine;
engine.loadFromModule("MyApp", "Main");

// C++ object available to QML
engine.rootContext()->setContextProperty("backend", &backendObj);
```

## Model/View Architecture

```cpp
// Model (QAbstractListModel)
class ItemModel : public QAbstractListModel {
    Q_OBJECT
public:
    enum Roles { NameRole = Qt::UserRole + 1, ValueRole };
    QHash<int, QByteArray> roleNames() const override {
        return { {NameRole, "name"}, {ValueRole, "value"} };
    }
    int rowCount(const QModelIndex & = QModelIndex()) const override {
        return m_items.size();
    }
    QVariant data(const QModelIndex &index, int role) const override {
        if (!checkIndex(index)) return {};
        const auto &item = m_items.at(index.row());
        switch (role) {
            case NameRole: return item.name;
            case ValueRole: return item.value;
        }
        return {};
    }
    // Modifications via beginInsertRows/endInsertRows, etc.
};

// View
QListView *list = new QListView;
list->setModel(new ItemModel(this));
list->setViewMode(QListView::IconMode);

// Delegate for custom rendering
class ItemDelegate : public QStyledItemDelegate {
    void paint(QPainter *painter, const QStyleOptionViewItem &option,
               const QModelIndex &index) const override {
        // Custom drawing
    }
};
```

## State Machine

```cpp
#include <QStateMachine>

QStateMachine machine;

QState *idle = new QState();
QState *running = new QState();
QState *error = new QState();

idle->addTransition(startButton, &QPushButton::clicked, running);
running->addTransition(stopButton, &QPushButton::clicked, idle);
running->addTransition(failSignal, error);
error->addTransition(resetButton, &QPushButton::clicked, idle);

idle->assignProperty(statusLabel, "text", "Idle");
running->assignProperty(statusLabel, "text", "Running");
error->assignProperty(statusLabel, "text", "Error");

machine.addState(idle);
machine.addState(running);
machine.addState(error);
machine.setInitialState(idle);
machine.start();
```

## Plugin System

```cpp
// Plugin interface
class ImageFilterInterface {
public:
    virtual ~ImageFilterInterface() = default;
    virtual QString name() const = 0;
    virtual QImage filter(const QImage &) = 0;
};
Q_DECLARE_INTERFACE(ImageFilterInterface, "com.myapp.ImageFilter/1.0")

// Plugin implementation
class BlurFilter : public QObject, public ImageFilterInterface {
    Q_OBJECT
    Q_PLUGIN_METADATA(IID "com.myapp.ImageFilter/1.0" FILE "blur.json")
    Q_INTERFACES(ImageFilterInterface)
};

// Load plugins
QPluginLoader loader("plugins/blurfilter.dll");
auto *filter = qobject_cast<ImageFilterInterface*>(loader.instance());
```

## Cross-Platform Patterns

```cpp
// Platform-conditional code
#ifdef Q_OS_WIN
    // Windows-specific
#elif defined(Q_OS_MACOS)
    // macOS-specific
#elif defined(Q_OS_LINUX)
    // Linux-specific
#endif

// QStandardPaths for OS-correct paths
QString dataDir = QStandardPaths::writableLocation(
    QStandardPaths::AppDataLocation);
QString docsDir = QStandardPaths::writableLocation(
    QStandardPaths::DocumentsLocation);

// QSettings for platform-appropriate storage
QSettings settings("MyCompany", "MyApp");
settings.setValue("theme", "dark");
```

## Key Architecture Rules

- Q_OBJECT macro in every QObject-derived class
- AUTOMOC enabled in CMake for all header/source files
- Model/view with proper begin/end notifications
- Signals emitted only when state actually changes
- QRC for all embedded resources
- Plugin systems use QPluginLoader + interfaces
- QStateMachine for complex stateful workflows
- QPropertyAnimation for smooth transitions
