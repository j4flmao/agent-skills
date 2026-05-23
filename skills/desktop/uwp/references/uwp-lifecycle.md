# UWP App Lifecycle Reference

## Application States

```
                    Not Running
                        |
                    Launching
                        |
                    Running
                    /      \
             Suspending   Activation (file, toast, etc.)
                |
            Suspended
                |
            Resuming
                |
            Running
```

## Lifecycle Event Handling

```csharp
// App.xaml.cs
sealed partial class App : Application
{
    // OnLaunched — fresh or after termination
    protected override void OnLaunched(LaunchActivatedEventArgs e)
    {
        if (e.PreviousExecutionState == ApplicationExecutionState.Terminated)
        {
            // Restore saved state
            RestoreState();
        }

        var rootFrame = new Frame();
        Window.Current.Content = rootFrame;
        rootFrame.Navigate(typeof(MainPage), e.Arguments);
        Window.Current.Activate();
    }

    // Suspending — app moving to background (5 seconds to save)
    private async void OnSuspending(object sender, SuspendingEventArgs e)
    {
        var deferral = e.SuspendingOperation.GetDeferral();
        try
        {
            await SaveStateAsync();
            await Task.Delay(100); // Let other operations finish
        }
        finally
        {
            deferral.Complete(); // Must call before 5s timeout
        }
    }

    // Resuming — app returning to foreground
    protected override void OnResuming()
    {
        // Refresh network state, reload data
        await RefreshDataAsync();
    }
}
```

## State Persistence

```csharp
public class StateManager
{
    private const string StateKey = "app_state";

    public async Task SaveStateAsync()
    {
        var state = new AppState
        {
            CurrentPage = typeof(MainPage).FullName,
            LastPosition = scrollViewer.VerticalOffset,
            UnsavedData = dirtyItems
        };

        var json = JsonSerializer.Serialize(state);
        var file = await ApplicationData.Current.LocalFolder
            .CreateFileAsync("state.json", CreationCollisionOption.ReplaceExisting);
        await FileIO.WriteTextAsync(file, json);

        // Also save to session state for fast recovery
        ApplicationData.Current.LocalSettings.Values["last_page"] = state.CurrentPage;
    }

    public async Task RestoreStateAsync()
    {
        try
        {
            var file = await ApplicationData.Current.LocalFolder
                .GetFileAsync("state.json");
            var json = await FileIO.ReadTextAsync(file);
            var state = JsonSerializer.Deserialize<AppState>(json);
            // Restore position, page, etc.
        }
        catch (FileNotFoundException)
        {
            // First launch
        }
    }
}
```

## Background Tasks

### Task Types

| Trigger Type | Description | Interval/Constraint |
|-------------|-------------|-------------------|
| TimeTrigger | Periodic timer | Min 15 min |
| SystemTrigger | System events (user present, network, etc.) | Event-driven |
| MaintenanceTrigger | Device plugged in | Min 15 min |
| PushNotificationTrigger | Raw push notification | Instant |
| ControlChannelTrigger | Long-lived network connections | Persistent |
| SocketActivityTrigger | Socket activity | Persistent |
| BluetoothLEAdvertisementWatcherTrigger | BLE advertisements | Event-driven |

### Background Task Implementation

```csharp
// Tasks/DataSyncTask.cs
public sealed class DataSyncTask : IBackgroundTask
{
    public async void Run(IBackgroundTaskInstance taskInstance)
    {
        var deferral = taskInstance.GetDeferral();
        try
        {
            taskInstance.Canceled += OnCanceled;

            var settings = ApplicationData.Current.LocalSettings;
            settings.Values["sync_status"] = "running";

            await SyncDataAsync();

            settings.Values["sync_status"] = "completed";
            ShowToastNotification("Sync completed");
        }
        catch (Exception ex)
        {
            ApplicationData.Current.LocalSettings.Values["sync_error"] = ex.Message;
        }
        finally
        {
            deferral.Complete();
        }
    }

    private void OnCanceled(IBackgroundTaskInstance sender, BackgroundTaskCancellationReason reason)
    {
        // Cleanup resources
    }

    private async Task SyncDataAsync()
    {
        using var client = new HttpClient();
        var response = await client.GetStringAsync("https://api.example.com/sync");
        // Process response
    }
}
```

### Background Task Registration

```csharp
public async Task RegisterBackgroundTaskAsync()
{
    var status = await BackgroundExecutionManager.RequestAccessAsync();
    if (status != BackgroundAccessStatus.AllowedSubjectToSystemPolicy &&
        status != BackgroundAccessStatus.AlwaysAllowed)
    {
        return; // Cannot register
    }

    foreach (var task in BackgroundTaskRegistration.AllTasks.Values)
    {
        if (task.Name == "DataSyncTask")
            return; // Already registered
    }

    var builder = new BackgroundTaskBuilder
    {
        Name = "DataSyncTask",
        TaskEntryPoint = "MyUwpApp.Tasks.DataSyncTask"
    };

    builder.SetTrigger(new TimeTrigger(15, false));
    builder.AddCondition(new SystemCondition(SystemConditionType.InternetAvailable));
    builder.CancelOnConditionLoss = true;

    var registration = builder.Register();
    registration.Completed += OnTaskCompleted;
}
```

## Toast Notifications

```csharp
using Windows.UI.Notifications;
using Windows.Data.Xml.Dom;

public void ShowToast(string title, string body)
{
    var template = ToastNotificationManager.GetTemplateContent(ToastTemplateType.ToastText02);
    var elements = template.GetElementsByTagName("text");
    elements[0].AppendChild(template.CreateTextNode(title));
    elements[1].AppendChild(template.CreateTextNode(body));

    // Add launch argument
    var xElement = template.SelectSingleNode("/toast");
    xElement.Attributes.GetNamedItem("launch").NodeValue = "action=view&id=42";

    var toast = new ToastNotification(template);
    toast.Tag = "sync_complete";
    toast.Group = "sync";
    ToastNotificationManager.CreateToastNotifier().Show(toast);
}
```

## Extended Execution

```csharp
// Request more time for critical operations
using var session = new ExtendedExecutionSession
{
    Reason = ExtendedExecutionReason.SavingData,
    Description = "Saving unsaved work"
};

session.Revoked += (s, a) =>
{
    // Time's up — save what you can
};

var result = await session.RequestExtensionAsync();
if (result == ExtendedExecutionResult.Denied)
{
    // Cannot extend — save immediately
    await ForceSaveAsync();
}
```
