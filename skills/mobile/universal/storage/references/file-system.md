# Mobile File System

## Directory locations

```dart
// Flutter path_provider
final tempDir = await getTemporaryDirectory();
final docDir = await getApplicationDocumentsDirectory();
final cacheDir = await getApplicationCacheDirectory();
final supportDir = await getApplicationSupportDirectory();
```

```swift
// iOS
let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
```

```kotlin
// Android
context.filesDir       // Internal storage
context.cacheDir       // Cache (may be cleared)
context.externalFilesDir // External storage (if available)
```

## File encryption

```dart
// Encrypt sensitive files
final cipher = AESCipher(key: encryptionKey);
final encrypted = cipher.encrypt(plaintext);
await file.writeAsBytes(encrypted);
```

## Cache management

```dart
class CacheManager {
  final Directory cacheDir;
  final Duration maxAge;

  CacheManager(this.cacheDir, this.maxAge);

  Future<void> cleanExpired() async {
    final files = cacheDir.listSync();
    final now = DateTime.now();
    for (final file in files) {
      final age = now.difference(file.statSync().modified);
      if (age > maxAge) await file.delete();
    }
  }
}
```
