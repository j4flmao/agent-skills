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
version: "2.0.0"
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
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- AppShell navigation works on all targets
- MVVM bindings resolve without code-behind
- CollectionView renders with DataTemplate
- Platform-specific code compiles under correct target
- App deploys and runs on iOS simulator and Android emulator

### Max Response Length
8000 tokens

## Architecture Decision Trees

### Shell vs NavigationPage
```
App navigation structure?
├── Tab bar + flyout menu → Shell (FlyoutItem, TabBar, Tab)
│   Pros: Built-in navigation bar, flyout, tabs, search, back behavior
├── Simple stack navigation → NavigationPage
│   Push/pop modal stack, simpler API
└── Tabbed app without flyout → TabbedPage
    Simpler than Shell, but less flexible
```

### MVVM Framework
```
Team preference?
├── CommunityToolkit.Mvvm → Source generators, [ObservableProperty], [RelayCommand]
│   Pros: Minimal boilerplate, compile-time binding validation
├── Prism.Maui → Full MVVM framework, navigation service, DI integration
│   Pros: Navigation service, regions, platform service abstraction
└── Manual INotifyPropertyChanged → Lightweight, no dependency
    Cons: More code, no source generators
```

### Platform-Specific Code Strategy
```
Volume of platform code?
├── Small (1-5 specialized views) → #if ANDROID / #if IOS preprocessor
├── Medium → Platform handlers in MauiProgram.cs ConfigureMauiHandlers
│   Preferred approach — maps cross-platform properties to native views
└── Large → Conditional compilation with partial class files per platform
    Use Platforms/Android/, Platforms/iOS/ folders for large blocks
```

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

## Anti-Patterns

- **Code-behind with business logic**: Keep to DI constructor + InitializeComponent
- **Singleton ViewModels**: ViewModels should be transient — new instance per navigation
- **Messaging abuse**: WeakReferenceMessenger for cross-ViewModel, not for general pub-sub
- **Direct static navigation calls**: Use Shell routing — never instantiate pages directly
- **Platform API calls without #if guard**: Platform-specific APIs crash on unsupported targets
- **Ignoring linker configuration**: Linker strips dynamically accessed types — preserve them explicitly

## Performance Optimization

### Startup Performance
MAUI app startup involves: native initialization, XAML parsing, Shell construction, and first-page rendering. Profile with: `dotnet-trace` (event tracing), Xamarin Profiler (legacy), or custom stopwatch logging. Key optimizations:

- **AOT compilation**: Enable `<PublishAot>true</PublishAot>` in .csproj for iOS/Android (reduces JIT overhead at startup, but increases binary size ~30%). For .NET 8+ MAUI, AOT is available for iOS via `--aot`.
- **Trim assemblies**: `<TrimMode>full</TrimMode>` with linker configuration. Reduces app size but requires `[DynamicallyAccessedMembers]` attributes on types accessed via reflection.
- **Lazy initialization**: Defer non-critical services: `Lazy<IService>` or `Task.Run(() => InitializeHeavyService())` after first frame render. Register heavy services as transient or use `Lazy<T>` wrapper.
- **Shell caching**: Shell caches pages by default — pages remain in memory after navigation. Use `Shell.Current.CachingStrategy = CachingStrategy.RetainElement` judiciously. Prefer `CachingStrategy.RecycleElement` for memory-bound scenarios.
- **Startup tracing**: Measure with `Activity` or `DiagnosticListener` between `Application.OnStart()` and first frame `Appearing` event. Target: <2s cold start on mid-range Android/iOS devices.

### Memory Management
- **CollectionView recycling**: Virtualization recycles cell templates — ensure views are data-bound, not created in `ItemTemplate` code-behind. Avoid `DataTemplate` with complex nested layouts.
- **Image caching**: Use `FFImageLoading` (community) or `MAUI CommunityToolkit`'s `CachedImage`. Set `CacheType` to `Disk` for large images. Avoid `ImageSource.FromStream` on UI thread.
- **Weak event patterns**: Event subscriptions (PropertyChanged, CollectionChanged) prevent GC of pages. Use `WeakEventManager` or `WeakReference` for subscribers.
- **Dispose pattern**: Implement `IDisposable` on ViewModels that hold subscriptions. Call `Dispose()` in page `OnDisappearing` or via `Lifecycle` events. Unsubscribe from `MessagingCenter`/`WeakReferenceMessenger` in ViewModel cleanup.
- **Large collection handling**: For 1000+ items, use `CollectionView` with `RemainingItemsThreshold` + `RemainingItemsThresholdReachedCommand` for incremental loading (infinite scroll). Never load all items into memory at once.

