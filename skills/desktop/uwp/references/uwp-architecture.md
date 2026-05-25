# UWP Architecture Reference

## MVVM in UWP

```csharp
// ViewModel with INotifyPropertyChanged
public class MainViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler PropertyChanged;
    private void Set<T>(ref T field, T value, [CallerMemberName] string name = null)
    {
        if (!EqualityComparer<T>.Default.Equals(field, value))
        {
            field = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
        }
    }

    private string _status;
    public string Status { get => _status; set => Set(ref _status, value); }

    private bool _isBusy;
    public bool IsBusy { get => _isBusy; set => Set(ref _isBusy, value); }

    public async Task InitializeAsync() { /* ... */ }
}
```

## Adaptive UI

```xml
<Page>
  <Grid x:Name="RootGrid">
    <VisualStateManager.VisualStateGroups>
      <VisualStateGroup>
        <VisualState x:Name="WideView">
          <VisualState.StateTriggers>
            <AdaptiveTrigger MinWindowWidth="800"/>
          </VisualState.StateTriggers>
          <VisualState.Setters>
            <Setter Target="ContentPanel.Orientation" Value="Horizontal"/>
            <Setter Target="Sidebar.Visibility" Value="Visible"/>
          </VisualState.Setters>
        </VisualState>
        <VisualState x:Name="NarrowView">
          <VisualState.StateTriggers>
            <AdaptiveTrigger MinWindowWidth="0"/>
          </VisualState.StateTriggers>
          <VisualState.Setters>
            <Setter Target="ContentPanel.Orientation" Value="Vertical"/>
            <Setter Target="Sidebar.Visibility" Value="Collapsed"/>
          </VisualState.Setters>
        </VisualState>
      </VisualStateGroup>
    </VisualStateManager.VisualStateGroups>
  </Grid>
</Page>
```

## Layout Panels

```xml
<!-- RelativePanel for flexible layouts -->
<RelativePanel>
  <TextBox x:Name="SearchBox" RelativePanel.AlignLeftWithPanel="True"
           RelativePanel.AlignRightWithPanel="True"/>
  <ListView x:Name="ResultsList" RelativePanel.Below="SearchBox"
            RelativePanel.AlignLeftWithPanel="True"
            RelativePanel.AlignRightWithPanel="True"
            RelativePanel.Above="StatusBar"/>
  <TextBlock x:Name="StatusBar" RelativePanel.AlignBottomWithPanel="True"/>
</RelativePanel>

<!-- VariableSizedWrapGrid for galleries -->
<VariableSizedWrapGrid ItemHeight="200" ItemWidth="200"
                        MaximumRowsOrColumns="4">
  <Rectangle Height="200" Width="400"/> <!-- spans 2 columns -->
  <Rectangle Height="200" Width="200"/>
</VariableSizedWrapGrid>
```

## Data Binding

```xml
<!-- x:Bind compile-time binding -->
<TextBlock Text="{x:Bind ViewModel.Title, Mode=OneWay}"/>
<TextBox Text="{x:Bind ViewModel.Name, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}"/>
<Button Command="{x:Bind ViewModel.SaveCommand}"/>

<!-- {Binding} for DataTemplates (runtime) -->
<ListView ItemsSource="{x:Bind ViewModel.Items}">
  <ListView.ItemTemplate>
    <DataTemplate>
      <TextBlock Text="{Binding Name}" FontSize="14"/>
    </DataTemplate>
  </ListView.ItemTemplate>
</ListView>
```

## App Lifecycle

```csharp
sealed partial class App : Application
{
    protected override void OnLaunched(LaunchActivatedEventArgs e)
    {
        if (e.PrelaunchActivated) return;

        if (Window.Current.Content is not Frame rootFrame)
        {
            rootFrame = new Frame();
            Window.Current.Content = rootFrame;
        }

        if (rootFrame.Content == null)
            rootFrame.Navigate(typeof(MainPage), e.Arguments);

        Window.Current.Activate();
    }

    // Suspension
    protected override void OnSuspending(object sender, SuspendingEventArgs e)
    {
        var deferral = e.SuspendingOperation.GetDeferral();
        // Save state
        deferral.Complete();
    }

    // Extended execution
    protected override void OnBackgroundActivated(BackgroundActivatedEventArgs args)
    {
        var deferral = args.TaskInstance.GetDeferral();
        // Background work
        deferral.Complete();
    }
}
```

## Background Tasks

```csharp
[BackgroundTask(EntryPoint = "Tasks.TimerTask")]
public sealed class TimerTask : IBackgroundTask
{
    public void Run(IBackgroundTaskInstance taskInstance)
    {
        var deferral = taskInstance.GetDeferral();
        try
        {
            var settings = ApplicationData.Current.LocalSettings;
            settings.Values["LastRun"] = DateTime.Now.ToString();
        }
        finally { deferral.Complete(); }
    }
}
```

```xml
<Extensions>
  <Extension Category="windows.backgroundTasks"
             EntryPoint="Tasks.TimerTask">
    <BackgroundTasks>
      <Task Type="timer"/>
    </BackgroundTasks>
  </Extension>
</Extensions>
```

## Contracts (Share, Search, etc.)

```csharp
// Share contract
 protected override void OnShareTargetActivated(ShareTargetActivatedEventArgs args)
{
    var shareOperation = args.ShareOperation;
    var page = new ShareTargetPage(shareOperation);
    Window.Current.Content = page;
    Window.Current.Activate();
}

// File open picker contract
protected override void OnFileOpenPickerActivated(FileOpenPickerActivatedEventArgs args)
{
    var page = new FilePickerPage(args.FileOpenPickerUI);
    Window.Current.Content = page;
    Window.Current.Activate();
}
```

## Key Architecture Rules

- Frame/Page for navigation, SuspensionManager for state persistence
- AdaptiveTrigger + VisualStateManager for responsive layouts
- x:Bind over {Binding} for performance (compiled bindings)
- Background tasks declare entry point in manifest and code
- ApplicationData.LocalSettings for key-value, LocalFolder for files
- Capabilities declared in manifest match actual API usage
- Contracts (Share, Search, FilePicker) handled via OnActivated
