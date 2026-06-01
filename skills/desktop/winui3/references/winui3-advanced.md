# WinUI 3 Advanced Topics

## Overview
Advanced WinUI 3 covers custom control development, data virtualization, Win2D graphics, multi-window management, WinRT interop, performance profiling, and MSIX packaging.

## Advanced Concepts

### Concept 1: Custom Templated Controls
Extend Control class with TemplatePart and TemplateVisualState attributes. Override OnApplyTemplate to wire template children. Register DependencyProperty for bindable properties. Define default style in themes/Generic.xaml.

### Concept 2: Data Virtualization
For large datasets: implement IIncrementalSource with ISupportIncrementalLoading, use ObservableCollection with batch inserts via AddRange, implement virtualization in custom controls, and use x:Phase for deferred binding. CacheSource for disk-backed caching.

### Concept 3: Win2D Graphics
DirectX-powered 2D rendering: CanvasControl for real-time drawing, CanvasBitmap for image loading/processing, CanvasTextLayout for rich text, and CanvasRenderTarget for off-screen rendering. Use for charts, image editors, and custom visualizations.

### Concept 4: Multi-Window Management
AppWindow (Windows App SDK) for secondary windows: create with AppWindow.Create, navigate pages, manage lifecycle, and communicate between windows. AppWindow.TitleBar for custom title bars per window scenario.

### Concept 5: Performance Profiling
Application Timeline (ETW tracing), XAML frame rate counters, memory usage analysis with dotnet-counters, layout cycle analysis, and CPU usage monitoring. Profile on target hardware with representative data.

## Advanced Techniques

### Custom Control Template
```csharp
[TemplatePart(Name = "PART_RootGrid", Type = typeof(Grid))]
public class CardControl : Control {
    protected override void OnApplyTemplate() {
        var root = GetTemplateChild("PART_RootGrid") as Grid;
        // Configure
    }
}
```

### Win2D Canvas Drawing
```csharp
canvasControl.Draw += (sender, args) => {
    var ds = args.DrawingSession;
    ds.FillCircle(100, 100, 50, Colors.Blue);
    ds.DrawText("Hello", 10, 10, Colors.White,
        new CanvasTextFormat { FontSize = 24 });
};
```

### Data Virtualization Source
```csharp
public class InfiniteSource : IIncrementalSource<Item> {
    public async Task<IEnumerable<Item>> GetPagedItemsAsync(
        int pageIndex, int pageSize, CancellationToken ct) {
        // Fetch from server, DB, or generate
    }
}
```

## Anti-Patterns

- Win2D without Dispose pattern (GPU resource leaks)
- Data binding without virtualization for large lists
- Custom controls without accessibility (UIA)
- Ignoring ApplicationWindow lifecycle events
- No fallback for unsupported Win2D hardware
- Cross-window communication via polling (use events)
- Profiling only in debug mode (release performance differs)
- WinUI 2 APIs compiled into WinUI 3 apps