### UI Thread and Responsiveness
- **Async all the way**: All I/O-bound operations (HTTP, database, file system) must use `async`/`await`. Never call `.Result` or `.Wait()` on Task — this deadlocks on MAUI's main thread.
- **`MainThread.BeginInvokeOnMainThread`**: Only use for UI updates from background threads. Batch UI updates — don't invoke per-item in a loop.
- **Layout passes**: Minimize layout pass count. Use `HorizontalStackLayout`/`VerticalStackLayout` over `StackLayout` (lighter). Avoid `AbsoluteLayout` for dynamic layouts (measuring pass is expensive). Prefer `Grid` with proportional rows/columns.
- **XAML compilation**: Enable `XAMLC` (XAML compilation) in all Release configs: add `[XamlCompilation(XamlCompilationOptions.Compile)]` on all Pages. Reduces runtime XAML parsing time.

```csharp
[assembly: XamlCompilation(XamlCompilationOptions.Compile)]
```

- **Data binding performance**: Prefer compiled bindings (`x:DataType`) over reflection-based bindings. Compiled bindings reduce reflection overhead and catch errors at compile time. For list items, ensure `x:DataType` on `DataTemplate` is set to the item type.

```xml
<CollectionView ItemsSource="{Binding Orders}">
    <CollectionView.ItemTemplate>
        <DataTemplate x:DataType="models:Order">
            <Label Text="{Binding CustomerName}" />
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

### Graphics and Animation
- **GPU-accelerated properties**: Animate `Opacity`, `Rotation`, `Scale`, `TranslationX`/`TranslationY` (GPU-composited). Avoid animating `Width`, `Height`, `Margin`, `Padding` (trigger layout passes).
- **`GraphicsView` over custom drawing**: MAUI's `GraphicsView` uses `Microsoft.Maui.Graphics` for 2D drawing — hardware-accelerated on most platforms. Use for custom charts, signatures, diagrams.
- **Reduce shadow/blur**: Shadows (`Shadow` effect) and blurs trigger off-screen rendering. Use sparingly in lists. Prefer flat design for list items, reserve shadows for modals/popups.

## Build & Deployment Patterns

### Project Configuration (.csproj)
```xml
<PropertyGroup>
    <TargetFrameworks>net8.0-android;net8.0-ios;net8.0-maccatalyst</TargetFrameworks>
    <OutputType>Exe</OutputType>
    <UseMaui>true</UseMaui>
    <SingleProject>true</SingleProject>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <!-- Release optimizations -->
    <PublishTrimmed>true</PublishTrimmed>
    <PublishAot>false</PublishAot>
    <TrimMode>partial</TrimMode>
    <Optimize>true</Optimize>
</PropertyGroup>

<!-- Android-specific -->
<PropertyGroup Condition="$(TargetFramework.Contains('android'))">
    <ApplicationId>com.company.app</ApplicationId>
    <ApplicationVersion>1</ApplicationVersion>
    <ApplicationDisplayVersion>1.0</ApplicationDisplayVersion>
    <AndroidSigningKeyStore>$(ProjectDir)release.keystore</AndroidSigningKeyStore>
    <AndroidSigningKeyAlias>app-alias</AndroidSigningKeyAlias>
    <AndroidSigningKeyPass>$(KS_PASS)</AndroidSigningKeyPass>
    <AndroidSigningStorePass>$(KSP_PASS)</AndroidSigningStorePass>
    <AndroidPackageFormat>aab</AndroidPackageFormat>
</PropertyGroup>

<!-- iOS-specific -->
<PropertyGroup Condition="$(TargetFramework.Contains('ios'))">
    <ApplicationId>com.company.app</ApplicationId>
    <BuildIpa>true</BuildIpa>
    <RuntimeIdentifier>ios-arm64</RuntimeIdentifier>
    <CodesignKey>Apple Distribution: Company Name</CodesignKey>
    <CodesignProvision>$(APPLE_PROVISIONING_PROFILE)</CodesignProvision>
    <ArchiveOnBuild>true</ArchiveOnBuild>
