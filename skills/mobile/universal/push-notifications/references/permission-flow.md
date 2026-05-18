# Permission Flow

## Standard Flow

```
App Launch
  ├── Check authorization status (UNAUTHORIZED / DENIED / AUTHORIZED / PROVISIONAL)
  ├── Show pre-permission dialog ("We'll notify you about orders")
  │     └── User taps "Allow" → RequestAuthorization
  └── Post-permission: registerForRemoteNotifications if granted
```

## iOS Permission States

```swift
UNUserNotificationCenter.current().getNotificationSettings { settings in
    switch settings.authorizationStatus {
    case .notDetermined:   // First launch — show pre-permission dialog
    case .denied:          // Redirect to Settings app
    case .authorized:      // Full permission
    case .provisional:     // iOS 12+ — quiet delivery
    case .ephemeral:       // iOS 15+ — focus mode, App Clips
    @unknown default:      // Future-proof
    }
}
```

## Pre-Permission Dialog

```swift
// Show custom UI before system prompt — improves opt-in rate 2-3x
@IBAction func requestNotificationsTapped() {
    // Show custom dialog explaining value
    let alert = UIAlertController(title: "Stay Updated",
                                  message: "Get notified about order status changes and exclusive deals.",
                                  preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "Allow", style: .default) { _ in
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
    })
    alert.addAction(UIAlertAction(title: "Not Now", style: .cancel))
    present(alert, animated: true)
}
```

## Provisional Authorization (iOS 12+)

```swift
// Quiet delivery — no banner, sound, or badge; appears in Notification Center only
UNUserNotificationCenter.current().requestAuthorization(options: [.provisional]) { granted, _ in }
// User can later upgrade from notification center or settings
```

## Critical Alerts (iOS 12+)

```swift
// Bypasses Do Not Disturb and ringer — for health/safety
UNUserNotificationCenter.current().requestAuthorization(options: [.criticalAlert])
```
Requires entitlement from Apple.

## Android Permission (API 33+)

```kotlin
// Runtime permission like camera/location
@RequiresApi(33)
fun requestNotificationPermission(activity: Activity) {
    ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_CODE)
}

// Pre-permission rationale
if (ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.POST_NOTIFICATIONS)) {
    // Show custom dialog
}
```

## Opt-In Rate Tips

| Approach | Impact |
|----------|--------|
| Pre-permission dialog | +20-40% opt-in |
| Prompt after value moment (e.g. after first order) | +15-25% |
| Provisional push (iOS) | 100% initial reach, user can upgrade |
| Delay prompt from launch | +10-15% |
| Provide opt-out in onboarding | +5-10% trust |
