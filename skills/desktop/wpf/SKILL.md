---
name: wpf
description: >
  Use this skill when building Windows desktop apps with WPF (.NET) — XAML UI, MVVM architecture, data binding, commands, styles/templates, and third-party controls. Do NOT use for: cross-platform apps, web UIs, UWP/WinUI 3 projects, console tools.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, windows, wpf, dotnet, xaml, phase-4]
---

# WPF

## Purpose
Build Windows desktop applications using WPF with MVVM architecture, XAML data binding, and .NET runtime.

## Agent Protocol

### Trigger
User request includes: `wpf`, `windows presentation foundation`, `xaml desktop`, `mvvm wpf`, `wpf app`, `.net desktop`, `xaml ui`.

### Input Context
- .NET version (.NET 6+, .NET Framework 4.8)
- MVVM framework (CommunityToolkit.Mvvm, Prism, Caliburn.Micro)
- Project type (LOB app, utility, designer tool)
- Third-party controls (DevExpress, Telerik, Syncfusion, none)
- Target OS (Windows 10, Windows 11)

### Output Artifact
A markdown document containing:
- Project structure with MVVM folders
- ViewModel with ObservableObject
- XAML view with data bindings
- Command implementation
- Service/dependency injection setup
- Style and template definitions
- Navigation pattern

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- ViewModel inherits ObservableObject (CommunityToolkit).
- XAML binds to ViewModel properties with {Binding}.
- Commands bound to buttons with ICommand.
- Dependency injection wired via Microsoft.Extensions.DependencyInjection.
- Styles defined in App.xaml or resource dictionary.
- Navigation implemented (window-based or page-based).

### Max Response Length
4096 tokens

## Workflow

### Step 1: Scaffold Project
```bash
dotnet new wpf -n MyApp
cd MyApp
dotnet add package CommunityToolkit.Mvvm
dotnet add package Microsoft.Extensions.DependencyInjection
```

### Step 2: Define ViewModel
```csharp
// ViewModels/MainViewModel.cs
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;

public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private string title = "My WPF App";

    [ObservableProperty]
    private string inputText = string.Empty;

    [ObservableProperty]
    private ObservableCollection<string> items = new();

    [RelayCommand]
    private void AddItem()
    {
        if (!string.IsNullOrWhiteSpace(InputText))
        {
            Items.Add(InputText);
            InputText = string.Empty;
        }
    }

    [RelayCommand]
    private void RemoveItem(string item)
    {
        Items.Remove(item);
    }
}
```

### Step 3: XAML View
```xml
<!-- Views/MainWindow.xaml -->
<Window x:Class="MyApp.Views.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="{Binding Title}" Height="600" Width="800"
        WindowStartupLocation="CenterScreen">
    <Grid Margin="16">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
        </Grid.RowDefinitions>

        <StackPanel Orientation="Horizontal" Grid.Row="0" Margin="0,0,0,16">
            <TextBox Text="{Binding InputText, UpdateSourceTrigger=PropertyChanged}"
                     Width="300" Margin="0,0,8,0"/>
            <Button Content="Add" Command="{Binding AddItemCommand}"
                    Padding="12,4"/>
        </StackPanel>

        <ListBox Grid.Row="1" ItemsSource="{Binding Items}">
            <ListBox.ItemTemplate>
                <DataTemplate>
                    <StackPanel Orientation="Horizontal">
                        <TextBlock Text="{Binding}" VerticalAlignment="Center" Width="200"/>
                        <Button Content="X" Command="{Binding DataContext.RemoveItemCommand,
                            RelativeSource={RelativeSource AncestorType=ListBox}}"
                                CommandParameter="{Binding}"/>
                    </StackPanel>
                </DataTemplate>
            </ListBox.ItemTemplate>
        </ListBox>
    </Grid>
</Window>
```

### Step 4: Wire DI in App.xaml
```xml
<!-- App.xaml -->
<Application x:Class="MyApp.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <Application.Resources>
        <ResourceDictionary>
            <ResourceDictionary.MergedDictionaries>
                <ResourceDictionary Source="Styles/GlobalStyles.xaml"/>
            </ResourceDictionary.MergedDictionaries>
        </ResourceDictionary>
    </Application.Resources>
</Application>
```

```csharp
// App.xaml.cs
using Microsoft.Extensions.DependencyInjection;

public partial class App : Application
{
    public static IServiceProvider Services { get; private set; }

    protected override void OnStartup(StartupEventArgs e)
    {
        var services = new ServiceCollection();
        services.AddSingleton<MainViewModel>();
        services.AddTransient<MainWindow>();

        Services = services.BuildServiceProvider();

        var window = Services.GetRequiredService<MainWindow>();
        window.DataContext = Services.GetRequiredService<MainViewModel>();
        window.Show();
    }
}
```

### Step 5: Global Styles
```xml
<!-- Styles/GlobalStyles.xaml -->
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <Style TargetType="Button">
        <Setter Property="Background" Value="#0078D4"/>
        <Setter Property="Foreground" Value="White"/>
        <Setter Property="BorderThickness" Value="0"/>
        <Setter Property="Padding" Value="12,6"/>
        <Setter Property="CornerRadius" Value="4"/>
        <Setter Property="FontWeight" Value="SemiBold"/>
    </Style>
    <Style TargetType="TextBox">
        <Setter Property="BorderBrush" Value="#CCCCCC"/>
        <Setter Property="BorderThickness" Value="1"/>
        <Setter Property="Padding" Value="8,4"/>
        <Setter Property="FontSize" Value="14"/>
    </Style>
</ResourceDictionary>
```

## Rules
- ViewModels use CommunityToolkit.Mvvm source generators ([ObservableProperty], [RelayCommand]).
- Views never reference ViewModel types in code-behind except for DataContext assignment.
- Commands, not event handlers, for all user interactions.
- Dependency injection for all services — no service locator anti-pattern.
- Styles defined in ResourceDictionary, not inline.
- INotifyPropertyChanged via source generators, never handwritten.

## References

### Reference Files
- `references/wpf-architecture.md` — Project structure, DI, lifecycle, threading
- `references/wpf-mvvm-patterns.md` — MVVM patterns, commands, validation, testing

### Related Skills
- `desktop/winui3/SKILL.md` — Modern Windows UI with WinAppSDK
- `desktop/winforms/SKILL.md` — Classic drag-drop Windows Forms
- `desktop/uwp/SKILL.md` — Universal Windows Platform

## Handoff
Hand off to `desktop/winui3/SKILL.md` when Fluent Design or modern Windows 11 UI required. Hand off to `desktop/uwp/SKILL.md` when Store distribution needed.