</PropertyGroup>
```

### CI/CD Pipeline (GitHub Actions)
```yaml
name: Build and Deploy MAUI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-android:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - name: Restore
        run: dotnet restore
      - name: Build Android
        run: |
          dotnet build -f net8.0-android --configuration Release `
            -p:AndroidSigningKeyStore=release.keystore `
            -p:AndroidSigningKeyAlias=app-alias `
            -p:AndroidSigningKeyPass=${{ secrets.KEY_PASS }} `
            -p:AndroidSigningStorePass=${{ secrets.STORE_PASS }}
      - name: Sign AAB
        run: |
          java -jar bundletool-all.jar build-bundle --modules=bin/Release/net8.0-android/*.aab
      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-release
          path: '**/*.aab'

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - name: Install iOS provisioning
        run: |
          echo ${{ secrets.IOS_CERT }} | base64 --decode > cert.p12
          echo ${{ secrets.IOS_PROVISIONING }} | base64 --decode > provisioning.mobileprovision
          security create-keychain -p temp temp.keychain
          security import cert.p12 -k temp.keychain -P ${{ secrets.CERT_PASS }}
      - name: Build iOS
        run: |
          dotnet build -f net8.0-ios --configuration Release `
            -p:RuntimeIdentifier=ios-arm64 `
            -p:CodesignKey="Apple Distribution: Company" `
            -p:CodesignProvision="$(ls provisioning.mobileprovision)"
      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ios-release
          path: '**/*.ipa'
```

### App Store & Play Store Submission

**Google Play**: Build AAB with `dotnet publish -f net8.0-android -c Release`. Sign with Android keystore (`jarsigner` or MSBuild properties). Upload to Google Play Console → Internal Testing → Closed Alpha → Open Beta → Production. Use `bundletool` for AAB testing: `java -jar bundletool.jar install-apks --apks=app.aab`.

**Apple App Store**: Build IPA with `dotnet publish -f net8.0-ios -c Release`. Requires Apple Developer Program membership ($99/year). Distribution via App Store Connect: Xcode Organizer → Distribute App → App Store Connect. Or use `Transporter` app for IPA upload. TestFlight for beta distribution before production release.

**App Center** (retired): Migrate to GitHub Actions + App Center Distribute (still available for distribution). Alternative: Firebase App Distribution for Android beta testing, TestFlight for iOS.

### Versioning Strategy
- `ApplicationVersion` (Android): integer, auto-increment per release.
- `CFBundleVersion` (iOS): same integer, matches Android version code.
- `ApplicationDisplayVersion` / `CFBundleShortVersionString`: semver string ("1.2.3").
- Sync via CI: read from `version.txt` or Git tag, inject into .csproj properties via script or `Directory.Build.props`.

## Platform-Specific Code Examples

### Android — Custom Handler (Remove Entry Underline)
```csharp
// MauiProgram.cs
builder.ConfigureMauiHandlers(handlers => {
    handlers.AddHandler<Entry, EntryHandler>(nameof(Entry), (handler) => {
#if ANDROID
        handler.PlatformView.BackgroundTintList = Android.Content.Res.ColorStateList.ValueOf(
            Android.Graphics.Color.Transparent);
#endif
    });
});
```

### iOS — Safe Area Handling
```csharp
// iOS — respect safe area in custom views
#if IOS
using UIKit;
using CoreGraphics;

public class SafeAreaAwareView : UIView
{
    public override void LayoutSubviews()
    {
        base.LayoutSubviews();
        var insets = Window?.SafeAreaInsets ?? UIEdgeInsets.Zero;
        // Adjust layout based on safe area
    }
}
#endif
```

### Windows — Title Bar Customization
```csharp
#if WINDOWS
using Microsoft.UI.Xaml;
using Microsoft.UI;

public static class WindowTitleBar
{
    public static void SetTheme(Window window, bool darkMode)
    {
        var nativeWindow = window.Handler?.PlatformView as Microsoft.UI.Xaml.Window;
        if (nativeWindow != null)
        {
            nativeWindow.ExtendsContentIntoTitleBar = true;
            // Custom title bar colors
        }
    }
}
#endif
```

