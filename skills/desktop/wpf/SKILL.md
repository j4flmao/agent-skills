---
name: desktop-wpf
description: >
  Use when the user asks about WPF (.NET Framework or .NET Core/5+/6+), XAML desktop apps, MVVM with WPF, XAML data binding, or WPF custom controls. Do NOT use for: WinForms (desktop-winforms), WinUI 3 (desktop-winui3), or UWP (desktop-uwp).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, wpf, dotnet, xaml]
---

# WPF

## Purpose
Build Windows desktop applications using Windows Presentation Foundation (WPF) — .NET's XAML-based UI framework with powerful data binding, templating, styling, and hardware-accelerated rendering via DirectX. WPF excels at complex LOB applications with rich UI requirements.

## Agent Protocol

### Trigger
Exact user phrases: "WPF", "WPF app", "XAML", "MVVM WPF", "WPF data binding", "WPF custom control", "WPF styles", "WPF template", "WPF binding", "ICommand", "INotifyPropertyChanged", "WPF UserControl".

### Input Context
- .NET target (.NET 6+ preferred, .NET Framework 4.8.x for legacy)
- Architecture (MVVM, MVC, code-behind)
- UI patterns (master-detail, wizard, dashboard, document MDI)
- Data access (Entity Framework, NHibernate, Dapper, ADO.NET)
- Performance requirements (large data sets, real-time updates, complex visuals)
- Third-party controls (DevExpress, Telerik, Infragistics, or none)

### Output Artifact
WPF application architecture with XAML view tree, ViewModel layer, data access, and styling strategy.

### Completion Criteria
- [ ] Application class configured (App.xaml, startup, resources)
- [ ] Main window with layout (Grid, DockPanel, or custom shell)
- [ ] MVVM pattern with ViewModels and ICommand/RelayCommand
- [ ] Data binding across views (x: Bind for .NET 6+, or Binding with converters)
- [ ] Styles and resources defined (global, theme-aware)
- [ ] Data templates for list/detail views
- [ ] Custom controls or UserControls (if needed)
- [ ] Data validation (IDataErrorInfo, ValidationRule, INotifyDataErrorInfo)
- [ ] Async operations (async Command, progress reporting)
- [ ] Deployment (ClickOnce, MSIX, MSI, Squirrel)

### Max Response Length
250 lines.

## Framework/Methodology

### WPF Architecture Decision Tree
```
What is the WPF app complexity?
├── Simple CRUD (single form, few fields)
│   → Window with data-bound controls
│   → RelCommand, INotifyPropertyChanged in code-behind
├── Standard LOB (master-detail, search, reports)
│   → MVVM with dedicated ViewModels
│   → Navigation via ContentControl + DataTemplate
│   → Entity Framework for data access
├── Complex dashboard (real-time, charts, drag-drop)
│   → MVVM with messaging (Mediator/Messenger)
│   → VirtualizingCollection for large data
│   → 3rd party charts or custom DrawingVisual rendering
└── Enterprise (modular, plugins, multiple teams)
    → Prism/MAUI for modularity, region navigation
    → MEF/DI for plugin loading
    → Separate assemblies per module
```

### MVVM Core Pattern
```
View (XAML) — Data Binding, Commands, Triggers
    ↑                          ↓
ViewModel — Observable Properties, ICommand, INotifyDataErrorInfo
    ↑
Model — Business Logic, Data Access, Validation Rules
```

## Workflow

### Step 1: Set Up WPF Project with MVVM

```csharp
// App.xaml
<Application x:Class="MyApp.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:local="clr-namespace:MyApp"
             StartupUri="MainWindow.xaml">
  <Application.Resources>
    <ResourceDictionary>
      <ResourceDictionary.MergedDictionaries>
        <ResourceDictionary Source="Resources/Styles.xaml" />
        <ResourceDictionary Source="Resources/Converters.xaml" />
      </ResourceDictionary.MergedDictionaries>
    </ResourceDictionary>
  </Application.Resources>
</Application>

// App.xaml.cs - Configure DI
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IDataService, DataService>();
        services.AddTransient<MainViewModel>();
        services.AddTransient<MainWindow>();

        var provider = services.BuildServiceProvider();
        var window = provider.GetRequiredService<MainWindow>();
        window.DataContext = provider.GetRequiredService<MainViewModel>();
        window.Show();
    }
}
```

