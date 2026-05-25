# Ionic Capacitor Plugins

## Built-in Plugins

### Camera Plugin
```typescript
import { Camera, CameraResultType } from '@capacitor/camera'

const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri,
  source: CameraSource.Prompt,
})
```

### Geolocation Plugin
```typescript
import { Geolocation } from '@capacitor/geolocation'

const position = await Geolocation.getCurrentPosition({
  enableHighAccuracy: true,
  timeout: 10000,
})

const watcher = Geolocation.watchPosition({}, (position, err) => {
  if (position) updateMap(position.coords)
})
```

### Push Notifications
```typescript
import { PushNotifications } from '@capacitor/push-notifications'

await PushNotifications.requestPermissions()
await PushNotifications.register()

PushNotifications.addListener('registration', (token) => {
  registerDeviceToken(token.value)
})
```

## Custom Plugin Development

### Plugin Structure
```
my-plugin/
├── src/
│   ├── index.ts         # Web implementation
│   ├── definitions.ts   # Type definitions
│   └── plugin.ts        # Interface
├── ios/
│   └── PluginPlugin.swift  # iOS native code
├── android/
│   └── src/main/java/.../PluginPlugin.java
└── package.json
```

### TypeScript Definition
```typescript
export interface MyPlugin {
  echo(options: { value: string }): Promise<{ value: string }>
  startScan(): Promise<void>
  addListener(eventName: 'scanResult', listener: (data: ScanData) => void): PluginListenerHandle
}
```

### iOS Implementation
```swift
@objc(MyPluginPlugin)
class MyPluginPlugin: CAPPlugin {
    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve(["value": value])
    }
}
```

### Android Implementation
```java
@CapacitorPlugin(name = "MyPlugin")
public class MyPluginPlugin extends Plugin {
    @PluginMethod
    public void echo(PluginCall call) {
        String value = call.getString("value");
        JSObject ret = new JSObject();
        ret.put("value", value);
        call.resolve(ret);
    }
}
```

## Third-Party Plugin Ecosystem

| Plugin | Purpose | Popularity |
|--------|---------|------------|
| @capacitor-mlkit/barcode-scanning | Barcode/QR scanning | High |
| @capacitor-firebase/authentication | Firebase Auth | High |
| @capacitor-community/stripe | Payment processing | Medium |
| @capacitor-community/file-opener | File handling | Medium |
| @capacitor-community/sqlite | Local SQLite database | High |
| @capacitor-community/contacts | Device contacts | Medium |

## Plugin Configuration

### Capacitor Config
```typescript
const config: CapacitorConfig = {
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      permissions: {
        ios: 'camera-photo-library',
        android: 'camera',
      },
    },
  },
}
```

### Permissions
- Declare all required permissions in platform configs
- iOS: Info.plist usage descriptions required
- Android: AndroidManifest.xml permissions required
- Web: navigator.permissions API for permission checks
- Handle permission denial gracefully in app UI
