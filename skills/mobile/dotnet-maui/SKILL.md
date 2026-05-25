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

1. **MAUI project architecture** — .NET MAUI uses a single-project structure targeting Android, iOS, Windows, and macOS from one codebase. Solution layout: `App.xaml` (global styles, resource dictionaries, theme definitions), `AppShell.xaml` (navigation container with flyout/tabs), `Pages/` (XAML views with code-behind minimal), `ViewModels/` (business logic with CommunityToolkit.Mvvm), `Models/` (data entities, DTOs), `Services/` (interfaces + implementations registered in DI), `Resources/` (colors, fonts, images, styles), `Platforms/` (Android with MainActivity/MainApplication/AndroidManifest, iOS with AppDelegate/Info.plist, Windows, Mac). `MauiProgram.cs` configures the app builder, registers services, and sets up handlers.

2. **Shell navigation** — Shell provides flyout (hamburger menu) and TabBar (bottom tabs) navigation containers. Define structure in `AppShell.xaml`: `FlyoutItem` for menu items, `TabBar` for bottom navigation, `ShellContent` for pages. Register detail routes with `Routing.RegisterRoute("route/name", typeof(Page))` in AppShell constructor. Navigate via `Shell.Current.GoToAsync("route/name?param=value")`. Receive parameters with `[QueryProperty(nameof(Param), "param")]` attribute or `IQueryAttributable` interface. Handle navigation events via `Shell.Current.Navigated` event. Shell provides built-in back button behavior, search handlers, and flyout customization (header template, icon, content templates).

3. **MVVM with CommunityToolkit.Mvvm** — ViewModel base class `ObservableObject` from CommunityToolkit.Mvvm. Source generators `[ObservableProperty]` (auto-generates INotifyPropertyChanged), `[RelayCommand]` (auto-generates IRelayCommand from method), `[NotifyPropertyChangedFor]` (notify dependent property on change). Data binding in XAML via `{Binding Property}` expressions. `x:DataType` for compile-time binding validation. Converters for value transformations (`IValueConverter`). ViewModel registered as transient in DI — new instance per navigation. Constructor injection for services. Messenger pattern (`WeakReferenceMessenger`) for cross-ViewModel communication.

4. **XAML and data binding** — XAML markup extensions: `{Binding}`, `{StaticResource}`, `{DynamicResource}`, `{TemplateBinding}`, `{RelativeSource}`. Compiled bindings enabled with `x:DataType` on page/control level — compile-time errors for invalid paths. `x:Array` and `x:Static` for static resources. Data templates for item rendering. Control templates for custom control structure. Styles in ResourceDictionary with `BasedOn`, `TargetType`, `Setter`. Triggers: `DataTrigger`, `MultiTrigger`, `EventTrigger` for state-based styling. VisualStateManager for view states (Normal, Disabled, Focused, Selected).

5. **MAUI controls** — `CollectionView` (replaces ListView): vertical/horizontal grids, grouping via `IsGrouped`, `EmptyView` for no-data state, pull-to-refresh with `RefreshView` wrapper. `CarouselView` for swipeable cards with `PeekAreaInsets` and `Loop` properties. `Border` replaces Frame for rounded corners. `FlexLayout` for wrapping layouts. `GraphicsView` for custom 2D drawing. `BlazorWebView` for hybrid Blazor + MAUI apps. Handlers architecture replaces the old Custom Renderers system — each control has a mapper that maps cross-platform properties to native views.

6. **Platform-specific code** — Three approaches: (a) `Platforms/` folder with conditional compilation — code files in `Platforms/Android/`, `Platforms/iOS/`, etc. are compiled only for the target platform. (b) `#if ANDROID`, `#if IOS`, `#if WINDOWS`, `#if MACCATALYST` preprocessor directives for inline platform branching. (c) Platform handlers in `MauiProgram.cs` via `ConfigureMauiHandlers()` — customize native controls (e.g., remove Entry underline on Android, set border style on iOS). Map native events to MAUI events. Handler customization is the preferred approach over conditional compilation.

7. **Deployment and hot reload** — `dotnet build -t:Run -f net8.0-android` builds and deploys to Android emulator. XAML Hot Reload applies XAML changes instantly during debugging on emulator/simulator (not real-time on physical device). Code signing: Android via `.csproj` properties (`AndroidSigningKeyStore`, `AndroidSigningKeyAlias`), iOS via provisioning profile in Info.plist. CI/CD: Azure DevOps or GitHub Actions with `dotnet publish` and platform-specific build steps. App Center retired — migrate to GitHub Actions or self-hosted. Test Cloud via Xamarin.UITest or Appium.

## Platform Compatibility

| Feature | Android | iOS | Windows | macOS |
|---------|---------|-----|---------|-------|
| Shell navigation | Full | Full | Flyout only | Flyout only |
| XAML Hot Reload | Yes | Yes | Yes | Yes |
| CollectionView | Full | Full | Full | Full |
| Platform handlers | Yes | Yes | Partial | Partial |
| .NET 8 support | Yes | Yes | Yes | Yes |

## Best Practices

- Use compiled bindings (`x:DataType`) on every page — catches binding errors at compile time
- Register all services and ViewModels in `MauiProgram.cs` — no service locator pattern
- Keep code-behind to DI constructor + InitializeComponent calls only
- Prefer `Border` over `Frame` — Frame is deprecated for rendering performance
- Use `CommunityToolkit.Maui` for behaviors, converters, animations, and popups
- Version `Platforms/` code with `#if` blocks — never duplicate entire files per platform

## Common Pitfalls

- **Missing linker configuration**: .NET MAUI linker strips unused assemblies. Add `Preserve` attribute or linker config XML for dynamically accessed types.
- **CollectionView inside ScrollView**: Causes ambiguous scroll direction exception. Use `CollectionView` alone or set `NestedScrollEnabled=false`.
- **iOS simulator keyboard**: Hardware keyboard on simulator doesn't trigger `Completed` event. Test keyboard on real device.
- **Android WebView mixed content**: `usesCleartextTraffic="true"` in AndroidManifest for HTTP resources in WebView.
- **XAML Hot Reload limitations**: Doesn't work for constructor changes, new page creation, or C# changes — only XAML property edits.

## Configuration Reference

```xml
<!-- .csproj — Android signing -->
<PropertyGroup Condition="$(TargetFramework.Contains('android'))">
  <AndroidSigningKeyStore>release.keystore</AndroidSigningKeyStore>
  <AndroidSigningKeyAlias>app-alias</AndroidSigningKeyAlias>
</PropertyGroup>
```

## References
- `references/maui-architecture.md` — Maui Architecture
- `references/maui-controls.md` — Maui Controls
- `references/maui-mvvm.md` — Maui Mvvm
- `references/maui-structure.md` — Maui Structure

## Handoff
Hand off to iOS/Android native skills when platform handler customization requires deep UIKit or Android Views API knowledge.
