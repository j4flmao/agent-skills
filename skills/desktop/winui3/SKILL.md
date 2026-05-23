---
name: winui3
description: >
  Use this skill when building modern Windows desktop apps with WinUI 3 and WinAppSDK — Fluent Design, .NET, XAML, Windows 11 styling, MSIX packaging. Do NOT use for: cross-platform apps, UWP Store-only apps, WPF legacy migration without modernization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, windows, winui3, dotnet, xaml, fluent-design, phase-4]
---

# WinUI 3

## Purpose
Build modern Windows desktop applications using WinUI 3 with WinAppSDK, Fluent Design, and MSIX packaging for Windows 10/11.

## Agent Protocol

### Trigger
User request includes: `winui3`, `winui 3`, `winappsdk`, `winapp sdk`, `windows app sdk`, `fluent design`, `modern windows app`, `muxc`, `microsoft.ui.xaml`.

### Input Context
- WinAppSDK version (1.4, 1.5, 1.6)
- .NET version (.NET 8+, .NET 9)
- Project type (single-window, multi-window, packaged, unpackaged)
- Deployment target (Windows 10 1809+, Windows 11)
- Template (Blank App, Navigation App, SplitView)

### Output Artifact
A markdown document containing:
- Project scaffold command
- App.xaml and MainWindow.xaml setup
- Navigation structure with NavigationView
- Data binding with INotifyPropertyChanged
- WinUI 3 controls usage
- MSIX packaging configuration
- Interop with Win32 APIs
- Dark/light theme support

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- App class derived from Microsoft.UI.Xaml.Application.
- NavigationView setup with pages and frame.
- Data binding with observable properties.
- MSIX manifest configured with capabilities.
- WinUI 3 controls (InfoBar, NumberBox, etc.) used.
- Theme switching implemented.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Scaffold Project
```bash
dotnet new winui -n MyApp
cd MyApp
dotnet build
```

### Step 2: App and Window Setup
```xml
<!-- App.xaml -->
<Application x:Class="MyApp.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <Application.Resources>
        <ResourceDictionary>
            <XamlControlsResources xmlns="using:Microsoft.UI.Xaml.Controls"/>
        </ResourceDictionary>
    </Application.Resources>
</Application>
```

```csharp
// App.xaml.cs
using Microsoft.UI.Xaml;

public partial class App : Application
{
    private Window m_window;

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        m_window = new MainWindow();
        m_window.Activate();
    }
}
```

### Step 3: Main Window with Navigation
```xml
<!-- MainWindow.xaml -->
<Window x:Class="MyApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <Grid>
        <NavigationView x:Name="NavView"
                        PaneDisplayMode="LeftCompact"
                        IsSettingsVisible="True"
                        ItemInvoked="OnItemInvoked"
                        BackRequested="OnBackRequested">
            <NavigationView.MenuItems>
                <NavigationViewItem Icon="Home" Content="Home" Tag="home"/>
                <NavigationViewItem Icon="Document" Content="Documents" Tag="docs"/>
                <NavigationViewItem Icon="Setting" Content="Settings" Tag="settings"/>
            </NavigationView.MenuItems>

            <Frame x:Name="ContentFrame" IsNavigationStackEnabled="True"/>
        </NavigationView>
    </Grid>
</Window>
```

```csharp
// MainWindow.xaml.cs
using Microsoft.UI.Xaml.Controls;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        NavView.SelectedItem = NavView.MenuItems[0];
        ContentFrame.Navigate(typeof(HomePage));
    }

    private void OnItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        var tag = args.InvokedItemContainer?.Tag?.ToString();
        if (tag == "home") ContentFrame.Navigate(typeof(HomePage));
        else if (tag == "docs") ContentFrame.Navigate(typeof(DocumentsPage));
        else if (tag == "settings") ContentFrame.Navigate(typeof(SettingsPage));
    }

    private void OnBackRequested(NavigationView sender, NavigationViewBackRequestedEventArgs args)
    {
        if (ContentFrame.CanGoBack) ContentFrame.GoBack();
    }
}
```

### Step 4: Page with Data Binding
```csharp
// ViewModels/HomeViewModel.cs
using System.ComponentModel;
using System.Runtime.CompilerServices;

public class HomeViewModel : INotifyPropertyChanged
{
    private string _welcomeText = "Welcome to WinUI 3";
    public string WelcomeText
    {
        get => _welcomeText;
        set { _welcomeText = value; OnPropertyChanged(); }
    }

    public event PropertyChangedEventHandler PropertyChanged;
    protected void OnPropertyChanged([CallerMemberName] string name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

```xml
<!-- Pages/HomePage.xaml -->
<Page x:Class="MyApp.Pages.HomePage"
      xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <StackPanel Padding="32" Spacing="16">
        <TextBlock Text="{x:Bind ViewModel.WelcomeText, Mode=OneWay}"
                   Style="{StaticResource TitleTextBlockStyle}"/>
        <InfoBar x:Name="StatusBar" IsOpen="False" Severity="Success"/>
        <NumberBox Header="Quantity" Minimum="0" Maximum="100"
                   SpinButtonPlacementMode="Inline"/>
        <Button Click="OnRefresh" Content="Refresh"/>
    </StackPanel>
</Page>
```

## Rules
- XamlControlsResources as merged dictionary in App.xaml.
- NavigationView for app-level navigation structure.
- {x:Bind} for page-level binding (compile-time), {Binding} for templates.
- MSIX packaging required for production distribution.
- {x:Load} for deferred element loading in complex pages.
- Theme resources (ThemeShadow, AcrylicBrush) for modern visuals.
- .NET 8+ with Windows-specific TFMs.

## References

### Reference Files
- `references/winui3-setup.md` — Project setup, MSIX packaging, Win32 interop, debugging
- `references/winui3-controls.md` — Controls reference, templates, styles, behaviors

### Related Skills
- `desktop/wpf/SKILL.md` — WPF for legacy .NET Framework apps
- `desktop/uwp/SKILL.md` — UWP for Store-only deployment
- `desktop/winforms/SKILL.md` — WinForms for rapid legacy forms

## Handoff
Hand off to `desktop/wpf/SKILL.md` when need mature ecosystem or third-party controls unavailable in WinUI 3. Hand off to `desktop/uwp/SKILL.md` when Windows Store distribution required.
