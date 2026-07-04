---
name: Desktop WinUI 3
description: >
  Harness engineering skill for building modern Windows desktop applications
  using WinUI 3, Windows App SDK, and Fluent Design System.
version: 2.0.0
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, windows, winui3, csharp, cpp, xaml]
---

# Desktop WinUI 3 Engineering

## Purpose
This skill encapsulates all the necessary architectural knowledge, design paradigms, and coding standards required to develop, test, and deploy robust desktop applications on Windows using WinUI 3 and the Windows App SDK. It provides agents and developers with precise operational semantics, troubleshooting heuristics, and structural templates to craft high-performance, fluent-design experiences.

## Core Principles
1. **Unify the Presentation Layer**: Always rely on WinUI 3 as the primary native UI framework, abstracting away Win32/UWP differences when possible.
2. **Prioritize Asynchronous Operations**: Leverage asynchronous programming (async/await in C#, co_await in C++/WinRT) for all I/O and intensive computations to maintain a responsive UI thread.
3. **Adopt Fluent Design Natively**: Implement native materials (Mica, Acrylic) and coherent animations consistently to match the Windows 11 design philosophy.
4. **Decouple Logic and View**: Implement strict MVVM (Model-View-ViewModel) patterns to ensure maintainability and testability of business logic.
5. **Optimize Resource Utilization**: Use virtualization for long lists and compiled bindings (`x:Bind`) extensively for minimal memory footprint and optimal execution speed.

## Agent Protocol

### Triggers
- When the user asks to "Create a new WinUI 3 app" or "Add a page to the desktop app".
- When encountering errors related to `Microsoft.UI.Xaml`, `DispatcherQueue`, or Windows App SDK.

### Input Context Required
- Target framework version (e.g., .NET 8.0 for C# or C++20 for C++/WinRT).
- Application packaging model (Packaged vs. Unpackaged).
- Minimal SDK version required.

### Output Artifact
- A compiled binary or structured source code representing a deployable desktop component.

### Response Formats
```json
{
  "operation": "CreatePage",
  "status": "Success",
  "files_modified": [
    "Views/MainPage.xaml",
    "Views/MainPage.xaml.cs"
  ],
  "warnings": []
}
```

## Decision Matrix
```
[Start]
  |
  +-- Needs custom windowing? 
  |     +-- [Yes] --> Use AppWindow API
  |     +-- [No]  --> Use default Window XAML element
  |
  +-- Language preference?
        +-- [C#] ----> Use .NET 8 + MVVM Community Toolkit
        +-- [C++] ---> Use C++/WinRT + XAML Compiler
```

## Detailed Architectural Overview

### Architecture Diagram
```
+-------------------------------------------------------------+
|                      Windows App SDK                        |
|  +-------------------+  +--------------------------------+  |
|  |     WinUI 3       |  |  MrtCore / Push Notifications  |  |
|  | (XAML, Controls)  |  |    (App Lifecycle, etc.)       |  |
|  +-------------------+  +--------------------------------+  |
|           |                           |                     |
|           v                           v                     |
|  +-------------------------------------------------------+  |
|  |                  Application Code                     |  |
|  |  +--------------+  +-------------+  +--------------+  |  |
|  |  |    Views     |  | ViewModels  |  |   Services   |  |  |
|  |  +--------------+  +-------------+  +--------------+  |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### Lifecycle Diagram
```
[Launched] -> [OnLaunched] -> [Window Created] -> [Activated] -> [Running] -> [Suspended/Closed]
```

## Workflow Steps

### Phase 1: Environment Setup
1. Verify Windows App SDK VSIX and NuGet packages are installed.
2. Initialize project using specific template (Packaged or Unpackaged).
3. Configure `app.manifest` and `Package.appxmanifest`.
4. Restore NuGet dependencies and build tools.

### Phase 2: Shell & Navigation
1. Create the main `AppWindow` with desired TitleBar customization.
2. Implement the `NavigationView` control for top-level routing.
3. Configure `Frame` navigation and backstack logic.
4. Bind navigation events to ViewModel commands.

### Phase 3: Data Binding & State
1. Define observable models implementing `INotifyPropertyChanged`.
2. Map commands to UI actions using `x:Bind`.
3. Handle state restoration during app suspension/resumption.
4. Integrate with local SQLite database or REST services.

### Phase 4: UI Refinement
1. Apply Fluent Design materials like Mica to the application backdrop.
2. Configure dark/light theme resource dictionaries.
3. Implement implicit animations for visual state transitions.
4. Ensure accessibility attributes (AutomationProperties) are populated.

### Phase 5: Testing
1. Write unit tests for ViewModels bypassing the UI thread.
2. Write UI tests using WinAppDriver or Appium.
3. Execute performance profiling (Visual Studio Diagnostics).
4. Verify memory leak absence using diagnostic tools.

### Phase 6: Packaging & Deployment
1. Select target architecture (x86, x64, ARM64).
2. Generate MSIX package or prepare standalone executable.
3. Sign the application package with a trusted certificate.
4. Deploy to the Microsoft Store or internal distribution server.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| "Class not registered" exception | Missing Windows App SDK runtime | Ensure deployment installs the correct runtime or use self-contained mode. |
| XamlParseException on launch | Malformed XAML or missing namespace | Validate XML structure and verify `xmlns` mappings. |
| App crashes silently on startup | Missing dependencies or wrong architecture | Check Event Viewer and ensure target architecture matches OS. |
| Window fails to become transparent | Mica not supported on OS version | Fall back to solid color if OS build < 22000. |
| Memory leaks on page navigation | Unsubscribed event handlers | Implement `IDisposable` or use weak event patterns. |
| Build fails with PRI errors | Duplicate resource keys | Clean project and ensure unique x:Key across ResourceDictionaries. |
| Slow initialization time | Heavy logic in App constructor | Defer heavy initialization to `OnLaunched` async tasks. |

## Complete Execution Scenario
```
[User Request: Add Settings Page]
       |
       v
[Agent Analyzes Request]
       |
       v
[Create SettingsPage.xaml] ---> [Apply Fluent Layout]
       |
       v
[Create SettingsViewModel.cs] ---> [Bind to LocalSettings]
       |
       v
[Update Navigation Configuration]
       |
       v
[Compile and Run Tests]
       |
       v
[Task Complete]
```

## Rules and Guidelines
1. Do not use legacy `Binding` when `x:Bind` can be utilized.
2. Never block the UI thread; always utilize `DispatcherQueue.TryEnqueue` when dispatching from background threads.
3. Always provide visual feedback for long-running operations (e.g., `ProgressRing`).
4. Keep the XAML tree as shallow as possible to minimize layout pass overhead.
5. All images and assets must provide multi-scale versions (100%, 150%, 200%, 400%) for high DPI monitors.

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
For related frontend desktop technologies, see the WPF or UWP skills. For backend services interacting with this desktop application, refer to the ASP.NET Core API skills.

<!-- COMPRESSION_FOOTER: {"checksum": "1234abcd", "timestamp": "2026-07-04", "size": "compressed"} -->