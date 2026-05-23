# Kirigami Guide Reference

## Kirigami.ApplicationWindow

```qml
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

Kirigami.ApplicationWindow {
    id: root

    // Window properties
    title: "My KDE App"
    width: 900
    height: 700
    minimumWidth: 400
    minimumHeight: 300

    // Page stack (primary navigation)
    pageStack.initialPage: mainPage

    // Context drawer (mobile sidebar)
    contextDrawer: Kirigami.ContextDrawer {
        id: contextDrawer
    }

    // Settings action
    actions.main: Kirigami.Action {
        icon.name: "documentinfo"
        text: "Info"
        onTriggered: pageStack.push(infoPage)
    }

    // Right action
    actions.right: Kirigami.Action {
        icon.name: "document-edit"
        text: "Edit"
        onTriggered: pageStack.push(editorPage)
    }

    // Left action (hamburger)
    // visible when globalDrawer is set
}
```

## GlobalDrawer (Sidebar)

```qml
Kirigami.ApplicationWindow {
    globalDrawer: Kirigami.GlobalDrawer {
        title: "Navigation"
        titleIcon: Kirigami.Theme.iconName("applications-system")

        // Banner area
        banner: Image { source: "banner.png"; fillMode: Image.PreserveAspectCrop }

        actions: [
            Kirigami.Action {
                text: "Dashboard"
                icon.name: "go-home"
                onTriggered: pageStack.layers.clear()
            },
            Kirigami.Action {
                text: "Files"
                icon.name: "folder"
                onTriggered: pageStack.push(filesPage)
            },
            Kirigami.Action {
                text: "Settings"
                icon.name: "settings-configure"
                onTriggered: pageStack.push(settingsPage)
            },
            Kirigami.Action {
                text: "About"
                icon.name: "help-about"
                onTriggered: pageStack.push(aboutPage)
            },
            // Separator
            Kirigami.Action { separator: true },
            Kirigami.Action {
                text: "Quit"
                icon.name: "application-exit"
                onTriggered: Qt.quit()
            }
        ]
    }
}
```

## Pages and Card Layout

```qml
import org.kde.kirigami as Kirigami

Kirigami.ScrollablePage {
    title: "Dashboard"

    Kirigami.CardsLayout {
        Kirigami.AbstractCard {
            contentItem: Item {
                implicitWidth: 300
                implicitHeight: 160
                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: Kirigami.Units.largeSpacing
                    Kirigami.Heading {
                        text: "Welcome"
                        level: 2
                    }
                    Kirigami.Separator {
                        Layout.fillWidth: true
                    }
                    Label {
                        text: "This is a Kirigami card"
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                    }
                }
            }
        }

        Kirigami.AbstractCard {
            contentItem: ColumnLayout {
                Kirigami.Heading {
                    text: "Quick Actions"
                    level: 2
                }
                Button {
                    text: "Open File"
                    Layout.fillWidth: true
                }
                Button {
                    text: "Settings"
                    Layout.fillWidth: true
                }
            }
        }
    }
}
```

## FormLayout

```qml
Kirigami.FormLayout {
    Kirigami.Heading {
        text: "Settings"
        Kirigami.FormData.label: ""
        Kirigami.FormData.isSection: true
    }

    TextField {
        Kirigami.FormData.label: "Name:"
        placeholderText: "Enter your name"
    }

    SpinBox {
        Kirigami.FormData.label: "Count:"
        from: 0
        to: 100
        value: 10
    }

    ComboBox {
        Kirigami.FormData.label: "Theme:"
        model: ["Light", "Dark", "System"]
    }

    CheckBox {
        Kirigami.FormData.label: ""
        text: "Enable notifications"
    }

    Kirigami.Separator {
        Kirigami.FormData.label: ""
        Kirigami.FormData.isSection: true
    }

    RowLayout {
        Kirigami.FormData.label: "Actions:"
        Button { text: "Save" }
        Button { text: "Reset" }
    }
}
```

## Dialogs

```qml
// Dialog component
Kirigami.Dialog {
    id: confirmDialog
    title: "Confirm"
    standardButtons: Kirigami.Dialog.Ok | Kirigami.Dialog.Cancel

    onAccepted: { /* confirmed */ }
    onRejected: { /* cancelled */ }

    Label { text: "Are you sure you want to proceed?" }
}

// Inline message
Kirigami.InlineMessage {
    id: notification
    text: "Operation completed"
    type: Kirigami.MessageType.Positive
    showCloseButton: true
    visible: false
    Layout.fillWidth: true
}
```

## SearchField

```qml
Kirigami.SearchField {
    id: searchField
    placeholderText: "Search items..."
    Layout.fillWidth: true
    onAccepted: performSearch(text)
    onTextChanged: if (text.length === 0) clearSearch()
}
```

## PromptDialog

```qml
Kirigami.PromptDialog {
    id: promptDialog
    title: "New Folder"
    text: "Enter folder name:"

    onAccepted: {
        console.log("Creating:", promptDialog.inputText)
        createFolder(promptDialog.inputText)
    }
}
```

## OverlaySheet

```qml
Kirigami.OverlaySheet {
    id: sheet
    parent: root.overlay

    ColumnLayout {
        Kirigami.Heading { text: "Details" }
        Label { text: "Additional information in overlay sheet" }
        Button { text: "Close"; onClicked: sheet.close() }
    }
}
```

## Units Reference

```qml
// Kirigami.Units provides platform-consistent spacing
import org.kde.kirigami as Kirigami

ColumnLayout {
    spacing: Kirigami.Units.largeSpacing    // ~16px

    Item { Layout.preferredHeight: Kirigami.Units.gridUnit }  // ~22px
    Label { leftPadding: Kirigami.Units.smallSpacing }         // ~4px
}

// Pixel values (Breeze theme defaults):
// smallSpacing: 4px
// defaultSpacing: 8px
// largeSpacing: 16px
// gridUnit: 22px
// iconSizes: smallMedium(22), desktop(32), large(48), huge(64)
```

## Theme Integration

```qml
import org.kde.kirigami as Kirigami

Label {
    // Theme-aware colors
    color: Kirigami.Theme.textColor
    // Other theme colors available:
    // - Kirigami.Theme.backgroundColor
    // - Kirigami.Theme.highlightColor
    // - Kirigami.Theme.positiveTextColor
    // - Kirigami.Theme.neutralTextColor
    // - Kirigami.Theme.negativeTextColor
    // - Kirigami.Theme.disabledTextColor
    // - Kirigami.Theme.linkColor
    // - Kirigami.Theme.viewBackgroundColor
    // - Kirigami.Theme.alternateBackgroundColor
}

// Theme-aware icon
Image {
    source: Kirigami.Theme.iconName("document-save")
}
```
