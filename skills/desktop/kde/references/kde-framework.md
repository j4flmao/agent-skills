# KDE Frameworks Reference

## Kirigami

```qml
import org.kde.kirigami as Kirigami

Kirigami.ApplicationWindow {
    id: root
    title: "My App"

    globalDrawer: Kirigami.GlobalDrawer {
        isMenu: false
        actions: [
            Kirigami.Action { text: "Home"; icon.name: "go-home" },
            Kirigami.Action { text: "Settings"; icon.name: "settings-configure" }
        ]
    }

    pageStack.initialPage: Kirigami.ScrollablePage {
        title: "Main Page"
        Kirigami.Card {
            banner: Image { source: "banner.jpg" }
            contentItem: Label { text: "Card content" }
            actions: [
                Kirigami.Action { icon.name: "document-edit" }
            ]
        }
    }
}

// Kirigami components:
// - ApplicationWindow — main shell with drawer + page stack
// - ScrollablePage — page with auto-scroll content
// - Card — material-style card with banner, content, actions
// - BasicListItem — item delegate with icon, text, secondary
// - InlineMessage — temporary notification bar
// - AbstractListHeader — section header for lists
```

## KConfig

```cpp
// KConfig XT — declarative settings
// settings.kcfg
<kcfg>
  <kcfgfile name="myapprc"/>
  <group name="General">
    <entry name="theme" type="String">
      <default>auto</default>
    </entry>
    <entry name="autoSave" type="Bool">
      <default>true</default>
    </entry>
    <entry name="refreshInterval" type="Int">
      <default>60</default>
      <min>5</min>
      <max>3600</max>
    </entry>
  </group>
</kcfg>

// Generated class: SettingsBase
#include "settings.h"
KConfigSkeleton *config = Settings::self();
QString theme = Settings::theme();
Settings::setAutoSave(false);
Settings::self()->save();
```

```cmake
kconfig_add_kcfg_files(myapp_sources settings.kcfg)
```

## KIO

```cpp
#include <KIO/Job>
#include <KIO/StatJob>
#include <KIO/CopyJob>

// File copy with network transparency
KIO::Job *job = KIO::copy(sourceUrl, destUrl, KIO::Overwrite);
connect(job, &KIO::Job::result, this, [](KJob *job) {
    if (job->error())
        KMessageBox::error(nullptr, job->errorString());
});

// List directory contents (local or remote)
KIO::SimpleJob *listJob = KIO::listDir(url);
connect(listJob, &KIO::Job::result, this, &onListComplete);

// File open dialog with KIO
#include <KFileWidget>
KFileWidget dialog(KFileWidget::Open, this);
dialog.setMimeFilter({"text/plain"});
dialog.setOperationMode(KFileWidget::Opening);
```

## Solid

```cpp
#include <Solid/Device>
#include <Solid/StorageAccess>

// Detect storage devices
for (const Solid::Device &device :
     Solid::Device::listFromType(Solid::DeviceInterface::StorageAccess)) {
    if (device.is<Solid::StorageAccess>()) {
        auto *access = device.as<Solid::StorageAccess>();
        qDebug() << "Mount point:" << access->filePath();
        connect(access, &Solid::StorageAccess::accessibilityChanged,
                this, &onMountChanged);
    }
}

// Power management
Solid::PowerManagement::requestSleep();
```

## Phonon (Multimedia)

```cpp
#include <Phonon/MediaObject>
#include <Phonon/AudioOutput>

Phonon::MediaObject *media = new Phonon::MediaObject(this);
Phonon::AudioOutput *audio = new Phonon::AudioOutput(
    Phonon::MusicCategory, this);
Phonon::createPath(media, audio);

media->setCurrentSource(Phonon::MediaSource("music.mp3"));
media->play();

connect(media, &Phonon::MediaObject::finished,
        this, &onPlaybackFinished);
```

## Plasma Integration

```cpp
// Access Plasma theme
#include <KColorScheme>
KColorScheme scheme(QPalette::Active, KColorScheme::View);
QColor bg = scheme.background(KColorScheme::NormalColor);
QColor fg = scheme.foreground(KColorScheme::NormalColor);

// Plasma data engine access
#include <Plasma/DataEngine>
Plasma::DataEngine *engine = dataEngine("weather");
engine->connectSource("weather|city", this);

// Notification
#include <KNotification>
KNotification *notif = new KNotification("newMessage", this);
notif->setText("You have a new message");
notif->sendEvent();
```

## QML Components

| Component | Purpose |
|-----------|---------|
| Kirigami.Card | Material-style card with banner, body, actions |
| Kirigami.SearchField | Search input with debounce |
| Kirigami.SelectableLabel | Selectable + copy text label |
| Kirigami.OverlaySheet | Modal bottom sheet |
| Kirigami.PromptDialog | Confirmation dialog |
| Kirigami.ActionTextField | Text field with action icons |

## Key Architecture Rules

- Kirigami.ApplicationWindow for convergent desktop/mobile apps
- KConfig XT for all settings (automatic persistence + UI binding)
- KIO for file operations (network-transparent, works with remote)
- Solid for hardware detection (devices, power, networking)
- Breeze icon naming convention for all icon references
- KNotification for desktop notifications
- ECM (Extra CMake Modules) required for KDE CMake helpers
- Plasma::DataEngine for real-time data sources (weather, battery, etc.)
