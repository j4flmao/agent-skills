# UWP Best Practices

## App Architecture

```
App.xaml
├── Services/
│   ├── NavigationService.cs
│   ├── DataService.cs
│   └── NotificationService.cs
├── ViewModels/
│   ├── MainViewModel.cs
│   ├── OrderListViewModel.cs
│   └── OrderDetailViewModel.cs
├── Views/
│   ├── MainPage.xaml
│   ├── OrderListPage.xaml
│   └── OrderDetailPage.xaml
├── Models/
│   ├── Order.cs
│   └── OrderItem.cs
├── Controls/
│   └── CustomButton.xaml
├── Helpers/
│   ├── Converters.cs
│   └── Extensions.cs
└── Assets/
    ├── StoreLogo.png
    └── SplashScreen.png
```

## Data Binding Best Practices

| Binding Mode | Use Case | Performance |
|-------------|----------|-------------|
| OneTime | Static display data | Best |
| OneWay | Read-only dynamic data | Good |
| TwoWay | Editable fields | Moderate |
| x:Bind | Compile-time binding | Best |
| {Binding} | Runtime binding | Moderate |

### x:Bind Example
```xml
<Page x:Class="MyApp.Views.OrderDetailPage"
      xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
  <Grid>
    <TextBlock Text="{x:Bind ViewModel.OrderId, Mode=OneWay}"/>
    <TextBlock Text="{x:Bind ViewModel.Status, Mode=OneWay}"/>
    <TextBox Text="{x:Bind ViewModel.Notes, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}"/>
  </Grid>
</Page>
```

## Adaptive UI Patterns

| View State | Min Width | Layout |
|------------|-----------|--------|
| Narrow | 0-640px | Single column, stacked |
| Medium | 641-1007px | Two column, side panel |
| Wide | 1008px+ | Multi-column, sidebar |

### Visual State Triggers
```xml
<VisualStateManager.VisualStateGroups>
  <VisualStateGroup>
    <VisualState x:Name="NarrowView">
      <VisualState.StateTriggers>
        <AdaptiveTrigger MinWindowWidth="0"/>
      </VisualState.StateTriggers>
      <VisualState.Setters>
        <Setter Target="ContentGrid.RowDefinitions" Value="Auto,*"/>
        <Setter Target="ContentPanel.Orientation" Value="Vertical"/>
      </VisualState.Setters>
    </VisualState>
    <VisualState x:Name="WideView">
      <VisualState.StateTriggers>
        <AdaptiveTrigger MinWindowWidth="800"/>
      </VisualState.StateTriggers>
      <VisualState.Setters>
        <Setter Target="ContentGrid.RowDefinitions" Value="*"/>
        <Setter Target="ContentPanel.Orientation" Value="Horizontal"/>
      </VisualState.Setters>
    </VisualState>
  </VisualStateGroup>
</VisualStateManager.VisualStateGroups>
```

## Performance Optimization

| Technique | Impact | Effort |
|-----------|--------|--------|
| x:Load for lazy loading | -30% startup time | Low |
| x:Phase for phased rendering | -20% perceived load | Low |
| VirtualizingStackPanel | -50% memory for lists | Low |
| Image caching | -40% image load time | Medium |
| Suspend on navigate | -15% background CPU | Medium |

## Common Pitfalls
- Async void only for event handlers
- Suspend app state in OnNavigatingFrom
- Dispose of large objects in OnNavigatedFrom
- Use ApplicationData for settings, not registry
- Capabilities must match actual API usage
- Store submission requires all assets at correct sizes
- Test on minimum target hardware for performance
