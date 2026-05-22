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

1. **Hybrid architecture** — Web view renders UI. Capacitor bridge exposes native APIs via plugin system. @capacitor/core provides common APIs (Storage, App, Device). HMR during `ionic serve`, full native builds via Cap CLI.

2. **UI framework selection** — Ionic React (fastest adoption for React devs), Ionic Angular (mature, full-featured), Ionic Vue (lightweight). All share @ionic/core components and theming via CSS custom properties.

3. **Native plugins** — Camera, Geolocation, Push Notifications, Filesystem, Storage, Share, Device installed via `npm install @capacitor/plugin-name`. Run `npx cap sync` after each install. Configure permissions in Info.plist and AndroidManifest.xml.

4. **Custom plugin development** — Create Capacitor plugin with Swift (iOS) and Kotlin (Android). Use `CAP_PLUGIN` macro, `CAPPluginCall` for data flow. Register in `+load`/ `init` blocks. Return results via `call.resolve()` / `call.reject()`.

5. **Build & deploy** — `ionic build` produces web build. `npx cap copy` copies to native platforms. `npx cap open ios/android` opens Xcode/ Android Studio. Code signing via Xcode Automatic/ Android keystore. Submit to App Store Connect and Google Play Console.

## Rules

- Web code runs on device, not a remote server.
- Capacitor plugins are the only path to native APIs.
- iOS and Android project files (ios/, android/) are committed.
- Custom plugins serialize all data via CAPPluginCall — no direct native-to-web references.
- Component library matches platform: ion- components for both iOS and Android.
- Permission strings must exist in Info.plist and AndroidManifest before using plugins.
- Every npm dependency change requires `npx cap sync`.

## References

- `references/capacitor-plugins.md` — Native APIs, custom plugins, permissions, configuration
- `references/ionic-deployment.md` — Build, sync, code signing, store submission

## Handoff
Hand off to native iOS/Android skills when custom plugin development needs deep platform API access beyond Capacitor's bridge.
