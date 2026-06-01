# AppKit Fundamentals

## Overview
AppKit is Apple's native macOS UI framework, providing window management, event handling, view hierarchy, and OS integration. This reference covers fundamental AppKit concepts, patterns, and best practices for building native macOS applications.

## Core Concepts

### Concept 1: MVC Architecture
AppKit follows Model-View-Controller: Model (data + business logic), View (NSView subclasses for display), Controller (NSViewController/NSWindowController mediates between them). Controllers use outlets (references to views) and actions (IBAction methods responding to user events).

### Concept 2: View Controller Lifecycle
loadView() → viewDidLoad() → viewWillAppear() → viewDidAppear() → viewWillDisappear() → viewDidDisappear(). Override these to set up, update, and tear down view state. Never access outlets before loadView().

### Concept 3: Responder Chain
Events (mouse, keyboard, touch) travel through the responder chain: first responder (key view) → its view controller → window → window controller → application → app delegate. Implement IBAction methods on any responder; they will be found automatically.

### Concept 4: Bindings and KVO
Cocoa Bindings connect model properties to view properties without glue code. Key-Value Observing (KVO) notifies objects of property changes. Prefer Combine framework for new code — it's more explicit and debuggable than IB bindings.

### Concept 5: Window Management
NSWindow has style masks (titled, closable, miniaturizable, resizable, fullSizeContentView), levels (normal, floating, modal panel), and behaviors (restorable, autosave name for geometry). Use NSWindowController for document-based apps.

## Best Practices

- Use storyboards for menu and window layout, programmatic views for complex content
- Prefer NSViewController containment over custom container views
- Implement validateMenuItem: for dynamic menu state
- Use NSColor system colors for automatic dark mode support
- Autosave window position with NSWindow autosaveName
- Prefer constraints (NSLayoutConstraint) over autoresizing masks
- Use NSView's wantsLayer for GPU-accelerated compositing
- Test accessibility with VoiceOver from the start
- Use Swift for new code (memory safety, Swift concurrency)
- Version Core Data models to prevent migration failures

## Anti-Patterns

- Strong delegate references (retain cycles) — use weak
- Hardcoded colors that don't adapt to dark mode
- Main thread blocking with synchronous I/O
- IB bindings for complex logic (fragile, hard to debug)
- Accessing outlets before viewDidLoad
- Deep view hierarchies (performance degradation)
- Custom drawing without wantsLayer (CPU-bound rendering)
