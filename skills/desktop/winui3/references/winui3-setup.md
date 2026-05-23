# WinUI 3 Setup Reference

## Prerequisites

```bash
# Visual Studio 2022 with:
# - .NET Desktop Development workload
# - Windows App SDK C++ Templates component
# - MSIX Packaging Tools

# Or use dotnet CLI
dotnet workload install wasdk
```

## Project Templates

```bash
# Blank App (WinUI 3 in Desktop)
dotnet new winui -n MyApp

# Navigation App
dotnet new winui -n MyApp --useNavigation

# Available options:
# --useNavigation: Add NavigationView + Frame
# --framework: net8.0, net9.0
```

## App Lifecycle

```csharp
// App.xaml.cs — Full lifecycle example
public partial class App : Application
{
    private Window m_window;

    protected override void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
    {
        m_window = new MainWindow();

        // Set title bar customization
        var titleBar = m_window.AppWindow.TitleBar;
        titleBar.ExtendsContentIntoTitleBar = true;
        titleBar.ButtonBackgroundColor = Colors.Transparent;
        titleBar.ButtonInactiveBackgroundColor = Colors.Transparent;

        m_window.Activate();
    }
}
```

## WinAppSDK Deployment

### MSIX Packaging
```xml
<!-- Package.appxmanifest -->
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">

  <Identity Name="MyCompany.MyApp" Publisher="CN=MyCompany" Version="1.0.0.0"/>
  <Properties>
    <DisplayName>My WinUI 3 App</DisplayName>
    <PublisherDisplayName>My Company</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.17763.0"
                        MaxVersionTested="10.0.22621.0"/>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0"
                        MaxVersionTested="10.0.22621.0"/>
  </Dependencies>
  <Capabilities>
    <rescap:Capability Name="runFullTrust"/>
    <Capability Name="internetClient"/>
  </Capabilities>
</Package>
```

### Unpackaged Deployment
```xml
<!-- .csproj modifications for unpackaged -->
<PropertyGroup>
  <WindowsAppSdkDeploymentManagerInitialize>false</WindowsAppSdkDeploymentManagerInitialize>
  <SelfContained>true</SelfContained>
  <WindowsPackageType>None</WindowsPackageType>
</PropertyGroup>
```

## Win32 Interop

```csharp
// P/Invoke into Win32 APIs
[DllImport("user32.dll")]
static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

// Get window handle
var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(m_window);
MessageBox(hwnd, "Hello from Win32!", "Interop", 0);
```

## Theme Support

```csharp
// App.xaml.cs
public void SetTheme(ElementTheme theme)
{
    if (m_window.Content is FrameworkElement rootElement)
    {
        rootElement.RequestedTheme = theme;
    }
}

// Toggle dark/light
private void ToggleTheme()
{
    var current = ((FrameworkElement)m_window.Content).ActualTheme;
    SetTheme(current == ElementTheme.Dark ? ElementTheme.Light : ElementTheme.Dark);
}
```

## Debugging

```powershell
# Enable diagnostics
$env:WINAPPSDK_DEBUG = 1
$env:WINUI3_DEBUG = 1

# View XAML binding errors in Output window
# Set: Debug > Options > Output > WPF/WinUI trace settings > Verbose
```

## Performance Tips

```csharp
// Use x:Load for deferred loading
<Grid>
    <Grid x:Load="x:False" x:Name="HeavyPanel">
        <!-- Loaded only when needed -->
    </Grid>
</Grid>

// In code-behind
FindName("HeavyPanel"); // Triggers load

// Or in XAML
// <Button Click="(sender, e) => HeavyPanel.Loaded = true"/>
```

## Navigation Patterns

```csharp
// Frame navigation with parameter
Frame.Navigate(typeof(DetailPage), itemId);

// DetailPage receives parameter
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    if (e.Parameter is int id)
    {
        ViewModel.LoadItem(id);
    }
}
```

## Common WinUI 3 NuGet Packages

| Package | Purpose |
|---------|---------|
| Microsoft.WindowsAppSDK | Core SDK, all WinUI 3 projects need this |
| Microsoft.Windows.SDK.BuildTools | Windows SDK headers |
| CommunityToolkit.WinUI.UI | Extensions, helpers, animations |
| CommunityToolkit.WinUI.UI.Controls | DataGrid, Markdown, Layout controls |
| WinUIEx | Window management, single-instance |
| Microsoft.Toolkit.Uwp | Shared between UWP/WinUI |
| Serilog.Extensions.Hosting | Structured logging |
