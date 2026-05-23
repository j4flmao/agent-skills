# Capacitor Plugins

## Plugin Architecture

Capacitor plugins bridge JavaScript to native code via a JSON serialization layer. Each plugin has:
- TypeScript API definition (type-safe interface)
- Swift implementation for iOS (subclass of `CAPPlugin`)
- Kotlin implementation for Android (class annotated with `@CapPlugin`)
- Optional web fallback for PWA mode (`src/web.ts`)

The call flow: JavaScript → JSON serialization → WebView bridge → native method → JSON result → JavaScript Promise resolution.

## Official Plugin List

```bash
npm install @capacitor/camera              # Photo/video capture, gallery picker
npm install @capacitor/geolocation          # GPS location, watch position
npm install @capacitor/push-notifications   # FCM/APNs push handling
npm install @capacitor/filesystem           # Read/write/delete files
npm install @capacitor/preferences          # Key-value storage (replaces Storage)
npm install @capacitor/share                # Native share sheet
npm install @capacitor/device               # Device info, battery, language
npm install @capacitor/splash-screen        # Splash show/hide
npm install @capacitor/status-bar           # Status bar visibility, style
npm install @capacitor/haptics              # Haptic feedback
npm install @capacitor/keyboard             # Keyboard show/hide events
npm install @capacitor/text-zoom            # System font scale
npm install @capacitor/screen-orientation   # Lock/rotate orientation
npm install @capacicator/app                # App lifecycle, deep links, back button
npm install @capacitor/browser              # In-app browser, open external URLs
npm install @capacitor/clipboard            # Read/write clipboard
npm install @capacitor/dialog               # Native dialogs (alert, confirm, prompt)
npm install @capacicator/network            # Network status monitoring
npm install @capacicator/screen-reader      # Accessibility (screen reader)
```

## Plugin Usage Patterns

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

// Camera with options
const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri,
  source: CameraSource.Camera,  // or .Photos (gallery) or .Prompt (user choice)
  saveToGallery: true,
  width: 1920,
  height: 1080,
});

// Filesystem operations
const file = await Filesystem.readFile({
  path: 'data.json',
  directory: Directory.Data,
});

// Preferences (key-value)
await Preferences.set({ key: 'token', value: 'abc123' });
const { value } = await Preferences.get({ key: 'token' });
```

## Permission Configuration

### iOS (Info.plist) — All Required Keys
```xml
<key>NSCameraUsageDescription</key>
<string>App needs camera for photo upload</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>App needs photo library for profile pictures</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>App needs to save photos to your gallery</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>App needs location for nearby features</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>App needs background location for geofence alerts</string>
<key>NSMicrophoneUsageDescription</key>
<string>App needs microphone for video recording</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>App needs Bluetooth for peripheral devices</string>
<key>NSMotionUsageDescription</key>
<string>App needs motion data for step counting</string>
```

### Android (AndroidManifest.xml) — All Common Permissions
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Custom Plugin Development

### Swift (iOS)
```swift
import Capacitor

@objc(MyCustomPlugin)
class MyCustomPlugin: CAPPlugin {
    @objc func doSomething(_ call: CAPPluginCall) {
        let value = call.getString("key") ?? ""
        guard !value.isEmpty else {
            call.reject("key is required", "MISSING_PARAM")
            return
        }
        // Perform native operation
        let result = processValue(value)
        call.resolve(["result": result])
    }

    @objc func doAsyncOperation(_ call: CAPPluginCall) {
        DispatchQueue.global().async {
            // Heavy computation
            DispatchQueue.main.async {
                call.resolve(["success": true])
            }
        }
    }

    private func processValue(_ value: String) -> String {
        return "Processed: \(value)"
    }
}
```

### Kotlin (Android)
```kotlin
package com.example.plugin

import com.getcapacitor.Plugin
import com.getcapacitor.PluginMethod
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MyCustomPlugin")
class MyCustomPlugin : Plugin() {
    @PluginMethod
    fun doSomething(call: PluginCall) {
        val value = call.getString("key")
        if (value.isNullOrEmpty()) {
            call.reject("key is required", "MISSING_PARAM")
            return
        }
        val result = processValue(value)
        call.resolve(mapOf("result" to result))
    }

    @PluginMethod
    fun doAsyncOperation(call: PluginCall) {
        Thread {
            // Heavy computation
            runOnUiThread { call.resolve(mapOf("success" to true)) }
        }.start()
    }

    private fun processValue(value: String): String = "Processed: $value"
}
```

## Web Fallback (PWA Mode)

```typescript
// src/web.ts — Optional web implementation for PWA mode
import { WebPlugin } from '@capacitor/core';
import type { MyCustomPluginPlugin } from './definitions';

export class MyCustomPluginWeb extends WebPlugin implements MyCustomPluginPlugin {
    async doSomething(options: { key: string }): Promise<{ result: string }> {
        // Web fallback — limited functionality
        return { result: `Web: ${options.key}` };
    }
}
```

## Plugin Error Handling

| Error Pattern | Method | Description |
|--------------|--------|-------------|
| Missing param | `call.reject("msg", "MISSING_PARAM")` | Required parameter not provided |
| Permission denied | `call.reject("msg", "PERMISSION_DENIED")` | User denied permission |
| Unavailable | `call.reject("msg", "UNAVAILABLE")` | Feature not available on device |
| Timeout | `call.reject("msg", "TIMEOUT")` | Operation timed out |

No preamble. No postamble. No explanations.
