# MAUI MVVM with CommunityToolkit

## ViewModel Base Pattern

```csharp
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;

public partial class ProductsViewModel : ObservableObject
{
    private readonly IProductService _productService;

    // Observable properties — source generator creates INotifyPropertyChanged
    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private string _searchText = string.Empty;

    [ObservableProperty]
    private Product? _selectedProduct;

    // Observable collection for list binding
    public ObservableCollection<Product> Products { get; } = new();

    // Constructor injection
    public ProductsViewModel(IProductService productService)
    {
        _productService = productService;
    }

    // RelayCommand from method — source generator creates IRelayCommand
    [RelayCommand]
    private async Task LoadProductsAsync()
    {
        if (IsLoading) return;
        try
        {
            IsLoading = true;
            var products = await _productService.GetProductsAsync();
            Products.Clear();
            foreach (var product in products)
                Products.Add(product);
        }
        catch (Exception ex)
        {
            // Error handling
            await Shell.Current.DisplayAlert("Error", ex.Message, "OK");
        }
        finally
        {
            IsLoading = false;
        }
    }

    // Async RelayCommand with parameter
    [RelayCommand]
    private async Task SelectProductAsync(Product product)
    {
        if (product == null) return;
        await Shell.Current.GoToAsync($"product/detail?id={product.Id}");
    }

    // Partial method for property change notification
    partial void OnSearchTextChanged(string value)
    {
        // Trigger search when search text changes
        Products.Clear();
        // Filter logic...
    }
}
```

## Compiled Bindings in XAML

```xml
<ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:vm="clr-namespace:MyApp.ViewModels"
             xmlns:models="clr-namespace:MyApp.Models"
             x:Class="MyApp.Pages.ProductsPage"
             x:DataType="vm:ProductsViewModel"
             Title="Products">

    <Grid RowDefinitions="Auto,*">

        <!-- Search Bar -->
        <SearchBar Placeholder="Search products..."
                   Text="{Binding SearchText}"
                   Grid.Row="0" />

        <!-- Product List with DataTemplate -->
        <RefreshView IsRefreshing="{Binding IsLoading}"
                     Command="{Binding LoadProductsCommand}"
                     Grid.Row="1">
            <CollectionView ItemsSource="{Binding Products}"
                            SelectionMode="Single"
                            SelectionChangedCommand="{Binding SelectProductCommand}"
                            SelectionChangedCommandParameter="{Binding SelectedItem, Source={RelativeSource Self}}">

                <!-- Empty View -->
                <CollectionView.EmptyView>
                    <VerticalStackLayout HorizontalOptions="Center"
                                         VerticalOptions="Center">
                        <Label Text="No products found"
                               FontSize="18"
                               HorizontalOptions="Center" />
                        <Button Text="Refresh"
                                Command="{Binding LoadProductsCommand}"
                                HorizontalOptions="Center" />
                    </VerticalStackLayout>
                </CollectionView.EmptyView>

                <!-- Item Template -->
                <CollectionView.ItemTemplate>
                    <DataTemplate x:DataType="models:Product">
                        <Border Padding="12" Margin="8,4"
                                StrokeShape="RoundRectangle 8"
                                Stroke="{AppThemeBinding Light={StaticResource Gray200}, Dark={StaticResource Gray600}}">
                            <Grid ColumnDefinitions="80,*,Auto" ColumnSpacing="12">
                                <Image Source="{Binding ImageUrl}"
                                       Aspect="AspectFill"
                                       WidthRequest="80"
                                       HeightRequest="80" />
                                <VerticalStackLayout Grid.Column="1" VerticalOptions="Center" Spacing="4">
                                    <Label Text="{Binding Name}"
                                           FontAttributes="Bold"
                                           FontSize="16" />
                                    <Label Text="{Binding Category}"
                                           FontSize="12"
                                           TextColor="{StaticResource Gray500}" />
                                    <Label Text="{Binding Price, StringFormat='{0:C}'}"
                                           FontSize="14"
                                           TextColor="{StaticResource Primary}" />
                                </VerticalStackLayout>
                                <Button Grid.Column="2"
                                        Text="Buy"
                                        Command="{Binding Source={RelativeSource AncestorType={x:Type vm:ProductsViewModel}}, Path=BuyCommand}"
                                        CommandParameter="{Binding .}"
                                        VerticalOptions="Center" />
                            </Grid>
                        </Border>
                    </DataTemplate>
                </CollectionView.ItemTemplate>
            </CollectionView>
        </RefreshView>

        <!-- Loading Indicator -->
        <ActivityIndicator IsRunning="{Binding IsLoading}"
                           IsVisible="{Binding IsLoading}"
                           VerticalOptions="Center"
                           HorizontalOptions="Center"
                           Grid.Row="1" />
    </Grid>
</ContentPage>
```

## Source Generator Features

```csharp
public partial class SettingsViewModel : ObservableObject
{
    // ObservableProperty generates: OnPropertyChanged, property change notification
    [ObservableProperty]
    private string _userName = string.Empty;

    // NotifyPropertyChangedFor: when UserName changes, also notify Greeting
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(Greeting))]
    private bool _isLoggedIn;

    // NotifyCanExecuteChangedFor: when IsLoggedIn changes, re-evaluate command
    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(LogoutCommand))]
    private bool _canLogout;

    // Computed property
    public string Greeting => IsLoggedIn ? $"Hello, {UserName}" : "Not logged in";

    // RelayCommand with CanExecute
    [RelayCommand(CanExecute = nameof(CanLogout))]
    private void Logout()
    {
        IsLoggedIn = false;
        UserName = string.Empty;
    }

    private bool CanLogout() => CanLogout;

    // AsyncRelayCommand
    [RelayCommand]
    private async Task SaveSettingsAsync()
    {
        await Task.Delay(100); // Simulate API call
    }
}
```

## Value Converters

```csharp
// Converter
public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is bool boolValue)
        {
            bool invert = parameter?.ToString() == "invert";
            return invert ? !boolValue : boolValue;
        }
        return false;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotImplementedException();
}

// XAML usage
// <Label IsVisible="{Binding IsDeleted, Converter={StaticResource BoolToVisibility}, ConverterParameter=invert}" />

// Register in App.xaml:
// <Application.Resources>
//   <converters:BoolToVisibilityConverter x:Key="BoolToVisibility" />
// </Application.Resources>
```

## Messenger Pattern

```csharp
// Message class
public record ProductAddedMessage(Product Product);

// Sender (ProductsViewModel)
WeakReferenceMessenger.Default.Send(new ProductAddedMessage(newProduct));

// Receiver (CartViewModel)
public class CartViewModel
{
    public CartViewModel()
    {
        WeakReferenceMessenger.Default.Register<ProductAddedMessage>(this, (r, m) =>
        {
            // Handle message
            AddToCart(m.Product);
        });
    }
}
```

## DI and ViewModel Resolution

```csharp
// Pages receive ViewModel via constructor injection
public partial class ProductsPage : ContentPage
{
    public ProductsPage(ProductsViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}

// Or use AppShell DataTemplate approach:
// <ShellContent ContentTemplate="{DataTemplate pages:ProductsPage}" />
// AppShell resolves ProductsPage from DI which resolves ProductsViewModel transitively
```

No preamble. No postamble. No explanations.