### Shared Service with Platform DI
```csharp
// Interface in shared code
public interface IDeviceInfo
{
    string GetDeviceName();
    string GetOSVersion();
}

// Android implementation (Platforms/Android/)
public class AndroidDeviceInfo : IDeviceInfo
{
    public string GetDeviceName() =>
        Android.OS.Build.Model ?? "Unknown";
    public string GetOSVersion() =>
        Android.OS.Build.VERSION.Release ?? "Unknown";
}

// iOS implementation (Platforms/iOS/)
public class IosDeviceInfo : IDeviceInfo
{
    public string GetDeviceName() =>
        UIKit.UIDevice.CurrentDevice.Name;
    public string GetOSVersion() =>
        UIKit.UIDevice.CurrentDevice.SystemVersion;
}

// Registration in MauiProgram.cs
#if ANDROID
builder.Services.AddSingleton<IDeviceInfo, AndroidDeviceInfo>();
#elif IOS
builder.Services.AddSingleton<IDeviceInfo, IosDeviceInfo>();
#endif
```

## Anti-Patterns (Expanded)

- **Static service locator**: `Application.Current.MainPage` or `DependencyService.Get<T>()` creates hidden dependencies. Use constructor DI only.
- **Massive MauiProgram.cs**: Registering every service and handler inline in MauiProgram.cs creates an unmaintainable file. Use extension methods: `builder.Services.AddOrderModule()`, `builder.ConfigurePaymentHandlers()`.
- **Direct ObservableCollection manipulation**: Adding/removing items on background thread crashes. Use `MainThread.BeginInvokeOnMainThread(() => collection.Add(item))`.
- **Overusing Effects**: Effects are procedural and harder to override. Use Handlers for MAUI-native customization, Effects only for pre-MAUI migration code.
- **Ignoring linker configuration**: Linker strips unused IL. Types accessed via reflection (Sqlite, serialization) must be preserved. Use `[Preserve]` attribute or linker XML configuration.
- **Missing `#if` on platform APIs**: `Android.Graphics.Color` in shared code compiles on all targets but throws on iOS. Always guard platform-specific types with `#if ANDROID`, `#if IOS`.
- **Nested layouts in ListView**: ListView/CollectionView with complex nested layouts (Grid in StackLayout in Frame) kills scroll performance. Flatten hierarchy for list items.
- **No `x:DataType` on DataTemplate**: Reflection-based bindings in lists are 3-5x slower than compiled bindings. Always set `x:DataType` on ItemTemplate DataTemplate.
- **Storing secrets in code**: API keys, connection strings in source code. Use Azure Key Vault, GitHub Secrets, or `Secrets.json` (user secrets in development). Never commit secrets.
- **Over-engineering with Prism**: Prism adds significant complexity for most apps. CommunityToolkit.Mvvm covers 90% of MVVM needs with less overhead.

## Configuration Reference

```xml
<!-- .csproj — Android signing -->
<PropertyGroup Condition="$(TargetFramework.Contains('android'))">
  <AndroidSigningKeyStore>release.keystore</AndroidSigningKeyStore>
  <AndroidSigningKeyAlias>app-alias</AndroidSigningKeyAlias>
</PropertyGroup>

<!-- .csproj — iOS version -->
<PropertyGroup Condition="$(TargetFramework.Contains('ios'))">
  <CFBundleVersion>1.0.0</CFBundleVersion>
  <CFBundleShortVersionString>1.0</CFBundleShortVersionString>
</PropertyGroup>
```

## References
  - references/dotnet-maui-advanced.md — Dotnet Maui Advanced Topics
  - references/dotnet-maui-fundamentals.md — Dotnet Maui Fundamentals
  - references/maui-architecture.md — MAUI Architecture
  - references/maui-controls.md — MAUI Controls
  - references/maui-mvvm.md — MAUI MVVM with CommunityToolkit
  - references/maui-structure.md — MAUI Project Structure
## Handoff
Hand off to iOS/Android native skills when platform handler customization requires deep UIKit or Android Views API knowledge.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.