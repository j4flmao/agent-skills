# MAUI Architecture

## Solution Layout

```
MyApp/
  MyApp.sln
  MyApp/
    App.xaml                    # Application definition, global styles
    App.xaml.cs
    AppShell.xaml               # Shell navigation container
    AppShell.xaml.cs
    MauiProgram.cs              # DI container, handlers, services registration
    GlobalUsings.cs             # Global using directives

    Pages/                      # XAML views
      HomePage.xaml
      HomePage.xaml.cs          # Minimal code-behind (InitializeComponent only)
      ProductsPage.xaml
      ProductDetailPage.xaml
      SettingsPage.xaml

    ViewModels/                 # Business logic (CommunityToolkit.Mvvm)
      HomeViewModel.cs
      ProductsViewModel.cs
      ProductDetailViewModel.cs
      SettingsViewModel.cs

    Models/                     # Data entities, DTOs
      User.cs
      Product.cs
      CartItem.cs

    Services/                   # Service interfaces and implementations
      Interfaces/
        IProductService.cs
        IAuthService.cs
        INavigationService.cs
      ProductService.cs
      AuthService.cs

    Resources/
      Styles/
        Colors.xaml              # Color palette
        Styles.xaml              # Global styles
      Fonts/
        OpenSans-Regular.ttf
        OpenSans-Semibold.ttf
      Images/
        logo.svg
        icon_home.svg
      Raw/                       # Raw assets (JSON, SQL, etc.)
        seed_data.json

    Platforms/
      Android/
        MainActivity.cs
        MainApplication.cs
        AndroidManifest.xml
        Resources/
      iOS/
        AppDelegate.cs
        Info.plist
        Program.cs
      Windows/
        App.xaml
        Package.appxmanifest
      MacCatalyst/
        AppDelegate.cs
        Info.plist

    MyApp.csproj                 # Single project targets all platforms
```

## MauiProgram.cs — Full Configuration

```csharp
using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .UseMauiCommunityToolkit()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            })
            .ConfigureMauiHandlers(handlers =>
            {
                // Platform-specific handler customization
#if ANDROID
                handlers.AddHandler<Entry, EntryHandler>(nameof(Entry), handler =>
                {
                    handler.PlatformView.BackgroundTintList = null;
                });
#elif IOS
                handlers.AddHandler<Entry, EntryHandler>(nameof(Entry), handler =>
                {
                    handler.PlatformView.BorderStyle = UITextBorderStyle.None;
                });
#endif
            });

        // Service registration
        builder.Services.AddSingleton<IConnectivity>(Connectivity.Current);
        builder.Services.AddSingleton<IPreferences>(Preferences.Default);

        // HTTP client
        builder.Services.AddHttpClient("api", client =>
        {
            client.BaseAddress = new Uri("https://api.example.com");
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        // Services
        builder.Services.AddSingleton<IProductService, ProductService>();
        builder.Services.AddSingleton<IAuthService, AuthService>();

        // ViewModels (transient — new instance per navigation)
        builder.Services.AddTransient<HomeViewModel>();
        builder.Services.AddTransient<ProductsViewModel>();
        builder.Services.AddTransient<ProductDetailViewModel>();

        // Pages (transient)
        builder.Services.AddTransient<HomePage>();
        builder.Services.AddTransient<ProductsPage>();
        builder.Services.AddTransient<ProductDetailPage>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
```

## AppShell Navigation Definition

```xml
<Shell xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
       xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
       xmlns:pages="clr-namespace:MyApp.Pages"
       x:Class="MyApp.AppShell"
       FlyoutBehavior="Disabled">

    <!-- TabBar: Bottom Navigation -->
    <TabBar>
        <ShellContent Title="Home"
                      Icon="icon_home.png"
                      ContentTemplate="{DataTemplate pages:HomePage}" />
        <ShellContent Title="Products"
                      Icon="icon_products.png"
                      ContentTemplate="{DataTemplate pages:ProductsPage}" />
        <ShellContent Title="Settings"
                      Icon="icon_settings.png"
                      ContentTemplate="{DataTemplate pages:SettingsPage}" />
    </TabBar>

</Shell>
```

