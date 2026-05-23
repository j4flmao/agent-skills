# WPF MVVM Patterns Reference

## ObservableObject Source Generators

```csharp
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

public partial class CustomerListViewModel : ObservableObject
{
    private readonly ICustomerService _service;
    private readonly INavigationService _nav;

    [ObservableProperty]
    private ObservableCollection<Customer> customers = new();

    [ObservableProperty]
    private Customer selectedCustomer;

    [ObservableProperty]
    private bool isLoading;

    [ObservableProperty]
    private string searchText = string.Empty;

    public CustomerListViewModel(ICustomerService service, INavigationService nav)
    {
        _service = service;
        _nav = nav;
    }

    // Auto-generated as LoadCustomersCommand, raises CanExecuteChanged
    [RelayCommand]
    private async Task LoadCustomers()
    {
        IsLoading = true;
        try
        {
            var results = await _service.GetAllAsync();
            Customers = new ObservableCollection<Customer>(results);
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    private async Task Search()
    {
        IsLoading = true;
        try
        {
            var results = await _service.SearchAsync(SearchText);
            Customers = new ObservableCollection<Customer>(results);
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    private void EditCustomer(Customer customer)
    {
        _nav.NavigateTo<CustomerEditViewModel>(customer);
    }

    [RelayCommand(CanExecute = nameof(HasSelection))]
    private async Task DeleteCustomer()
    {
        await _service.DeleteAsync(SelectedCustomer.Id);
        Customers.Remove(SelectedCustomer);
    }

    private bool HasSelection() => SelectedCustomer != null;

    // Re-evaluate DeleteCustomerCommand.CanExecute
    partial void OnSelectedCustomerChanged(Customer value)
    {
        DeleteCustomerCommand.NotifyCanExecuteChanged();
    }
}
```

## RelayCommand with Parameter

```csharp
// Parameterized command
[RelayCommand]
private void OpenDetail(int customerId)
{
    _nav.NavigateTo<CustomerDetailViewModel>(customerId);
}
```

```xml
<Button Content="View"
        Command="{Binding OpenDetailCommand}"
        CommandParameter="{Binding Id}"/>
```

## Messaging (WeakReferenceMessenger)

```csharp
// Message types
public record CustomerSavedMessage(int CustomerId);
public record StatusMessage(string Text, MessageSeverity Severity);

// Sender
WeakReferenceMessenger.Default.Send(new CustomerSavedMessage(customer.Id));

// Receiver (in ViewModel constructor)
WeakReferenceMessenger.Default.Register<CustomerSavedMessage>(this, (r, m) =>
{
    // Reload or update
    SelectedCustomer = Customers.FirstOrDefault(c => c.Id == m.CustomerId);
});
```

## Validation

### Data Annotations
```csharp
public partial class CustomerEditViewModel : ObservableValidator
{
    [ObservableProperty]
    [Required(ErrorMessage = "Name is required")]
    [StringLength(100, MinimumLength = 2)]
    private string name;

    [ObservableProperty]
    [Required]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    private string email;

    [RelayCommand]
    private void Save()
    {
        ValidateAllProperties();
        if (HasErrors) return;

        // Save logic
    }
}
```

```xml
<TextBox Text="{Binding Name, ValidatesOnNotifyDataErrors=True, UpdateSourceTrigger=PropertyChanged}"/>
```

### FluentValidation Integration
```csharp
public class CustomerValidator : AbstractValidator<Customer>
{
    public CustomerValidator()
    {
        RuleFor(x => x.Name).NotEmpty().Length(2, 100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Age).InclusiveBetween(18, 120);
    }
}
```

## Converters Reference

| Converter | Input | Output | Use |
|-----------|-------|--------|-----|
| BoolToVisibility | bool | Visibility | Show/hide controls |
| StringEmptyToVisibility | string | Visibility | Hide empty strings |
| InverseBoolConverter | bool | !bool | Invert boolean binding |
| DateFormatConverter | DateTime | string | Custom date display |
| CurrencyConverter | decimal | string | "$1,234.56" |
| EnumToBoolean | Enum | bool | Radio button mapping |
| PercentageConverter | double | string | "85%" |

## Event to Command (Behaviors)

```xml
<!-- Using Microsoft.Xaml.Behaviors -->
xmlns:i="http://schemas.microsoft.com/xaml/behaviors"

<TextBox>
    <i:Interaction.Behaviors>
        <i:EventTrigger EventName="TextChanged">
            <i:InvokeCommandAction Command="{Binding SearchCommand}"/>
        </i:EventTrigger>
    </i:Interaction.Behaviors>
</TextBox>
```

## Async Command Pattern

```csharp
// Built-in with [RelayCommand] on async Task methods
[RelayCommand]
private async Task ProcessAsync()
{
    IsProcessing = true;
    try
    {
        await Task.Delay(2000);
    }
    finally
    {
        IsProcessing = false;
    }
}
```

## Unit Testing ViewModels

```csharp
[TestClass]
public class CustomerListViewModelTests
{
    [TestMethod]
    public async Task LoadCustomers_PopulatesCollection()
    {
        var mockService = new Mock<ICustomerService>();
        mockService.Setup(s => s.GetAllAsync())
            .ReturnsAsync(new List<Customer> { new() { Id = 1, Name = "Test" } });

        var vm = new CustomerListViewModel(mockService.Object, Mock.Of<INavigationService>());
        await vm.LoadCustomersCommand.ExecuteAsync(null);

        Assert.AreEqual(1, vm.Customers.Count);
        Assert.AreEqual("Test", vm.Customers[0].Name);
    }
}
```
