# Qt QML Guide Reference

## QML Component Hierarchy

```qml
// Main.qml — Entry point
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    visible: true
    width: 1024
    height: 768
    title: "QML App"

    // Define custom component inline
    component InfoCard : Rectangle {
        property string title: ""
        property string body: ""
        width: 200
        height: 100
        radius: 8
        color: "#f0f0f0"
        border.color: "#ddd"

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            Label { text: title; font.bold: true; font.pixelSize: 16 }
            Label { text: body; font.pixelSize: 12; color: "#666" }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16

        InfoCard { title: "Welcome"; body: "QML desktop app" }
        InfoCard { title: "Status"; body: "Running"; Layout.fillWidth: true }
    }
}
```

## Layout System

### Anchors
```qml
Rectangle {
    anchors.centerIn: parent
    anchors.horizontalCenter: parent.horizontalCenter
    anchors.verticalCenter: parent.verticalCenter
    anchors.top: parent.top
    anchors.bottom: button.top
    anchors.leftMargin: 16
    anchors.rightMargin: 16
}
```

### QtQuick.Layouts
```qml
import QtQuick.Layouts

RowLayout {
    spacing: 8
    Button { text: "Left" }
    Button { text: "Center"; Layout.fillWidth: true }
    Button { text: "Right" }
}

ColumnLayout {
    spacing: 12
    Label { text: "Top" }
    Rectangle {
        Layout.fillHeight: true
        Layout.fillWidth: true
        color: "blue"
    }
    Label { text: "Bottom" }
}

GridLayout {
    columns: 2
    rowSpacing: 8
    columnSpacing: 16
    Label { text: "Name:" }
    TextField { Layout.fillWidth: true }
    Label { text: "Email:" }
    TextField { Layout.fillWidth: true }
}
```

## Property Binding and Signals

```qml
Rectangle {
    property int counter: 0

    width: 200
    height: 100
    color: counter > 5 ? "green" : "red"

    Text {
        text: "Count: " + parent.counter
        anchors.centerIn: parent
    }

    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: parent.counter++
    }
}
```

## Model/View Patterns

### ListModel + ListView
```qml
ListModel {
    id: fruitModel
    ListElement { name: "Apple"; color: "red"; price: 1.20 }
    ListElement { name: "Banana"; color: "yellow"; price: 0.80 }
    ListElement { name: "Cherry"; color: "darkred"; price: 2.50 }
}

ListView {
    anchors.fill: parent
    model: fruitModel
    delegate: Rectangle {
        width: parent.width
        height: 50
        color: index % 2 === 0 ? "#f9f9f9" : "white"

        RowLayout {
            anchors.fill: parent
            anchors.margins: 8
            Rectangle {
                width: 16
                height: 16
                radius: 8
                color: model.color
            }
            Label { text: model.name; Layout.fillWidth: true }
            Label { text: "$" + model.price.toFixed(2) }
        }
    }
}
```

### C++ Model in QML
```qml
// C++ model exposed as context property
ListView {
    model: dataModel.items
    delegate: ItemDelegate {
        text: modelData
        onClicked: dataModel.currentIndex = index
    }
}
```

## Animations

```qml
Rectangle {
    id: box
    width: 100
    height: 100
    color: "blue"

    NumberAnimation on x {
        from: 0
        to: 300
        duration: 1000
        easing.type: Easing.InOutQuad
    }

    PropertyAnimation on color {
        from: "blue"
        to: "red"
        duration: 500
    }

    // Sequential animation
    SequentialAnimation {
        running: true
        loops: Animation.Infinite
        NumberAnimation { target: box; property: "rotation"; to: 360; duration: 2000 }
        PauseAnimation { duration: 500 }
    }
}
```

## Qt Quick Controls 2

```qml
import QtQuick.Controls

ApplicationWindow {
    SwipeView {
        id: swipeView
        anchors.fill: parent
        currentIndex: tabBar.currentIndex

        Page { Label { text: "Tab 1"; anchors.centerIn: parent } }
        Page { Label { text: "Tab 2"; anchors.centerIn: parent } }
        Page { Label { text: "Tab 3"; anchors.centerIn: parent } }
    }

    footer: TabBar {
        id: tabBar
        currentIndex: swipeView.currentIndex
        TabButton { text: "One" }
        TabButton { text: "Two" }
        TabButton { text: "Three" }
    }
}
```

## C++ Type Registration

```cpp
// Register QML type
qmlRegisterType<DataModel>("com.example.models", 1, 0, "DataModel");

// Then in QML:
// import com.example.models 1.0
// DataModel { id: myModel }
```

## Custom QML Component File

```qml
// Card.qml
import QtQuick
import QtQuick.Controls

Rectangle {
    property string cardTitle: ""
    property string cardBody: ""
    property color cardColor: "#ffffff"

    signal clicked()

    width: 280
    height: 160
    radius: 12
    color: cardColor

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        Label {
            text: cardTitle
            font.pixelSize: 18
            font.bold: true
        }
        Label {
            text: cardBody
            font.pixelSize: 14
            color: "#666"
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: parent.clicked()
    }
}
```

## Positioning: StackView

```qml
StackView {
    id: stack
    anchors.fill: parent
    initialItem: homePage

    Component { id: homePage; Page { ... } }
    Component { id: detailPage; Page { ... } }

    function pushDetail() { stack.push(detailPage) }
    function goBack() { stack.pop() }
}
```

## Dialogs

```qml
Dialog {
    id: confirmDialog
    title: "Confirm"
    standardButtons: Dialog.Yes | Dialog.No
    onAccepted: { /* do action */ }
    Label { text: "Are you sure?" }
}
```
