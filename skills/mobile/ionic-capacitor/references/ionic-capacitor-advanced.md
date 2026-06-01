# Ionic & Capacitor Advanced Topics

## Overview
Advanced Ionic/Capacitor topics cover custom native plugins, Capacitor 3+ migration, performance optimization, advanced WebView configuration, and production deployment strategies.

## Custom Capacitor Plugins

### Plugin Structure
Capacitor plugin = JavaScript TypeScript definition + native implementations (Swift for iOS, Java/Kotlin for Android). `@capacitor/create-plugin` scaffolds the project. Exported as npm package. Define methods with `@PluginMethod` / `@objc` annotations.

### iOS Plugin Development
Extend `CAPPlugin` in Swift. `@objc` annotation for method exposure. `CAPPluginCall` for input/output. `call.resolve(["result": value])` for success, `call.reject(message)` for failure. Use `CAPLog` for native logging. Bridge UIKit/Foundation APIs.

### Android Plugin Development
Extend `com.getcapacitor.Plugin` in Kotlin/Java. `@PluginMethod` annotation. `JSObject` for result data. `pluginCall.resolve(result)` / `pluginCall.reject()`. `com.getcapacitor.annotation.CapacitorPlugin` for permissions. Use AndroidX APIs for compatibility.

### Thread Safety
Native plugin methods run on web view thread by default. Offload heavy work to background threads. `DispatchQueue.main.async` for iOS UIKit calls. `runOnUiThread` for Android UI updates. Handle concurrent plugin calls with synchronization.

## WebView Optimization

### WKWebView Configuration (iOS)
Ionic uses WKWebView (iOS 12+). Configure in ViewController: `configuration.preferences.javaScriptEnabled = true`. `configuration.websiteDataStore` for cache management. `scrollView.bounces = false` for no overscroll. Set `allowsInlineMediaPlayback` for video.

### Android WebView Configuration
Android WebView settings in `MainActivity.java`. `webView.getSettings().setJavaScriptEnabled(true)`. `setDomStorageEnabled(true)` for local storage. `setAppCacheEnabled(true)` for caching. `setUseWideViewPort(true)` for responsive layout. Disable file access in production.

### Preloading and Caching
Preload critical pages with service worker. Cache API responses with CacheStorage API. Preconnect to API servers via `<link rel="preconnect">`. Lazy-load non-critical components. Service worker for offline asset serving. Bundle critical CSS/JS in index.html.

## Performance Optimization

### WebView Startup
Minimize initial bundle size (code splitting, tree shaking). Defer non-critical script loading. Use `module/nomodule` for modern/legacy bundles. Inline critical CSS for first paint. Remove render-blocking resources. Profile with Chrome DevTools on Android.

### Native Bridge Efficiency
Batch native plugin calls to reduce bridge overhead. `@capacitor-community/bridge-speed` for performance. Avoid calling native plugins in tight loops. Prefer web APIs over native plugins when equivalent. `Capacitor.convertFileSrc` for file path conversion.

### Memory Management
Detach listeners on page leave to prevent memory leaks. Clear cached data periodically. Use WeakRef for DOM references. Avoid growing WebView heap indefinitely. Monitor with Safari Web Inspector (iOS) or Chrome DevTools (Android).

## Production Deployment

### App Store Requirements
iOS: remove `UIWebView` references (rejected if found). Minimum iOS 13+ target. Privacy manifest for required reason APIs. xcarchive build for App Store Connect. TestFlight for beta distribution.

### Play Store Requirements
Android: target API 33+. Play App Signing for key management. App Bundle (AAB) for upload. `android:usesCleartextTraffic="false"` in manifest. 64-bit native library requirement. `minSdkVersion 22+` for modern Capacitor.

### Live Updates
`@capacitor/app-updater` or custom solution for OTA web content updates. `capacitor.config.json server.url` for live update server. Download new web bundle, cache, and swap on next launch. Rollback capability. Monitor update success rate.

## Advanced Native Features

### Push Notifications
`@capacitor/push-notifications` for remote push. Register for push on app launch. Handle foreground, background, and tap states. Custom notification sounds. Rich notifications with media attachments (iOS service extension). Notification grouping (Android channels).

### Background Tasks
`@capacitor-background-task` for limited background execution. iOS: BGTaskScheduler for periodic sync (15 min+). Android: WorkManager via `@capacitor-background-task`. Beware of OS time limits (30s iOS, variable Android). Use for critical short-lived operations.

### Biometric Authentication
`@capacitor/biometric` or `@aparajita/capacitor-biometric` for Face ID / fingerprint. Check biometry availability before prompting. Handle enrollment changes. Fallback to device passcode. Use for sensitive screens and payment confirmation.

## Migration from Cordova

### Plugin Compatibility
Capacitor is not a drop-in Cordova replacement. Cordova plugins require `@capacitor-community/cordova-plugin` compatibility layer. Prefer native Capacitor plugins. Migrate custom plugins to Capacitor format. `cordova-res` generates native app icons and splash screens.

### Key Differences
Capacitor uses WKWebView (not UIWebView). Plugins are async by design (Promise-based). No `cordova.js` bridge — direct native calls. Configuration in `capacitor.config.json` (not config.xml). Native project files committed to repo (managed by Capacitor CLI).

## Key Points
- Custom plugins: CAPPlugin (iOS) / Plugin (Android) with @PluginMethod
- WKWebView on iOS, Android WebView with tuned settings
- Batch native calls to reduce bridge overhead
- Live updates for OTA web content (no store review for web changes)
- Push notifications via @capacitor/push-notifications
- Biometric auth via @capacitor/biometric
- Background tasks limited to OS-allowed windows
- Migration from Cordova requires Capacitor-native plugins
- Privacy manifest and minimum OS versions for store submission
- App Bundle (Android) + xcarchive (iOS) for distribution
