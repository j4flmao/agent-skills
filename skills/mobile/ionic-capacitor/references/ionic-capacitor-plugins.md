# Ionic Capacitor Plugins Reference

## Overview

Capacitor plugins provide the native bridge between JavaScript/TypeScript code and platform-specific APIs on iOS and Android. This reference covers plugin architecture, the official plugin catalog, community plugins, Cordova compatibility, custom plugin development, and advanced plugin patterns.

## Plugin Architecture

### Communication Model

```
JavaScript (TypeScript API)
        │
        ▼  JSON serialization
┌───────────────┐
│ Capacitor     │
│ Bridge        │
│ (WebView)     │
└───────┬───────┘
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ iOS Plugin   │  │ Android      │  │ Web Fallback │
│ (Swift)      │  │ Plugin (Kot) │  │ (TypeScript) │
│ CAPPlugin    │  │ CAPPlugin    │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Plugin File Structure

```
my-capacitor-plugin/
├── package.json
├── CapacitorPlugin.podspec          # CocoaPods spec for iOS
├── src/
│   ├── index.ts                      # Plugin registration (CapacitorPlugin.register)
│   ├── definitions.ts                # TypeScript interfaces for plugin API
│   └── web.ts                        # Web fallback implementation
├── ios/
│   ├── Plugin/
│   │   └── MyPlugin.swift            # iOS native implementation
│   └── Plugin.xcodeproj              # iOS project file
├── android/
│   └── src/main/
│       └── java/.../
│           └── MyPlugin.kt           # Android native implementation
└── README.md
```

### Plugin Class (TypeScript Definitions)

```typescript
// src/definitions.ts
export interface MyPluginPlugin {
    echo(options: { value: string }): Promise<{ value: string }>;
    getDeviceInfo(): Promise<DeviceInfoResult>;
    startListener(callback: (event: SensorEvent) => void): Promise<void>;
    stopListener(): Promise<void>;
}

export interface DeviceInfoResult {
    model: string;
    osVersion: string;
    appVersion: string;
    batteryLevel: number;
}

export interface SensorEvent {
    x: number;
    y: number;
    z: number;
    timestamp: number;
}
```

### Plugin Registration

```typescript
// src/index.ts
import { registerPlugin } from '@capacitor/core';
import type { MyPluginPlugin } from './definitions';

const MyPlugin = registerPlugin<MyPluginPlugin>('MyPlugin', {
    web: () => import('./web').then(m => new m.MyPluginWeb()),
});

export * from './definitions';
export { MyPlugin };
```

## Official Plugins Catalog

### Core Capacitor Plugins

```yaml
@capacitor/action-sheet:
  description: "Native action sheets for confirmation dialogs"
  api: ["showActions()", "showAlert()"]
  ios: "UIAlertController"
  android: "AlertDialog.Builder"
  permissions: "None"

@capacitor/app:
  description: "App lifecycle events and information"
  api: ["getInfo()", "getState()", "exitApp()", "addListener('appUrlOpen')"]
  events: ["appUrlOpen", "appStateChange", "restoredResult"]
  permissions: "None"

@capacitor/browser:
  description: "Open URLs in the system browser or in-app browser tab"
  api: ["open()", "close()", "prefetch()"]
  ios: "SFSafariViewController"
  android: "Chrome Custom Tabs"
  permissions: "None"

@capacitor/camera:
  description: "Take photos or pick from gallery"
  api: ["getPhoto()"]
  config: ["resultType (base64 | uri)", "source (camera | photos | prompt)", "quality (0-100)"]
  ios_permissions: "NSCameraUsageDescription, NSPhotoLibraryUsageDescription"
  android_permissions: "CAMERA, READ_EXTERNAL_STORAGE"

@capacitor/clipboard:
  description: "Read and write to the system clipboard"
  api: ["read()", "write()"]
  ios: "UIPasteboard"
  android: "ClipboardManager"
  permissions: "None (iOS 14+ shows paste confirmation)"

@capacitor/device:
  description: "Device information (model, OS, battery, language)"
  api: ["getId()", "getInfo()", "getBatteryInfo()", "getLanguageCode()"]
  permissions: "None"

@capacitor/dialog:
  description: "Native dialog boxes (alert, confirm, prompt)"
  api: ["alert()", "confirm()", "prompt()"]
  ios: "UIAlertController"
  android: "AlertDialog"
  permissions: "None"

