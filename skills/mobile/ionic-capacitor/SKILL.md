---
name: mobile-ionic-capacitor
description: >
  Use this skill when the user says 'Ionic', 'Capacitor', 'Ionic app', 'hybrid mobile', 'web-to-mobile', 'Capacitor plugin', 'Ionic framework', 'Ionic React', 'Ionic Angular', 'Ionic Vue'. Build hybrid mobile apps using Ionic UI components and Capacitor native bridge with web-to-native access. Do NOT use for: native mobile development (KMP/MAUI) or pure web apps.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, ionic, capacitor, phase-7]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Ionic & Capacitor

## Purpose
Guide for building hybrid mobile apps with Ionic framework and Capacitor native bridge.

## Agent Protocol

### Trigger
Phrases: "Ionic", "Capacitor", "Ionic app", "hybrid mobile", "web-to-mobile", "Capacitor plugin", "Ionic framework", "Ionic React", "Ionic Angular", "Ionic Vue"

### Input Context
- Framework choice (React, Angular, or Vue)
- Required native plugin list
- Existing web app to wrap (if any)
- Build and deployment targets

### Output Artifact
Ionic project with: Capacitor config, native plugin integrations, custom plugin code, build/deploy pipeline scripts.

### Response Format
```
<ionic-capacitor>
<project>{framework, capacitor config, structure}</project>
<plugins>{installed plugins, config, permissions}</plugins>
<custom-plugin>{swift/kotlin, call pattern}</custom-plugin>
<build>{sync, xcode, android-studio steps}</build>
</ionic-capacitor>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- `ionic build` succeeds with zero errors
- `npx cap sync` copies web assets to both platforms
- Native plugins function on device
- Custom plugin call/response cycle works
- App deploys to TestFlight and Play Console internal track

### Max Response Length
8000 tokens

## Architecture

### Hybrid Bridge Architecture
```
┌─────────────────────────────────────────────┐
│           Web Application (SPA)              │
│  Ionic UI Components | Framework (React/     │
│  Angular/Vue) | App Logic                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Capacitor Bridge (WKWebView/        │
│          Android WebView)                    │
│  • Plugin registry: maps JS calls to native  │
│  • JSON serialization/deserialization        │
│  • Error propagation via Promise reject      │
│  • Event emitter for native-to-JS events     │
└───────┬─────────────────────┬───────────────┘
        │                     │
┌───────▼─────────┐  ┌───────▼───────────────┐
│   iOS Runtime    │  │   Android Runtime      │
│   (Swift/Obj-C)  │  │   (Kotlin/Java)        │
│   CAPPlugin      │  │   CAPPlugin            │
└─────────────────┘  └───────────────────────┘
```

### Decision Tree: Framework Selection
```
Team expertise?
├── React developers → Ionic React
│   Pros: hooks, largest ecosystem, TypeScript-first
│   Cons: routing less mature than Angular
├── Angular developers → Ionic Angular
│   Pros: mature routing (lazy loading, guards), full-featured
│   Cons: more boilerplate, steeper learning curve for new devs
└── Vue developers → Ionic Vue
    Pros: lightweight, composition API, growing ecosystem
    Cons: fewer community plugins, smaller talent pool
