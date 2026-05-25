# WPF Best Practices

## Project Structure

```
MyApp/
├── App.xaml                — Application resources, styles
├── App.xaml.cs             — DI setup, startup
├── ViewModels/
│   ├── MainViewModel.cs    — [ObservableProperty], [RelayCommand]
│   ├── OrderListViewModel.cs
│   └── OrderDetailViewModel.cs
├── Views/
│   ├── MainWindow.xaml
│   ├── OrderListView.xaml
│   └── OrderDetailView.xaml
├── Models/
│   ├── Order.cs
│   └── OrderItem.cs
├── Services/
│   ├── IOrderService.cs
│   └── OrderService.cs
├── Controls/
│   └── LoadingSpinner.xaml
├── Converters/
│   ├── BoolToVisibilityConverter.cs
│   └── DateFormatConverter.cs
├── Styles/
│   ├── GlobalStyles.xaml
│   └── ButtonStyles.xaml
└── Helpers/
    └── RelayCommand.cs
```

## MVVM with CommunityToolkit

```csharp
public partial class OrderListViewModel : ObservableObject
{
    private readonly IOrderService _orderService;

    [ObservableProperty]
    private ObservableCollection<Order> orders = new();

    [ObservableProperty]
    private bool isLoading;

    [ObservableProperty]
    private string? searchText;

    [RelayCommand]
    private async Task LoadOrdersAsync()
    {
        IsLoading = true;
        try
        {
            var result = await _orderService.GetOrdersAsync();
            Orders = new ObservableCollection<Order>(result);
        }
        finally
        {
            IsLoading = false;
        }
    }

    partial void OnSearchTextChanged(string? value)
    {
        LoadOrdersCommand.Execute(null);
    }
}
```

## Data Binding

| Binding Mode | Use Case | Notes |
|-------------|----------|-------|
| OneWay | Read-only display | Default for read-only |
| TwoWay | Editable fields | Default for TextBox |
| OneTime | Static data | Best performance |
| OneWayToSource | Output-only | Form submission |

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="{Binding Title}" DataContext="{Binding MainViewModel}">
  <StackPanel>
    <TextBox Text="{Binding SearchText, UpdateSourceTrigger=PropertyChanged}"/>
    <ListBox ItemsSource="{Binding Orders}"
             SelectedItem="{Binding SelectedOrder, Mode=TwoWay}">
      <ListBox.ItemTemplate>
        <DataTemplate DataType="{x:Type models:Order}">
          <StackPanel>
            <TextBlock Text="{Binding OrderId}"/>
            <TextBlock Text="{Binding TotalAmount, StringFormat=C}"/>
          </StackPanel>
        </DataTemplate>
      </ListBox.ItemTemplate>
    </ListBox>
    <Button Content="Refresh" Command="{Binding LoadOrdersCommand}"/>
  </StackPanel>
</Window>
```

## Dependency Injection

```csharp
public partial class App : Application
{
    private static IServiceProvider ConfigureServices()
    {
        var services = new ServiceCollection();

        services.AddSingleton<IOrderService, OrderService>();
        services.AddTransient<OrderListViewModel>();
        services.AddTransient<MainWindow>();

        return services.BuildServiceProvider();
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        var services = ConfigureServices();
        var mainWindow = services.GetRequiredService<MainWindow>();
        mainWindow.DataContext = services.GetRequiredService<OrderListViewModel>();
        mainWindow.Show();
    }
}
```

## Styling Guidelines

| Style Location | Scope | Recommendation |
|---------------|-------|----------------|
| App.xaml | Global | Base styles, theme colors |
| ResourceDictionary | Module | Component-specific styles |
| Inline | Single usage | Avoid (breaks consistency) |

## Performance Tips
- Use VirtualizingStackPanel for large lists
- Enable virtualization: VirtualizingPanel.IsVirtualizing="True"
- Freeze Freezable objects when possible
- Use x:Shared="False" sparingly
- Profile with WPF Performance Suite
- Avoid UI thread blocking operations
- Use async/await for I/O operations
- Reduce visual tree depth for complex UIs
