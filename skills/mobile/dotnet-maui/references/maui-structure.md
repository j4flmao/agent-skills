# MAUI Project Structure

## Solution Layout

```
MyApp/
  App.xaml              # Application resources, startup
  AppShell.xaml          # Shell navigation definition
  MauiProgram.cs         # DI container setup
  Pages/
    HomePage.xaml
    HomePage.xaml.cs
    ProfilePage.xaml
  ViewModels/
    HomeViewModel.cs
    ProfileViewModel.cs
  Models/
    User.cs
    Product.cs
  Services/
    IAuthService.cs
    AuthService.cs
    ApiService.cs
  Resources/
    Styles/
    Fonts/
    Images/
  Platforms/
    Android/
      MainApplication.cs
      AndroidManifest.xml
    iOS/
      AppDelegate.cs
      Info.plist
  MyApp.csproj
```

## AppShell Navigation

```xml
<Shell xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
       xmlns:pages="clr-namespace:MyApp.Pages">
  <FlyoutItem Title="Home" Icon="home.png">
    <ShellContent ContentTemplate="{DataTemplate pages:HomePage}" />
  </FlyoutItem>
  <TabBar>
    <ShellContent Title="Feed" ContentTemplate="{DataTemplate pages:FeedPage}" />
    <ShellContent Title="Profile" ContentTemplate="{DataTemplate pages:ProfilePage}" />
  </TabBar>
</Shell>
```

```csharp
// Route registration in AppShell constructor
Routing.RegisterRoute("profile/detail", typeof(ProfileDetailPage));

// Navigate
await Shell.Current.GoToAsync("profile/detail?userId=42");
```

## MVVM with CommunityToolkit

```csharp
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

public partial class HomeViewModel : ObservableObject
{
  [ObservableProperty]
  private string title;

  [ObservableProperty]
  private bool isLoading;

  [RelayCommand]
  private async Task LoadData()
  {
    IsLoading = true;
    try { Title = await _service.FetchTitle(); }
    finally { IsLoading = false; }
  }
}
```

## DI Registration (MauiProgram.cs)

```csharp
builder.Services.AddSingleton<IApiService, ApiService>();
builder.Services.AddTransient<HomeViewModel>();
builder.Services.AddTransient<HomePage>();
```

## Data Binding in XAML

```xml
<ContentPage BindingContext="{Binding HomeViewModel}">
  <Label Text="{Binding Title}" />
  <ActivityIndicator IsRunning="{Binding IsLoading}" />
  <Button Command="{Binding LoadDataCommand}" Text="Load" />
</ContentPage>
```
