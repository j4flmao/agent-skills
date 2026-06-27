---
name: desktop-winui3
description: >
  Use when the user asks about WinUI 3 desktop app development, Windows App SDK, WinUI XAML, Mica/acrylic materials, or modern Windows desktop UI. Do NOT use for: UWP (desktop-uwp), WPF (desktop-wpf), or WinForms (desktop-winforms).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, winui3, windows, windows-app-sdk]
---

# WinUI 3

## Purpose
Build modern Windows desktop applications using WinUI 3 with the Windows App SDK — Microsoft's native Windows UI framework with Fluent Design, Mica materials, and access to WinRT APIs without UWP constraints.

## Agent Protocol

### Trigger
Exact user phrases: "WinUI 3", "Windows App SDK", "WinUI XAML", "Fluent Design", "Mica", "WinUI desktop", "WinUI navigation", "NavigationView", "InfoBar", "WinUI 3 app".

### Input Context
- Windows App SDK version (1.3, 1.4, 1.5+)
- .NET version (.NET 6+ for C#, or C++/WinRT)
- App packaging (MSIX packaged, unpackaged, or both)
- UI requirements (NavigationView, TabView, DataGrid, custom controls)
- OS features needed (notifications, background tasks, Share, Mica)
- Deployment strategy (Store, sideloading, enterprise MSI)

### Output Artifact
WinUI 3 application architecture with pages, navigation, data binding, and Windows 11 integration.

### Completion Criteria
- [ ] App project created with Windows App SDK NuGet packages
- [ ] Navigation framework selected (NavigationView, Pivot, or TabView)
- [ ] Page hierarchy defined
- [ ] MVVM pattern established (CommunityToolkit.Mvvm or similar)
- [ ] Data binding and resource system configured
- [ ] Mica/acrylic material applied to main window
- [ ] Theme support (light/dark, system preference)
- [ ] App lifecycle handled (OnLaunched, OnSuspending)
- [ ] Custom controls defined (if needed: UserControl, TemplatedControl)
- [ ] MSIX packaging configured with capabilities

### Max Response Length
250 lines.

## Framework/Methodology

### WinUI 3 Decision Tree
```
What is the app requirement?
├── Standard Windows app (modern Fluent Design)
│   → WinUI 3 + MVVM + NavigationView
│   → MSIX package, Mica backdrop, dark mode
├── Data-heavy LOB app (master-detail, data grid)
│   → WinUI 3 + CommunityToolkit DataGrid
│   → VirtualizingCollectionView, async loading
├── Media/content app (video player, image viewer)
│   → WinUI 3 + MediaPlayerElement
│   → SystemMediaTransportControls, thumbnail toolbar
├── Multi-tab MDI app (editor, browser tabs)
│   → TabView with closable tabs
│   → TabView.TabItemsSource binding
└── Migration from UWP or WPF
    → Hybrid approach: host WinUI 3 in WPF via child window
    → Or full migration with feature parity check
```

### WinUI 3 vs UWP vs WPF
```
Feature                    WinUI 3          UWP              WPF
────────────────────────────────────────────────────────────────────
Full Windows APIs          ✅ Full         ❌ Sandboxed     ✅ Full
WinRT access               ✅ Yes           ✅ Yes           ❌ No
Fluent Design (Mica)       ✅ Yes           ❌ Limited       ❌ No
Unpackaged support         ✅ Yes           ❌ No            ✅ Yes
.NET/C# support            ✅ .NET 6+       ❌ .NET Native   ✅ .NET
XAML performance           ✅ Fast (C++/WinRT) ✅ Fast        ❌ Slower
Legacy WinForms hosting    ❌ No            ❌ No            ✅ Yes
Cross-platform             ❌ Windows only  ❌ Windows only  ❌ Windows only
Learning curve             Moderate        Moderate        Steep (XAML)
```

## Workflow

### Step 1: Set Up WinUI 3 Project

```csharp
// App.xaml.cs
public partial class App : Application
{
    public static Window? MainWindow { get; private set; }

    protected override void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
    {
        MainWindow = new MainWindow();
        MainWindow.Activate();

        // Apply Mica backdrop (Windows 11)
        if (DesktopAcrylicController.IsSupported())
        {
            var micaController = new MicaController();
            micaController.SetSystemBackdropConfiguration(new SystemBackdropConfiguration
            {
                IsInputActive = true,
                Theme = SystemBackdropTheme.Default
            });
            micaController.AddSystemBackdropTarget(MainWindow.As<Microsoft.UI.Composition.ICompositionSupportsSystemBackdrop>());
        }
    }
}
```

```csharp
// MainWindow.xaml.cs
public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Title = "My WinUI 3 App";
        ExtendsContentIntoTitleBar = true;

        // Set title bar drag region
        SetTitleBar(AppTitleBar);
    }
}
```

### Step 2: Navigation with NavigationView

```xml
<Window x:Class="MyApp.MainWindow">
  <Grid RowDefinitions="Auto,*">
    <!-- Custom title bar -->
    <Grid x:Name="AppTitleBar" Grid.Row="0" Height="32" Margin="0,0,0,0">
      <TextBlock Text="My App" VerticalAlignment="Center" Margin="12,0,0,0"
                 Style="{StaticResource CaptionTextBlockStyle}" />
    </Grid>

    <!-- Navigation View -->
    <NavigationView x:Name="NavView" Grid.Row="1"
                    PaneDisplayMode="LeftCompact"
                    IsSettingsVisible="True"
                    ItemInvoked="NavView_ItemInvoked"
                    BackRequested="NavView_BackRequested">
      <NavigationView.MenuItems>
        <NavigationViewItem Content="Home" Tag="home" Icon="Home" />
        <NavigationViewItem Content="Library" Tag="library" Icon="Library" />
        <NavigationViewItemSeparator />
        <NavigationViewItem Content="Projects" Tag="projects" Icon="Folder" />
      </NavigationView.MenuItems>

      <Frame x:Name="ContentFrame" />
    </NavigationView>
  </Grid>
</Window>
```

```csharp
// Navigation handling
private void NavView_ItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
{
    if (args.IsSettingsInvoked)
    {
        ContentFrame.Navigate(typeof(SettingsPage));
        return;
    }

    var tag = (args.InvokedItemContainer as NavigationViewItem)?.Tag?.ToString();
    NavigateToPage(tag);
}

private void NavigateToPage(string? tag)
{
    Type? page = tag switch
    {
        "home" => typeof(HomePage),
        "library" => typeof(LibraryPage),
        "projects" => typeof(ProjectsPage),
        _ => null
    };

    if (page != null && ContentFrame.CurrentSourcePageType != page)
    {
        ContentFrame.Navigate(page, null, new SlideNavigationTransitionInfo
        {
            Effect = SlideNavigationTransitionEffect.FromRight
        });
    }
}
```

### Step 3: MVVM with CommunityToolkit

```csharp
// ViewModels/MainViewModel.cs
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;

public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private bool isLoading;

    [ObservableProperty]
    private string statusMessage = "Ready";

    [ObservableProperty]
    private Item? selectedItem;

    public ObservableCollection<Item> Items { get; } = new();

    [RelayCommand]
    private async Task LoadItemsAsync()
    {
        IsLoading = true;
        StatusMessage = "Loading items...";

        try
        {
            var items = await _dataService.GetItemsAsync();
            Items.Clear();
            foreach (var item in items)
            {
                Items.Add(item);
            }
            StatusMessage = $"Loaded {items.Count} items";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
            // Show InfoBar in view
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    private async Task DeleteItemAsync(Item item)
    {
        Items.Remove(item);
        await _dataService.DeleteItemAsync(item.Id);
        StatusMessage = "Item deleted";
    }
}
```

### Step 4: WinUI XAML Page with Data Binding

```xml
<Page x:Class="MyApp.Pages.HomePage"
      xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

  <Grid>
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto" />
      <RowDefinition Height="*" />
    </Grid.RowDefinitions>

    <!-- InfoBar for notifications -->
    <InfoBar x:Name="StatusInfoBar" Grid.Row="0"
             IsOpen="{x:Bind ViewModel.IsLoading, Mode=OneWay}"
             Severity="Informational"
             Message="{x:Bind ViewModel.StatusMessage, Mode=OneWay}" />

    <!-- Master-detail layout -->
    <Grid Grid.Row="1" ColumnDefinitions="300,*">
      <!-- Master list -->
      <ListView ItemsSource="{x:Bind ViewModel.Items, Mode=OneWay}"
                SelectedItem="{x:Bind ViewModel.SelectedItem, Mode=TwoWay}"
                SelectionMode="Single">
        <ListView.ItemTemplate>
          <DataTemplate>
            <StackPanel>
              <TextBlock Text="{Binding Name}" Style="{StaticResource BodyStrongTextBlockStyle}" />
              <TextBlock Text="{Binding Subtitle}" Style="{StaticResource BodyTextBlockStyle}"
                         Foreground="{ThemeResource TextFillColorSecondaryBrush}" />
            </StackPanel>
          </DataTemplate>
        </ListView.ItemTemplate>
      </ListView>

      <!-- Detail panel -->
      <StackPanel Grid.Column="1" Margin="16,0,0,0"
                  Visibility="{x:Bind ViewModel.SelectedItem, Mode=OneWay, Converter={StaticResource NotNullToVisibilityConverter}}">
        <TextBlock Text="{x:Bind ViewModel.SelectedItem.Name, Mode=OneWay}"
                   Style="{StaticResource TitleLargeTextBlockStyle}" />
        <TextBlock Text="{x:Bind ViewModel.SelectedItem.Description, Mode=OneWay}"
                   Style="{StaticResource BodyTextBlockStyle}"
                   Margin="0,8,0,0" />
      </StackPanel>
    </Grid>
  </Grid>
</Page>
```

### Step 5: Windows 11 Materials and Title Bar

```csharp
// Mica backdrop configuration
private void ApplyMica()
{
    if (MicaController.IsSupported())
    {
        var configuration = new SystemBackdropConfiguration
        {
            IsInputActive = true,
            Theme = SystemBackdropTheme.Default
        };

        // React to theme changes
        _themeListener = new;
        _themeListener.ThemeChanged += (s, e) =>
        {
            configuration.Theme = e.Theme switch
            {
                "Dark" => SystemBackdropTheme.Dark,
                "Light" => SystemBackdropTheme.Light,
                _ => SystemBackdropTheme.Default
            };
        };
        _themeListener.Start();

        var micaController = new MicaController();
        micaController.SetSystemBackdropConfiguration(configuration);
        micaController.AddSystemBackdropTarget(this.As<ICompositionSupportsSystemBackdrop>());
    }
    else
    {
        // Fallback: acrylic
        var acrylicController = new DesktopAcrylicController();
        // Similar setup
    }
}

// Extend content into title bar
ExtendsContentIntoTitleBar = true;
SetTitleBar(AppTitleBar); // Custom Grid at top of window
```

### Step 6: Custom Controls

```csharp
// Controls/CardControl.cs
[TemplatePart(Name = nameof(PART_Image), Type = typeof(Image))]
[TemplatePart(Name = nameof(PART_Title), Type = typeof(TextBlock))]
[TemplatePart(Name = nameof(PART_Description), Type = typeof(TextBlock))]
public sealed class CardControl : Control
{
    private Image? PART_Image;
    private TextBlock? PART_Title;
    private TextBlock? PART_Description;

    public CardControl()
    {
        DefaultStyleKey = typeof(CardControl);
    }

    protected override void OnApplyTemplate()
    {
        PART_Image = GetTemplateChild(nameof(PART_Image)) as Image;
        PART_Title = GetTemplateChild(nameof(PART_Title)) as TextBlock;
        PART_Description = GetTemplateChild(nameof(PART_Description)) as TextBlock;
        base.OnApplyTemplate();
    }

    public string Title
    {
        get => (string)GetValue(TitleProperty);
        set => SetValue(TitleProperty, value);
    }
    public static readonly DependencyProperty TitleProperty =
        DependencyProperty.Register(nameof(Title), typeof(string), typeof(CardControl),
            new PropertyMetadata(string.Empty, OnTitleChanged));
    private static void OnTitleChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        (d as CardControl)?.PART_Title?.SetValue(TextBlock.TextProperty, e.NewValue);
    }
}
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Unpackaged limitations | Missing Mica, background tasks restricted | Use MSIX package for full feature access |
| WinUI 2 vs WinUI 3 API confusion | Different namespaces, APIs | Ensure Windows App SDK, not UWP-only APIs |
| NavigationView overhead | Heavy on initial load with many items | Lazy loading pages, virtualization |
| Title bar customization bugs | Drag region, minimize/maximize broken | Proper SetTitleBar, exclude interactive elements |
| WinRT threading issues | STA vs MTA, async/await on wrong thread | Use DispatcherQueue for UI work |
| Missing .winmd references | C++/WinRT interop errors | Install matching Windows SDK, C++/WinRT NuGet |
| Large MSIX packages | Bundling unnecessary dependencies | Package reduction, dependency trimming |
| No backward compatible Win10 | Win11-only APIs crash on Win10 | Check ApiInformation.IsApiContractPresent |
| Resource dictionary conflicts | Theme resources, merged dictionaries | Namespace resources, proper key scoping |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| MVVM with CommunityToolkit.Mvvm | Source generators, no boilerplate, testable |
| MSIX packaging | Full API access, automatic updates, clean uninstall |
| Mica for backgrounds | Native Win11 look, performant (GPU-composited) |
| x:Bind over Binding | Compiled binding, better performance, type-safe |
| NavigationView for app shell | Standard Win11 navigation pattern |
| Lazy loading pages | Faster startup, lower memory |
| Theme-based resources | Automatic light/dark support |
| InfoBar for notifications | Better than status bar, supports action button |
| DispatcherQueue for UI thread | Safe cross-thread updates |
| WinAppSdk self-contained deployment | No runtime dependency on installed SDK |

## Architecture Patterns

### TabView (Multi-Tab MDI)
```xml
<TabView TabItemsSource="{x:Bind ViewModel.OpenTabs}"
         AddTabButtonClick="TabView_AddTabButtonClick"
         TabCloseRequested="TabView_TabCloseRequested">
  <TabView.ItemTemplate>
    <DataTemplate>
      <TabViewItem Header="{Binding Title}" IconSource="{Binding Icon}">
        <Frame SourcePageType="{Binding PageType}" />
      </TabViewItem>
    </DataTemplate>
  </TabView.ItemTemplate>
</TabView>
```

### WinUI 3 Hosting in WPF
```csharp
// WPF hosting WinUI 3 via WindowsXamlHost
using Microsoft.Toolkit.Wpf.UI.XamlHost;

var host = new WindowsXamlHost();
host.InitialTypeName = "MyApp.Controls.MyWinUIControl";
// Add to WPF layout
```

## References
  - references/winui3-advanced.md — WinUI 3 Advanced Topics
  - references/winui3-fundamentals.md — WinUI 3 Fundamentals
  - references/winui3-migration.md — UWP/WPF to WinUI 3 Migration Reference
  - references/winui3-xaml-patterns.md — WinUI 3 XAML Patterns Reference
## Handoff
Hand off to `design-accessibility` for UIA/accessibility testing. Hand off to `desktop-uwp` for UWP-specific API references.
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

## Architecture Decision Trees

### WinUI 3 (Desktop) vs UWP

| Decision | WinUI 3 (Desktop) | UWP |
|---|---|---|
| Window model | Full window control | UWP window constraints |
| WinRT APIs | Via WinRT interop | Native access |
| .NET support | .NET 6+ | .NET Native / WinRT |
| MSIX | Yes (required for Store) | Yes |
| Community toolkit | WinUI 3 Gallery | UWP Community Toolkit |
| Future | Microsoft investment | Maintenance mode |
| Best for | New Windows desktop apps | Existing UWP apps |

### WinUI 3 vs WPF for Migration

| Aspect | WinUI 3 | WPF |
|---|---|---|
| Learning path | New XAML (WinUI) | Legacy XAML |
| WebView2 | Built-in | Requires NuGet |
| Acrylic/Mica | Built-in | Manual |
| Desktop integration | Full | Full |
| Third-party controls | Growing ecosystem | Mature ecosystem |