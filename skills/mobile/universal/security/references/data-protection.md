# Mobile Data Protection

## Key Storage

| Platform | API | What to store |
|----------|-----|---------------|
| iOS | Keychain | Tokens, keys, biometric data |
| Android | EncryptedSharedPreferences | Small sensitive data |
| Android | Android Keystore | Crypto keys (never expose) |
| Flutter | flutter_secure_storage | Cross-platform keychain/keystore |
| RN | react-native-keychain | Cross-platform keychain |

## Encryption at rest

```kotlin
// Android: File-level encryption (Android 10+)
val storageStats = storageManager.getStorageStats(storageVolume)
if (storageStats.isFileBasedEncryptionEnabled) { /* FBE active */ }
```

```swift
// iOS: Data Protection class
let data = try Data(contentsOf: url)
let protected = try data.write(to: url, options: .completeFileProtection)
```

## Cache cleanup

```dart
// Flutter: clear secure storage on logout
await FlutterSecureStorage().deleteAll();
```