@capacitor/filesystem:
  description: "Read, write, and delete files in the device filesystem"
  api: ["readFile()", "writeFile()", "appendFile()", "deleteFile()", "mkdir()", "rmdir()", "readdir()", "stat()", "getUri()"]
  directories: ["Documents", "Data", "Library", "Cache", "External", "ExternalStorage"]
  permissions: "None (sandboxed), READ_EXTERNAL_STORAGE (external directories)"

@capacitor/geolocation:
  description: "Device location services"
  api: ["getCurrentPosition()", "watchPosition()", "clearWatch()"]
  ios_permissions: "NSLocationWhenInUseUsageDescription"
  android_permissions: "ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION"
  config: ["accuracy (high | medium | low)", "timeout", "maximumAge"]

@capacitor/haptics:
  description: "Haptic feedback (vibration)"
  api: ["impact()", "notification()", "selectionStart()", "selectionChanged()", "selectionEnd()", "vibrate()"]
  ios: "UIImpactFeedbackGenerator, UINotificationFeedbackGenerator"
  android: "VibrationEffect"
  permissions: "VIBRATE (Android)"

@capacitor/keyboard:
  description: "Keyboard show/hide events and configuration"
  api: ["show()", "hide()", "setAccessoryBarVisible()", "setScroll()", "setResizeMode()"]
  events: ["keyboardWillShow", "keyboardDidShow", "keyboardWillHide", "keyboardDidHide"]
  config: ["resize (native | body | ionic | none)", "style (dark | light)"]

@capacitor/local-notifications:
  description: "Schedule and display local notifications"
  api: ["schedule()", "cancel()", "getPending()", "getDelivered()", "registerActionTypes()"]
  events: ["localNotificationReceived", "localNotificationActionPerformed"]
  permissions: "POST_NOTIFICATIONS (Android 13+)"

@capacitor/motion:
  description: "Device accelerometer and orientation data"
  api: ["addListener('accel')", "addListener('orientation')"]
  ios: "CMMotionManager"
  android: "SensorManager"
  permissions: "None"

@capacitor/network:
  description: "Network connectivity status monitoring"
  api: ["getStatus()", "addListener('networkStatusChange')"]
  events: ["networkStatusChange"]
  permissions: "ACCESS_NETWORK_STATE (Android)"

@capacitor/preferences:
  description: "Key-value storage (successor to @capacitor/storage)"
  api: ["get()", "set()", "remove()", "clear()", "keys()", "migrate()"]
  ios: "UserDefaults"
  android: "SharedPreferences"
  permissions: "None"

@capacitor/push-notifications:
  description: "Push notification registration and handling"
  api: ["register()", "unregister()", "getDeliveredNotifications()", "removeAllDeliveredNotifications()", "removeDeliveredNotifications()", "createChannel()", "deleteChannel()", "listChannels()", "checkPermissions()", "requestPermissions()"]
  events: ["registration", "registrationError", "pushNotificationReceived", "pushNotificationActionPerformed"]
  ios_permissions: "Push Notifications capability"
  android_permissions: "POST_NOTIFICATIONS (Android 13+)"
  ios_setup: "APNs certificate or key in Apple Developer Portal"
  android_setup: "Firebase Cloud Messaging configuration"

@capacitor/screen-orientation:
  description: "Lock and unlock screen orientation"
  api: ["orientation()", "lock()", "unlock()"]
  ios: "UIDevice.current.setValue"
  android: "Activity.setRequestedOrientation"
  permissions: "None"

@capacitor/screen-reader:
  description: "Screen reader (VoiceOver, TalkBack) status and events"
  api: ["isEnabled()", "speak()", "addListener('stateChange')"]
  events: ["stateChange"]
  permissions: "None"

@capacitor/share:
  description: "Native share sheet"
  api: ["share()"]
  ios: "UIActivityViewController"
  android: "Intent.ACTION_SEND"
  permissions: "None"

@capacitor/splash-screen:
  description: "Show and hide the splash screen"
  api: ["show()", "hide()"]
  config: ["launchShowDuration", "launchAutoHide", "backgroundColor", "androidSplashResourceName", "androidScaleType", "showSpinner", "spinnerStyle", "spinnerColor"]
  permissions: "None"

