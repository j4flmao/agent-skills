# WPF Fundamentals

## Overview
WPF (Windows Presentation Foundation) is .NET's XAML-based UI framework with powerful data binding, templating, styling, and DirectX-accelerated rendering. This reference covers fundamental WPF concepts.

## Core Concepts

### Concept 1: XAML and Code-Behind
XAML (Extensible Application Markup Language) declares the UI tree: elements, layout containers, data bindings, styles, and triggers. Code-behind files handle event handlers and ViewModel wiring. The two are partial classes compiled together.

### Concept 2: Dependency Properties
DependencyProperty is a property system that supports: data binding, styling, animation, value inheritance, and property change notification. Properties are registered with PropertyMetadata (default value, change callback, coercion). Attached properties extend any DependencyObject.

### Concept 3: Data Binding
Binding connects target (UI property) to source (CLR property). Path, Mode (OneWay, TwoWay, OneTime, OneWayToSource), UpdateSourceTrigger (PropertyChanged, LostFocus, Explicit). Converters transform values (IValueConverter). FallbackValue for null/missing data.

### Concept 4: MVVM Pattern
View (XAML) binds to ViewModel (ObservableObject with INotifyPropertyChanged) via DataContext. ViewModel uses ICommand (RelayCommand) for actions. Model contains business logic and data. The ViewModel mediates between View and Model without direct View reference.

### Concept 5: Styles and Templates
Styles (Setter, Trigger, DataTrigger, MultiTrigger) define visual properties. ControlTemplate completely replaces a control's visual tree. DataTemplate defines how data objects are rendered. Resources at Application, Window, or Page level.

## Best Practices

- .NET 6+ for new projects
- MVVM strictly (separation of concerns)
- CommunityToolkit.Mvvm for source generators
- async/await for all I/O (non-blocking UI)
- VirtualizingStackPanel for lists (performance)
- StaticResource over DynamicResource (performance)
- DataTemplates for type-based ViewModel rendering
- Prism for modular enterprise apps

## Anti-Patterns

- UI thread blocking with long operations
- Memory leaks from event handlers (unsubscribed)
- Data Virtualization missing (10K+ rows)
- Deep XAML nesting (performance)
- No async commands (button blocks)
- Cross-thread UI access (dispatcher required)
- Large resource dictionaries (slow startup)
- StaticRessource where DynamicResource needed (and vice versa)
