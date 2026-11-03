# Desktop App Engineer

**Who this is for:** You build native or cross-platform desktop applications.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (2 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`desktop-electron`](../../skills/desktop/electron/SKILL.md) | `desktop/electron` | Build cross-platform desktop applications using Electron — combining Chromium (for rendering) and Node.js (for system access). |
| [`desktop-tauri`](../../skills/desktop/tauri/SKILL.md) | `desktop/tauri` | Tauri builds desktop (Windows, macOS, Linux) and mobile (iOS, Android) apps from a web frontend rendered in the OS webview (WebView2, WKWebView,… |

## Level 2 — Professional (8 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`desktop-qt`](../../skills/desktop/qt/SKILL.md) | `desktop/qt` | Build cross-platform desktop (and embedded) applications using the Qt framework — QtWidgets for traditional desktop UIs, QtQuick/QML for fluid… |
| [`desktop-gtk`](../../skills/desktop/gtk/SKILL.md) | `desktop/gtk` | Build applications using GTK (GIMP Toolkit) — the primary widget toolkit for GNOME and a cross-platform toolkit supporting Linux, Windows, and macOS. |
| [`desktop-wpf`](../../skills/desktop/wpf/SKILL.md) | `desktop/wpf` | Build Windows desktop applications using Windows Presentation Foundation (WPF) — .NET's XAML-based UI framework with powerful data binding,… |
| [`desktop-winforms`](../../skills/desktop/winforms/SKILL.md) | `desktop/winforms` | Build and maintain Windows desktop applications using Windows Forms — .NET's mature, rapid-application-development UI framework with… |
| [`desktop-uwp`](../../skills/desktop/uwp/SKILL.md) | `desktop/uwp` | Build Universal Windows Platform (UWP) applications — Microsoft's modern Windows app platform with XAML UI, WinRT APIs, adaptive layout, and… |
| [`desktop-swiftui`](../../skills/desktop/swiftui/SKILL.md) | `desktop/swiftui` | Build native macOS applications using SwiftUI — Apple's declarative UI framework for all Apple platforms. |
| [`desktop-appkit`](../../skills/desktop/appkit/SKILL.md) | `desktop/appkit` | Build native macOS applications using AppKit — Apple's mature, Objective-C-originated UI framework. |
| [`desktop-gnome`](../../skills/desktop/gnome/SKILL.md) | `desktop/gnome` | Build applications and extensions for the GNOME desktop environment using GNOME platform libraries — GLib, GIO, GSettings, libadwaita, and GNOME… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-security`](../../skills/frontend/universal/security/SKILL.md) | `frontend/universal/security` | Prevent XSS, CSRF, and injection attacks. |
| [`dev-loop-performance-profiler`](../../skills/dev-loop/performance-profiler/SKILL.md) | `dev-loop/performance-profiler` | Identify, analyze, and resolve performance bottlenecks in applications — CPU profiling, memory profiling, I/O analysis, database query… |
| [`github-actions`](../../skills/devops/github-actions/SKILL.md) | `devops/github-actions` | Define CI/CD pipelines using GitHub Actions workflows, reusable workflows, and composite actions. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (2 skills):**

```bash
npx skills add j4flmao/agent-skills --skill desktop-electron --skill desktop-tauri
```

**Level 1 + 2 (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill desktop-electron --skill desktop-tauri --skill desktop-qt --skill desktop-gtk --skill desktop-wpf --skill desktop-winforms --skill desktop-uwp --skill desktop-swiftui --skill desktop-appkit --skill desktop-gnome
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`desktop-all`](../bundles.md#desktop-all) | 30 | Desktop: Electron, Tauri, Qt, Gtk, WPF, WinUI, UWP, WinForms, SwiftUI, AppKit, GNOME, KDE |

## Combine with

- [Frontend Engineer](frontend.md)
- [QA & Test Engineer](quality.md)

## Watch out

Level 1 and 2 are alternatives: install the one toolkit you ship with. WinUI 3 and KDE are covered inside `desktop/uwp` and `desktop/qt` references.
