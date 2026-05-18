---
name: mobile-push-notifications
description: >
  Use this skill when the user says 'push notification', 'APNs', 'FCM', 'remote notification', 'push token', 'notification payload', 'notification channel'. This skill enforces platform-specific push notification patterns: permission flow, token management, payload structure, foreground/background handling, and notification channels. Applies to iOS, Android, Flutter, and React Native.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, push-notifications, universal]
---

# Mobile Push Notifications

## Purpose
Implement push notifications with correct permission flow, token management, payload design, and foreground/background handling across all mobile platforms.

## Agent Protocol

### Trigger
User request includes: `push notification`, `APNs`, `FCM`, `remote notification`, `push token`, `notification payload`, `notification channel`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Push service (APNs, FCM, or both)
- Existing notification infrastructure

### Output Artifact
A markdown document containing permission flow implementation, token registration and refresh, payload structure (alert, data, silent), foreground/background handling, notification channels (Android), and platform-specific considerations.

### Response Format
Code-first. One code block per platform (Swift, Kotlin, Dart/TS) with full implementation. Summarize platform divergence points in bullet list. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Permission flow implemented for all target platforms
- [ ] Token registration and refresh handled
- [ ] Foreground and background notification handling implemented
- [ ] Notification channels defined (Android)
- [ ] Payload structure documented (alert, data, silent)

### Max Response Length
4096 tokens

## Workflow

### Step 1: Implement Permission Flow
```
App Launch -> Request Authorization -> Grant -> Register for Remote Notifications
                                         Deny -> Handle restricted state
```

```swift
// iOS - AppDelegate
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
    if granted {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}
```

```kotlin
// Android - NotificationCompat
val channel = NotificationChannel("default", "Default", NotificationManager.IMPORTANCE_HIGH).apply {
    description = "General notifications"
}
val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
manager.createNotificationChannel(channel)
```

```dart
// Flutter - flutter_local_notifications
final plugin = FlutterLocalNotificationsPlugin();
await plugin.initialize(InitializationSettings(
  iOS: DarwinInitializationSettings(),
  android: AndroidInitializationSettings('@mipmap/ic_launcher'),
));
```

```typescript
// React Native - notifee
await notifee.requestPermission();
await notifee.createChannel({ id: 'default', name: 'Default', importance: AndroidImportance.HIGH });
```

### Step 2: Handle Foreground vs Background

| State | Behavior | Action |
|-------|----------|--------|
| Foreground | System shows banner (iOS) or heads-up (Android) | Call `onMessage` handler - update UI silently or show in-app |
| Background | Delivered to notification tray | System displays automatically; tap opens `onNotificationOpenedApp` |
| Killed | Delivered to tray | Tap launches app via `getInitialNotification` |

```dart
// Flutter
FirebaseMessaging.onMessage.listen((RemoteMessage msg) => handleForeground(msg));
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage msg) => handleTap(msg));
final initial = await FirebaseMessaging.instance.getInitialMessage();
```

```swift
// iOS - UNUserNotificationCenter delegate
func userNotificationCenter(_ center: UNUserNotificationCenter,
                            willPresent notification: UNNotification,
                            withCompletionHandler handler: @escaping (UNNotificationPresentationOptions) -> Void) {
    handler([.banner, .sound, .badge])
}
func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any]) async -> UIBackgroundFetchResult {
    return processPayload(userInfo)
}
```

### Step 3: Define Notification Channels (Android)
```kotlin
val channels = listOf(
    NotificationChannel("orders", "Orders", IMPORTANCE_HIGH),
    NotificationChannel("chat", "Chat Messages", IMPORTANCE_DEFAULT),
    NotificationChannel("promo", "Promotions", IMPORTANCE_LOW),
)
channels.forEach { manager.createNotificationChannel(it) }
```

## Rules
- Always handle both foreground and background notification states.
- Never hardcode notification channel IDs - define them as constants.
- Always implement token refresh handling (APNs token rotation, FCM token refresh).
- Silent push payload must not show UI; data push must be parsed in `onMessage`.
- Android requires notification channels for all notification types.
- Always test with real device - simulator push has limitations.
- Never log push tokens in production.

## References
- `references/apns-guide.md` — APNs endpoints, tokens, certificate vs key auth, payload limits
- `references/fcm-guide.md` — FCM HTTP v1 API, topic messaging, device groups, delivery extensions
- `references/payload-design.md` — Alert, data, and silent payload structures, localized strings, media attachments
- `references/permission-flow.md` — Provisional authorization, critical alerts, provisional push, pre-permission dialog design

## Handoff
No further handoff. Push notification integration is self-contained.
