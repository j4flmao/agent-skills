# Ionic & Capacitor Fundamentals

## Overview
Ionic is a hybrid mobile framework using web technologies (HTML, CSS, JavaScript/TypeScript) wrapped in a native WebView. Capacitor is the modern native bridge that provides access to device APIs. Ionic apps run on iOS, Android, and the web with shared code.

## Core Concepts

### WebView Rendering
Ionic apps render in a WebView (WKWebView on iOS, Android WebView). UI is built with web components — not native UI controls. Styling with standard CSS. Performance bound by WebView capabilities. Can be enhanced with native UI when needed.

### Capacitor Plugins
Capacitor provides a plugin system for native API access. Official plugins: Camera, Geolocation, Filesystem, Push Notifications, Storage, Network. Community plugins extend functionality. Custom plugins for app-specific native features. Import from `@capacitor/*` packages.

### Ionic Components
Library of pre-built UI components (`ion-button`, `ion-card`, `ion-list`, `ion-modal`). Components are web components (custom elements) built with Stencil compiler. Styled with CSS custom properties for theming. Responsive across mobile and tablet. Accessible by default.

### Angular, React, Vue
Ionic supports framework integrations: @ionic/angular, @ionic/react, @ionic/vue. Use your preferred framework for app logic. Ionic CLI generates framework-specific projects. Same Ionic components, different framework wrappers. Navigation uses framework router integration.

## Architecture Patterns

### Single Page Application (SPA)
Ionic apps are SPAs — one HTML page, client-side routing. Navigation stack managed by framework router (Angular Router, React Router, Vue Router). Page transitions use Ionic's built-in animation system. Stack navigation for native-like back button behavior.

### Portals (Web to Native)
Ionic Portals embeds web content in native apps. Create a Portal (web app URL or local build) and display in native ViewController. Two-way communication via Portals API. Micro-frontend architecture for hybrid teams. Use for gradual migration from web to native.

### Offline-First with Capacitor
Capacitor Storage for key-value persistence. SQLite via `@capacitor-community/sqlite`. Network detection with `@capacitor/network`. Cache API responses using CacheStorage. Sync when online via background tasks. Ionic's native-like UX even offline.

## Data Management

### Capacitor Preferences
Simple key-value storage for app settings. Async API, platform-backed (UserDefaults on iOS, SharedPreferences on Android). `Preferences.set({ key, value })` / `Preferences.get({ key })`. Not encrypted — use secure storage for sensitive data. Max capacity: platform-dependent (~6MB on Android).

### SQLite for Complex Data
`@capacitor-community/sqlite` provides full SQLite access. Create/query/update databases from JavaScript. Supports migrations and prepared statements. Better than Preferences for structured data. Use `typeorm` or custom query builder for ORM.

### Filesystem
`@capacitor/filesystem` for reading/writing files. Directories: `Documents`, `Cache`, `Data`, `External`. `Filesystem.writeFile({ path, data, directory })`. Read with `Filesystem.readFile()`. Cache directory auto-cleared by OS.

## Security Fundamentals

### HTTPS Requirement
All network requests must be HTTPS. Configure `allowNavigation` in `capacitor.config.json` for allowed hosts. Content Security Policy (CSP) headers. Disable cleartext traffic on Android via network security config. ATS blocks cleartext on iOS.

### Secure Storage
`@capacitor/preferences` wraps UserDefaults/SharedPreferences — not encrypted. Use `@aparajita/capacitor-secure-storage` for iOS Keychain and Android EncryptedSharedPrefs. Store tokens, keys, and PII in secure storage. Never log sensitive values.

### SSL Pinning
Capacitor supports SSL pinning via `capacitor-ssl-pinning` plugin or network security config (Android). Pin SHA-256 hash of public key. Include backup pins for rotation. Test by proxying through mitmproxy.

## Build & Dependency Management

### Ionic CLI
`ionic start` for project creation. `ionic serve` for web-based development. `ionic build` for production web build. `ionic cap add ios/android` for native project generation. `ionic cap sync` to copy web build to native project. `ionic cap open ios` to open Xcode.

### Capacitor Configuration
`capacitor.config.json` configures app name, bundle ID, server URL. `webDir` points to built web assets. `server.url` for live reload during development. `plugins` section for plugin-specific configuration. `android`/`ios` sections for platform overrides.

### E2E Testing
Cypress or Playwright for web-based testing (most logic in web). Detox for native E2E on real devices/emulators. Appium for cross-platform automated UI testing. Test WebView behavior on both iOS and Android. Focus on native bridge interactions.

## Key Points
- WebView-based (WKWebView on iOS, Android WebView)
- Capacitor provides native plugin bridge (not Cordova)
- Framework-agnostic: Angular, React, Vue supported
- Ionic components are web components (Stencil-based)
- @capacitor/preferences for simple key-value storage
- @capacitor-community/sqlite for complex relational data
- HTTPS required; configure allowNavigation for internal hosts
- Secure storage plugin for Keychain/EncryptedSharedPrefs support
- `ionic cap sync` propagates web changes to native projects
- Portals for embedding web in native micro-frontends
