# .NET MAUI Fundamentals

## Overview
.NET MAUI (Multi-platform App UI) is Microsoft's cross-platform framework for building native apps with C# and XAML. It targets Android, iOS, macOS, and Windows from a single project. MAUI evolved from Xamarin.Forms with improved performance and modern .NET integration.

## Core Concepts

### App and Window
`MauiApp` configures services, fonts, and handlers. `App.xaml.cs` defines the app entry point and main page. `Window` manages platform windows. Single project structure: `Platforms/` folder for platform-specific code. `Resources/` for shared assets.

### Pages and Shell Navigation
Pages: `ContentPage`, `NavigationPage`, `TabbedPage`, `FlyoutPage`. Shell provides URI-based navigation with flyout/tab structure. `Shell.Current.GoToAsync("//route")` for programmatic navigation. Query parameters via `IQueryAttributable` interface.

### XAML and Data Binding
XAML markup for UI layout. `{Binding Property}` for data binding. `x:DataType` for compiled bindings (compile-time validation, better performance). `INotifyPropertyChanged` for view model updates. `ObservableCollection<T>` for list reactivity.

### MVVM Pattern
View (XAML) binds to ViewModel (C# class implementing INotifyPropertyChanged). ViewModel exposes properties and commands (`ICommand`). `CommunityToolkit.Mvvm` provides source generators: `[ObservableProperty]`, `[RelayCommand]`. DI via `MauiProgram.CreateMauiApp()`.

## Architecture Patterns

### MVVM with CommunityToolkit.Mvvm
Partial ViewModel class with `[ObservableProperty]` for bindable properties. `[RelayCommand]` for ICommand generation. `WeakReferenceMessenger` for cross-view-model communication. `ObservableObject` base class. Reduces boilerplate by 60%+.

### Shell Navigation
`<Shell>` with `<FlyoutItem>`/`<TabBar>` for app structure. Route registration via `Routing.RegisterRoute`. `GoToAsync("Detail?id=123")` with query parameters. `Shell.TabBarIsVisible` for dynamic tab visibility. Navigation stack management via `GoToAsync("..")`.

### Handler Architecture
MAUI uses handlers (not renderers) for platform controls. `<View>.Handler` for platform-specific access. Custom handlers for modifying native control behavior. `Microsoft.Maui.Handlers` namespace. `HandlerChanged` event for post-handler setup.

## Data Management

### SQLite with sqlite-net-pcl
Lightweight ORM for SQLite. `[Table]`, `[PrimaryKey]`, `[Indexed]` attributes. `SQLiteAsyncConnection` for async operations. Simple CRUD without complex SQL. Use for local persistence with simple relational data. More complex needs: Entity Framework Core (limited MAUI support).

### Preferences and SecureStorage
`Preferences` for key-value settings (async, platform-backed). `SecureStorage` for encrypted storage (Keychain on iOS, EncryptedSharedPrefs on Android). `SecureStorage.Default.SetAsync("key", "value")`. Never store secrets in Preferences.

### File System
`FileSystem.AppDataDirectory` for app-private data. `FileSystem.CacheDirectory` for temporary files. `FileSystem.Current` for AppDataDirectory/CacheDirectory access. Platform-specific locations handled automatically. Bundle assets in `Resources/Raw/`.

## Security Fundamentals

### Platform Security
iOS: Keychain via SecureStorage, data protection APIs, ATS. Android: EncryptedSharedPreferences, network security config. Windows: DPAPI for data protection. Use MAUI's abstractions over platform-specific APIs. Validate HTTPS certificates.

### Authentication
`WebAuthenticator` for OAuth flows (opens system browser, captures callback). Native platform auth: Apple Sign In, Google Sign In. `CommunityToolkit.Maui` provides additional auth helpers. Secure token storage with SecureStorage. Biometric via platform-specific code.

## Build & Dependency Management

### .NET MAUI Project
Single `.csproj` targeting multiple platforms via `<TargetFrameworks>`. `net8.0-android`, `net8.0-ios`, `net8.0-maccatalyst`, `net8.0-windows`. Conditional compilation with `#if ANDROID`, `#if IOS`. NuGet packages for dependencies. `dotnet build -f net8.0-ios` for specific platform.

### Hot Reload and Live Preview
XAML Hot Reload updates UI without rebuild. C# Hot Reload for code changes. Live Preview for real-time XAML editing. Enable in Visual Studio / VS Code. Debug on emulator/device with hot reload active.

### Testing
`.NET MAUI` testing with `MSTest`/`xUnit`/. Use `Microsoft.Maui.Testing` for UI tests. `Xamarin.UITest` for E2E (legacy, limited MAUI support). Unit test ViewModels with CommunityToolkit.Mvvm. Platform-specific UI testing via Appium.

## Key Points
- Single .csproj targets Android, iOS, macOS, Windows
- Shell for URI-based navigation with tabs/flyout
- CommunityToolkit.Mvvm for MVVM with source generators
- Compiled bindings with x:DataType for performance
- Handlers (not renderers) for platform control customization
- SecureStorage for encrypted credential storage
- WebAuthenticator for OAuth flows
- Shared UI with platform-specific customization via OnPlatform/OnIdiom
- .NET MAUI Check tool for compatibility validation
- Hot Reload for rapid UI iteration
