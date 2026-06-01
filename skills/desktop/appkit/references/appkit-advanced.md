# AppKit Advanced Topics

## Overview
Advanced AppKit covers complex view controller containment, custom NSView subclassing with CALayer, responsive UI with Auto Layout constraints, Core Data integration, drag-and-drop, and accessibility.

## Advanced Concepts

### Concept 1: View Controller Containment
NSViewController containment enables building complex interfaces from reusable controller components. Add child view controllers with addChildViewController(), manage view lifecycle transitions, and forward responder chain events. Use for split views, tab interfaces, and wizard flows.

### Concept 2: CALayer and Custom Drawing
NSView with wantsLayer = true uses CALayer for hardware-accelerated compositing. Custom CALayer subclasses for advanced effects: gradient layers, shape layers with animated paths, replicator layers for particle effects. Use NSAnimationContext for implicit animations.

### Concept 3: Auto Layout and Constraints
Programmatic constraints with NSLayoutConstraint or Visual Format Language (VFL). NSLayoutAnchor API (leadingAnchor, topAnchor, widthAnchor) provides type-safe constraint creation. Priority-based layout for adaptive resizing. NSStackView for automatic layout.

### Concept 4: Core Data Integration
NSPersistentContainer for stack setup, NSManagedObjectContext for data operations, NSFetchRequest with NSPredicate and NSSortDescriptor, NSFetchedResultsController for table/collection view integration, and Core Data migrations (lightweight vs manual).

### Concept 5: Accessibility with NSAccessibility
Every NSView subclass should implement NSAccessibility protocol: accessibilityRole, accessibilityLabel, accessibilityValue, accessibilityPerformPress, accessibilityFocusedUIElement. Use NSAccessibility protocols for custom controls. Test with Accessibility Inspector.

## Advanced Techniques

### Custom Animation with NSViewAnimation
```swift
// View-based animation
NSAnimationContext.runAnimationGroup { context in
    context.duration = 0.3
    context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    myView.animator().alphaValue = 0.0
    myView.animator().frame.origin.y += 20
}
```

### Drag-and-Drop with Pasteboard
```swift
// Write to pasteboard
let pb = NSPasteboard(name: .dragPboard)
pb.clearContents()
pb.setString(data, forType: .myCustomType)

// Read from pasteboard
let items = pb.readObjects(forClasses: [NSString.self])
```

### Core Data Migration
Lightweight migration: add attributes, add relationships, add entities. Manual migration: mapping model, migration manager, custom NSEntityMigrationPolicy.

## Anti-Patterns

- Deep view hierarchy without containment
- wantsLayer without performance considerations
- Copy-paste constraint code (use NSStackView)
- Core Data on the main thread for large operations
- Accessibility as an afterthought
- Ignoring NSAnimationContext for animation
- Manual layout calculations instead of Auto Layout
- Strong delegate references causing retain cycles