### Step 2: Create RelayCommand and BaseViewModel

```csharp
// Infrastructure/RelayCommand.cs
public class RelayCommand : ICommand
{
    private readonly Action<object?> _execute;
    private readonly Func<object?, bool>? _canExecute;

    public RelayCommand(Action<object?> execute, Func<object?, bool>? canExecute = null)
    {
        _execute = execute;
        _canExecute = canExecute;
    }

    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }

    public bool CanExecute(object? parameter) => _canExecute?.Invoke(parameter) ?? true;
    public void Execute(object? parameter) => _execute(parameter);
}

// Infrastructure/BaseViewModel.cs
public abstract class BaseViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
            return false;

        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        return true;
    }
}
```

### Step 3: Build ViewModel with Commands

```csharp
// ViewModels/MainViewModel.cs
public class MainViewModel : BaseViewModel
{
    private readonly IDataService _dataService;
    private string _searchText = string.Empty;
    private Item? _selectedItem;

    public MainViewModel(IDataService dataService)
    {
        _dataService = dataService;
        LoadItemsCommand = new RelayCommand(async _ => await LoadItemsAsync());
        DeleteItemCommand = new RelayCommand(async item => await DeleteItemAsync(item),
            item => item is Item);
        SaveCommand = new RelayCommand(async _ => await SaveAsync(), _ => CanSave);
    }

    public ObservableCollection<Item> Items { get; } = new();

    public string SearchText
    {
        get => _searchText;
        set
        {
            SetProperty(ref _searchText, value);
            _ = FilterItemsAsync(); // Fire-and-forget with error handling
        }
    }

    public Item? SelectedItem
    {
        get => _selectedItem;
        set
        {
            SetProperty(ref _selectedItem, value);
            OnPropertyChanged(nameof(CanSave));
        }
    }

    public bool CanSave => SelectedItem != null;

    public ICommand LoadItemsCommand { get; }
    public ICommand DeleteItemCommand { get; }
    public ICommand SaveCommand { get; }

    private async Task LoadItemsAsync()
    {
        IsBusy = true;
        try
        {
            var items = await _dataService.GetItemsAsync();
            Items.Clear();
            foreach (var item in items) Items.Add(item);
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to load: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task DeleteItemAsync(object? param)
    {
        if (param is Item item)
        {
            Items.Remove(item);
            await _dataService.DeleteItemAsync(item.Id);
        }
    }

    private async Task SaveAsync()
    {
        // Save logic
    }
}
```

### Step 4: WPF XAML with Data Binding

