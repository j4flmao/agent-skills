# UWP Architecture Reference

## Project Structure

```
MyUwpApp/
├── Package.appxmanifest            # Capabilities, declarations, visuals
├── App.xaml / App.xaml.cs          # Application lifecycle, activation
├── MainPage.xaml / MainPage.xaml.cs
├── Pages/
│   ├── DashboardPage.xaml
│   ├── DetailPage.xaml
│   └── SettingsPage.xaml
├── ViewModels/
│   ├── DashboardViewModel.cs
│   └── DetailViewModel.cs
├── Models/
│   └── DataItem.cs
├── Services/
│   ├── IDataService.cs
│   └── DataService.cs
├── Controls/
│   └── CustomControl.cs
├── Converters/
│   └── StringToVisibilityConverter.cs
├── Helpers/
│   └── NavigationHelper.cs
├── Tasks/
│   └── BackgroundTask.cs
├── Assets/
│   ├── StoreLogo.png
│   ├── Square150x150Logo.png
│   └── Wide310x150Logo.png
└── Strings/
    └── en-US/
        └── Resources.resw
```

## App.xaml.cs Activation

```csharp
sealed partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs e)
    {
        if (Window.Current.Content is not Frame rootFrame)
        {
            rootFrame = new Frame();
            Window.Current.Content = rootFrame;
        }

        if (e.PrelaunchActivated == false)
        {
            if (rootFrame.Content == null)
            {
                rootFrame.Navigate(typeof(MainPage), e.Arguments);
            }
            Window.Current.Activate();
        }
    }

    protected override void OnActivated(IActivatedEventArgs args)
    {
        if (args.Kind == ActivationKind.ToastNotification)
        {
            var toastArgs = args as ToastNotificationActivatedEventArgs;
            var frame = Window.Current.Content as Frame;
            frame.Navigate(typeof(DetailPage), toastArgs.Argument);
        }
    }
}
```

## Frame-Based Navigation

```csharp
// Navigate with parameter
Frame.Navigate(typeof(DetailPage), itemId);

// Go back
if (Frame.CanGoBack) Frame.GoBack();

// Pass complex navigation args
Frame.Navigate(typeof(DetailPage), new NavigationArgs { Id = 42, Source = "dashboard" });

// Handle navigation in Page
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    base.OnNavigatedTo(e);
    if (e.Parameter is int id)
    {
        ViewModel.LoadItem(id);
    }
}

protected override void OnNavigatedFrom(NavigationEventArgs e)
{
    base.OnNavigatedFrom(e);
    ViewModel.Cleanup();
}
```

## Data Binding with x:Bind (Compile-Time)

```xaml
<Page x:Class="MyUwpApp.Pages.DetailPage"
      x:Name="PageRoot">

    <!-- x:Bind binds to Page by default -->
    <TextBlock Text="{x:Bind ViewModel.Title, Mode=OneWay}"/>
    <TextBox Text="{x:Bind ViewModel.Name, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}"/>

    <!-- Event via x:Bind -->
    <Button Click="{x:Bind ViewModel.SaveClick}"/>

    <!-- Function binding -->
    <TextBlock Text="{x:Bind local:FormatHelper.FormatDate(ViewModel.Date)}"/>
</Page>
```

## Data Binding with {Binding} (Runtime)

```xaml
<!-- Runtime binding for templates and dynamic targets -->
<ListView ItemsSource="{Binding Items}">
    <ListView.ItemTemplate>
        <DataTemplate>
            <StackPanel>
                <TextBlock Text="{Binding Title}"/>
                <TextBlock Text="{Binding Subtitle, FallbackValue='N/A'}"
                           Foreground="Gray"/>
            </StackPanel>
        </DataTemplate>
    </ListView.ItemTemplate>
</ListView>
```

## Adaptive UI with VisualStateManager

```xaml
<Page>
    <Grid>
        <VisualStateManager.VisualStateGroups>
            <VisualStateGroup>
                <VisualState x:Name="DefaultState"/>
                <VisualState x:Name="WideState">
                    <VisualState.StateTriggers>
                        <AdaptiveTrigger MinWindowWidth="800"/>
                    </VisualState.StateTriggers>
                    <VisualState.Setters>
                        <Setter Target="LayoutRoot.Margin" Value="40"/>
                        <Setter Target="ContentGrid.ColumnDefinitions[1].MinWidth" Value="400"/>
                    </VisualState.Setters>
                </VisualState>
                <VisualState x:Name="TallState">
                    <VisualState.StateTriggers>
                        <AdaptiveTrigger MinWindowHeight="600"/>
                    </VisualState.StateTriggers>
                </VisualState>
            </VisualStateGroup>
        </VisualStateManager.VisualStateGroups>
    </Grid>
</Page>
```

## Data Binding Converter Example

```csharp
public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        bool val = (bool)value;
        bool invert = parameter?.ToString() == "invert";
        return (val ^ invert) ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
    {
        var val = (Visibility)value;
        bool invert = parameter?.ToString() == "invert";
        return (val == Visibility.Visible) ^ invert;
    }
}
```

## Storage Patterns

```csharp
// Local settings
ApplicationData.Current.LocalSettings.Values["theme"] = "dark";
var theme = ApplicationData.Current.LocalSettings.Values["theme"] as string;

// Local folder for files
var localFolder = ApplicationData.Current.LocalFolder;
var file = await localFolder.CreateFileAsync("data.json", CreationCollisionOption.ReplaceExisting);
await FileIO.WriteTextAsync(file, jsonContent);

// Roaming settings (syncs across devices)
ApplicationData.Current.RoamingSettings.Values["preference"] = value;

// Temporary folder
var tempFolder = ApplicationData.Current.TemporaryFolder;
```

## Capabilities Reference

| Capability | XML | Use Case |
|------------|-----|----------|
| Internet (Client) | `<Capability Name="internetClient"/>` | HTTP API calls |
| Internet (Client & Server) | `<Capability Name="internetClientServer"/>` | Network server |
| Location | `<DeviceCapability Name="location"/>` | GPS |
| Webcam | `<DeviceCapability Name="webcam"/>` | Camera |
| Microphone | `<DeviceCapability Name="microphone"/>` | Recording |
| Pictures Library | `<Capability Name="picturesLibrary"/>` | Photo access |
| Music Library | `<Capability Name="musicLibrary"/>` | Audio library |
| Removable Storage | `<Capability Name="removableStorage"/>` | USB drives |
| Shared User Certificates | `<Capability Name="sharedUserCertificates"/>` | Digital signatures |
| Enterprise Auth | `<Capability Name="enterpriseAuthentication"/>` | Domain resources |
| AllJoyn | `<DeviceCapability Name="alljoyn"/>` | IoT device comm |
| Bluetooth | `<DeviceCapability Name="bluetooth"/>` | Bluetooth LE |
| Proximity | `<DeviceCapability Name="proximity"/>` | NFC |
| Run Full Trust | `<rescap:Capability Name="runFullTrust"/>` | Win32 interop |
