# .NET MAUI Advanced Topics

## Overview
Advanced .NET MAUI topics cover custom handlers, complex animations, native platform integration, advanced MVVM patterns, performance profiling, and production deployment.

## Custom Handlers

### Replacing Default Handlers
Subclass existing handlers (e.g., `EntryHandler`) and override `Map*` methods. `PropertyMapper` for custom property mapping. `CommandMapper` for custom methods. Register in `MauiProgram.cs` via `ConfigureMauiHandlers`. Example: custom Entry with character limit.

### Custom Platform Views
Create handler for a custom .NET MAUI control. Define `PlatformView` (native control) + `VirtualView` (MAUI abstraction). Map property changes to native updates. Connect native events to MAUI events. Register handler with `AppBuilder.UseMauiApp` configuration.

### Performance Tuning
Minimize handler re-creation by using `Mapper` overrides. Batch property updates via `UpdateProperties`. Avoid creating handlers in tight loops. Recycle handlers where possible. Profile with `dotnet trace` for handler-related overhead.

## Advanced Data Binding

### Compiled Bindings
Always use `x:DataType` for compile-time binding validation. `x:DataType="vm:OrderViewModel"` on page level. Incompatible types caught at compile time. Better performance than reflection-based binding. Works with `{Binding Order.Property}` path expressions.

### MultiBinding and Converters
`MultiBinding` for combining multiple source properties. `IValueConverter` for value transformations. `IMultiValueConverter` for multi-source converters. Converters should be stateless and thread-safe. `CommunityToolkit.Maui` provide common converters (BoolToObject, InvertedBool).

### Behaviors and Attached Properties
`Behavior<T>` for adding functionality to existing controls. `PlatformBehavior` for platform-specific behaviors. Attached properties for custom markup extensions. `Microsoft.Xaml.Interactivity` for reusable interaction logic. Behaviors over custom controls when possible.

## Advanced Navigation

### Shell Route Factories
Custom `ShellContent` with `ContentTemplate` for lazy page loading. Route-specific data passing via `IQueryAttributable`. Tab preselection at startup. Dynamic shell item visibility based on auth state. `Shell.Current.ItemTemplate` for dynamic flyout items.

### Deep Linking
Configure URI schemes and universal links. Handle incoming links in `App.OnAppLinkRequestReceived`. Support deferred deep linking (store attribution). Test with `adb shell am start -d "myapp://route"`. iOS: Associated Domains entitlement.

## Advanced MVVM

### Messenger Patterns
`WeakReferenceMessenger` from CommunityToolkit.Mvvm. `Send` for publishing messages, `Register` for receiving. Message types: `ValueChangedMessage<T>`, `AsyncRequestMessage<T>`, `CollectionRequestMessage<T>`. Unregister in ViewModel disposal. Use for cross-ViewModel communication.

### Dependency Injection
`.NET MAUI` uses `Microsoft.Extensions.DependencyInjection`. Register services in `MauiProgram.cs` via `builder.Services`. Transient, Singleton, Scoped lifetimes. `IServiceProvider` for manual resolution. `ServiceHelper` from CommunityToolkit for service locator fallback.

### Unit of Work Pattern
Wrap multiple database operations in a transaction. `UnitOfWork` manages context/scoped DB connection. Commit on success, rollback on failure. Works with dependency injection per-scope. Ensures data consistency across repositories.

## Performance Optimization

### Startup Time
Reduce assembly load: fewer controls in App.xaml. Lazy-load heavy pages with `ContentTemplate`. `BackgroundService` for background initialization. Native AOT publish (limited MAUI support). Profile startup with `dotnet trace` + PerfView.

### Collection Performance
`CollectionView` over `ListView` (better virtualization). `ItemsLayout` for custom grid layouts. `DataTemplate` caching with `x:DataType`. `RemainingItemsThreshold` for infinite scroll. Avoid complex layouts inside item templates.

### Memory Management
Unsubscribe from events and messengers in `OnDisappearing` / `Dispose`. Clear `ObservableCollection` on page dispose. Use `WeakReference` for long-lived event targets. Profile with JetBrains dotMemory or Visual Studio Diagnostic Tools. Monitor GC frequency.

## Platform-Specific Code

### Platform Conditional
`#if ANDROID`, `#if IOS`, `#if WINDOWS`, `#if MACCATALYST` for conditional compilation. `Platforms/Android`, `Platforms/iOS` folders for platform files. `DeviceInfo.Platform` for runtime checks. `OnPlatform`/`OnIdiom` markup extensions for XAML.

### Platform Effects
`PlatformEffect` for lightweight platform customization. `RoutingEffect` for platform-independent effects. Attach to controls via `Effects.Add()`. iOS: `PlatformEffect` for iOS-specific behavior. Android: `PlatformEffect` for Android-specific behavior.

## Production Deployment

### Code Signing
iOS: Apple Distribution certificate + provisioning profile via Fastlane. Android: Keystore with `dotnet publish -f net8.0-android -c Release`. Windows: SignTool with Authenticode certificate. macOS: Developer ID for notarization.

### App Store Submission
iOS: `.ipa` via App Store Connect or Transporter. Android: `.aab` via Google Play Console. Windows: `.msix` via Microsoft Store. macOS: `.pkg` via App Store or notarized DMG. CI/CD with GitHub Actions + Fastlane.

## Key Points
- Custom handlers extend native platform controls
- Compiled bindings (x:DataType) for compile-time validation and performance
- WeakReferenceMessenger for cross-ViewModel communication
- CollectionView over ListView for better scroll performance
- Native AOT publish for startup optimization (limited support)
- Platform effects for lightweight customization
- BackgroundService for deferred initialization
- MAUI lifecycle: OnStart, OnSleep, OnResume
- Fastlane for automated code signing and store submission
- dotMemory / PerfView for memory and performance profiling