```csharp
// AppShell.xaml.cs — Route registration
public partial class AppShell : Shell
{
    public AppShell()
    {
        InitializeComponent();

        // Register detail routes (not in TabBar/Flyout)
        Routing.RegisterRoute("product/detail", typeof(ProductDetailPage));
        Routing.RegisterRoute("product/edit", typeof(ProductEditPage));
        Routing.RegisterRoute("settings/profile", typeof(ProfilePage));
    }
}
```

## Shell Navigation Patterns

```csharp
// Absolute navigation (replaces stack)
await Shell.Current.GoToAsync("//Home");

// Relative navigation (push)
await Shell.Current.GoToAsync("product/detail?id=42");

// With multiple parameters
await Shell.Current.GoToAsync($"product/detail?id={product.Id}&source=search");

// Back navigation
await Shell.Current.GoToAsync("..");

// Back with parameter
await Shell.Current.GoToAsync("../?refresh=true");

// Modal navigation (iOS)
await Shell.Current.GoToAsync("modalPage", true);

// Tab switching
Shell.Current.CurrentItem = Shell.Current.Items[1]; // Switch to second tab
```

## Query Parameters — IQueryAttributable

```csharp
// Method 1: QueryProperty attribute
[QueryProperty(nameof(ProductId), "id")]
[QueryProperty(nameof(Source), "source")]
public partial class ProductDetailPage : ContentPage
{
    private string _productId;
    public string ProductId
    {
        get => _productId;
        set
        {
            _productId = value;
            LoadProduct(value);
        }
    }

    public string Source { get; set; }
}

// Method 2: IQueryAttributable interface
public partial class ProductDetailViewModel : ObservableObject, IQueryAttributable
{
    public void ApplyQueryAttributes(IDictionary<string, object> query)
    {
        if (query.TryGetValue("id", out var id))
            ProductId = id.ToString();
    }
}
```

## .csproj Configuration

```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <TargetFrameworks>net8.0-android;net8.0-ios;net8.0-maccatalyst</TargetFrameworks>
        <TargetFrameworks Condition="$([MSBuild]::IsOSPlatform('windows'))">
            $(TargetFrameworks);net8.0-windows10.0.19041.0
        </TargetFrameworks>
        <OutputType>Exe</OutputType>
        <RootNamespace>MyApp</RootNamespace>
        <UseMaui>true</UseMaui>
        <SingleProject>true</SingleProject>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>

        <!-- App metadata -->
        <ApplicationTitle>MyApp</ApplicationTitle>
        <ApplicationId>com.example.myapp</ApplicationId>
        <ApplicationDisplayVersion>1.0</ApplicationDisplayVersion>
        <ApplicationVersion>1</ApplicationVersion>

        <!-- Android signing -->
        <AndroidSigningKeyStore Condition="$(TargetFramework.Contains('android'))">
            $(AppDir)\release.keystore
        </AndroidSigningKeyStore>
        <AndroidSigningKeyAlias>app-alias</AndroidSigningKeyAlias>
    </PropertyGroup>
</Project>
```

## Platform-Specific Code Patterns

```csharp
// Method 1: Platforms/ folder files
// Platforms/Android/AuthService.cs — compiled only for Android
public class AndroidAuthService : IAuthService { }

// Method 2: Conditional compilation
public static class DeviceInfo
{
    public static string GetDeviceName()
    {
#if ANDROID
        return Android.OS.Build.Model;
#elif IOS
        return UIKit.UIDevice.CurrentDevice.Name;
#elif WINDOWS
        return Environment.MachineName;
#else
        return "Unknown";
#endif
    }
}

// Method 3: Platform handlers
builder.ConfigureMauiHandlers(handlers =>
{
    handlers.AddHandler<Button, ButtonHandler>(nameof(Button), handler =>
    {
#if ANDROID
        handler.PlatformView.SetAllCaps(false);
#endif
    });
});

// Method 4: Dependency injection with platform-specific services
public interface IDeviceInfoService
{
    string GetDeviceId();
}

// Register platform implementations in MauiProgram.cs
// Android: builder.Services.AddSingleton<IDeviceInfoService, AndroidDeviceInfoService>();
// iOS: builder.Services.AddSingleton<IDeviceInfoService, IosDeviceInfoService>();
```

No preamble. No postamble. No explanations.
