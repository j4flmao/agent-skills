# WinUI 3 Controls Reference

## NavigationView

```xml
<NavigationView x:Name="NavView"
                PaneDisplayMode="Left"
                IsSettingsVisible="True"
                AlwaysShowHeader="True"
                Header="{Binding PageTitle}"
                OpenPaneLength="280"
                CompactPaneLength="48">

    <!-- Menu items -->
    <NavigationView.MenuItems>
        <NavigationViewItem Icon="Home" Content="Dashboard" Tag="dashboard">
            <NavigationViewItem.Icon>
                <SymbolIcon Symbol="Home"/>
            </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem Content="Documents" Tag="docs">
            <NavigationViewItem.Icon>
                <FontIcon Glyph="&#xE8A5;"/>
            </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItemSeparator/>
        <NavigationViewItem Content="Reports" Tag="reports"/>
    </NavigationView.MenuItems>

    <Frame x:Name="ContentFrame"/>
</NavigationView>
```

## InfoBar

```xml
<InfoBar x:Name="NotificationBar"
         Title="Operation completed"
         Message="Your changes were saved successfully."
         Severity="Success"
         IsOpen="False"
         IsClosable="True"
         Duration="5000"/>
```

```csharp
// Show notification
NotificationBar.Title = "Error";
NotificationBar.Message = "Failed to save changes.";
NotificationBar.Severity = InfoBarSeverity.Error;
NotificationBar.IsOpen = true;
```

## NumberBox

```xml
<NumberBox Header="Quantity"
           Value="{x:Bind ViewModel.Quantity, Mode=TwoWay}"
           Minimum="0"
           Maximum="999"
           SmallChange="1"
           LargeChange="10"
           SpinButtonPlacementMode="Inline"
           NumberFormatter="{StaticResource IntFormatter}"/>
```

## DataGrid (CommunityToolkit)

```xml
<!-- Requires: xmlns:controls="using:CommunityToolkit.WinUI.UI.Controls" -->
<controls:DataGrid ItemsSource="{x:Bind ViewModel.Items}"
                   AutoGenerateColumns="False"
                   SelectionMode="Single"
                   RowDetailsVisibilityMode="VisibleWhenSelected">

    <controls:DataGrid.Columns>
        <controls:DataGridTextColumn Header="Name" Binding="{Binding Name}" Width="*"/>
        <controls:DataGridTextColumn Header="Date" Binding="{Binding Date, StringFormat='{}{0:yyyy-MM-dd}'}"/>
        <controls:DataGridTextColumn Header="Amount" Binding="{Binding Amount, StringFormat='C'}" Width="120"/>
        <controls:DataGridCheckBoxColumn Header="Active" Binding="{Binding IsActive}"/>
        <controls:DataGridTemplateColumn Header="Actions" Width="150">
            <controls:DataGridTemplateColumn.CellTemplate>
                <DataTemplate>
                    <StackPanel Orientation="Horizontal" Spacing="4">
                        <Button Content="Edit"/>
                        <Button Content="Delete"/>
                    </StackPanel>
                </DataTemplate>
            </controls:DataGridTemplateColumn.CellTemplate>
        </controls:DataGridTemplateColumn>
    </controls:DataGrid.Columns>
</controls:DataGrid>
```

## TeachingTip

```xml
<Button x:Name="ActionButton" Content="Save"/>
<TeachingTip Target="{x:Bind ActionButton}"
             Title="Tip: Save Often"
             Subtitle="Your work is automatically backed up"
             IsOpen="{x:Bind ViewModel.ShowTip, Mode=TwoWay}"
             Placement="Bottom"
             PreferredPlacement="Bottom"/>
```

## TabView

```xml
<TabView x:Name="Tabs"
         AddTabButtonClick="OnAddTab"
         TabCloseRequested="OnCloseTab"
         CanReorderTabs="True"
         CanDragTabs="True">

    <TabView.TabItems>
        <TabViewItem Header="Document 1" IconSource="Document">
            <Grid>
                <TextBlock Text="Content of document 1"/>
            </Grid>
        </TabViewItem>
    </TabView.TabItems>
</TabView>
```

## ProgressRing

```xml
<ProgressRing IsActive="{x:Bind ViewModel.IsLoading}"
              Width="40"
              Height="40"
              Foreground="{ThemeResource SystemAccentColor}"/>
```

## PipsPager

```xml
<PipsPager NumberOfPages="{x:Bind ViewModel.TotalPages}"
           SelectedPageIndex="{x:Bind ViewModel.CurrentPage, Mode=TwoWay}"
           Orientation="Horizontal"
           MaxVisiblePips="7"/>
```

## CommandBar

```xml
<CommandBar DefaultLabelPosition="Right"
            Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
    <AppBarButton Icon="Add" Label="New" Command="{x:Bind ViewModel.NewCommand}"/>
    <AppBarButton Icon="Edit" Label="Edit" Command="{x:Bind ViewModel.EditCommand}"/>
    <AppBarButton Icon="Delete" Label="Delete" Command="{x:Bind ViewModel.DeleteCommand}"/>
    <AppBarSeparator/>
    <AppBarButton Icon="Refresh" Label="Refresh" Command="{x:Bind ViewModel.RefreshCommand}"/>
    <CommandBar.SecondaryCommands>
        <AppBarButton Icon="Setting" Label="Settings"/>
        <AppBarButton Icon="Help" Label="About"/>
    </CommandBar.SecondaryCommands>
</CommandBar>
```

## AnimatedVisualPlayer (Lottie)

```xml
<AnimatedVisualPlayer x:Name="Player"
                      AutoPlay="true"
                      Width="200" Height="200">
    <lottie:LottieVisualSource UriSource="ms-appx:///Animations/loading.json"/>
</AnimatedVisualPlayer>
```

## DropDownButton / SplitButton

```xml
<DropDownButton Content="Save">
    <DropDownButton.Flyout>
        <MenuFlyout>
            <MenuFlyoutItem Text="Save"/>
            <MenuFlyoutItem Text="Save As..."/>
            <MenuFlyoutItem Text="Save All"/>
        </MenuFlyout>
    </DropDownButton.Flyout>
</DropDownButton>

<SplitButton Content="Save"
             Click="OnSave"
             Command="{x:Bind ViewModel.SaveCommand}">
    <SplitButton.Flyout>
        <MenuFlyout>
            <MenuFlyoutItem Text="Save As..."/>
        </MenuFlyout>
    </SplitButton.Flyout>
</SplitButton>
```

## Resource and Style System

```xml
<Page.Resources>
    <x:Double x:Key="StandardMargin">16</x:Double>
    <x:Double x:Key="ControlCornerRadius">8</x:Double>

    <Style TargetType="Button" x:Key="PrimaryButtonStyle">
        <Setter Property="Background" Value="{ThemeResource SystemAccentColor}"/>
        <Setter Property="Foreground" Value="White"/>
        <Setter Property="CornerRadius" Value="{StaticResource ControlCornerRadius}"/>
        <Setter Property="Padding" Value="16,8"/>
    </Style>
</Page.Resources>
```