```

### Decision Tree: Plugin Strategy
```
Need native device access?
├── Common feature (camera, geolocation, storage)
│   → Use official @capacitor/* plugin
│   → Configure permissions in native project files
├── Niche but exists (bluetooth, NFC, health kit)
│   → Search npm for @capacitor-community/* or capacitor-*
│   → Evaluate maintenance status, open issues, last update
├── Existing Cordova plugin
│   → Use @capacitor/cordova-plugin-compat
│   → Test thoroughly — not all Cordova patterns migrate cleanly
└── Completely custom native requirement
    → Write custom plugin (Swift + Kotlin)
    → Keep plugin surface small, test on real device
```

## Workflow

1. **Ionic framework overview** — Ionic is a UI toolkit for building cross-platform mobile apps using web technologies (HTML, CSS, JS). It provides a library of mobile-optimized UI components (`ion-*`), gestures, and animations that mimic native platform conventions. Three framework integrations: Ionic React (hooks, fast iteration, largest ecosystem), Ionic Angular (NgModule + standalone, mature routing, full-featured), Ionic Vue (composition API, lightweight, growing ecosystem). All share `@ionic/core` components and CSS custom properties theming.

2. **Capacitor vs Cordova** — Capacitor is the successor to Cordova with key advantages: modern plugin API (Promise-based instead of callback), native project files committed to repo (full Xcode/Android Studio control), Swift/Kotlin plugin development (instead of Java/Obj-C), HMR support during development, PWA fallback for web, and unified config (`capacitor.config.ts`). Cordova plugins are compatible via `@capacitor/cordova-plugin-compat`. Migration path: `npx cap init` on existing Cordova project, then replace `cordova plugin add` with `npm install @capacitor/plugin-name`.

3. **Project creation** — `ionic start myApp blank --type=react-ts` creates an Ionic React TypeScript project with Capacitor pre-configured. Key files: `capacitor.config.ts` (app ID, name, server URL for live reload), `ionic.config.json` (project type, integrations), `src/` (web app code), `ios/` (Xcode project after `npx cap add ios`), `android/` (Android Studio project after `npx cap add android`). The web app is the single source of truth — native projects are generated artifacts.

4. **Live reload development** — `ionic serve` for web-only HMR. For device live reload: `ionic cap run ios -l --external` starts a dev server with your machine's IP, updates `capacitor.config.ts` with `server.url`, then opens Xcode. The device loads web assets from the dev server over the network. Hot Module Replacement preserves component state. For Android: `ionic cap run android -l --external`. Requires device on same network as dev machine. Disable `server.url` for production builds.

5. **Capacitor plugin system** — Plugins are npm packages that expose native APIs to JavaScript. Architecture: TypeScript API definition (`@capacitor/plugin-name`) -> iOS implementation (Swift, `CAPPlugin` subclass) -> Android implementation (Kotlin, `CAPPlugin` subclass) -> optional web fallback. Plugin calls are serialized via JSON through the WebView bridge. `npx cap sync` installs plugin pods (iOS) and copies plugin code (Android). Permissions must be configured in native project files before plugin use.

6. **PWA conversion** — Capacitor apps are PWAs by default. The same web code works as a standalone PWA when served over HTTPS. Add a `manifest.json` with icons, `service-worker.js` for caching. Capacitor plugins gracefully degrade: check `Capacitor.isPluginAvailable('Camera')` before calling native APIs. PWA mode runs in the browser, not WebView. Use `@capacitor/filesystem` and `@capacitor/storage` as they have web fallbacks.

7. **Build and deploy pipeline** — `ionic build --prod` generates optimized web assets in `www/`. `npx cap copy` copies to native platforms, `npx cap sync` also installs native dependencies. Code signing: iOS via Xcode Automatic signing (requires Apple Developer account), Android via keystore (`keytool -genkey` then `./gradlew bundleRelease`). Distribution: App Store Connect (iOS) via Xcode Organizer or Transporter, Google Play Console (Android) via signed AAB upload. Appflow and EAS Build for cloud CI/CD.

8. **Custom plugin development** — When an official plugin does not exist, create a custom plugin. Structure: `npx cap plugin:generate my-plugin` scaffolds the plugin template. The generated plugin has `src/definitions.ts` (TypeScript interface), `src/web.ts` (web fallback), `ios/Plugin/Plugin.swift` (iOS native), `android/src/main/.../Plugin.kt` (Android native). Implement `@objc` annotated methods on iOS and `@PluginMethod` annotated methods on Android. Return data via `call.resolve()` and errors via `call.reject()`. Test the plugin in a sample Ionic app before publishing.

9. **Deep linking and universal links** — Configure deep links to open the app from URLs. iOS: configure `apple-app-site-association` file on your server, add associated domain in Xcode, handle in AppDelegate. Android: configure intent filters in `AndroidManifest.xml` for URL scheme. Capacitor's `App.addListener('appUrlOpen')` catches incoming URLs in the web layer. Map URL paths to navigation routes. Test with `xcrun simctl openurl` for iOS and `adb shell am start` for Android.

10. **Push notifications** — Set up push notifications via `@capacitor/push-notifications`. iOS: configure APNs certificate in Apple Developer Portal, add Push Notifications capability in Xcode. Android: set up Firebase Cloud Messaging, upload server key to Firebase Console. Register for notifications: `PushNotifications.requestPermissions()` then `PushNotifications.register()`. Handle foreground notifications with `PushNotifications.addListener('pushNotificationReceived')`. Handle background tap actions with `PushNotifications.addListener('pushNotificationActionPerformed')`. Test with `curl` to APNs/FCM endpoints or use Pusher/PushCompanion tools.

## Platform Compatibility

| Feature | iOS | Android | Web/PWA |
|---------|-----|---------|---------|
| Core UI components | Full | Full | Full |
| Native plugins | All | All | Graceful fallback |
| Push notifications | APNs | FCM | Not supported |
| Background mode | Limited | Yes | Not supported |
| Live reload | Yes | Yes | Dev only |
| HMR | Via server | Via server | Built-in |
| Camera access | Full | Full | Browser limited |
| Geolocation | Full | Full | Browser limited |
| Biometric auth | Face ID/Touch ID | Fingerprint/Biometric | Not supported |
| File system | Full | Full | Sandboxed |

## Best Practices

- Use `ion-` components exclusively — avoid mixing with platform-specific UI
- Commit `ios/` and `android/` directories to version control
- Test on real devices before each release — simulator misses camera, sensors, push
- Use `npx cap sync` after every npm dependency change — not just `npx cap copy`
- Configure all permission strings in Info.plist and AndroidManifest before plugin calls
- Keep `capacitor.config.ts` environment-aware: different `server.url` for dev/prod
- Use TypeScript strict mode for plugin call type safety
- Profile WebView performance: 60fps animations, avoid layout thrashing, lazy-load images
- Use `ion-content` scroll assistance with keyboard plugin to handle keyboard overlap
- Set `SplashScreen.backgroundColor` to match app background color to prevent white flash
- Abstract plugin calls behind service interfaces for testability
- Check `Capacitor.isPluginAvailable()` before calling any plugin method in web context
- Use `Capacitor.convertFileSrc()` for filesystem paths to ensure correct URL scheme
- Implement error boundaries around plugin calls to handle native failures gracefully

## Common Pitfalls

- **Missing permissions**: Plugin fails silently with no error. Always check Info.plist and AndroidManifest.
- **Stale native project**: `npx cap sync` must run after every plugin install or npm update.
- **CORS in WebView**: Capacitor WebView has no CORS restrictions — but PWA mode does. Use `@capacitor/http` for production API calls.
- **Keyboard overlay**: Use `@capacitor/keyboard` with `ion-content` scroll assistance to handle keyboard show/hide.
- **Splash screen flicker**: Configure `backgroundColor` in `capacitor.config.ts` to match splash color — prevents white flash.
- **Plugin call timeout**: Heavy native operations (image processing) may exceed default timeout. Use `call.resolve()` in async callback.
- **Navigation state loss**: When the app is backgrounded and killed, WebView state is lost. Persist critical state to storage.
- **Memory pressure on low-end devices**: WebView on Android devices with 2GB RAM may crash under memory pressure. Monitor with `window.performance.memory`.
- **SSL certificate issues**: Self-signed certs for dev servers require `server.cleartext: true` — never ship this to production apps.
- **Icons and splash screen not updating**: Clear build cache between icon/splash updates. Use `npx capacitor-assets generate` for consistent asset generation.

## Compared With

| Approach | Use Case | Tradeoff |
|----------|----------|----------|
| Ionic + Capacitor | Hybrid apps, web-to-mobile migration | WebView performance ceiling, native API gap |
| React Native | Near-native perf, large ecosystem | Separate RN component lib, thicker bridge |
| Flutter | High-performance cross-platform | Dart language, custom rendering engine |
| Kotlin Multiplatform | Native UI, shared logic | Two UI codebases, less mature |
| MAUI (.NET) | .NET ecosystem, enterprise | Windows-focused, smaller mobile community |
| Pure PWA | No app store, instant updates | Limited device API access, no push on iOS |
| Native (Swift/Kotlin) | Full platform access | Two codebases, higher maintenance cost |

## Performance

- WebView startup: 200-600ms on modern devices depending on OS version and hardware
- Ionic component rendering: ion-* components use Shadow DOM for style isolation — adds ~50-100ms initial render per component tree
- Navigation transitions: Ionic uses GPU-accelerated CSS animations — target 60fps, avoid layout-triggering property animations (top, left, width, height)
- Image-heavy lists: use `ion-img` with lazy loading (Intersection Observer-based) instead of `<img>` tags
- Plugin call latency: each JS-to-native plugin call adds 5-15ms round-trip overhead. Batch related native calls into a single plugin method
- Memory: WebView on Android is a separate process with ~100-200MB default heap. Monitor with `window.performance.memory`
- Bundle size: Ionic core components ~2MB gzipped — use `@ionic/core` tree-shaking with Vite or webpack
- Scrolling: `ion-content` uses native scrolling on iOS and synthetic scrolling on Android — virtual scrolling (`ion-virtual-scroll`) for lists over 100 items
- Startup optimization: lazy-load routes with framework-specific patterns, defer heavy plugin initialization to after first meaningful paint

## Tooling

| Tool | Category | Purpose |
|------|----------|---------|
| Ionic CLI | Project management | Start, build, serve, cap commands |
| Capacitor CLI | Native bridge management | Add platforms, sync, copy, open |
| Appflow | CI/CD | Cloud build, live deploy, package |
| EAS Build (Expo) | CI/CD alternative | Cloud builds for Capacitor apps |
| capacitor-assets | Asset generation | Auto-generate icons and splash screens |
| Portals (Ionic) | Micro-frontends | Embed web apps in native apps |
| Cordova Plugin Compat | Migration | Run Cordova plugins in Capacitor |
| Safari Web Inspector | Debugging | iOS WebView JS console, network, elements |
| Chrome DevTools | Debugging | Android WebView JS console, network, elements |
| xcodebuild / Gradle | Native build | Platform-specific compilation and signing |
| fastlane | Automation | Certificate management, beta deployment, screenshots |
| Maestro / Detox | E2E testing | Mobile UI testing for hybrid apps |

## Configuration Reference

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'MyApp',
  webDir: 'www',
  server: {
    url: process.env.NODE_ENV === 'development' ? 'http://192.168.1.100:8100' : undefined,
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: { contentInset: 'always' },
  android: { allowMixedContent: true },
};
export default config;
```

## Rules

- `ios/` and `android/` directories must be committed to version control — they are the source of truth for native configuration
- All permission strings must be configured in native project files before plugin usage — silent failures are not acceptable
- `npx cap sync` must be run after every npm dependency change — not just `npx cap copy`
- Plugin calls must be guarded with `Capacitor.isPluginAvailable()` when the app also runs as a PWA
- Custom plugins must implement both iOS (Swift) and Android (Kotlin) native layers plus a web fallback
- `server.url` in `capacitor.config.ts` must be set for development and removed for production builds
- Hardcoded URLs, API keys, or secrets must never appear in native project files or the web bundle
- App icons and splash screens must be regenerated with `npx capacitor-assets generate` — never manually resized
- Deep linking configuration must be tested on real devices, not just simulators
- The WebView content must be tested on minimum supported OS versions — WebView updates are OS-dependent on Android
- Push notification payloads must be handled both in foreground and background states
- Navigation state must be persisted across app restarts — WebView state is volatile
- All plugin calls should be wrapped in error handling — native failures must not crash the web layer
- Production builds must use `ionic build --prod` with optimizations enabled (ahead-of-time compilation, tree shaking)
- Bundle size must be monitored: Ionic core should be tree-shaken to exclude unused components

## Performance Optimization

### WebView Rendering Performance

The WebView is the bottleneck in Ionic apps. Optimize for 60fps scrolling and smooth animations:

- **Avoid layout thrashing**: Batch DOM reads and writes. Use `FastDom` or wrapper that schedules writes after reads. Measure with Chrome DevTools Performance tab — look for "Layout" events >10ms.
- **CSS containment**: `contain: layout style paint` on off-screen components prevents the browser from recalculating layout/style/paint for elements outside the viewport. Apply to static sidebars, headers, footers.
- **`ion-img` over `<img>`**: Ionic's image component uses IntersectionObserver for lazy loading — images outside viewport don't load. Set `--lazy-load-threshold` for pre-load buffer. Fallback: `loading="lazy"` attribute on native `<img>`.
- **Virtual scrolling**: `ion-virtual-scroll` renders only visible items + buffer. For lists >100 items, always use virtual scrolling. Configure `approxItemHeight` for smoother scroll. Replaced with `ion-list` + `virtual-scroll` in newer Ionic versions; consider `cdk-virtual-scroll-viewport` from Angular CDK for Angular projects.
- **Reduce DOM node count**: Target <1500 DOM nodes for good performance. Audit with Chrome DevTools Elements panel. Replace nested `<div>` chains with CSS Grid/Flexbox single-layer layouts. Use `ion-item` directly without wrapping in extra `<div>` elements.
- **WebView pool (Android)**: Android WebView instances consume ~100MB each. If the app opens secondary WebViews (for external links, in-app browsers), reuse the existing WebView instance or use Custom Tabs (Chrome custom tabs) instead.

### JavaScript Bundle Optimization

- **Tree-shaking**: Ionic components tree-shake with Vite by default — but only if you import from specific paths: `import { IonButton } from '@ionic/react'` instead of importing everything. Audit with `vite-plugin-inspect` or `webpack-bundle-analyzer`.
- **Lazy load routes**: Framework-specific lazy loading. Angular: `loadChildren: () => import('./orders/orders.module').then(m => m.OrdersModule)`. React: `React.lazy(() => import('./OrdersPage'))`. Vue: `() => import('./OrdersPage.vue')`.
- **Capacitor plugin tree-shaking**: Capacitor plugins register at build time; unused plugins don't add JS overhead. However, native SDKs (Android `build.gradle` dependencies, iOS Pods) always add binary size. Remove unused plugins from `package.json` and run `npx cap sync`.
- **Preload critical chunks**: Use `<link rel="modulepreload">` for the app shell and first-route modules. Reduces waterfall of module loading. Configure in `vite.config.ts` via `optimizeDeps.include`.

### Native Bridge Optimization

- **Batch native calls**: Each JS → native call costs 5-15ms round-trip. For bulk operations (reading 100 contacts), create a single plugin method that returns an array instead of 100 individual calls.
- **Capacitor `runOutsideAngular` (Ionic Angular)**: Plugin callbacks outside Angular's zone reduce change detection cycles. Wrap plugin calls:
  ```typescript
  import { NgZone } from '@angular/core';
  constructor(private zone: NgZone) {}
  async callPlugin() {
    const result = await this.zone.runOutsideAngular(() => Camera.getPhoto({...}));
    // Re-enter zone only for UI updates
  }
  ```
- **Event emitter debouncing**: Native-to-JS events (geolocation updates, sensor data) can flood the bridge. Debounce in native layer before emitting: `DispatchQueue.main.asyncAfter(deadline: .now() + 0.1)` in Swift, `Handler(Looper.getMainLooper()).postDelayed({}, 100)` in Kotlin.
- **Avoid synchronous plugin calls**: Capacitor doesn't support synchronous native calls. Use `async/await` everywhere. Never use `Capacitor.convertFileSrc()` synchronously — it's fine for path conversion but the underlying file may not be ready.
- **`@capacitor-community/native-audio` preloading**: For audio assets, preload in native layer during app initialization, trigger play with minimal JS overhead. Audio files in WebView have ~200ms startup latency; native playback is near-instant.

### Memory and Caching

- **`@capacitor/filesystem` cache directory**: Use `Directory.Cache` for temporary files, `Directory.Data` for persistent app data. Clear cache on app version upgrade. Monitor with `window.performance.memory?.usedJSHeapSize`.
- **Service worker caching**: For PWA mode, use Workbox or custom service worker with stale-while-revalidate strategy for API responses. Cache-first for static assets. Limit cache to 50MB (PWA storage quota varies by browser).
- **Image cache**: Use `@capacitor/cache` or native image loading libraries (SDWebImage for iOS, Glide for Android) via custom plugin for production apps. WebView image cache is limited and cleared frequently.
- **`ion-content` scroll events**: Scroll event listeners fire at 60fps — throttle to 100-200ms for non-critical work (lazy loading, analytics). Use `requestAnimationFrame` for visual updates, `setTimeout` for data operations.

## Production Build & App Store Deployment

### Android Play Store

1. **Build signed AAB**: `ionic build --prod && npx cap sync android && cd android && ./gradlew bundleRelease`
2. **Signing**: Configure `android/app/build.gradle` signing configs:
   ```groovy
   android {
       signingConfigs {
           release {
               storeFile file(System.getenv("KEYSTORE_PATH"))
               storePassword System.getenv("KEYSTORE_PASS")
               keyAlias System.getenv("KEY_ALIAS")
               keyPassword System.getenv("KEY_PASS")
           }
       }
       buildTypes {
           release { signingConfig signingConfigs.release }
       }
   }
   ```
3. **Play Console**: Upload AAB → Set up Store Listing (screenshots, description, category) → Content Rating → Pricing & Distribution → Rollout to Internal Testing → Closed Alpha → Open Beta → Production.
4. **App signing by Google Play**: Enroll in Play App Signing. Google manages the signing key; you upload an upload key. If you lose the upload key, Google can reset it.

### iOS App Store

1. **Build IPA**: `ionic build --prod && npx cap sync ios && cd ios && xcodebuild -workspace App.xcworkspace -scheme App -archivePath App.xcarchive archive`
2. **Code signing**: Automatic signing in Xcode (requires Apple Developer account). For CI, use `fastlane match` to manage certificates and provisioning profiles across machines.
3. **App Store Connect**: Create app record → Upload IPA via Transporter or Xcode Organizer → Fill out metadata (name, description, keywords, privacy URL) → Submit for Review.
4. **TestFlight**: Enable in App Store Connect → Add testers (up to 100 internal, 10,000 external) → Build must pass basic review before external testing. Beta builds expire after 90 days.

### Fastlane Automation
```ruby
# fastlane/Fastfile
lane :deploy_ios do
  match(type: "appstore")  # sync certificates
  build_ios_app(scheme: "App")
  upload_to_app_store(skip_metadata: true, skip_screenshots: true)
end

lane :deploy_android do
  gradle(task: "bundleRelease")
  upload_to_play_store(track: "internal")
end
```

### Environment Configuration
- **capacitor.config.ts**: Use environment variables for `server.url` (live reload) vs production. Never ship production build with `server.url` set — it weakens security by allowing external content loading.
- **Environment flags**: Inject build-time variables via Vite or Angular environment files:
  ```typescript
  // src/environments/environment.prod.ts
  export const environment = {
    production: true,
    apiUrl: 'https://api.example.com',
    appVersion: '1.2.3',
  };
  ```
- **Runtime config**: Load config from a remote endpoint on app startup for feature flags and endpoint URLs without app store submission. Cache in storage, refresh on app foreground.

## Custom Plugin Code Examples

### iOS (Swift) — Background Geolocation Plugin
```swift
@objc(BackgroundGeolocation)
class BackgroundGeolocation: CAPPlugin {
    private var locationManager = CLLocationManager()

    @objc func startTracking(_ call: CAPPluginCall) {
        locationManager.delegate = self
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.startUpdatingLocation()
        call.resolve()
    }

    @objc func stopTracking(_ call: CAPPluginCall) {
        locationManager.stopUpdatingLocation()
        call.resolve()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        notifyListeners("locationUpdate", data: [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy
        ])
    }
}
```

### Android (Kotlin) — Same Plugin
```kotlin
@CapacitorPlugin(name = "BackgroundGeolocation")
class BackgroundGeolocation : CAPPlugin() {
    private val locationManager by lazy {
        activity?.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    }

    @PluginMethod
    fun startTracking(call: PluginCall) {
        if (ActivityCompat.checkSelfPermission(
                activity, Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            call.reject("Location permission not granted")
            return
        }
        locationManager?.requestLocationUpdates(
            LocationManager.GPS_PROVIDER, 5000L, 10f,
            object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    notifyListeners("locationUpdate", JSObject().apply {
                        put("latitude", location.latitude)
                        put("longitude", location.longitude)
                        put("accuracy", location.accuracy)
                    })
                }
            }
        )
        call.resolve()
    }

    @PluginMethod
    fun stopTracking(call: PluginCall) {
        locationManager?.removeUpdates(this)
        call.resolve()
    }
}
```

### Web Fallback
```typescript
// src/web.ts
import { WebPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from './definitions';

export class BackgroundGeolocationWeb
  extends WebPlugin
  implements BackgroundGeolocationPlugin
{
  async startTracking(): Promise<void> {
    console.warn('BackgroundGeolocation not available on web');
    // Fallback: use browser Geolocation API
    navigator.geolocation.watchPosition(
      (pos) => this.notifyListeners('locationUpdate', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async stopTracking(): Promise<void> {
    // cleanup
  }
}
```

### Plugin Testing
- **Unit tests**: Test plugin TypeScript API definitions with standard Jest/Vitest — pure interface testing.
- **Native tests**: Android: JUnit + Mockito for plugin methods. iOS: XCTest with `CAPPluginCall` mock.
- **E2E**: Maestro or Detox — test plugin calls from the web layer verify native behavior. Run on real devices for hardware-dependent plugins (camera, geolocation, biometrics).

## References
  - references/capacitor-plugins.md — Capacitor Plugins
  - references/ionic-capacitor-advanced.md — Ionic Capacitor Advanced Topics
  - references/ionic-capacitor-fundamentals.md — Ionic Capacitor Fundamentals
  - references/ionic-capacitor-plugins.md — Ionic Capacitor Plugins
  - references/ionic-cli.md — Ionic CLI Reference
  - references/ionic-deployment.md — Ionic Deployment
  - references/ionic-capacitor-plugins.md — Ionic Capacitor Plugins Reference
  - references/ionic-capacitor-performance.md — Ionic Capacitor Performance Optimization
## Handoff
Hand off to native iOS/Android skills when custom plugin development needs deep platform API access beyond Capacitor's bridge.
