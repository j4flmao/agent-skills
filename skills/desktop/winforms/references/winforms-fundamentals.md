# Windows Forms Fundamentals

## Overview
Windows Forms (WinForms) is .NET's rapid-application-development UI framework with designer-driven development, rich control set, and GDI+ drawing. This reference covers fundamental WinForms concepts.

## Core Concepts

### Concept 1: Form Lifecycle
Form events in order: Load (before visible), Shown (after visible), Activated (receives focus), Deactivate (loses focus), FormClosing (validates, can cancel), FormClosed (after close), Dispose (cleanup resources). Load for initialization, Shown for startup animations.

### Concept 2: Event-Driven Model
WinForms uses event handlers for user interaction: Click, TextChanged, SelectedIndexChanged, Validating, Validated. Wire events in designer or programmatically. Use async void for event handlers (fire-and-forget).

### Concept 3: Data Binding
BindingSource connects controls to data sources (DataTable, List<T>, Entity Framework). BindingNavigator provides navigation UI. DataGridView displays tabular data. Use VirtualMode for large datasets (>1000 rows) to avoid loading all data in memory.

### Concept 4: Layout Management
Controls have Dock (fill, top, bottom, left, right) and Anchor (relative edge positioning). TableLayoutPanel and FlowLayoutPanel provide dynamic layouts. Use Padding and Margin for spacing. AutoScaleMode = Dpi for high-DPI support.

### Concept 5: GDI+ Drawing
Custom painting in OnPaint event. Use Graphics object for shapes, text, images. DoubleBuffered = true for flicker-free rendering. BufferedGraphics for complex scenes. Dispose of Pen, Brush, Font, and Bitmap resources (IDisposable pattern).

## Best Practices

- .NET 6+ for new projects (.NET Framework for legacy)
- TableLayoutPanel for resizable layouts
- Async void for event handlers (fire-and-forget)
- BindingSource for data binding
- VirtualMode for large DataGridView
- DoubleBuffered = true for custom painting
- ErrorProvider for validation
- Settings.settings for typed configuration

## Anti-Patterns

- UI thread blocking with synchronous I/O
- Cross-thread UI access (missing InvokeRequired)
- DataGridView without VirtualMode for large data
- Not disposing GDI+ resources (leaks)
- No high-DPI handling (blurry on 4K)
- Magic strings for control names
- Unhandled exceptions in event handlers
- Application.DoEvents misuse (reentrancy)
