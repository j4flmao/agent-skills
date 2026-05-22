---
name: mobile-dotnet-maui
description: >
  Use this skill when the user says '.NET MAUI', 'MAUI app', 'Xamarin', 'MAUI', 'MAUI page', 'MAUI Shell', 'MAUI MVVM', 'MAUI data binding', 'MAUI collection view'. Build cross-platform mobile apps with .NET MAUI including Shell navigation, MVVM, controls, and deployment. Do NOT use for: ASP.NET Core or Blazor development.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, dotnet, maui, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile .NET MAUI

## Purpose
Guide for building cross-platform mobile apps with .NET MAUI using MVVM, Shell navigation, and platform-specific customization.

## Agent Protocol

### Trigger
Phrases: ".NET MAUI", "MAUI app", "Xamarin", "MAUI Shell", "MAUI page", "MAUI MVVM", "MAUI data binding", "MAUI collection view"

### Input Context
- Target platforms (Android, iOS, Windows, macOS)
- Pages and navigation structure
- Data models and service interfaces
- Required platform-specific features

### Output Artifact
MAUI solution with: AppShell, Pages with ViewModels, Services, Platform-specific code in Platforms/ folder, CommunityToolkit.Mvvm integration.

### Response Format
```
<maui-app>
<shell>{routes, flyout/tab structure}</shell>
<pages>{page-viewmodel pairs, bindings}</pages>
<services>{DI registration, platform services}</services>
<platform>{platform-specific handlers}</platform>
</maui-app>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- AppShell navigation works on all targets
- MVVM bindings resolve without code-behind
- CollectionView renders with DataTemplate
- Platform-specific code compiles under correct target
- App deploys and runs on iOS simulator and Android emulator

### Max Response Length
8000 tokens

## Workflow

1. **Project structure** — Solution with App.xaml (global styles, resources), AppShell.xaml (navigation container), Pages/ (XAML views), ViewModels/ (business logic), Models/ (data), Services/ (interfaces + implementations), Resources/ (colors, fonts, styles).

2. **Shell navigation** — Define flyout items (master menu) or TabBar (bottom tabs). Register routes via Routing.RegisterRoute. Pass data via query parameters with IQueryAttributable. Handle navigation events in Shell.Current.Navigated.

3. **MVVM with MAUI** — ViewModel inherits ObservableObject from CommunityToolkit.Mvvm. Data binding via `{Binding Property}`. IRelayCommand for actions. Source generators `[ObservableProperty]`, `[RelayCommand]`. ViewModel registered as transient in DI.

4. **MAUI controls** — CollectionView with DataTemplate for lists. RefreshView wrapping CollectionView for pull-to-refresh. CollectionView grouping via IsGrouped. CarouselView for swipeable cards. EmptyView for no-data state.

5. **Platform-specific code** — Platforms/Android and Platforms/iOS folders. Conditional compilation `#if ANDROID` / `#if IOS`. Platform handlers for customizing native controls (Entry, Button, etc.). Custom renderers migrated to handlers.

6. **Deployment** — Single project multi-targets all platforms. Code signing via .csproj properties. App Center or GitHub Actions for CI. Test Cloud for device testing.

## Rules

- MVVM is the required pattern — no exceptions.
- Code-behind minimal: only constructor + component initialization.
- Shell is the only navigation mechanism (no manual navigation stacks).
- CommunityToolkit.Mvvm for ObservableObject and source generators.
- CollectionView replaces ListView in all new code.
- DataTemplate required for all item templates.
- Platform handlers, not custom renderers, for native control customization.
- Resource dictionaries for all reusable styles.

## References

- `references/maui-structure.md` — Project setup, Shell, navigation, MVVM basics
- `references/maui-controls.md` — CollectionView, data templates, gestures, platform handlers

## Handoff
Hand off to iOS/Android native skills when platform handler customization requires deep UIKit or Android Views API knowledge.
