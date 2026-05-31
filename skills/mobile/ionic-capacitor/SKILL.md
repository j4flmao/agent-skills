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