```xml
<Window x:Class="MyApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:conv="clr-namespace:MyApp.Converters"
        Title="My WPF App" Height="600" Width="900">

  <Window.Resources>
    <conv:BoolToVisibilityConverter x:Key="BoolToVis" />
  </Window.Resources>

  <Grid Margin="12">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto" />
      <RowDefinition Height="Auto" />
      <RowDefinition Height="*" />
      <RowDefinition Height="Auto" />
    </Grid.RowDefinitions>

    <!-- Search bar -->
    <TextBox Grid.Row="0" Text="{Binding SearchText, UpdateSourceTrigger=PropertyChanged}"
             Margin="0,0,0,8" Watermark="Search items..." />

    <!-- Busy indicator -->
    <ProgressBar Grid.Row="1" IsIndeterminate="{Binding IsBusy}"
                 Visibility="{Binding IsBusy, Converter={StaticResource BoolToVis}}"
                 Height="4" Margin="0,0,0,8" />

    <!-- Master-detail -->
    <Grid Grid.Row="2" ColumnDefinitions="2*,*">
      <!-- List -->
      <ListBox ItemsSource="{Binding Items}"
               SelectedItem="{Binding SelectedItem, Mode=TwoWay}"
               VirtualizingPanel.IsVirtualizing="True"
               VirtualizingPanel.VirtualizationMode="Recycling">
        <ListBox.ItemTemplate>
          <DataTemplate>
            <StackPanel Margin="4">
              <TextBlock Text="{Binding Name}" FontWeight="SemiBold" />
              <TextBlock Text="{Binding Subtitle}" Foreground="Gray"
                         FontSize="11" />
            </StackPanel>
          </DataTemplate>
        </ListBox.ItemTemplate>
      </ListBox>

      <!-- Detail -->
      <ContentControl Grid.Column="1" Margin="16,0,0,0"
                      Content="{Binding SelectedItem}">
        <ContentControl.ContentTemplate>
          <DataTemplate>
            <StackPanel>
              <TextBlock Text="{Binding Name}" FontSize="18" FontWeight="Bold" />
              <TextBlock Text="{Binding Description}" TextWrapping="Wrap"
                         Margin="0,8,0,0" />
              <CheckBox IsChecked="{Binding IsActive}" Content="Active"
                        Margin="0,8,0,0" />
            </StackPanel>
          </DataTemplate>
        </ContentControl.ContentTemplate>
      </ContentControl>
    </Grid>

    <!-- Status bar -->
    <StatusBar Grid.Row="3">
      <StatusBarItem>
        <TextBlock Text="{Binding StatusMessage}" />
      </StatusBarItem>
    </StatusBar>
  </Grid>
</Window>
```

### Step 5: Data Validation

```csharp
// Model with validation
public class Item : BaseViewModel, IDataErrorInfo
{
    private string _name = string.Empty;
    private string _email = string.Empty;

    public string Name
    {
        get => _name;
        set => SetProperty(ref _name, value);
    }

    public string Email
    {
        get => _email;
        set => SetProperty(ref _email, value);
    }

    // IDataErrorInfo implementation
    public string this[string columnName] => columnName switch
    {
        nameof(Name) => string.IsNullOrWhiteSpace(Name)
            ? "Name is required"
            : Name.Length > 100 ? "Name too long (max 100)" : string.Empty,
        nameof(Email) => !Regex.IsMatch(Email ?? "", @"^[^@\s]+@[^@\s]+\.[^@\s]+$")
            ? "Invalid email format"
            : string.Empty,
        _ => string.Empty
    };

    public string Error => string.Empty;
}
```

### Step 6: WPF Styling and Theming

```xml
<!-- Resources/Styles.xaml -->
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
  <!-- Colors -->
  <Color x:Key="PrimaryColor">#2563EB</Color>
  <Color x:Key="PrimaryHover">#1D4ED8</Color>
  <Color x:Key="SurfaceColor">#F8FAFC</Color>
  <Color x:Key="TextPrimary">#1E293B</Color>

  <!-- Brushes -->
  <SolidColorBrush x:Key="PrimaryBrush" Color="{StaticResource PrimaryColor}" />
  <SolidColorBrush x:Key="SurfaceBrush" Color="{StaticResource SurfaceColor}" />

  <!-- Base button style -->
  <Style TargetType="Button">
    <Setter Property="Background" Value="{StaticResource PrimaryBrush}" />
    <Setter Property="Foreground" Value="White" />
    <Setter Property="Padding" Value="12,6" />
    <Setter Property="BorderThickness" Value="0" />
    <Setter Property="Cursor" Value="Hand" />
    <Style.Triggers>
      <Trigger Property="IsMouseOver" Value="True">
        <Setter Property="Background" Value="#1D4ED8" />
      </Trigger>
      <Trigger Property="IsEnabled" Value="False">
        <Setter Property="Background" Value="#94A3B8" />
      </Trigger>
    </Style.Triggers>
  </Style>

  <!-- ListBox item style -->
  <Style TargetType="ListBoxItem">
    <Setter Property="Padding" Value="8,4" />
    <Setter Property="Margin" Value="0,2" />
    <Style.Triggers>
      <Trigger Property="IsSelected" Value="True">
        <Setter Property="Background" Value="#DBEAFE" />
      </Trigger>
    </Style.Triggers>
  </Style>
</ResourceDictionary>
```

