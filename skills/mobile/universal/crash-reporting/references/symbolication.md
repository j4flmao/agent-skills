# Symbolication

## What is Symbolication?

Raw crash logs contain memory addresses, not function names. Symbolication maps addresses back to source: `0x1023a4b5c` → `MyApp.OrderManager.createOrder(line 142)`.

## iOS — dSYM Upload

### Automatic (Xcode)

```bash
# Xcode 14+ auto-uploads dSYMs via Build Settings:
DEBUG_INFORMATION_FORMAT = dwarf-with-dsym
# Run script build phase for Sentry / Crashlytics automatically
```

### Manual Upload — Sentry

```bash
# Install sentry-cli
curl -sL https://sentry.io/get-cli/ | bash

# Upload dSYM
sentry-cli upload-dif --org myorg --project myproject /path/to/dSYMs
```

### Manual Upload — Crashlytics

```bash
# via Firebase CLI
./Pods/FirebaseCrashlytics/upload-symbols -gsp GoogleService-Info.plist -p ios /path/to/dSYMs
```

### Bitcode Caveat

- Bitcode-enabled builds produce **two dSYMs**: one from Xcode archive, one from App Store Connect
- Must download App Store dSYM from Apple after processing (~30 min post-upload)
- **Disable bitcode** (`ENABLE_BITCODE = NO`) to avoid this complexity

## Android — ProGuard / R8 Mapping

### Sentry

```bash
sentry-cli upload-proguard \
  --org myorg \
  --project myproject \
  --android-manifest app/build/intermediates/merged_manifests/release/AndroidManifest.xml \
  --write-proguard-mapping-report \
  app/build/outputs/mapping/release/mapping.txt
```

### Crashlytics

```groovy
// build.gradle — Firebase plugin auto-uploads on release build
firebaseCrashlytics {
    mappingFileUploadEnabled = true
    // ProGuard mapping file auto-uploaded during build
}
```

### Verify

```bash
# Sentry — check uploaded artifacts
sentry-cli releases info com.example.app@1.0.0+1

# Crashlytics — check mapping.txt exists in:
# app/build/outputs/mapping/release/mapping.txt
```

## React Native — Source Maps

```bash
# Sentry
sentry-cli releases files com.example.app@1.0.0+1 upload-sourcemaps \
  --dist 1 \
  --rewrite \
  ./build/main.jsbundle.map
```

## Testing Symbolication

```swift
// Force a crash to verify symbolication
func forceCrash() {
    let array: [Int] = []
    let _ = array[999]  // Index out of bounds
}

// Debug with try/catch — non-fatal via captureException
// Or use Sentry.crash() / Crashlytics.crashlytics().crash()
```
