# WPF Architecture Reference

## MVVM Pattern

```
Views/         → XAML UI (data-bound to ViewModel)
ViewModels/    → Observable state + commands
Models/        → Domain data + business logic
Services/      → DI-registered services (data access, navigation)
```

```csharp
// ViewModel
public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private string name;

    [RelayCommand]
    private async Task Save()
    {
        await _service.SaveAsync(Name);
    }
}
```

## XAML & Data Binding

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

  <!-- OneWay binding (display only) -->
  <TextBlock Text="{Binding UserName, Mode=OneWay}"/>

  <!-- TwoWay binding (edit) -->
  <TextBox Text="{Binding UserName, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}"/>

  <!-- OneTime binding (static data, best perf) -->
  <TextBlock Text="{Binding Version, Mode=OneTime}"/>

  <!-- Binding to ancestor -->
  <Button Command="{Binding DataContext.DeleteCommand,
    RelativeSource={RelativeSource AncestorType=ListBox}}"
    CommandParameter="{Binding}"/>
</Window>
```

## Dependency Properties

```csharp
// Custom control dependency property
public class MyControl : Control
{
    public static readonly DependencyProperty LabelProperty =
        DependencyProperty.Register(
            name: nameof(Label),
            propertyType: typeof(string),
            ownerType: typeof(MyControl),
            typeMetadata: new PropertyMetadata(
                defaultValue: string.Empty,
                propertyChangedCallback: OnLabelChanged));

    public string Label
    {
        get => (string)GetValue(LabelProperty);
        set => SetValue(LabelProperty, value);
    }

    private static void OnLabelChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        var ctrl = (MyControl)d;
        ctrl.OnLabelUpdated((string)e.NewValue);
    }
}
```

## Commands

```csharp
// RelayCommand via CommunityToolkit
public partial class ViewModel : ObservableObject
{
    [RelayCommand]
    private void Execute() { }

    [RelayCommand(CanExecute = nameof(CanSave))]
    private async Task SaveAsync() { }
    private bool CanSave() => IsValid;

    // Parameterized command
    [RelayCommand]
    private void DeleteItem(Item item) { }
}
```

## Attached Behaviors

```csharp
public static class TextBoxBehaviors
{
    public static readonly DependencyProperty SelectAllOnFocusProperty =
        DependencyProperty.RegisterAttached(
            "SelectAllOnFocus", typeof(bool), typeof(TextBoxBehaviors),
            new PropertyMetadata(false, OnSelectAllOnFocusChanged));

    public static void SetSelectAllOnFocus(TextBox element, bool value)
        => element.SetValue(SelectAllOnFocusProperty, value);

    public static bool GetSelectAllOnFocus(TextBox element)
        => (bool)element.GetValue(SelectAllOnFocusProperty);

    private static void OnSelectAllOnFocusChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is TextBox tb)
        {
            tb.GotFocus -= SelectAll;
            if ((bool)e.NewValue) tb.GotFocus += SelectAll;
        }
    }

    private static void SelectAll(object sender, RoutedEventArgs e)
    {
        if (sender is TextBox tb) tb.SelectAll();
    }
}
```

```xml
<TextBox Text="{Binding Name}"
         behaviors:TextBoxBehaviors.SelectAllOnFocus="True"/>
```

## Routed Events

```csharp
// Custom routed event
public partial class MyControl : UserControl
{
    public static readonly RoutedEvent ItemSelectedEvent =
        EventManager.RegisterRoutedEvent(
            name: "ItemSelected",
            routingStrategy: RoutingStrategy.Bubble,
            handlerType: typeof(RoutedEventHandler),
            ownerType: typeof(MyControl));

    public event RoutedEventHandler ItemSelected
    {
        add => AddHandler(ItemSelectedEvent, value);
        remove => RemoveHandler(ItemSelectedEvent, value);
    }

    private void RaiseItemSelected()
    {
        RaiseEvent(new RoutedEventArgs(ItemSelectedEvent));
    }
}
```

```xml
<local:MyControl ItemSelected="OnItemSelected"/>
```

## Value Converters

```csharp
[ValueConversion(typeof(bool), typeof(Visibility))]
public class BoolToVisConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        bool val = (bool)value;
        return val ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return (Visibility)value == Visibility.Visible;
    }
}
```

## Key Rules

- ViewModel never references View types
- Dependency properties for custom control inheritable values
- Commands over event handlers for all user actions
- Attached behaviors for reusable cross-cutting concerns
- Routed events for composable event handling up the tree
- Converters for type transformations in bindings
- ObservableCollection for dynamic lists
