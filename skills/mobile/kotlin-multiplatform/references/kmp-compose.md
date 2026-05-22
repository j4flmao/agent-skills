# Compose Multiplatform

## Project Setup

Apply the Compose Multiplatform plugin:

```kotlin
plugins {
  id("org.jetbrains.compose")
  id("org.jetbrains.kotlin.plugin.compose")
}

kotlin {
  sourceSets {
    commonMain.dependencies {
      implementation(compose.runtime)
      implementation(compose.foundation)
      implementation(compose.material3)
      implementation(compose.ui)
    }
  }
}
```

## Shared Composable Screens

All UI lives in commonMain. Screens are @Composable functions with a ViewModel or state holder parameter.

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
  val state by viewModel.state.collectAsState()
  Scaffold(topBar = { TopAppBar(title = { Text("Profile") }) }) {
    when {
      state.loading -> LoadingIndicator()
      state.error -> ErrorView(state.error)
      else -> ProfileContent(state.user)
    }
  }
}
```

## Navigation (Voyager)

```kotlin
@Composable
fun App() {
  Navigator(screens = listOf(HomeScreen()))
}

class HomeScreen : Screen {
  @Composable
  override fun Content() {
    val navigator = LocalNavigator.currentOrThrow
    Button(onClick = { navigator.push(ProfileScreen) }) {
      Text("Profile")
    }
  }
}
```

## Platform Theming Adapters

```kotlin
// commonMain
expect val platformColors: Colors

@Composable
fun AppTheme(content: @Composable () -> Unit) {
  MaterialTheme(
    colors = platformColors,
    typography = AppTypography,
    content = content
  )
}

// androidMain
actual val platformColors: Colors get() = dynamicLightColorScheme(LocalContext.current)

// iosMain
actual val platformColors: Colors
  get() = lightColorScheme(
    primary = Color(0xFF007AFF),
    secondary = Color(0xFF5856D6)
  )
```

## Platform Composables via expect/actual

For truly platform-specific UI elements (maps, web views), declare expect composables:

```kotlin
// commonMain
@Composable
expect fun MapView(latitude: Double, longitude: Double)

// androidMain
@Composable
actual fun MapView(latitude: Double, longitude: Double) {
  AndroidView(factory = { MapView(it) })
}
```
