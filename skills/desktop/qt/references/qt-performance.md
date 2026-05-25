# Qt Performance Reference

## OpenGL Integration

```cpp
// Enable OpenGL rendering
QSurfaceFormat fmt;
fmt.setVersion(4, 1);
fmt.setProfile(QSurfaceFormat::CoreProfile);
fmt.setSwapInterval(1); // VSync
QSurfaceFormat::setDefaultFormat(fmt);

// QOpenGLWidget for custom GL rendering
class GLWidget : public QOpenGLWidget, protected QOpenGLFunctions {
protected:
    void initializeGL() override {
        initializeOpenGLFunctions();
        glClearColor(0.1f, 0.1f, 0.2f, 1.0f);
    }
    void paintGL() override {
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        // Custom rendering
    }
};

// Qt Quick Scenegraph (QSG) for QML rendering
// Automatically uses OpenGL/Vulkan/Direct3D
// QSGRendererInterface for custom rendering
```

## QML Optimization

```qml
// Delegate caching
ListView {
    model: largeModel
    // Recycling mode (default since Qt 5.x)
    cacheBuffer: 2000 // pixels to preload
}

// Lazy loading via Loader
Loader {
    active: isVisible
    sourceComponent: complexComponent  // Created only when active
}

// Use Repeater sparingly — prefer ListView for >50 items
// Avoid JavaScript in property bindings (slows evaluation)
// Use ShaderEffect instead of Canvas for pixel operations

// Item pooling
Timer {
    interval: 100
    repeat: true
    onTriggered: {
        pool.recycleUnused();
    }
}
```

## Threading with QtConcurrent

```cpp
#include <QtConcurrent>

// Async computation
QFuture<Result> future = QtConcurrent::run([this]() {
    return performExpensiveComputation();
});

// Process results on UI thread
auto watcher = new QFutureWatcher<Result>(this);
connect(watcher, &QFutureWatcher<Result>::finished, this, [this, watcher]() {
    Result result = watcher->result();
    updateUI(result);
    watcher->deleteLater();
});
watcher->setFuture(future);

// Parallel map (uses thread pool)
QList<int> results = QtConcurrent::blockingMapped(
    inputList, [](int x) { return heavyComputation(x); });

// Filter
QFuture<int> filtered = QtConcurrent::filtered(
    list, [](int x) { return x > 0; });
```

## Memory Management

```cpp
// Parent-child ownership (Qt tree)
auto *layout = new QVBoxLayout(this); // parented to 'this'
auto *btn = new QPushButton("Click", this); // auto-deleted with parent

// QPointer for safe dangling reference
QPointer<QWidget> safePtr = widget;
if (safePtr) safePtr->show();

// Explicit delete with parent-awareness
delete widget; // Removes from parent layout, deletes children

// Use QCache for expensive-to-create objects
QCache<QString, QPixmap> cache(100 * 1024 * 1024); // 100 MB
cache.insert("background", new QPixmap("bg.png"));

// QSharedPointer for shared ownership
QSharedPointer<ExpensiveObject> shared = QSharedPointer<ExpensiveObject>::create();
```

## Profiling

```cpp
// Qt Creator Profiler (built-in)
// Analyze → QML Profiler (QML bindings, JS calls, scene graph)
// Analyze → CPU Usage Analyzer (C++ hotspots)

// Custom performance measurement
#include <QElapsedTimer>
QElapsedTimer timer;
timer.start();
performOperation();
qDebug() << "Operation took" << timer.elapsed() << "ms";

// Qt Quick Compiler (QML → C++ ahead-of-time)
// qmlcachegen generates optimized QML caching
// qmlsc generates compiled QML for faster startup
```

## QML Profiling Tips

```
Turn on QML profiling:
1. Set environment: QML_DEBUG=1 QML_DEBUG_SERVER_PORT=3768
2. In Qt Creator: Analyze → QML Profiler → Connect
3. Look for:
   - Bindings that re-evaluate frequently
   - Slow JavaScript functions
   - Scene graph render time > 16ms (60fps frame budget)
   - Excessive item count in delegates
```

## Checklist

- QSurfaceFormat configured for 60fps rendering
- QtConcurrent for background computation (not QThread directly)
- ListView with cache buffer for large models
- Loader for deferred component creation
- QPixmap cache for repeated image loads
- QElapsedTimer for targeted profiling
- QML Compiler (qmlsc) for production builds
- Avoid synchronous file/network I/O on main thread
- Scene graph inspector for render performance
- QSG_LOG_ITEM_COUNT=1 for debugging item counts
- Reduce binding re-evaluation — use Binding { when: ... } for conditional
- Canvas 2D replaced with ShaderEffect for pixel operations