@capacitor/status-bar:
  description: "Status bar style and visibility"
  api: ["setStyle()", "setBackgroundColor()", "show()", "hide()", "getInfo()", "setOverlaysWebView()"]
  ios: "UIStatusBarManager"
  android: "WindowInsetsController"
  permissions: "None"

@capacitor/text-zoom:
  description: "Text zoom level control"
  api: ["get()", "set()", "addListener('zoomChange')"]
  ios: "UIApplication.shared.preferredContentSizeCategory"
  android: "WebSettings.textZoom"
  permissions: "None"

@capacitor/toast:
  description: "Native toast notifications"
  api: ["show()"]
  ios: "No native toast, uses custom view"
  android: "Toast"
  permissions: "None"
```

## Community Plugins

```yaml
@capacitor-community/admob:
  description: "AdMob banner, interstitial, and rewarded ads"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "AdMob app ID in Info.plist and AndroidManifest"

@capacitor-community/background-geolocation:
  description: "Background location tracking"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "Background Modes > Location updates (iOS), FOREGROUND_SERVICE permission (Android)"

@capacitor-community/barcode-scanner:
  description: "Camera-based barcode and QR code scanning"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "Camera"

@capacitor-community/bluetooth-le:
  description: "Bluetooth Low Energy communication"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "Bluetooth (iOS), BLUETOOTH_SCAN, BLUETOOTH_CONNECT (Android)"

@capacitor-community/camera-preview:
  description: "Camera preview layer for custom camera UI"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "Camera"

@capacitor-community/facebook-login:
  description: "Facebook Login integration"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "Facebook App ID configuration, URL schemes"

@capacitor-community/firebase-analytics:
  description: "Firebase Analytics integration"
  platforms: "iOS, Android, Web"
  maintenance: "Active (community maintained)"
  setup: "GoogleService-Info.plist, google-services.json"

@capacitor-community/firebase-crashlytics:
  description: "Firebase Crashlytics crash reporting"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "Firebase project + Crashlytics SDK"

@capacitor-community/firebase-remote-config:
  description: "Firebase Remote Config for feature flags"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "Firebase project"

@capacitor-community/google-login:
  description: "Google Sign-In integration"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "GoogleService-Info.plist, OAuth client ID, reverse client ID URL scheme"

@capacitor-community/http:
  description: "Advanced HTTP client with cookie management"
  platforms: "iOS, Android, Web"
  maintenance: "Active"
  note: "Alternative to fetch/axios with better cookie handling"

@capacitor-community/keep-awake:
  description: "Prevent device screen from sleeping"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "WAKE_LOCK (Android)"

@capacitor-community/media:
  description: "Camera roll access for photos and videos"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "Photo Library"

@capacitor-community/native-audio:
  description: "Native audio playback with background support"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "Background audio mode"

@capacitor-community/native-market:
  description: "Open app store listings for rating/review"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "Apple App ID, Google Play package name"

@capacitor-community/privacy-screen:
  description: "Prevent app content from appearing in app switcher"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "None"

@capacitor-community/screen-brightness:
  description: "Control device screen brightness"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "None"

@capacitor-community/sqlite:
  description: "Native SQLite database with encryption support"
  platforms: "iOS, Android, Web"
  maintenance: "Active"
  features: "Full SQLite support, SQLCipher encryption, JSON1 extension"

@capacitor-community/stripe:
  description: "Stripe payment processing"
  platforms: "iOS, Android"
  maintenance: "Active"
  setup: "Stripe publishable key, URL scheme for payment callback"

@capacitor-community/spotify:
  description: "Spotify SDK integration (premium playback)"
  platforms: "iOS, Android"
  maintenance: "Maintained"
  setup: "Spotify Developer account, redirect URI"

@capacitor-community/text-to-speech:
  description: "Text-to-speech with voice selection"
  platforms: "iOS, Android"
  maintenance: "Active"
  permissions: "None"

@capacitor-community/video-player:
  description: "Full-featured video player"
  platforms: "iOS, Android"
  maintenance: "Active"
  features: "Fullscreen, subtitles, playback speed, background audio"
```

## Plugin Installation and Configuration

### Installation Process

```bash
# 1. Install the plugin package
npm install @capacitor/camera