### Step 7: Custom Controls and UserControls

```csharp
// Controls/WatermarkTextBox.cs - Custom control with additional property
public class WatermarkTextBox : TextBox
{
    static WatermarkTextBox()
    {
        DefaultStyleKeyProperty.OverrideMetadata(typeof(WatermarkTextBox),
            new FrameworkPropertyMetadata(typeof(WatermarkTextBox)));
    }

    public string Watermark
    {
        get => (string)GetValue(WatermarkProperty);
        set => SetValue(WatermarkProperty, value);
    }
    public static readonly DependencyProperty WatermarkProperty =
        DependencyProperty.Register(nameof(Watermark), typeof(string),
            typeof(WatermarkTextBox), new PropertyMetadata(string.Empty));
}
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| UI thread blocking | Heavy computation freezes app | async/await, BackgroundWorker, Task.Run with dispatcher |
| Memory leaks from event handlers | Subscribing without unsubscribing | WeakEvent pattern, -= in Dispose |
| Data Virtualization missing | Loading 10K+ rows freezes UI | VirtualizingCollection, async loading, paging |
| INotifyPropertyChanged overhead | Every property change triggers binding | Batch updates, delay signals, use SetProperty |
| No async commands | Button blocks while operation runs | Use AsyncRelayCommand or async void with error handling |
| Deep XAML nesting | Performance degradation from complexity | UserControl extraction, virtualization |
| Missing fallback values | Binding errors show nothing | TargetNullValue, FallbackValue on bindings |
| Ignoring Freezable objects | Shared resources modified at runtime | Freeze resources, use Frozen flag |
| No dispatcher for background updates | Cross-thread UI access exception | Check Dispatcher.CheckAccess, use InvokeAsync |
| Large resource dictionaries | Slow startup loading all resources | Split by theme/feature, merge lazily |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| MVVM strictly enforced | Testability, separation of concerns |
| CommunityToolkit.Mvvm for source generators | Less boilerplate, compile-time verified |
| async/await for all I/O | Non-blocking UI, Task-based commands |
| VirtualizingPanel for lists | Efficient rendering of large collections |
| StaticResource over DynamicResource | Better performance, compile-time check |
| DataTemplates for type-based rendering | Automatic view resolution for ViewModel types |
| Attached behaviors for complex interactions | Reusable, declarative interaction patterns |
| Prism for modular enterprise apps | Region navigation, modularity, DI integration |
| WPF Performance Suite for profiling | Identify rendering, layout, binding bottlenecks |
| .NET 6+ for new WPF projects | .NET 6+, not .NET Framework |

## Architecture Patterns

### Dialog Service (MVVM-Friendly)
```csharp
public interface IDialogService
{
    bool? ShowDialog(string title, object viewModel);
}
public class DialogService : IDialogService
{
    public bool? ShowDialog(string title, object viewModel)
    {
        var window = new Window
        {
            Title = title,
            Content = new ContentControl { Content = viewModel },
            DataContext = viewModel,
            Width = 400, Height = 300,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            Owner = Application.Current.MainWindow
        };
        return window.ShowDialog();
    }
}
```

### Mediator for ViewModel Communication
```csharp
// WeakReference-based messaging between ViewModels
public class Mediator
{
    private readonly Dictionary<Type, List<WeakReference>> _subscribers = new();

    public void Subscribe<TMessage>(object subscriber, Action<TMessage> handler) { ... }
    public void Unsubscribe<TMessage>(object subscriber) { ... }
    public void Send<TMessage>(TMessage message) { ... }
}
```

## References
  - references/wpf-advanced.md — WPF Advanced Topics
  - references/wpf-fundamentals.md — WPF Fundamentals
  - references/wpf-mvvm-patterns.md — WPF MVVM Patterns Reference
  - references/wpf-performance.md — WPF Performance Reference
  - references/wpf-styling.md — WPF Styling and Theming Reference
## Handoff
Hand off to `desktop-winui3` for Windows App SDK migration. Hand off to `design-accessibility` for UIA accessibility testing.
