# KDE Fundamentals

## Overview
KDE applications use KDE Frameworks — a set of libraries built on Qt providing KConfig (settings), KIO (file I/O), Kirigami (adaptive UI), KXMLGUI (menus/toolbars), and Plasma integration APIs. This reference covers fundamental KDE development concepts.

## Core Concepts

### Concept 1: Kirigami Adaptive UI
Kirigami provides convergent UI components that adapt to desktop, tablet, and mobile form factors. Kirigami.ApplicationWindow provides navigation drawer, page stack, and global actions. Pages can be pushed/popped. Cards and lists adapt to available width.

### Concept 2: KConfig XT
Type-safe configuration system: XML schema defines settings with types, defaults, and constraints. Code generates SettingsBase class with strongly-typed getters/setters. Supports multiple configuration files and group-based organization.

### Concept 3: KIO (KDE Input/Output)
Network-transparent file operations supporting local files, FTP, SFTP, SMB, WebDAV, and custom protocols. KIO jobs are asynchronous with progress reporting and cancellation. KFileWidget provides native file dialogs with preview support.

### Concept 4: Plasma Integration
KStatusNotifierItem (system tray), KNotification (desktop notifications), KRunner (search integration), MPRIS (media controls), and KWallet (credential storage). These integrate applications into the Plasma desktop experience.

### Concept 5: KAboutData and KService
KAboutData provides consistent about dialog with authors, license, and library dependency listing. KService provides plugin discovery and metadata loading. KPluginLoader loads plugins at runtime with dependency resolution.

## Best Practices

- KF6 + Qt6 for new projects
- Kirigami for adaptive, convergent apps
- KConfig XT over raw QSettings
- KIO over QFile (network transparency, progress)
- KLocalizedString for i18n (KDE infrastructure)
- CMake + ECM module system
- Plasma-style QQC2 theme for consistent look
- Test on both X11 and Wayland
- Flatpak distribution (KDE Flatpak runtime)

## Anti-Patterns

- Hardcoded strings (no i18n)
- KF5 for new projects (KF6 is current)
- Direct file I/O instead of KIO
- No D-Bus integration (app not scriptable)
- Plasma-specific APIs in non-Plasma contexts
- Static plugin loading (no discoverability)
- X11-specific code (broken on Wayland)
- Raw QSettings instead of KConfig XT
