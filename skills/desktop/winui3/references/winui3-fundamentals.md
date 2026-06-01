# WinUI 3 Fundamentals

## Overview
WinUI 3 with the Windows App SDK is Microsoft's modern native Windows UI framework, providing Fluent Design, Mica materials, and full WinRT API access without UWP sandboxing. This reference covers fundamental WinUI 3 concepts.

## Core Concepts

### Concept 1: Windows App SDK
The Windows App SDK provides WinUI 3 plus additional APIs for push notifications, app lifecycle, and deployment. It decouples UI framework from the OS version, enabling new features without requiring Windows updates. Packaged apps (MSIX) get full API access.

### Concept 2: XAML UI
WinUI uses XAML markup for UI layout with code-behind in C# or C++/WinRT. Key controls: NavigationView (app shell), InfoBar (notifications), TabView (tabs), NavigationView (sidebar), Grid/StackPanel (layout), and WinUI DataGrid (CommunityToolkit).

### Concept 3: Navigation and Shell
NavigationView provides collapsed/expanded sidebar, navigation items, header, and settings link. Frame manages page navigation with navigation transitions (SlideNavigationTransition, DrillInNavigationTransition). Pages are NavigationView content.

### Concept 4: Windows 11 Materials
Mica (desktop wallpaper blended material) and Acrylic (frosted glass) provide modern backgrounds. MicaController applies Mica to any surface. DesktopAcrylicController for acrylic. Cross-window dragging requires proper title bar setup with SetTitleBar.

### Concept 5: MVVM with CommunityToolkit
ObservableObject, ObservableProperty, RelayCommand, and source generators reduce boilerplate. Apps use binding to ViewModel properties. Dependency injection recommended for service resolution.

## Best Practices

- MVVM with CommunityToolkit.Mvvm
- MSIX packaging for full API access
- Mica backdrop for Win11 native look
- x:Bind over Binding (compiled, type-safe)
- NavigationView for app shell
- InfoBar for status notifications
- Lazy loading pages for performance
- Theme-aware resources for dark mode

## Anti-Patterns

- Unpackaged deployment (missing Mica, background access)
- WinUI 2 APIs in WinUI 3 (different namespaces)
- Title bar customization broken (drag regions wrong)
- WinRT threading issues (STA/MTA confusion)
- No backward-compatible Win10 checks (Win11-only APIs crash)
- Large MSIX packages (unnecessary dependencies)
- No DispatcherQueue for cross-thread UI
- Resource dictionary conflicts
