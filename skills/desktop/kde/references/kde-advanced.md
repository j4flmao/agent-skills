# KDE Advanced Topics

## Overview
Advanced KDE covers Kirigami navigation patterns, KIO slave development, Plasma applet creation, KRunner plugin development, KConfig XT advanced features, and internationalization at scale.

## Advanced Concepts

### Concept 1: Kirigami Navigation Patterns
Advanced page management: push/pop with page stack, master-detail with split view, modal sheets (OverlaySheet), context drawers (GlobalDrawer), and wizard flows with sequential pages. Use Kirigami.Action for undo/redo patterns and Kirigami.InlineView for in-page navigation.

### Concept 2: KIO Slave Development
Custom KIO slaves add support for new protocols (kio-webkit, kio-gdrive). Implement listDir, stat, get, put, copy, move, delete, and mimetype. Slaves run in separate processes for isolation. Register in KDE system configuration.

### Concept 3: Plasma Applet Configuration
KCModule for applet configuration (declarative QML or C++), config keys stored in KConfig XT, ConfigModel for list-based configurations, and Kirigami.FormLayout for consistent settings appearance.

### Concept 4: KRunner Advanced
Custom runners with multiple match categories, file-based results with preview, action lists for complex results (open, copy path, reveal in file manager), configuration interface, and relevance tuning per query type.

### Concept 5: KDE i18n at Scale
KLocalizedString with plural forms (ki18np), context-sensitive translations (ki18nc with comment), semantic markup for accessible text, and translation template generation via extractrc and xgettext. Use KUIT (KDE User Interface Text) guidelines.

## Advanced Techniques

### Plasma Applet with JavaScript
```qml
import QtQuick 2.15
import org.kde.plasma.plasmoid 2.0

PlasmoidItem {
    Plasmoid.configurationRequired: false
    Plasmoid.busy: loading
    
    function updateData() {
        // Network request, update UI
    }
    
    Timer {
        interval: 60000
        running: true
        onTriggered: updateData()
    }
}
```

### KIO Slave Skeleton
```cpp
class MyProtocol : public KIO::SlaveBase {
    void get(const QUrl& url) override {
        QByteArray data = fetchData(url);
        dataPipe(data);
        processedSize(data.size());
        finished();
    }
};
```

## Anti-Patterns

- Plasma applets without configuration UI
- KIO slaves without caching (network overhead)
- Kirigami with fixed-width layouts (not adaptive)
- KRunner plugins that block on network requests
- Hardcoded strings with no i18n context
- Kirigami.ListItem without proper actions
- Not testing applet at different panel sizes
- Ignoring KDE system settings (colors, fonts, icons)
