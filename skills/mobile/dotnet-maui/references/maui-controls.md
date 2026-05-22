# MAUI Controls

## CollectionView — The Primary List Control

```xml
<RefreshView IsRefreshing="{Binding IsRefreshing}"
             Command="{Binding RefreshCommand}">
  <CollectionView ItemsSource="{Binding Items}"
                  SelectionMode="Single"
                  SelectionChangedCommand="{Binding ItemSelectedCommand}"
                  SelectionChangedCommandParameter="{Binding SelectedItem, Source={RelativeSource Self}}">
    <CollectionView.ItemTemplate>
      <DataTemplate x:DataType="models:Product">
        <Frame Padding="12" Margin="4">
          <Grid ColumnDefinitions="80,*">
            <Image Source="{Binding ImageUrl}" Aspect="AspectFill" />
            <StackLayout Grid.Column="1" Spacing="4">
              <Label Text="{Binding Name}" FontAttributes="Bold" />
              <Label Text="{Binding Price, StringFormat='{0:C}'}" />
            </StackLayout>
          </Grid>
        </Frame>
      </DataTemplate>
    </CollectionView.ItemTemplate>
    <CollectionView.EmptyView>
      <StackLayout>
        <Label Text="No items found" HorizontalOptions="Center" />
      </StackLayout>
    </CollectionView.EmptyView>
  </CollectionView>
</RefreshView>
```

## CollectionView Grouping

```xml
<CollectionView ItemsSource="{Binding GroupedItems}"
                IsGrouped="True">
  <CollectionView.GroupHeaderTemplate>
    <DataTemplate x:DataType="models:ItemGroup">
      <Label Text="{Binding Category}" FontSize="18"
             FontAttributes="Bold" Padding="8,4" />
    </DataTemplate>
  </CollectionView.GroupHeaderTemplate>
</CollectionView>
```

## CarouselView

```xml
<CarouselView ItemsSource="{Binding Products}"
              PeekAreaInsets="20"
              Loop="False">
  <CarouselView.ItemTemplate>
    <DataTemplate x:DataType="models:Product">
      <Frame Padding="16" Margin="8">
        <VerticalStackLayout>
          <Image Source="{Binding ImageUrl}" HeightRequest="200" />
          <Label Text="{Binding Name}" />
        </VerticalStackLayout>
      </Frame>
    </DataTemplate>
  </CarouselView.ItemTemplate>
</CarouselView>
```

## Platform Handlers

```csharp
// MauiProgram.cs — Customize Entry on all platforms
builder.ConfigureMauiHandlers(handlers =>
{
  handlers.AddHandler<Entry, EntryHandler>(nameof(Entry), (handler) =>
  {
#if ANDROID
    handler.PlatformView.BackgroundTintList = null;
#elif IOS
    handler.PlatformView.BorderStyle = UITextBorderStyle.None;
#endif
  });
});
```

## Gestures

```xml
<Frame>
  <Frame.GestureRecognizers>
    <TapGestureRecognizer Command="{Binding TapCommand}"
                          CommandParameter="{Binding .}" />
    <SwipeGestureRecognizer Direction="Left"
                            Command="{Binding DeleteCommand}" />
  </Frame.GestureRecognizers>
  <Label Text="{Binding Name}" />
</Frame>
```
