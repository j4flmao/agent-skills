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

## Delivery Optimization

### Deliverability Patterns
```yaml
deliverability:
  token_management:
    registration: "Register token on every app launch — tokens can change without notice"
    refresh: "Monitor token refresh callbacks (APNs, FCM) — update server immediately"
    expiry: "APNs tokens expire after connecting to new environment (dev → prod)"
    stale_tokens: "Monitor delivery failures — remove stale tokens from active push lists"
    
  throttling:
    per_device: "Max 1 push per 30 seconds per device — OS may drop otherwise"
    per_user: "Max 5 pushes per hour per user in peak, 1-2 per hour in quiet periods"
    burst: "For time-sensitive batches, spread pushes over 5-10min window, not all at once"
    
  priority_management:
    critical_alerts: "Use critical alert entitlement (iOS) — bypasses mute/ringer"
    time_sensitive: "Use time-sensitive interruption level — delivered immediately"
    normal: "Standard priority — may be grouped or delayed by OS"
    background: "Content-available only (silent) — no user-facing payload"
    
  payload_size:
    apns_limit: "4KB max payload (including headers)"
    fcm_limit: "4KB max payload (Android), 2KB for notification-only (iOS via FCM)"
    optimization: "Use data-only (FCM) + local notification (app) pattern for rich content"
```

### Rich Notification Patterns
```yaml
rich_notifications:
  ios:
    media_attachments: "Image, audio, video up to 50MB via service extension"
    interactive: "Custom action buttons (reply, confirm, dismiss) via UNNotificationCategory"
    live_activities: "Dynamic Island / Lock Screen live updates for ongoing events"
    
  android:
    notification_templates: "Expandable notifications with inbox, big picture, big text, media styles"
    action_buttons: "Up to 3 action buttons per notification"
    direct_reply: "Inline reply via RemoteInput — no app launch required"
    
  cross_platform:
    image_loading: "Provide image URL in payload — app caches and displays on notification tap"
    deep_linking: "Include deeplink path in payload — navigate directly to relevant screen"
    grouping: "Use thread-id (iOS) and group-key (Android) for logical grouping"
```

### Analytics and Monitoring

```yaml
notification_analytics:
  metrics:
    delivery_rate: "Notifications delivered by provider vs dropped"
    tap_rate: "Percentage of delivered notifications that are tapped"
    conversion: "Users who complete target action after tapping notification"
    opt_out_rate: "Users who disable notifications after receiving them"
    
  tracking:
    impression: "Track when notification is displayed to user"
    tap: "Track when notification is tapped (with deep-link path)"
    conversion: "Track subsequent user action (order, message, signup)"
    
  a_b_testing:
    variables: ["Title", "Body text", "Image presence", "Action button text", "Delivery time"]
    metric: "Tap rate and conversion within 24 hours of delivery"
    minimum_sample: "1000 users per variant for statistical significance"
```

## Rules
- Always handle both foreground and background notification states.
- Never hardcode notification channel IDs - define them as constants.
- Always implement token refresh handling (APNs token rotation, FCM token refresh).
- Silent push payload must not show UI; data push must be parsed in `onMessage`.
- Android requires notification channels for all notification types.
- Always test with real device - simulator push has limitations.
- Never log push tokens in production.
- Monitor delivery rates and tap rates — notifications not delivering are worse than not sending.
- Implement token refresh callback, not just registration — tokens change without notice.
- Throttle pushes per device — OS may silently drop notifications from aggressive senders.

## References
  - references/apns-guide.md — APNs Guide
  - references/fcm-guide.md — FCM Guide
  - references/local-notifications.md — Local Notifications
  - references/payload-design.md — Payload Design
  - references/permission-flow.md — Permission Flow
  - references/push-notifications.md — Push Notifications Setup
## Handoff
No further handoff. Push notification integration is self-contained.
