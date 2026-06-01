---
name: desktop-uwp
description: >
  Use when the user asks about Universal Windows Platform (UWP) development, WinRT APIs, XAML UWP, Windows Store apps, or UWP lifecycle. Do NOT use for: WinUI 3 (desktop-winui3), WPF (desktop-wpf), or WinForms (desktop-winforms).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, uwp, windows]
---

# UWP

## Purpose
Build Universal Windows Platform (UWP) applications — Microsoft's modern Windows app platform with XAML UI, WinRT APIs, adaptive layout, and secure sandboxed deployment via the Microsoft Store. UWP emphasizes responsive design, touch-first interaction, and Windows 10/11 integration.

## Agent Protocol

### Trigger
Exact user phrases: "UWP", "Universal Windows Platform", "WinRT", "Windows Store app", "UWP XAML", "Windows Runtime", "AppContainer", "UWP lifecycle", "adaptive trigger", "VisualStateManager".

### Input Context
- Target SDK (Windows 10 1809+, Windows 11)
- Language (C#, C++/WinRT, JavaScript)
- XAML technologies (UWP XAML, WinUI 2.x)
- App features (notifications, background tasks, in-app purchases, tiles, share target)
- Form factor (desktop, tablet, Xbox, IoT, HoloLens)
- Deployment (Microsoft Store, sideloading, enterprise)

### Output Artifact
UWP application architecture with pages, navigation, data model, adaptive layout, and background tasks.

### Completion Criteria
- [ ] App project created with Package.appxmanifest
- [ ] Navigation framework selected (Frame, NavigationView, or TabView)
- [ ] Page hierarchy designed (main pages, dialogs, flyouts)
- [ ] Data binding strategy (x:Bind, Binding, or MVVM with INotifyPropertyChanged)
- [ ] Adaptive layout triggers (VisualStateManager, AdaptiveTrigger)
- [ ] Background tasks registered (Timer trigger, system event, push notification)
- [ ] Live tiles and notifications configured
- [ ] App lifecycle handled (Launching, Suspending, Resuming, OnBackgroundActivated)
- [ ] Store integration (licensing, trial, in-app purchases, ads)
- [ ] Accessibility (UIA, narrator, keyboard navigation, high contrast)

### Max Response Length
250 lines.

## Framework/Methodology

### UWP App Decision Tree
```
What kind of UWP app?
├── Standard Windows app → NavigationView + Pages
│   → Frame-based navigation with ShellPage
│   → MVVM with Template 10 or Community Toolkit
├── Media/content app → MediaPlayerElement + in-app toolbar
│   → SystemMediaTransportControls, SMTC integration
│   → Background audio, playlist management
├── IoT/embedded → Headless app with background tasks
│   → Windows IoT Core, GPIO, I2C, SPI
│   → App service for communication
├── Xbox app → Gamepad navigation, 10ft UI
│   → Focus visual, XY focus navigation
│   → High contrast, large target sizes
└── Line-of-business → Forms + data + printing + sharing
    → Content dialog, AppBar, Share contract
    → Enterprise sideloading, AppLocker
```

### UWP App Lifecycle
```
Launch → OnLaunched (SplashScreen → MainPage)
   ↓
Running (active, full interaction)
   ↓ (user switches away / Windows suspends)
Suspending → OnSuspending (save state, release resources)
   ↓ (5 second limit, app may be terminated)
Terminated → (if resumed: OnLaunched with PreviousExecutionState)
   ↓ (user switches back, app not terminated)
Resuming → OnResumed (restore state, refresh network)
```

## Workflow

### Step 1: Set Up UWP Project

```xml
<!-- Package.appxmanifest (key settings) -->
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  Identity Name="MyCompany.MyApp" Publisher="CN=MyCompany" Version="1.0.0.0" />

  <Properties>
    <DisplayName>My App</DisplayName>
    <PublisherDisplayName>My Company</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>

  <Dependencies>
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>

  <Capabilities>
    <Capability Name="internetClient" />
    <DeviceCapability Name="microphone" />
    <DeviceCapability Name="webcam" />
  </Capabilities>
```

### Step 2: Navigation and Shell

```xml
<!-- ShellPage.xaml - NavigationView layout -->
<Page xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

  <Grid>
    <NavigationView x:Name="NavView"
                    PaneDisplayMode="LeftCompact"
                    IsSettingsVisible="True"
                    ItemInvoked="NavView_ItemInvoked">
      <NavigationView.MenuItems>
        <NavigationViewItem Icon="Home" Content="Home" Tag="home" />
        <NavigationViewItem Icon="Library" Content="Library" Tag="library" />
        <NavigationViewItemSeparator />
        <NavigationViewItem Icon="Folder" Content="Projects" Tag="projects" />
      </NavigationView.MenuItems>

      <Frame x:Name="ContentFrame" />
    </NavigationView>
  </Grid>
</Page>
```

```csharp
// ShellPage.xaml.cs - Navigation
private void NavView_ItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
{
    if (args.IsSettingsInvoked)
    {
        ContentFrame.Navigate(typeof(SettingsPage));
        return;
    }

    var tag = (args.InvokedItemContainer as NavigationViewItem)?.Tag?.ToString();
    switch (tag)
    {
        case "home":
            ContentFrame.Navigate(typeof(HomePage));
            break;
        case "library":
            ContentFrame.Navigate(typeof(LibraryPage));
            break;
        case "projects":
            ContentFrame.Navigate(typeof(ProjectsPage));
            break;
    }
}
```

### Step 3: MVVM with Community Toolkit

```csharp
// ViewModel.cs
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;

public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private string title = "My UWP App";

    [ObservableProperty]
    private Item? selectedItem;

    public ObservableCollection<Item> Items { get; } = new();

    [RelayCommand]
    private async Task LoadItemsAsync()
    {
        // Simulate async load
        await Task.Delay(500);
        Items.Clear();
        foreach (var item in await _dataService.GetItemsAsync())
        {
            Items.Add(item);
        }
    }

    [RelayCommand]
    private async Task DeleteItemAsync(Item item)
    {
        Items.Remove(item);
        await _dataService.DeleteItemAsync(item.Id);
    }
}
```

### Step 4: Adaptive Layout

```xml
<!-- Adaptive page with VisualStateManager -->
<Page>
  <Grid>
    <VisualStateManager.VisualStateGroups>
      <VisualStateGroup>
        <VisualState x:Name="WideLayout">
          <VisualState.StateTriggers>
            <AdaptiveTrigger MinWindowWidth="1024" />
          </VisualState.StateTriggers>
          <VisualState.Setters>
            <Setter Target="ItemGrid.Columns" Value="4" />
            <Setter Target="DetailPanel.Visibility" Value="Visible" />
          </VisualState.Setters>
        </VisualState>

        <VisualState x:Name="MediumLayout">
          <VisualState.StateTriggers>
            <AdaptiveTrigger MinWindowWidth="600" />
          </VisualState.StateTriggers>
          <VisualState.Setters>
            <Setter Target="ItemGrid.Columns" Value="2" />
            <Setter Target="DetailPanel.Visibility" Value="Collapsed" />
          </VisualState.Setters>
        </VisualState>

        <VisualState x:Name="NarrowLayout">
          <VisualState.StateTriggers>
            <AdaptiveTrigger MinWindowWidth="0" />
          </VisualState.StateTriggers>
          <VisualState.Setters>
            <Setter Target="ItemGrid.Columns" Value="1" />
            <Setter Target="DetailPanel.Visibility" Value="Collapsed" />
          </VisualState.Setters>
        </VisualState>
      </VisualStateGroup>
    </VisualStateManager.VisualStateGroups>

    <Grid.ColumnDefinitions>
      <ColumnDefinition Width="2*" />
      <ColumnDefinition x:Name="DetailPanel" Width="*" />
    </Grid.ColumnDefinitions>

    <GridView x:Name="ItemGrid" Grid.Column="0">
      <GridView.ItemTemplate>
        <DataTemplate>
          <StackPanel>
            <TextBlock Text="{Binding Title}" Style="{StaticResource TitleTextBlockStyle}" />
            <TextBlock Text="{Binding Subtitle}" Style="{StaticResource CaptionTextBlockStyle}" />
          </StackPanel>
        </DataTemplate>
      </GridView.ItemTemplate>
    </GridView>

    <ScrollViewer Grid.Column="1" x:Name="DetailPanel">
      <!-- Detail content -->
    </ScrollViewer>
  </Grid>
</Page>
```

### Step 5: Background Tasks

```csharp
// WindowsRuntimeComponent/BackgroundTask.cs
public sealed class MyBackgroundTask : IBackgroundTask
{
    private BackgroundTaskDeferral? _deferral;

    public async void Run(IBackgroundTaskInstance taskInstance)
    {
        _deferral = taskInstance.GetDeferral();

        try
        {
            // Do background work
            var settings = ApplicationData.Current.LocalSettings;
            settings.Values["LastRunTime"] = DateTime.Now.ToString();

            // Update tile
            var updater = TileUpdateManager.CreateTileUpdaterForApplication();
            var tileXml = TileUpdateManager.GetTemplateContent(TileTemplateType.TileSquare150x150Text04);
            updater.Update(new TileNotification(tileXml));

            // Send toast if needed
            var toastXml = ToastNotificationManager.GetTemplateContent(ToastTemplateType.ToastText02);
            var toast = new ToastNotification(toastXml);
            ToastNotificationManager.CreateToastNotifier().Show(toast);
        }
        finally
        {
            _deferral?.Complete();
        }
    }
}
```

### Step 6: App Lifecycle

```csharp
// App.xaml.cs
sealed partial class App : Application
{
    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        // Check for previous execution state
        if (args.PreviousExecutionState == ApplicationExecutionState.Terminated)
        {
            // Restore saved state
            RestoreState();
        }

        var shell = new ShellPage();
        Window.Current.Content = shell;
        Window.Current.Activate();

        // Register for lifecycle events
        Application.Current.Suspending += OnSuspending;
        Application.Current.Resuming += OnResuming;
    }

    private async void OnSuspending(object sender, SuspendingEventArgs e)
    {
        var deferral = e.SuspendingOperation.GetDeferral();
        await SaveStateAsync();
        deferral.Complete();
    }

    private void OnResuming(object sender, object e)
    {
        RefreshNetworkState();
    }
}
```

### Step 7: Windows 11 Integration

```csharp
// Mica/acrylic backgrounds
using Windows.UI.Composition;
using Windows.UI.ViewManagement;

// Enable Mica (Win11 22000+)
var settings = new UISettings();
var accentColor = settings.GetColorValue(UIColorType.Accent);

// Title bar customization
var titleBar = ApplicationView.GetForCurrentView().TitleBar;
titleBar.ButtonBackgroundColor = Colors.Transparent;

// Snap layout integration
ApplicationView.GetForCurrentView().SetPreferredMinSize(new Size(400, 300));
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| App suspension data loss | State not saved before suspend | Save critical state in OnSuspending with deferral |
| .NET Native issues | Missing serialization, reflection | Use DataContractJsonSerializer, avoid late binding |
| Package limitations | File system, registry access restricted | Use ApplicationData, FutureAccessList for known folders |
| x:Bind limitations | Can't bind to methods, indexers, nested properties | Use Binding with converter as fallback |
| UI thread blocking | Async void instead of Task | Always async Task, not async void (except event handlers) |
| No adaptive layout | App looks wrong on different screens | AdaptiveTrigger, VisualStateManager, RelativePanel |
| Missing capability | App crashes when accessing camera, location, etc. | Declare required capabilities in manifest |
| Background task timeout | Tasks killed after 30 seconds | Use deferral, stay under 30s wall-clock time |
| Large package size | Including unnecessary WinMD references | Remove unused SDKs, optimize assets |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Use CommunityToolkit.Mvvm | MVVM source generators, no boilerplate |
| Prefer x:Bind over Binding | Compiled bindings are faster, type-safe |
| Use AdaptiveTrigger for layout | Automatic responsive design without code-behind |
| Store state in OnSuspending | 5-second limit, use deferral for async |
| Use Connected Animation | Native-feeling page transitions |
| Register background tasks with conditions | Battery, internet, user-present to extend lifetime |
| Use DesignTimeData | Better XAML designer experience |
| Version package manifest | Store updates require incrementing version |
| Test with App Analysis Kit | Detect perf issues, missing capabilities |
| Use WinUI 2.x controls | Modern UI over built-in UWP controls |

## Architecture Patterns

### Share Target
```xml
<Extensions>
  <uap:Extension Category="windows.shareTarget">
    <uap:ShareTarget Description="Share to My App">
      <uap:DataFormat>Text</uap:DataFormat>
      <uap:DataFormat>Bitmap</uap:DataFormat>
      <uap:DataFormat>StorageItems</uap:DataFormat>
    </uap:ShareTarget>
  </uap:Extension>
</Extensions>
```

### Toast Notifications
```csharp
var builder = new ToastContentBuilder()
    .AddText("Hello from UWP!")
    .AddButton(new ToastButton()
        .SetContent("Reply")
        .AddArgument("action", "reply"))
    .AddInlineImage(new Uri("ms-appx:///Assets/logo.png"));

builder.Show();
```

## References
  - references/uwp-advanced.md — UWP Advanced Topics
  - references/uwp-fundamentals.md — UWP Fundamentals
  - references/uwp-lifecycle.md — UWP Lifecycle Reference
  - references/uwp-xaml-patterns.md — UWP XAML Patterns Reference
## Handoff
Hand off to `desktop-winui3` for WinUI 3 migration. Hand off to `design-accessibility` for UIA/Narrator testing.
