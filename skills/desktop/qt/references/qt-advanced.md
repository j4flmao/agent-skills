# Qt Advanced Topics

## Overview
Advanced Qt covers QML engine optimization, C++ model performance, Qt network programming, Qt multimedia, Qt WebEngine integration, custom QML plugins, and cross-platform deployment.

## Advanced Concepts

### Concept 1: QML Engine Optimization
Cache compiled QML (.qmlc files), use Loader for deferred loading, avoid JavaScript in property bindings (prefer pure QML), use Qt.binding() for complex expressions, minimize re-evaluation with Binding type, and profile with qmlprofiler.

### Concept 2: High-Performance C++ Models
For large datasets (100K+ rows): use QAbstractItemModel with efficient canFetchMore/fetchMore for incremental loading, implement roles via roleNames() hash, batch updates with beginInsertRows/endInsertRows, and use QSortFilterProxyModel for server-side sorting.

### Concept 3: Qt Network Programming
QNetworkAccessManager for HTTP/HTTPS requests, QWebSocket for bidirectional communication, QSslSocket for secure TCP, QNetworkReply for handling responses, and QHttpMultiPart for file uploads. Use connection pooling for high-throughput scenarios.

### Concept 4: Qt WebEngine
Embed Chromium-based web content: QWebEngineView for web views, QWebEnginePage for page management, QWebChannel for C++ ↔ JavaScript communication, and QWebEngineProfile for persistent storage and custom schemes.

### Concept 5: Custom QML Modules
Register C++ types for QML: qmlRegisterType for QObject-based types, qmlRegisterUncreatableType for abstract types, qmlRegisterSingletonType for singletons, and QML_ELEMENT macro (Qt6) for automatic registration. Provide type-safe interfaces.

## Advanced Techniques

### QML Profiling
```bash
qmlprofiler -p 3768 myapp
# Analyze binding evaluations, JavaScript execution, scene graph rendering
```

### Custom QML Singleton
```cpp
class AppSettings : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString theme READ theme WRITE setTheme NOTIFY themeChanged)
    QML_SINGLETON  // Qt6
    QML_ELEMENT
};
```

### C++ ↔ JavaScript Communication
```cpp
// C++ side
class Bridge : public QObject {
    Q_OBJECT
    Q_INVOKABLE void callJS(const QString& data);
signals:
    void fromJS(const QString& data);
};

// QML side
WebChannel.id = "bridge";
Bridge.onFromJS.connect(handleFromJS);
function callCpp(data) { bridge.callJS(data); }
```

## Anti-Patterns

- QML property bindings with side effects
- Large QML files (slow to parse, compile)
- C++ models returning QVariantList (not QAbstractItemModel)
- Blocking network requests on main thread
- Multiple QWebEngineProfiles (memory overhead)
- QML singletons with mutable state (thread safety)
- Ignoring qmlscene vs qml runtime differences
- Direct widget manipulation from QML (use signal/slot)
