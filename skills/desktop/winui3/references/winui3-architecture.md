# WinUI 3 Architecture Reference

## MVVM with WinUI 3

```csharp
// ViewModel base
public class ViewModelBase : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler PropertyChanged;
    protected void Set<T>(ref T field, T value, [CallerMemberName] string name = null)
    {
        if (!EqualityComparer<T>.Default.Equals(field, value))
        {
            field = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
        }
    }
}

public class MainViewModel : ViewModelBase
{
    private string _title = "WinUI 3 App";
    public string Title { get => _title; set => Set(ref _title, value); }

    private bool _isLoading;
    public bool IsLoading { get => _isLoading; set => Set(ref _isLoading, value); }

    public async Task LoadAsync() { /* ... */ }
}
```

## XAML Controls

```xml
<Page xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

  <!-- Modern controls -->
  <InfoBar x:Name="StatusBar" IsOpen="False"
           Severity="Success" Title="Operation complete"/>
  <NumberBox Header="Quantity" Minimum="0" Maximum="100"
             SpinButtonPlacementMode="Inline"/>
  <RatingControl Value="3"/>
  <TeachingTip Target="{x:Bind btnHelp}" IsOpen="{x:Bind ShowHelp, Mode=TwoWay}"/>

  <!-- Theme-aware resources -->
  <Button Background="{ThemeResource SystemAccentColor}"
          Style="{StaticResource AccentButtonStyle}"/>
</Page>
```

## Data Templates

```xml
<Page.Resources>
  <DataTemplate x:Key="ItemTemplate" x:DataType="models:Item">
    <StackPanel Spacing="8" Padding="12">
      <TextBlock Text="{x:Bind Name}" Style="{StaticResource BodyStrongTextBlockStyle}"/>
      <TextBlock Text="{x:Bind Description}"
                 Style="{StaticResource BodyTextBlockStyle}"
                 Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
    </StackPanel>
  </DataTemplate>
</Page.Resources>

<ListView ItemsSource="{x:Bind ViewModel.Items}"
          ItemTemplate="{StaticResource ItemTemplate}"/>
```

## Custom Controls

```csharp
// Templated control
[TemplatePart(Name = "PART_Content", Type = typeof(ContentControl))]
public class CardControl : Control
{
    public CardControl()
    {
        DefaultStyleKey = typeof(CardControl);
    }

    public string Header
    {
        get => (string)GetValue(HeaderProperty);
        set => SetValue(HeaderProperty, value);
    }
    public static readonly DependencyProperty HeaderProperty =
        DependencyProperty.Register(nameof(Header), typeof(string),
            typeof(CardControl), new PropertyMetadata(null));

    protected override void OnApplyTemplate()
    {
        base.OnApplyTemplate();
        var content = GetTemplateChild("PART_Content") as ContentControl;
        // Initialize
    }
}
```

```xml
<!-- Generic.xaml -->
<Style TargetType="local:CardControl">
  <Setter Property="Template">
    <Setter.Value>
      <ControlTemplate TargetType="local:CardControl">
        <Border Background="{ThemeResource CardBackgroundFillColorDefaultBrush}"
                CornerRadius="8" Padding="16">
          <StackPanel>
            <TextBlock Text="{TemplateBinding Header}"
                       Style="{StaticResource SubtitleTextBlockStyle}"/>
            <ContentPresenter x:Name="PART_Content"
                              Content="{TemplateBinding Content}"/>
          </StackPanel>
        </Border>
      </ControlTemplate>
    </Setter.Value>
  </Setter>
</Style>
```

## Navigation

```csharp
// Frame-based navigation with NavigationView
public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        NavView.SelectedItem = NavView.MenuItems[0];
    }

    private void OnItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        if (args.IsSettingsInvoked)
        {
            ContentFrame.Navigate(typeof(SettingsPage));
            return;
        }

        var tag = args.InvokedItemContainer.Tag?.ToString();
        ContentFrame.Navigate(tag switch
        {
            "home" => typeof(HomePage),
            "items" => typeof(ItemsPage),
            "settings" => typeof(SettingsPage),
            _ => typeof(HomePage)
        });
    }
}

// Page navigation with parameter
Frame.Navigate(typeof(DetailPage), itemId);

// Handle on target page
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    if (e.Parameter is int id)
        ViewModel.Load(id);
}
```

## Resource Management

```csharp
// XamlControlsResources in App.xaml
public partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        m_window = new MainWindow();
        m_window.Activate();
    }
}

// Theme switching
void SetTheme(ElementTheme theme)
{
    if (m_window.Content is FrameworkElement root)
        root.RequestedTheme = theme;
}

// Resource dictionaries
// Themes/Generic.xaml — default control styles
// Styles/Custom.xaml — app-specific styles
```

```xml
<Application.Resources>
  <ResourceDictionary>
    <ResourceDictionary.MergedDictionaries>
      <XamlControlsResources xmlns="using:Microsoft.UI.Xaml.Controls"/>
      <ResourceDictionary Source="Styles/Custom.xaml"/>
    </ResourceDictionary.MergedDictionaries>
  </ResourceDictionary>
</Application.Resources>
```

## Key Architecture Rules

- {x:Bind} for page-level (compile-time), {Binding} for DataTemplates
- NavigationView for top-level navigation, Frame for page switching
- Custom controls derive from Control, not UserControl
- Theme resources instead of hardcoded colors
- WinAppSDK lifecycle: OnLaunched → window creation → page navigation
- {x:Load} for deferred element rendering
- Event handlers in code-behind only for view concerns
