---
name: desktop/kde
description: >
  Comprehensive engineering skill for building advanced desktop applications using the KDE ecosystem.
  Focuses on Plasma, Kirigami, KWin, and Qt/QML integration for robust and visually convergent user interfaces.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - kde
  - plasma
  - kirigami
  - kwin
  - qml
  - c++
  - desktop
---

# Desktop KDE Engineering Skill

## Purpose
The desktop/kde skill encompasses the foundational architecture, best practices, and advanced implementation strategies necessary for developing rich, high-performance applications within the KDE ecosystem. It unifies Plasma workspaces, KWin compositing features, and Kirigami UI components to produce converged experiences across desktop and mobile devices.

## Core Principles
1. **Convergence Through Kirigami**: Ensure UI components adapt gracefully to different screen sizes and input methods without duplicating logic.
2. **Wayland-First KWin Compositing**: Prioritize Wayland for window management, rendering pipelines, and efficient IPC with DBus.
3. **Decoupled State Management**: Maintain strict separation between QML frontend layers and C++ backend state objects.
4. **Performance by Default**: Optimize rendering paths, avoid frequent QML garbage collection, and manage memory meticulously in C++.
5. **Secure DBus IPC**: Enforce strict validation on all inter-process communication interfaces to prevent privilege escalation or data leakage.

## Agent Protocol
- **Triggers**: Initialization of KDE projects, debugging Wayland compositors, designing Kirigami interfaces, DBus IPC configuration.
- **Input Context Required**: QML module dependencies, CMake configuration paths, target environment details (X11 vs Wayland).
- **Output Artifact**: Verified CMakeLists.txt, optimized QML schemas, integrated C++ backend classes.
- **Response Formats**:
```json
{
  "status": "success",
  "component": "Kirigami.Page",
  "action": "layout_update",
  "recommendations": [
    "Use ColumnLayout for dynamic sizing",
    "Bind properties via C++ Q_PROPERTY"
  ]
}
```

## Decision Matrix
```ascii
                            +--------------------------+
                            |       Select Task        |
                            +-----------+--------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
        +--------v-------+                            +--------v-------+
        |  UI Rendering  |                            | Window Manager |
        +--------+-------+                            +--------+-------+
                 |                                             |
       +---------+----------+                        +---------+----------+
       |                    |                        |                    |
+------v-------+    +-------v-------+        +-------v-------+    +-------v-------+
|  Kirigami    |    |  Qt Quick     |        |    KWin       |    |   Wayland     |
| Components   |    |  Primitives   |        | Extensions    |    | Compositor    |
+--------------+    +---------------+        +---------------+    +---------------+
```

## Detailed Architectural Overview
```ascii
+---------------------------------------------------------------------------------+
|                                 KDE Application Lifecycle                       |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   +-------------------+       +-------------------+       +-------------------+ |
|   |   Bootstrapping   +-------> Initialization    +------->   Execution       | |
|   | (KAboutData, CLI) |       | (QQmlEngine)      |       | (Event Loop)      | |
|   +-------------------+       +--------+----------+       +--------+----------+ |
|                                        |                           |            |
|                               +--------v----------+       +--------v----------+ |
|                               |   DBus Services   |       | Kirigami/Plasma   | |
|                               | Registration      |       | Rendering         | |
|                               +-------------------+       +-------------------+ |
+---------------------------------------------------------------------------------+
```

## Workflow Steps
1. **Initialization Phase**
   1. Setup KAboutData and KCrash handlers.
   2. Configure QCoreApplication attributes for high DPI.
   3. Instantiate QQmlApplicationEngine and register custom QML types.
2. **Backend Configuration**
   1. Define QObjects with Q_PROPERTY for state bindings.
   2. Establish DBus interfaces via QtDBus macros.
   3. Implement threading for non-blocking IO.
3. **Frontend Assembly**
   1. Design Kirigami.ApplicationWindow.
   2. Map UI components to C++ models.
   3. Apply KDE Plasma styling and theming rules.
4. **Integration & IPC**
   1. Connect KRunner or KWin plugins if applicable.
   2. Validate DBus signal emission and reception.
   3. Test interoperability with Plasma workspaces.
5. **Optimization**
   1. Profile QML rendering times using QSG_VISUALIZE.
   2. Limit JavaScript usage within QML bindings.
   3. Refactor heavy calculations into C++ workers.
6. **Deployment**
   1. Construct robust CMakeLists.txt using ECM (Extra CMake Modules).
   2. Package via AppImage or Flatpak.
   3. Automate testing with QTest and CTest.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| High CPU usage in QML | Excessive JS in bindings | Move logic to C++ backend and expose via Q_PROPERTY |
| Segfault on exit | Improper QObject parenting | Ensure KCrash is configured and check parent trees |
| Blank window on Wayland | Missing Wayland plugins | Verify QT_QPA_PLATFORM=wayland and dependencies |
| Kirigami icons missing | Breeze icon theme not found | Install `breeze-icon-theme` or check QIcon search paths |
| DBus timeout error | Blocking calls in service | Use asynchronous QtDBus calls or QDBusPendingReply |
| Poor scroll performance | Overuse of complex delegates | Use ListView with simple delegates and asynchronous image loading |

## Complete Execution Scenario
```ascii
[User Action] --> (Kirigami UI) --> [QML Binding] --> (C++ Backend)
                                                            |
                                                            v
[Plasma Workspace] <--- (DBus IPC) <----------------- [Business Logic]
        |
        v
    (KWin Compositor) --> [Display/Wayland Surface]
```

## Rules and Guidelines
1. Always prefer `org.kde.kirigami` components over standard QtQuick Controls for consistency.
2. Never perform blocking operations in the main thread; utilize `QThread` or `QtConcurrent`.
3. Use Extra CMake Modules (ECM) to ensure standard KDE install paths and translations.
4. Stick to Wayland native APIs whenever extending KWin; avoid X11 fallbacks.
5. Always define strict signal/slot connections to avoid memory leaks when QML objects are destroyed.

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
For related frontend integration, see the [Qt QML Skill](../qt/qml/SKILL.md). For low-level Wayland details, refer to the [Wayland Compositors Skill](../wayland/SKILL.md).

<!-- COMPRESSION_FOOTER: {"v":1,"tags":["kde","plasma","kirigami","kwin"],"type":"skill","refs":8} -->