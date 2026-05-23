# WPF Architecture Reference

## Project Structure

```
MyApp/
├── App.xaml / App.xaml.cs        # Application entry, DI, global styles
├── Views/
│   ├── MainWindow.xaml / .cs
│   ├── CustomerEditView.xaml / .cs
│   └── SettingsView.xaml / .cs
├── ViewModels/
│   ├── MainViewModel.cs
│   ├── CustomerEditViewModel.cs
│   └── SettingsViewModel.cs
├── Models/
│   ├── Customer.cs
│   └── Order.cs
├── Services/
│   ├── ICustomerService.cs
│   ├── CustomerService.cs
│   ├── INavigationService.cs
│   └── NavigationService.cs
├── Converters/
│   ├── BoolToVisibilityConverter.cs
│   └── DateFormatConverter.cs
├── Styles/
│   └── GlobalStyles.xaml
└── Resources/
    └── Icons/
```

## Dependency Injection Setup

```csharp
// App.xaml.cs
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public partial class App : Application
{
    private static IHost _host;

    public static IHost Host => _host ??= CreateHostBuilder().Build();

    private static IHostBuilder CreateHostBuilder()
    {
        return Host.CreateDefaultBuilder()
            .ConfigureServices((context, services) =>
            {
                services.AddSingleton<MainViewModel>();
                services.AddTransient<CustomerEditViewModel>();
                services.AddTransient<MainWindow>();

                services.AddScoped<ICustomerService, CustomerService>();
                services.AddSingleton<INavigationService, NavigationService>();
            });
    }

    protected override async void OnStartup(StartupEventArgs e)
    {
        await Host.StartAsync();
        var window = Host.Services.GetRequiredService<MainWindow>();
        window.DataContext = Host.Services.GetRequiredService<MainViewModel>();
        window.Show();
        base.OnStartup(e);
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        await Host.StopAsync();
        base.OnExit(e);
    }
}
```

## Dispatcher and Threading

```csharp
// Update UI from background thread
await Task.Run(() =>
{
    // Background work
    var result = ComputeExpensiveOperation();

    // Dispatch to UI thread
    Application.Current.Dispatcher.Invoke(() =>
    {
        ViewModel.Result = result;
    });
});

// Using async/await (automatic marshaling)
private async void LoadButton_Click(object sender, RoutedEventArgs e)
{
    StatusText = "Loading...";
    var data = await _service.FetchDataAsync();  // UI stays responsive
    Items = new ObservableCollection<Item>(data);
    StatusText = "Loaded";
}
```

## Window Lifecycle

| Event | Trigger | Use |
|-------|---------|-----|
| Initialized | Before window shown | Set defaults, wire events |
| Loaded | Window rendered | Load data, start operations |
| ContentRendered | First content drawn | Post-layout adjustments |
| Activated | Window gains focus | Refresh stale data |
| Deactivated | Window loses focus | Pause animations |
| Closing | User closing | Confirm unsaved changes |
| Closed | Window destroyed | Cleanup resources |

## INotifyPropertyChanged with CommunityToolkit

```csharp
// Using source generators (recommended)
public partial class CustomerViewModel : ObservableObject
{
    [ObservableProperty]
    private int _id;

    [ObservableProperty]
    private string _name;

    [ObservableProperty]
    private string _email;

    [ObservableProperty]
    private bool _isSelected;

    // Computed property
    public string DisplayName => $"{Name} ({Email})";

    partial void OnNameChanged(string value)
    {
        OnPropertyChanged(nameof(DisplayName));
    }
}
```

## Data Templates

```xml
<Window.Resources>
    <!-- Type-based data templates -->
    <DataTemplate DataType="{x:Type models:Customer}">
        <Border BorderBrush="#EEE" BorderThickness="0,0,0,1" Padding="8">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <CheckBox IsChecked="{Binding IsSelected}" Grid.Column="0"/>
                <StackPanel Grid.Column="1" Margin="8,0,0,0">
                    <TextBlock Text="{Binding Name}" FontWeight="SemiBold"/>
                    <TextBlock Text="{Binding Email}" Foreground="Gray"/>
                </StackPanel>
            </Grid>
        </Border>
    </DataTemplate>
</Window.Resources>

<!-- Implicit template usage -->
<ListBox ItemsSource="{Binding Customers}"/>
<!-- Each item renders using Customer DataTemplate -->
```

## Value Converters

```csharp
[ValueConversion(typeof(bool), typeof(Visibility))]
public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        bool boolValue = (bool)value;
        bool invert = parameter?.ToString() == "invert";
        return (boolValue ^ invert) ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var vis = (Visibility)value;
        bool invert = parameter?.ToString() == "invert";
        return (vis == Visibility.Visible) ^ invert;
    }
}
```

```xml
<Window.Resources>
    <converters:BoolToVisibilityConverter x:Key="BoolToVis"/>
</Window.Resources>

<Button Visibility="{Binding IsVisible, Converter={StaticResource BoolToVis}}"/>
```

## Resource Dictionaries Merging

```xml
<Application.Resources>
    <ResourceDictionary>
        <ResourceDictionary.MergedDictionaries>
            <ResourceDictionary Source="Styles/Colors.xaml"/>
            <ResourceDictionary Source="Styles/Buttons.xaml"/>
            <ResourceDictionary Source="Styles/DataGrid.xaml"/>
            <ResourceDictionary Source="Styles/Converters.xaml"/>
        </ResourceDictionary.MergedDictionaries>
    </ResourceDictionary>
</Application.Resources>
```

## Multi-Window Support

```csharp
// Open a new window from ViewModel via service
public class WindowService : IWindowService
{
    public void ShowWindow<T>() where T : Window
    {
        var window = App.Host.Services.GetRequiredService<T>();
        window.Show();
    }

    public bool? ShowDialog<T>() where T : Window
    {
        var window = App.Host.Services.GetRequiredService<T>();
        return window.ShowDialog();
    }
}
```
