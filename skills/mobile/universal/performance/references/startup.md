# Mobile Startup

## Cold start sequence

1. Process start → 2. Init runtime → 3. Load main activity → 4. Render first frame

## Optimization

### Lazy init

```kotlin
// Defer non-critical SDKs
class App : Application() {
    override fun onCreate() {
        // init crash reporter here
        // analytics, feature flags → lazy
    }
}
```

```swift
// iOS: Move setup off main thread
DispatchQueue.global().async {
    setupAnalytics()
    setupCrashReporter()
}
```

### Splash screen

```yaml
# Flutter: native splash
flutter_native_splash:
  color: "#FFFFFF"
  image: assets/splash.png
```

```typescript
// RN: expo-splash-screen
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();
// After fonts/images load
SplashScreen.hideAsync();
```

### Baseline profiles (Android)

Generate with Jetpack Macrobenchmark:

```kotlin
@LargeTest
fun measureStartup() {
    val rule = startupTimingRule(
        targetPackage = "com.example.app",
        iterations = 10
    )
    rule.measureRepeated {
        startActivityAndWait(Intent())
    }
}
```
