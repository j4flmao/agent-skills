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
version: "1.0.0"
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
- App deploys to TestFlight and Play Store internal track

### Max Response Length
8000 tokens

## Workflow

1. **Ionic framework overview** — Ionic is a UI toolkit for building cross-platform mobile apps using web technologies (HTML, CSS, JS). It provides a library of mobile-optimized UI components (`ion-*`), gestures, and animations that mimic native platform conventions. Three framework integrations: Ionic React (hooks, fast iteration, largest ecosystem), Ionic Angular (NgModule + standalone, mature routing, full-featured), Ionic Vue (composition API, lightweight, growing ecosystem). All share `@ionic/core` components and CSS custom properties theming.

2. **Capacitor vs Cordova** — Capacitor is the successor to Cordova with key advantages: modern plugin API (Promise-based instead of callback), native project files committed to repo (full Xcode/Android Studio control), Swift/Kotlin plugin development (instead of Java/Obj-C), HMR support during development, PWA fallback for web, and unified config (`capacitor.config.ts`). Cordova plugins are compatible via `@capacitor/cordova-plugin-compat`. Migration path: `npx cap init` on existing Cordova project, then replace `cordova plugin add` with `npm install @capacitor/plugin-name`.

3. **Project creation** — `ionic start myApp blank --type=react-ts` creates an Ionic React TypeScript project with Capacitor pre-configured. Key files: `capacitor.config.ts` (app ID, name, server URL for live reload), `ionic.config.json` (project type, integrations), `src/` (web app code), `ios/` (Xcode project after `npx cap add ios`), `android/` (Android Studio project after `npx cap add android`). The web app is the single source of truth — native projects are generated artifacts.

4. **Live reload development** — `ionic serve` for web-only HMR. For device live reload: `ionic cap run ios -l --external` starts a dev server with your machine's IP, updates `capacitor.config.ts` with `server.url`, then opens Xcode. The device loads web assets from the dev server over the network. Hot Module Replacement preserves component state. For Android: `ionic cap run android -l --external`. Requires device on same network as dev machine. Disable `server.url` for production builds.

5. **Capacitor plugin system** — Plugins are npm packages that expose native APIs to JavaScript. Architecture: TypeScript API definition (`@capacitor/plugin-name`) → iOS implementation (Swift, `CAPPlugin` subclass) → Android implementation (Kotlin, `CAPPlugin` subclass) → optional web fallback. Plugin calls are serialized via JSON through the WebView bridge. `npx cap sync` installs plugin pods (iOS) and copies plugin code (Android). Permissions must be configured in native project files before plugin use.

6. **PWA conversion** — Capacitor apps are PWAs by default. The same web code works as a standalone PWA when served over HTTPS. Add a `manifest.json` with icons, `service-worker.js` for caching. Capacitor plugins gracefully degrade: check `Capacitor.isPluginAvailable('Camera')` before calling native APIs. PWA mode runs in the browser, not WebView. Use `@capacitor/filesystem` and `@capacitor/storage` as they have web fallbacks.

7. **Build & deploy pipeline** — `ionic build --prod` generates optimized web assets in `www/`. `npx cap copy` copies to native platforms, `npx cap sync` also installs native dependencies. Code signing: iOS via Xcode Automatic signing (requires Apple Developer account), Android via keystore (`keytool -genkey` then `./gradlew bundleRelease`). Distribution: App Store Connect (iOS) via Xcode Organizer or Transporter, Google Play Console (Android) via signed AAB upload. Appflow and EAS Build for cloud CI/CD.

## Platform Compatibility

| Feature | iOS | Android | Web/PWA |
|---------|-----|---------|---------|
| Core UI components | Full | Full | Full |
| Native plugins | All | All | Graceful fallback |
| Push notifications | APNs | FCM | Not supported |
| Background mode | Limited | Yes | Not supported |
| Live reload | Yes | Yes | Dev only |
| HMR | Via server | Via server | Built-in |

## Best Practices

- Use `ion-` components exclusively — avoid mixing with platform-specific UI
- Commit `ios/` and `android/` directories to version control
- Test on real devices before each release — simulator misses camera, sensors, push
- Use `npx cap sync` after every npm dependency change — not just `npx cap copy`
- Configure all permission strings in Info.plist and AndroidManifest before plugin calls
- Keep `capacitor.config.ts` environment-aware: different `server.url` for dev/prod
- Use TypeScript strict mode for plugin call type safety
- Profile WebView performance: 60fps animations, avoid layout thrashing, lazy-load images

## Common Pitfalls

- **Missing permissions**: Plugin fails silently with no error. Always check Info.plist and AndroidManifest.
- **Stale native project**: `npx cap sync` must run after every plugin install or npm update.
- **CORS in WebView**: Capacitor WebView has no CORS restrictions — but PWA mode does. Use `@capacitor/http` for production API calls.
- **Keyboard overlay**: Use `@capacitor/keyboard` with `ion-content` scroll assistance to handle keyboard show/hide.
- **Splash screen flicker**: Configure `backgroundColor` in `capacitor.config.ts` to match splash color — prevents white flash.
- **Plugin call timeout**: Heavy native operations (image processing) may exceed default timeout. Use `call.resolve()` in async callback.

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

## References
- `references/capacitor-plugins.md` — Capacitor Plugins
- `references/ionic-capacitor-plugins.md` — Ionic Capacitor Plugins
- `references/ionic-cli.md` — Ionic Cli
- `references/ionic-deployment.md` — Ionic Deployment

## Handoff
Hand off to native iOS/Android skills when custom plugin development needs deep platform API access beyond Capacitor's bridge.
