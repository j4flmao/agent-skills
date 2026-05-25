---
name: uwp
description: >
  Use this skill when building Universal Windows Platform (UWP) apps — .NET/Windows Runtime, adaptive UI, Windows 10+, Store distribution, sandboxed execution, background tasks. Do NOT use for: desktop-only Win32 apps, cross-platform mobile/web, WinUI 3 unpackaged apps.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, windows, uwp, dotnet, xaml, phase-4]
---

# UWP

## Purpose
Build Universal Windows Platform apps with sandboxed execution, adaptive UI, and Store distribution for Windows 10+ devices.

## Agent Protocol

### Trigger
User request includes: `uwp`, `universal windows`, `windows runtime`, `winrt`, `store app`, `adaptive ui`, `windows 10 app`, `background task`.

### Input Context
- Windows 10 SDK version (19041, 22000, 22621)
- Language (C#, C++/WinRT)
- Device family (desktop, Xbox, HoloLens, IoT)
- Features (background tasks, notifications, camera, Bluetooth)
- MVVM framework (Template10, Prism, MvvmCross)

### Output Artifact
A markdown document containing:
- Project structure with Package.appxmanifest
- Adaptive UI with Visual State Manager
- Navigation with Frame/Page
- Data binding with {x:Bind}
- Background task registration
- Toast notification setup
- Store submission checklist

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Package.appxmanifest configured with capabilities.
- Adaptive layout with visual states or x:Load.
- Frame-based navigation between pages.
- Data bound to observable ViewModel.
- Background task registered in manifest and code.
- Toast notifications sending and handling.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Scaffold Project
```bash
dotnet new uwp -n MyUwpApp
# Or use Visual Studio: New Project > Blank App (Universal Windows)
```

### Step 2: Package Manifest
```xml
<!-- Package.appxmanifest (snippet) -->
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         IgnorableNamespaces="uap rescap">
  <Identity Name="MyCompany.MyUwpApp" Publisher="CN=MyCompany"
            Version="1.0.0.0"/>
  <Properties>
    <DisplayName>My UWP App</DisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0"
                        MaxVersionTested="10.0.22621.0"/>
  </Dependencies>
  <Capabilities>
    <Capability Name="internetClient"/>
    <DeviceCapability Name="webcam"/>
    <DeviceCapability Name="microphone"/>
  </Capabilities>
  <Extensions>
    <Extension Category="windows.backgroundTasks"
               EntryPoint="MyUwpApp.Tasks.MyBackgroundTask">
      <BackgroundTasks>
        <Task Type="systemEvent"/>
        <Task Type="timer"/>
      </BackgroundTasks>
    </Extension>
  </Extensions>
</Package>
```

### Step 3: Adaptive UI
```xml
<!-- MainPage.xaml -->
<Page x:Class="MyUwpApp.MainPage"
      xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

  <Grid>
    <VisualStateManager.VisualStateGroups>
      <VisualStateGroup>
        <VisualState x:Name="WideView">
          <VisualState.StateTriggers>
            <AdaptiveTrigger MinWindowWidth="800"/>
          </VisualState.StateTriggers>
          <VisualState.Setters>
            <Setter Target="ContentPanel.Orientation" Value="Horizontal"/>
            <Setter Target="Sidebar.Visibility" Value="Visible"/>
          </VisualState.Setters>
        </VisualState>
        <VisualState x:Name="NarrowView">
          <VisualState.StateTriggers>
            <AdaptiveTrigger MinWindowWidth="0"/>
          </VisualState.StateTriggers>
          <VisualState.Setters>
            <Setter Target="ContentPanel.Orientation" Value="Vertical"/>
            <Setter Target="Sidebar.Visibility" Value="Collapsed"/>
          </VisualState.Setters>
        </VisualState>
      </VisualStateGroup>
    </VisualStateManager.VisualStateGroups>

    <StackPanel x:Name="ContentPanel" Orientation="Horizontal">
      <StackPanel x:Name="Sidebar" Width="200" Background="{ThemeResource SystemControlBackgroundAccentBrush}">
        <TextBlock Text="Menu" Style="{StaticResource TitleTextBlockStyle}" Margin="12"/>
      </StackPanel>
      <Grid>
        <TextBlock Text="Main Content" Style="{StaticResource SubtitleTextBlockStyle}"/>
      </Grid>
    </StackPanel>
  </Grid>
</Page>
```

### Step 4: Background Task
```csharp
// Tasks/MyBackgroundTask.cs
using Windows.ApplicationModel.Background;

public sealed class MyBackgroundTask : IBackgroundTask
{
    public void Run(IBackgroundTaskInstance taskInstance)
    {
        var deferral = taskInstance.GetDeferral();
        try
        {
            // Perform background work
            var settings = Windows.Storage.ApplicationData.Current.LocalSettings;
            settings.Values["LastRunTime"] = DateTime.Now.ToString();
        }
        finally
        {
            deferral.Complete();
        }
    }
}
```

```csharp
// Register from App.xaml.cs
await BackgroundExecutionManager.RequestAccessAsync();
var builder = new BackgroundTaskBuilder
{
    Name = "MyBackgroundTask",
    TaskEntryPoint = "MyUwpApp.Tasks.MyBackgroundTask"
};
builder.SetTrigger(new TimeTrigger(15, false));
builder.Register();
```

### Step 5: Toast Notification
```csharp
using Windows.UI.Notifications;
using Windows.Data.Xml.Dom;

var template = ToastNotificationManager.GetTemplateContent(ToastTemplateType.ToastText02);
var elements = template.GetElementsByTagName("text");
elements[0].AppendChild(template.CreateTextNode("Hello from UWP"));
elements[1].AppendChild(template.CreateTextNode("This is a notification body"));

var toast = new ToastNotification(template);
ToastNotificationManager.CreateToastNotifier().Show(toast);
```

## Rules
- Capabilities list in manifest must match actual API usage.
- Background tasks declare entry point in manifest and implement IBackgroundTask.
- Adaptive layout using VisualStateManager + AdaptiveTrigger, not fixed sizes.
- {x:Bind} for compile-time binding in data templates.
- ApplicationData.LocalSettings for small key-value persistence.
- Async void only for event handlers — all else async Task.
- Store graphics required: 620x300, 1240x600, StoreLogo, Square44x44.

## References

### Reference Files
- `references/uwp-architecture.md` — MVVM, adaptive UI, layout panels, data binding, app lifecycle, background tasks, contracts
- `references/uwp-deployment.md` — Store submission, packaging, capabilities, sideloading, enterprise deployment, versioning
- `references/uwp-lifecycle.md` — App lifecycle, suspension, background tasks, activation
- `references/uwp-best-practices.md` — UWP best practices, architecture, data binding, performance

### Related Skills
- `desktop/winui3/SKILL.md` — WinUI 3 for modern desktop-only Windows apps
- `desktop/electron/SKILL.md` — Cross-platform alternative with Chromium runtime

## Handoff
Hand off to `desktop/winui3/SKILL.md` when need desktop-only app without Store restrictions. Hand off to `desktop/electron/SKILL.md` when cross-platform deployment required.
