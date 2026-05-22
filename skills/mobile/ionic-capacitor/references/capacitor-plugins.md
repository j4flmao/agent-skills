# Capacitor Plugins

## Plugin List — Common Native APIs

```bash
npm install @capacitor/camera
npm install @capacitor/geolocation
npm install @capacitor/push-notifications
npm install @capacitor/filesystem
npm install @capacitor/storage
npm install @capacitor/share
npm install @capacitor/device
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/haptics
npm install @capacitor/keyboard
npm install @capacitor/text-zoom
npm install @capacitor/screen-orientation
```

## Plugin Usage

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri
});
```

## Permission Configuration

### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>App needs camera for photo upload</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>App needs photo library for profile pictures</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>App needs location for nearby features</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## Custom Plugin — iOS (Swift)

```swift
@objcap(MyCustomPlugin)
class MyCustomPlugin: CAPPlugin {
  @objc func doSomething(_ call: CAPPluginCall) {
    let value = call.getString("key") ?? ""
    guard !value.isEmpty else {
      call.reject("key is required")
      return
    }
    call.resolve(["result": "Processed: \(value)"])
  }
}
```

## Custom Plugin — Android (Kotlin)

```kotlin
@CapPlugin(name = "MyCustomPlugin")
class MyCustomPlugin : CAPPlugin() {
  @CapMethod(name = "doSomething")
  fun doSomething(call: CAPPluginCall) {
    val value = call.getString("key")
    if (value.isNullOrEmpty()) {
      call.reject("key is required")
      return
    }
    call.resolve(mapOf("result" to "Processed: $value"))
  }
}
```

## Register Custom Plugin

No registration needed — Capacitor auto-discovers plugins at runtime. For the web fallback, create a web implementation in `src/web.ts`.
