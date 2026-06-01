# Windows Forms Advanced Topics

## Overview
Advanced WinForms covers custom control development, GDI+ performance optimization, printing and print preview, drag-and-drop, multithreading patterns, ClickOnce deployment, and accessibility.

## Advanced Concepts

### Concept 1: Custom Control Development
Extend Control or UserControl. Override OnPaint for custom rendering, OnMouseDown/OnMouseUp/MouseMove for interaction, OnResize for layout. Add properties with Browsable attribute for designer support. Implement IComponent for design-time integration.

### Concept 2: GDI+ Performance
BufferedGraphics for double-buffered drawing, regions for invalidation optimization, cached bitmaps for static elements, and suspended layout (SuspendLayout/ResumeLayout). Use Measurement graphics for text sizing without rendering.

### Concept 3: Printing and Print Preview
PrintDocument with PrintPage event handler (one page per event), PageSetupDialog for page settings, PrintDialog for printer selection, PrintPreviewDialog/PrintPreviewControl for preview. Track current page in PrintPage event.

### Concept 4: Drag and Drop
GiveFeedback/DragOver/DragDrop events, DoDragDrop for initiating drag, QueryContinueDrag for cancellation, and DataFormats for clipboard data types. Custom cursors for drag visual feedback.

### Concept 5: ClickOnce Deployment
Automatic updates via ApplicationDeployment.CheckForUpdate, publisher certificate signing for trust, prerequisites installer, application files exclusion for size optimization, and API for programmatic updates.

## Advanced Techniques

### GDI+ Double Buffering
```csharp
protected override void OnPaint(PaintEventArgs e) {
    using var buffer = BufferedGraphicsManager.Current.Allocate(e.Graphics,
        this.ClientRectangle);
    buffer.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
    // Draw to buffer
    buffer.Render(e.Graphics);
}
```

### BackgroundWorker with Progress
```csharp
var worker = new BackgroundWorker {
    WorkerReportsProgress = true,
    WorkerSupportsCancellation = true
};
worker.DoWork += (s, e) => { /* long operation */ };
worker.ProgressChanged += (s, e) => progressBar.Value = e.ProgressPercentage;
worker.RunWorkerAsync();
```

## Anti-Patterns

- OnPaint with expensive operations (recreated every frame)
- No VirtualMode for large DataGridView (10K+ rows)
- Printing without print preview
- Cross-thread UI access without Invoke
- ClickOnce without version checking
- Designer file manual edits (regenerated on designer change)
- No accessibility labels on custom controls
- Application.DoEvents in loops (reentrancy issues)
