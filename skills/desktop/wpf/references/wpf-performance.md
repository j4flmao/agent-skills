# WPF Performance Reference

## UI Virtualization

```xml
<!-- VirtualizingStackPanel is default for ListBox, ListView, DataGrid -->
<ListBox VirtualizingStackPanel.VirtualizationMode="Recycling"
         VirtualizingPanel.ScrollUnit="Pixel"
         VirtualizingPanel.IsVirtualizing="True"
         VirtualizingPanel.CacheLength="2,2"/>

<!-- Enable container recycling for smooth scrolling -->
<ListBox VirtualizingStackPanel.VirtualizationMode="Recycling"/>

<!-- TreeView virtualization -->
<TreeView VirtualizingStackPanel.IsVirtualizing="True"
          VirtualizingStackPanel.VirtualizationMode="Recycling"/>

<!-- Disable virtualization only for small fixed lists -->
<ItemsControl VirtualizingStackPanel.IsVirtualizing="False"/>
```

## Rendering Optimization

```csharp
// Enable GPU/hardware rendering
RenderOptions.ProcessRenderMode = RenderMode.Default;

// Check rendering tier
int tier = (int)RenderCapability.Tier >> 16;
// Tier 0 = software, Tier 1 = partial GPU, Tier 2 = full GPU

if (tier < 2)
{
    // Fall back to simpler visuals
}

// Bitmap caching for complex visuals
<Canvas>
    <Canvas.CacheMode>
        <BitmapCache EnableClearType="False"
                     RenderAtScale="1"
                     SnapsToDevicePixels="True"/>
    </Canvas.CacheMode>
    <!-- Complex drawing here -->
</Canvas>

// Reduce visual tree depth — flatten nested panels
// Use Border instead of nested StackPanels where possible
```

## Memory Management

```csharp
// Clear large collections
items.Clear();
items = null;

// Explicitly unload large BitmapImage sources
image.Source = null;

// Use Freeze for read-only resources
var brush = new SolidColorBrush(Colors.Blue);
brush.Freeze(); // Makes it thread-safe, reduces overhead

// Weak event pattern to avoid listener leaks
WeakEventManager<INotifyPropertyChanged, PropertyChangedEventArgs>
    .AddHandler(source, nameof(INotifyPropertyChanged.PropertyChanged), handler);

// Dispose unmanaged resources
~MyView()
{
    _bitmap?.Dispose();
    _renderTarget?.Dispose();
}
```

## Async Patterns

```csharp
// UI thread never blocks
private async Task LoadDataAsync()
{
    IsLoading = true;
    try
    {
        var data = await _service.FetchLargeDatasetAsync();
        Items = new ObservableCollection<Item>(data);
    }
    finally
    {
        IsLoading = false;
    }
}

// Background work with UI updates
private async Task RunExportAsync()
{
    var result = await Task.Run(() => ExportService.GenerateReport());
    // Back on UI thread automatically
    PreviewDocument(result);
}

// Throttle rapid changes
private CancellationTokenSource _searchCts;

private async void OnSearchTextChanged(string text)
{
    _searchCts?.Cancel();
    _searchCts = new CancellationTokenSource();
    try
    {
        await Task.Delay(300, _searchCts.Token); // debounce
        var results = await _service.SearchAsync(text);
        SearchResults = results;
    }
    catch (TaskCanceledException) { }
}
```

## Profiling Tools

```csharp
// Enable WPF performance tracing in app.config
/*
<appSettings>
  <add key="EnableWPFPerformanceTrace" value="true"/>
</appSettings>
*/

// Use Stopwatch for targeted timing
var sw = Stopwatch.StartNew();
await LoadExpensiveDataAsync();
sw.Stop();
Debug.WriteLine($"Load took {sw.ElapsedMilliseconds}ms");

// Check layout cycles
PresentationSource source = PresentationSource.FromVisual(this);
if (source != null)
{
    var compositionTarget = source.CompositionTarget;
    // Monitor transform changes
}
```

## Checklist

- UI virtualization enabled for all list-like controls
- Container recycling mode enabled
- BitmapCache on complex composite elements
- Freeze regdable Freezable objects (brushes, transforms)
- WeakEventManager for long-lived event subscriptions
- async/await for all I/O operations
- Debounce search/throttle inputs
- Dispose BitmapSource and other unmanaged resources
- Avoid triggers where setters suffice (triggers invalidate tree)
- Deferred scrolling via ScrollViewer.NotSmoothWhenScrolling="False"
- DataGrid: EnableRowVirtualization + EnableColumnVirtualization
- Reduce use of Run properties in TextBlock/FlowDocument
