# AppKit Controls Reference

## Control Class Hierarchy

```
NSResponder
├── NSView
│   ├── NSControl
│   │   ├── NSButton (push, toggle, radio, checkbox)
│   │   ├── NSTextField (label, editable text)
│   │   ├── NSSecureTextField (password)
│   │   ├── NSSlider (linear, circular)
│   │   ├── NSStepper
│   │   ├── NSComboBox
│   │   ├── NSPopUpButton (dropdown)
│   │   ├── NSDatePicker
│   │   ├── NSColorWell (color picker)
│   │   ├── NSLevelIndicator (progress bar, rating)
│   │   ├── NSPathControl (file path breadcrumb)
│   │   └── NSSegmentedControl
│   ├── NSTableView (column-based list)
│   ├── NSOutlineView (hierarchical tree)
│   ├── NSCollectionView (grid/layout)
│   ├── NSTextView (rich text editing)
│   ├── NSImageView
│   ├── NSBox (grouping container)
│   ├── NSTabView
│   ├── NSSplitView
│   ├── NSScrollView
│   ├── NSStackView (auto-layout stack)
│   └── NSVisualEffectView (vibrancy/blur)
├── NSViewController
└── NSWindowController
```

## NSTableView with Cell-Based View

```swift
class FileListViewController: NSViewController {
    @IBOutlet weak var tableView: NSTableView!
    var files: [FileInfo] = []

    override func viewDidLoad() {
        tableView.delegate = self
        tableView.dataSource = self

        // Configure columns
        let nameColumn = NSTableColumn(identifier: .name)
        nameColumn.title = "Name"
        nameColumn.width = 200
        tableView.addTableColumn(nameColumn)

        let dateColumn = NSTableColumn(identifier: .date)
        dateColumn.title = "Date Modified"
        dateColumn.width = 150
        tableView.addTableColumn(dateColumn)
    }
}

extension FileListViewController: NSTableViewDataSource {
    func numberOfRows(in tableView: NSTableView) -> Int {
        return files.count
    }
}

extension FileListViewController: NSTableViewDelegate {
    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard let column = tableColumn else { return nil }
        let file = files[row]

        if column.identifier == .name {
            let cell = tableView.makeView(withIdentifier: .nameCell, owner: self)
                as? NSTableCellView ?? NSTableCellView()
            cell.textField?.stringValue = file.name
            cell.imageView?.image = file.icon
            cell.identifier = .nameCell
            return cell
        } else {
            let cell = tableView.makeView(withIdentifier: .dateCell, owner: self)
                as? NSTableCellView ?? NSTableCellView()
            cell.textField?.stringValue = file.modifiedDate.formatted(date: .numeric, time: .shortened)
            cell.identifier = .dateCell
            return cell
        }
    }
}

extension NSUserInterfaceItemIdentifier {
    static let name = Self("name")
    static let nameCell = Self("nameCell")
    static let date = Self("date")
    static let dateCell = Self("dateCell")
}
```

## NSButton Styles

```swift
// Push button (default)
let btn = NSButton(title: "Save", target: self, action: #selector(save))

// Checkbox
let checkbox = NSButton(checkboxWithTitle: "Enable feature", target: self, action: #selector(toggleFeature))
checkbox.state = .on

// Radio button
let radio1 = NSButton(radioButtonWithTitle: "Option A", target: self, action: #selector(selectOption))
let radio2 = NSButton(radioButtonWithTitle: "Option B", target: self, action: #selector(selectOption))

// Switch (macOS 14+)
let toggle = NSSwitch()
toggle.target = self
toggle.action = #selector(toggleSetting)

// Pop-up button (dropdown)
let popup = NSPopUpButton(target: self, action: #selector(selectItem))
popup.addItems(withTitles: ["Option 1", "Option 2", "Option 3"])

// Segmented control
let seg = NSSegmentedControl(labels: ["Day", "Week", "Month"], trackingMode: .selectOne, target: self, action: #selector(viewModeChanged))
seg.selectedSegment = 0

// Color well
let colorWell = NSColorWell()
colorWell.color = NSColor.controlAccentColor
colorWell.action = #selector(colorChanged)
```

## NSTextField and NSTextView

```swift
// Label
let label = NSTextField(labelWithString: "File Name:")
label.font = .systemFont(ofSize: 13, weight: .medium)

// Editable text field
let textField = NSTextField(string: "")
textField.placeholderString = "Enter file name..."
textField.isEditable = true
textField.delegate = self // NSControlTextEditingDelegate
textField.bezelStyle = .roundedBezel

// Rich text view
let textView = NSTextView(frame: .zero)
textView.isRichText = true
textView.allowsUndo = true
textView.isGrammarCheckingEnabled = true
textView.automaticSpellingCorrectionEnabled = true

// Wrap in scroll view
let scrollView = NSScrollView()
scrollView.documentView = textView
scrollView.hasVerticalScroller = true
scrollView.borderType = .bezelBorder
```

## NSStackView Layout

```swift
// Horizontal stack
let hStack = NSStackView(views: [label, textField, button])
hStack.orientation = .horizontal
hStack.spacing = 8
hStack.alignment = .centerY
hStack.distribution = .fill

// Vertical stack
let vStack = NSStackView(views: [headerLabel, hStack, footerLabel])
vStack.orientation = .vertical
vStack.spacing = 16
vStack.edgeInsets = NSEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)

// Nested stacks with Auto Layout
view.addSubview(vStack)
vStack.translatesAutoresizingMaskIntoConstraints = false
NSLayoutConstraint.activate([
    vStack.topAnchor.constraint(equalTo: view.topAnchor),
    vStack.leadingAnchor.constraint(equalTo: view.leadingAnchor),
    vStack.trailingAnchor.constraint(equalTo: view.trailingAnchor),
])
```

## NSVisualEffectView (Vibrancy)

```swift
let effectView = NSVisualEffectView()
effectView.material = .sidebar        // .hudWindow, .popover, .menu, .contentBackground
effectView.blendingMode = .behindWindow
effectView.state = .active            // .followsWindowActiveState

// Wrap content in effect view
effectView.addSubview(contentView)
```

## Touch Bar Support

```swift
override func makeTouchBar() -> NSTouchBar? {
    let bar = NSTouchBar()
    bar.defaultItemIdentifiers = [.save, .share, .flexibleSpace, .slider]
    bar.delegate = self
    return bar
}

extension ViewController: NSTouchBarDelegate {
    func touchBar(_ touchBar: NSTouchBar, makeItemForIdentifier identifier: NSTouchBarItem.Identifier) -> NSTouchBarItem? {
        switch identifier {
        case .save:
            return NSButtonTouchBarItem(identifier: identifier, title: "Save", target: self, action: #selector(save))
        case .slider:
            return NSSliderTouchBarItem(identifier: identifier)
        default:
            return nil
        }
    }
}
```