# 2. Sync native project files — this installs CocoaPods and copies plugin source
npx cap sync

# 3. Configure permissions (iOS: Info.plist, Android: AndroidManifest.xml)
# iOS: Add NSCameraUsageDescription key
# Android: Camera permission is auto-added by the plugin

# 4. Use in your code
import { Camera } from '@capacitor/camera';

const photo = await Camera.getPhoto({
    quality: 90,
    resultType: 'uri',
    source: 'camera',
});
```

### Permission Configuration by Platform

```xml
<!-- iOS: Info.plist permissions -->
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to take profile photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app accesses your photo library to select profile images</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to show nearby stores</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app may access your microphone for voice recordings</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to nearby devices</string>
<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID to secure your account</string>
```

```xml
<!-- Android: AndroidManifest.xml permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### Runtime Permission Requests

```typescript
import { Camera } from '@capacitor/camera';

async function takePhoto() {
    // Check and request permission
    const permission = await Camera.checkPermissions();
    if (permission.camera === 'prompt') {
        const result = await Camera.requestPermissions();
        if (result.camera !== 'granted') {
            throw new Error('Camera permission denied');
        }
    }

    // Take photo
    const photo = await Camera.getPhoto({
        quality: 90,
        resultType: 'uri',
        source: 'camera',
    });
    return photo;
}
```

## Custom Plugin Development

### Generating a Custom Plugin

```bash
# Scaffold a new plugin
npx cap plugin:generate my-plugin

# This creates:
# src/definitions.ts    — TypeScript API
# src/web.ts            — Web fallback
# ios/Plugin/*.swift   — iOS native
# android/src/*.kt     — Android native
```

### iOS Plugin (Swift)

```swift
import Capacitor

@objc(MyPlugin)
public class MyPlugin: CAPPlugin {
    // Method called from JavaScript
    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve(["value": value])
    }

    @objc func getDeviceInfo(_ call: CAPPluginCall) {
        let device = UIDevice.current
        call.resolve([
            "model": device.model,
            "osVersion": device.systemVersion,
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "",
            "batteryLevel": device.batteryLevel >= 0 ? Int(device.batteryLevel * 100) : -1,
        ])
    }

    @objc func startListener(_ call: CAPPluginCall) {
        // Set up a native listener and emit events to JavaScript
        let callbackId = call.callbackId
        // ... start monitoring ...
        call.resolve()
    }

    // Emit event to JavaScript
    private func notifySensorEvent(x: Double, y: Double, z: Double) {
        notifyListeners("sensorEvent", data: [
            "x": x,
            "y": y,
            "z": z,
            "timestamp": Date().timeIntervalSince1970 * 1000,
        ])
    }
}
```

### Android Plugin (Kotlin)

```kotlin
package com.example.myplugin

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MyPlugin")
class MyPlugin : Plugin() {
    @PluginMethod
    fun echo(call: PluginCall) {
        val value = call.getString("value") ?: ""
        call.resolve(mapOf("value" to value))
    }

    @PluginMethod
    fun getDeviceInfo(call: PluginCall) {
        val info = mapOf(
            "model" to android.os.Build.MODEL,
            "osVersion" to android.os.Build.VERSION.RELEASE,
            "appVersion" to getAppVersion(),
            "batteryLevel" to getBatteryLevel(),
        )
        call.resolve(info)
    }

    @PluginMethod
    fun startListener(call: PluginCall) {
        call.resolve()
    }

    private fun getAppVersion(): String {
        return try {
            val pkg = context.packageManager.getPackageInfo(context.packageName, 0)
            pkg.versionName ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    private fun getBatteryLevel(): Int {
        val intent = context.registerReceiver(null, android.content.IntentFilter(
            android.content.Intent.ACTION_BATTERY_CHANGED
        ))
        if (intent != null) {
            val level = intent.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1)
            return if (level >= 0 && scale > 0) (level * 100 / scale) else -1
        }
        return -1
    }
}
```

### Web Fallback Implementation

