# UWP Fundamentals

## Overview
The Universal Windows Platform (UWP) is Microsoft's app platform for Windows 10/11 with XAML UI, WinRT APIs, sandboxed deployment via the Store, and adaptive layout. This reference covers fundamental UWP concepts.

## Core Concepts

### Concept 1: App Lifecycle
UWP apps transition through states: Launching → Running → Suspending → (Suspended/Terminated) → Resuming. OnSuspending has 5 seconds to save state (use deferral for async). OnLaunched checks PreviousExecutionState. Save critical data in OnSuspending.

### Concept 2: XAML Navigation
Frame manages page navigation with Navigate(typeof(PageType)). NavigationView (WinUI 2.x) provides sidebar/header navigation with built-in back button, pane modes, and settings integration. Pages push/pop within the Frame.

### Concept 3: Adaptive Layout
VisualStateManager + AdaptiveTrigger switches layouts at window width breakpoints. State setters modify control properties per breakpoint. RelativePanel positions child elements relative to each other. Use 3-4 breakpoints covering mobile (0-599), tablet (600-1023), and desktop (1024+).

### Concept 4: Data Binding
x:Bind (compiled, type-checked, faster) is preferred over Binding (reflection-based, slower). Bind to ViewModel properties with {x:Bind ViewModel.Property}. Use converters for type transformations. x:Bind supports x:Phase for deferred loading.

### Concept 5: Background Tasks
Background tasks run when the app is suspended or closed. Types: timer trigger (TimeTrigger, up to 15 min), system event (SystemTrigger: user present, internet available), push notification (RawNotification), and maintenance trigger.

## Best Practices

- Use CommunityToolkit.Mvvm for MVVM source generation
- Prefer x:Bind over Binding (compiled, type-safe)
- AdaptiveTrigger for responsive layouts (not code-behind)
- Save state in OnSuspending with deferral
- WinUI 2.x controls for modern UI
- ConnectedAnimation for page transitions
- Register background tasks with conditions
- Version package manifest for Store updates

## Anti-Patterns

- Data loss on suspend (not saving state)
- .NET Native serialization issues (use DataContract)
- No adaptive layout (broken at different widths)
- x:Bind limitations with complex expressions
- UI thread blocking with synchronous operations
- Missing capability declarations in manifest
- Background task timeouts (over 30 seconds)
- Large package size (unnecessary WinMD references)
