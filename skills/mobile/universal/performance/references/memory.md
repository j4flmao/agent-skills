# Mobile Memory

## Common leaks

| Cause | Platform | Fix |
|-------|----------|-----|
| Retain cycle (closure) | iOS | `[weak self]` |
| Static ViewModel ref | Android | Clear on destroy |
| Timer not cancelled | All | `cancel()` in dispose |
| Stream subscription | All | `cancellable.store()` |
| Bitmap not recycled | Android | `bitmap.recycle()` |
| Large image cache | All | LRU cache, size limit |

## Profiling

```bash
# Flutter
flutter run --profile

# RN
react-native start --profile

# Android
./gradlew assembleProfile

# iOS
# Xcode > Product > Profile (Cmd+I)
```

## GC tuning

```kotlin
// Android: Avoid allocations in draw/hot path
// Preallocate collections with known size
val list = ArrayList<Order>(expectedSize)
```