```typescript
// src/web.ts
import { WebPlugin } from '@capacitor/core';
import type { MyPluginPlugin, DeviceInfoResult } from './definitions';

export class MyPluginWeb extends WebPlugin implements MyPluginPlugin {
    async echo(options: { value: string }): Promise<{ value: string }> {
        return { value: options.value };
    }

    async getDeviceInfo(): Promise<DeviceInfoResult> {
        // Provide reasonable defaults for web
        return {
            model: navigator.platform || 'unknown',
            osVersion: navigator.userAgent,
            appVersion: '1.0.0',
            batteryLevel: -1,  // Web Battery API not always available
        };
    }

    async startListener(): Promise<void> {
        // Web implementation or throw 'not implemented'
        throw this.unavailable('This feature is not available on web');
    }

    async stopListener(): Promise<void> {
        throw this.unavailable('This feature is not available on web');
    }
}
```

### Plugin with Event Emitter

```typescript
// Usage in app code
import { MyPlugin } from 'my-capacitor-plugin';

// Add event listener for native events
MyPlugin.addListener('sensorEvent', (event: SensorEvent) => {
    console.log('Sensor data:', event.x, event.y, event.z);
});

// Start the native listener
await MyPlugin.startListener();

// Later: stop and remove listener
await MyPlugin.stopListener();
MyPlugin.removeAllListeners();
```

## Cordova Plugin Compatibility

### Using Cordova Plugins with Capacitor

```bash
# Install the Cordova plugin
npm install cordova-plugin-my-plugin

# Capacitor detects Cordova plugins and configures them
npx cap sync
```

### Compatibility Limitations

```yaml
cordova_to_capacitor_migration:
  plugin_api:
    cordova: "Callback-based (success, failure)"
    capacitor: "Promise-based"
    compat: "@capacitor/cordova-plugin-compat wraps callbacks into promises"

  permissions:
    cordova: "Auto-managed via plugin.xml"
    capacitor: "Manual Info.plist and AndroidManifest configuration"
    compat: "Some Cordova plugins auto-add permissions on cap sync"

  plugin_registry:
    cordova: "Plugins registered globally via window.cordova.plugins"
    capacitor: "Plugins imported as ES modules"
    compat: "Cordova plugins available via window.cordova.plugins after sync"

  unsupported_patterns:
    - "Cordova exec() with custom Bridge"
    - "Plugins that modify Cordova's internal WebView"
    - "Platform-specific Cordova hooks (before_plugin_install, after_plugin_uninstall)"
    - "Plugins relying on Cordova's build-extras.gradle"
```

### Migration Strategy

```bash
# Step 1: Initialize Capacitor in existing Cordova project
npx cap init

# Step 2: Add native platforms
npx cap add ios
npx cap add android

# Step 3: Replace Cordova plugins with Capacitor equivalents
npm uninstall cordova-plugin-camera
npm install @capacitor/camera

# Step 4: For plugins without Capacitor equivalents, keep as Cordova plugin
npm install cordova-plugin-native-keyboard

# Step 5: Sync and verify
npx cap sync
npx cap open ios
```

## Plugin Testing

### Unit Testing Plugin Calls

```typescript
// Plugin unit test
import { MyPlugin } from './my-plugin';

describe('MyPlugin', () => {
    it('should echo the input value', async () => {
        const result = await MyPlugin.echo({ value: 'hello' });
        expect(result.value).toBe('hello');
    });
});
```

### E2E Testing with Detox

```typescript
// Detox test for camera plugin
describe('Camera Plugin', () => {
    beforeAll(async () => {
        await device.launchApp();
    });

    it('should open camera on button press', async () => {
        await element(by.id('take-photo-button')).tap();
        // On simulator, camera returns a test image
        await expect(element(by.id('photo-preview'))).toBeVisible();
    });
});
```

## Plugin Performance

- Plugin call overhead: 5-15ms round-trip for simple calls (echo, getInfo)
- Heavy operations (camera, media processing): 200-2000ms depending on device
- Event listener overhead: <1ms per event emitted from native to JavaScript
- Plugin initialization: 10-50ms on first import (lazy-loaded on first call)
- Memory: typical plugin uses 1-5MB native heap for its runtime
- Batched calls: multiple plugin calls in sequence should be batched into a single plugin method where possible

## References

- ionic-capacitor-performance.md — Capacitor Performance Optimization
- ionic-cli.md — Ionic CLI Reference
- ionic-deployment.md — Deployment Guide for Ionic Apps
- capacitor-plugins.md — Capacitor Plugin System Overview
