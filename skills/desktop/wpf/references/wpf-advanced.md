# WPF Advanced Topics

## Overview
Advanced WPF covers custom controls with ControlTemplate, attached behaviors, commanding (routed commands), UI virtualization, WPF threading (Dispatcher), Interop (WinForms/Win32 hosting), and MVVM with messaging.

## Advanced Concepts

### Concept 1: Custom Controls with ControlTemplate
Extend Control, register DependencyProperty, define default style in Generic.xaml with ControlTemplate. Use TemplatePart for optional named elements, TemplateVisualState for visual states (common, disabled, mouseover). OnApplyTemplate wires template children.

### Concept 2: Attached Behaviors
Attached properties implement reusable behavior without subclassing: DragBehavior (enable drag on any FrameworkElement), ScrollBehavior (smooth scrolling), ValidationBehavior (cross-field validation). Behaviors encapsulate interaction patterns.

### Concept 3: Routed Commands
RoutedCommand with InputGesture (Ctrl+S), CommandBinding on window level, CommandTarget for directed execution, and CommandManager for automatic CanExecute re-evaluation. Prefer Prism DelegateCommand or CommunityToolkit RelayCommand.

### Concept 4: UI Virtualization
VirtualizingStackPanel for ListBox/ListView, VirtualizingWrapPanel (Custom), UI virtualization via VirtualizationMode.Recycling, container recycling for ScrollViewer, and deferred scrolling (ScrollUnit.Pixel).

### Concept 5: Interop (WinForms/Win32 Hosting)
WindowsFormsHost for WinForms controls in WPF, HwndHost for custom Win32 windows, and ElementHost for WPF controls in WinForms. Use for legacy control integration or Win32-specific functionality.

## Advanced Techniques

### Attached Behavior
```csharp
public static class DragBehavior {
    public static readonly DependencyProperty IsDragEnabledProperty =
        DependencyProperty.RegisterAttached("IsDragEnabled", typeof(bool),
            typeof(DragBehavior), new PropertyMetadata(false, OnIsDragEnabledChanged));
    public static void SetIsDragEnabled(DependencyObject obj, bool value) =>
        obj.SetValue(IsDragEnabledProperty, value);
    public static bool GetIsDragEnabled(DependencyObject obj) =>
        (bool)obj.GetValue(IsDragEnabledProperty);
}
```

### Virtualizing Wrap Panel
Custom VirtualizingPanel: implement IScrollInfo, measure/arrange children based on viewport, reuse container elements, and support pixel-based scrolling for smooth UX.

### MVVM Messaging (WeakReference)
```csharp
// Mediator with WeakReference to prevent leaks
Messenger.Default.Send(new SaveMessage());
Messenger.Default.Register<SaveMessage>(this, msg => Save());
```

## Anti-Patterns

- UI virtualization disabled for ListBox (memory issues with 500+ items)
- Event handlers not unsubscribed (memory leaks)
- Code-behind logic that belongs in ViewModel
- ControlTemplate in resource dictionary with no key (applies everywhere)
- Heavy visual tree in DataTemplate (performance)
- Freezable objects modified after freezing
- DispatcherPriority misuse (starving rendering)
- Direct WPF/WinForms interop without layout consideration
