# Crashlytics Setup

## Gradle Setup (Android)

```groovy
// build.gradle (project-level)
buildscript {
    dependencies {
        classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
        classpath 'com.google.firebase:perf-plugin:1.4.2'  // Optional: Performance
    }
}

// build.gradle (app-level)
plugins {
    id 'com.google.gms.google-services'
    id 'com.google.firebase.crashlytics'
    id 'com.google.firebase.firebase-perf'  // Optional
}

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.2.0')
    implementation 'com.google.firebase:firebase-crashlytics-ktx'
    implementation 'com.google.firebase:firebase-analytics-ktx'
}
```

## SPM Setup (iOS)

```
File → Add Package → https://github.com/firebase/firebase-ios-sdk
Products: FirebaseCrashlytics, FirebaseAnalytics
```

## Debug vs Production

```kotlin
// Android — disable Crashlytics in debug builds
if (BuildConfig.DEBUG) {
    FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(false)
}
```

```swift
// iOS
Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(!isDebug)
```

## Custom Keys

```swift
// iOS — up to 64 key-value pairs
Crashlytics.crashlytics().setCustomValue("premium_annual", forKey: "subscription_plan")
Crashlytics.crashlytics().setCustomKeysAndValues([
    "orders_today": 3,
    "last_sync": Date().timeIntervalSince1970
])
```

```kotlin
// Android
FirebaseCrashlytics.getInstance().setCustomKey("subscription_plan", "premium_annual")
FirebaseCrashlytics.getInstance().setCustomKey("orders_today", 3)
```

## User Logs

```swift
Crashlytics.crashlytics().log("User tapped checkout")
// Appears in the crash report's "Logs" section
```

## Analytics Integration

```swift
// Crashlytics logs automatically include Analytics events
// No extra setup — just add FirebaseAnalytics dependency
// Events that occurred before crash appear in crash report
```

## Check for Updates

```bash
# Firebase Crashlytics provides a "no news is good news" model.
# Monitor https://console.firebase.google.com for:
# - New issues
# - Regression arrows on issue cards
# - Version adoption drop-off
```

## NDK Crashes (Android C/C++)

```groovy
dependencies {
    implementation 'com.google.firebase:firebase-crashlytics-ndk'
}
```
Upload native debug symbols via `sentry-cli` or Firebase console.
