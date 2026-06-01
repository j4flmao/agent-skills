---
name: mobile-push-notifications
description: >
  Use this skill when the user says 'push notification', 'APNs', 'FCM',
  'remote notification', 'push token', 'notification payload', 'notification
  channel'. This skill enforces platform-specific push notification patterns:
  permission flow, token management, payload structure, foreground/background
  handling, and notification channels. Applies to iOS, Android, Flutter, and
  React Native.
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
A markdown document containing permission flow, token registration and refresh, payload structure (alert, data, silent), foreground/background handling, notification channels (Android), and platform-specific considerations.

### Response Format
Code-first. One code block per platform (Swift, Kotlin, Dart/TS) with full implementation. Summarize platform divergence points in bullet list. No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Permission flow implemented for all target platforms
- [ ] Token registration and refresh handled
- [ ] Foreground and background notification handling implemented
- [ ] Notification channels defined (Android)
- [ ] Payload structure documented (alert, data, silent)

### Max Response Length
4096 tokens

## Decision Trees

### Push Service Selection
```
Which push service?
├── iOS-only → APNs directly (simpler, no extra dependency)
├── Android-only → FCM directly (required for Play Store apps)
├── iOS + Android → FCM (unified, single server endpoint)
│   └── FCM handles APNs relay for iOS automatically
├── Cross-platform (Flutter/RN) → Firebase Cloud Messaging SDK
│   └── flutter-fire / react-native-firebase handles both platforms
└── Need advanced analytics → Firebase + BigQuery / custom analytics
```

### Notification Type Selection
```
What type of notification?
├── User-facing alert (new message, order update, reminder)
│   ├── iOS: alert payload with aps.alert, badge, sound
│   └── Android: notification channel with importance level
├── Silent data sync (content sync, cache refresh)
│   ├── iOS: content-available:1, no alert/badge/sound
│   ├── Android: data-only payload, no notification key
│   └── Triggers background processing (30s iOS, variable Android)
├── Rich notification (image, actions, reply)
│   ├── iOS: UNNotificationServiceExtension for media download
│   └── Android: BigPictureStyle, InboxStyle, action buttons
└── Critical alert (health, safety, security)
    └── iOS: critical alert entitlement + critical:1 in payload
```

### Permission Strategy
```
When to request permission?
├── On first launch (preferred: explain why first)
│   ├── Show custom UI explaining notification benefits
│   ├── Then call system permission dialog
│   └── If denied: never prompt again (iOS), can re-prompt (Android)
├── On value moment (after user completes key action)
│   ├── "Enable notifications for order updates?"
│   └── Higher grant rate but later token registration
└── Proactive re-prompt (Android only)
    └── Use shouldShowRequestPermissionRationale to check
```

## Workflow

### Step 1: Implement Permission Flow

```
App Launch → Explain why notifications → Request Authorization → Grant → Register Token
                                                                    Deny → Handle restricted state (show settings link)
```

### Step 2: Register Token and Handle Refresh

### Step 3: Handle Foreground vs Background Notifications

### Step 4: Define Notification Channels (Android)

### Step 5: Configure Server-Side Sending

### Step 6: Add Rich Media and Interactive Actions

## Permission Flow

### iOS — UNUserNotificationCenter
```swift
import UserNotifications
import UIKit

class NotificationService: NSObject {
  static let shared = NotificationService()

  func requestPermission() {
    // Show custom pre-permission dialog first for higher grant rate
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound, .badge, .criticalAlert]) { granted, error in
      if granted {
        DispatchQueue.main.async {
          UIApplication.shared.registerForRemoteNotifications()
        }
      } else {
        // Log denial — may want to show settings redirect later
      }
    }
  }

  func getPermissionStatus(completion: @escaping (UNAuthorizationStatus) -> Void) {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      completion(settings.authorizationStatus)
    }
  }
}
```

### Android — NotificationCompat
```kotlin
class NotificationHelper(private val context: Context) {
  companion object {
    const val CHANNEL_ORDERS = "orders"
    const val CHANNEL_CHAT = "chat"
    const val CHANNEL_PROMO = "promotions"
  }

  fun createChannels() {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channels = listOf(
      NotificationChannel(CHANNEL_ORDERS, "Orders", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Order updates and status changes"
        enableVibration(true)
        setShowBadge(true)
      },
      NotificationChannel(CHANNEL_CHAT, "Chat Messages", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Direct messages from other users"
        enableLights(true)
      },
      NotificationChannel(CHANNEL_PROMO, "Promotions", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Sales, offers, and recommendations"
        setShowBadge(false)
      },
    )
    channels.forEach { manager.createNotificationChannel(it) }
  }

  // Android 13+ requires runtime permission (POST_NOTIFICATIONS)
  fun requestPermission(activity: Activity) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ActivityCompat.requestPermissions(
        activity,
        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
        NOTIFICATION_PERMISSION_REQUEST
      )
    }
  }
}
```

### Flutter — firebase_messaging
```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class PushService {
  final _messaging = FirebaseMessaging.instance;

  Future<void> setup() async {
    // Request permission (iOS) / no-op on Android
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Get token
      final token = await _messaging.getToken();
      await _registerToken(token!);

      // Listen for token refresh
      _messaging.onTokenRefresh.listen(_registerToken);

      // Foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // App opened from notification (background state)
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // App opened from notification (killed state)
      final initial = await _messaging.getInitialMessage();
      if (initial != null) _handleNotificationTap(initial);
    }
  }

  Future<void> _registerToken(String token) async {
    await api.post('/push/register', {'token': token, 'platform': 'mobile'});
  }

  void _handleForegroundMessage(RemoteMessage message) {
    // Show local notification or update in-app UI
  }

  void _handleNotificationTap(RemoteMessage message) {
    // Navigate based on deep link in payload
    final deepLink = message.data['deep_link'] as String?;
    if (deepLink != null) navigatorKey.currentState?.pushNamed(deepLink);
  }
}
```

### React Native — @react-native-firebase/messaging
```typescript
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

class PushService {
  async setup() {
    // Request permission (iOS)
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED
      || authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Create notification channels (Android)
      await notifee.createChannel({
        id: 'orders',
        name: 'Orders',
        importance: AndroidImportance.HIGH,
      });
      await notifee.createChannel({
        id: 'chat',
        name: 'Chat Messages',
        importance: AndroidImportance.DEFAULT,
      });

      // Get token
      const token = await messaging().getToken();
      await api.post('/push/register', { token, platform: 'mobile' });

      // Token refresh
      messaging().onTokenRefresh(async (newToken) => {
        await api.post('/push/register', { token: newToken });
      });

      // Foreground messages — show local notification
      messaging().onMessage(async (remoteMessage) => {
        await notifee.displayNotification({
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          android: { channelId: remoteMessage.data?.channel || 'default' },
          ios: {},  // iOS shows system notification automatically
        });
      });

      // Background message handler
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        await notifee.displayNotification({ ... });
      });

      // Notification tap — background state
      messaging().onNotificationOpenedApp((remoteMessage) => {
        navigate(remoteMessage.data?.deep_link);
      });

      // Notification tap — killed state
      const initial = await messaging().getInitialNotification();
      if (initial) navigate(initial.data?.deep_link);
    }
  }
}
```

## Token Management

### iOS — APNs Token
```swift
// AppDelegate
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
  let token = deviceToken.map { String(format: "%02x", $0) }.joined()
  api.registerToken(token, platform: "ios")
}

func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
  // Handle — usually simulator or no network
  logger.error("Push registration failed: \(error.localizedDescription)")
}
```

### Android — FCM Token
```kotlin
// FirebaseMessagingService
class MyFirebaseService : FirebaseMessagingService() {
  override fun onNewToken(token: String) {
    super.onNewToken(token)
    // Token changed (rotated, restored, new install)
    api.registerToken(token, "android")
  }
}
```

## Server-Side Sending

### Node.js — Firebase Admin
```javascript
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });

async function sendPush(userId, title, body, data = {}) {
  const tokens = await db.getUserTokens(userId);

  const message = {
    tokens,  // Up to 500 per call
    notification: { title, body },
    data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    android: {
      notification: {
        channelId: data.channel || 'default',
        priority: 'high',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          badge: 1,
          sound: 'default',
          'content-available': 1,
          interruptionLevel: data.critical ? 'critical' : 'active',
        },
      },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Handle delivery failures — remove stale tokens
  response.responses.forEach((resp, idx) => {
    if (resp.error?.code === 'messaging/registration-token-not-registered') {
      db.removeToken(tokens[idx]);
    }
  });
}
```

### Node.js — APNs Direct
```javascript
const apn = require('apn');

const apnProvider = new apn.Provider({
  token: {
    key: fs.readFileSync('./AuthKey.p8'),
    keyId: 'KEY_ID',
    teamId: 'TEAM_ID',
  },
  production: true,  // false for sandbox
});

async function sendAPNs(deviceToken, title, body, data = {}) {
  const notification = new apn.Notification();
  notification.alert = { title, body };
  notification.badge = 1;
  notification.sound = 'default';
  notification.payload = data;
  notification.topic = 'com.example.app';
  notification.pushType = 'alert';
  notification.interruptionLevel = data.critical ? 'critical' : 'active';

  const result = await apnProvider.send(notification, deviceToken);
  if (result.failed.length > 0) {
    result.failed.forEach(f => {
      if (f.error?.status === 410 || (f.error?.status === 400 && f.error?.reason === 'BadDeviceToken')) {
        db.removeToken(f.device);  // Token expired
      }
    });
  }
}
```

## Payload Structure

### Alert Notification
```json
{
  "aps": {
    "alert": {
      "title": "Order Shipped",
      "body": "Your order #1234 has shipped",
      "subtitle": "Arriving tomorrow"
    },
    "badge": 3,
    "sound": "default",
    "thread-id": "order-1234",
    "category": "order_update"
  },
  "deep_link": "orders/1234",
  "image_url": "https://example.com/order.png"
}
```

### Silent Data Notification
```json
{
  "aps": {
    "content-available": 1
  },
  "type": "order_sync",
  "order_ids": ["1234", "1235"],
  "silent": true
}
```

### Android — FCM Data Payload
```json
{
  "to": "device_token",
  "priority": "high",
  "notification": {
    "title": "Order Shipped",
    "body": "Your order #1234 has shipped",
    "android_channel_id": "orders",
    "click_action": "OPEN_ORDER",
    "image": "https://example.com/order.png"
  },
  "data": {
    "type": "order_update",
    "order_id": "1234",
    "deep_link": "orders/1234"
  }
}
```

## Rich Notifications

### iOS — Notification Service Extension
```swift
// NotificationService.swift (added as separate target)
class NotificationService: UNNotificationServiceExtension {
  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    guard let attachment = request.content.userInfo["image_url"] as? String,
          let url = URL(string: attachment) else {
      contentHandler(request.content)
      return
    }

    // Download attachment (30s timeout)
    let task = URLSession.shared.downloadTask(with: url) { location, _, error in
      if let location = location {
        let data = try? Data(contentsOf: location)
        let tempURL = URL(fileURLWithPath: NSTemporaryDirectory())
          .appendingPathComponent(url.lastPathComponent)
        try? data?.write(to: tempURL)

        if let attachment = try? UNNotificationAttachment(identifier: "image", url: tempURL) {
          let content = request.content.mutatingCopy()
          content.attachments = [attachment]
          contentHandler(content)
          return
        }
      }
      contentHandler(request.content)
    }
    task.resume()
  }
}
```

### Android — Big Picture Style
```kotlin
val bigPictureStyle = NotificationCompat.BigPictureStyle()
  .bigPicture(bitmap)
  .bigLargeIcon(null)  // Hide large icon when expanded

val notification = NotificationCompat.Builder(context, CHANNEL_ORDERS)
  .setSmallIcon(R.drawable.ic_notification)
  .setContentTitle("Order Shipped")
  .setContentText("Your order #1234 has shipped")
  .setStyle(bigPictureStyle)
  .addAction(R.drawable.ic_track, "Track", trackPendingIntent)
  .addAction(R.drawable.ic_contact, "Contact", contactPendingIntent)
  .build()
```

## Interactive Notifications

### iOS — Action Buttons
```swift
// Register categories at launch
let category = UNNotificationCategory(
  identifier: "order_update",
  actions: [
    UNNotificationAction(identifier: "TRACK", title: "Track", options: .foreground),
    UNNotificationAction(identifier: "CONTACT", title: "Contact Support", options: .foreground),
    UNTextInputNotificationAction(identifier: "REPLY", title: "Reply", options: [])
  ],
  intentIdentifiers: [],
  options: []
)
UNUserNotificationCenter.current().setNotificationCategories([category])

// Handle action
func userNotificationCenter(_ center: UNUserNotificationCenter,
                            didReceive response: UNNotificationResponse,
                            withCompletionHandler completion: @escaping () -> Void) {
  switch response.actionIdentifier {
  case "TRACK": navigateToOrder()
  case "REPLY": handleReply(response)
  default: break
  }
  completion()
}
```

### Android — Direct Reply
```kotlin
val replyLabel = "Reply"
val remoteInput = RemoteInput.Builder("reply_text")
  .setLabel(replyLabel)
  .build()

val replyAction = NotificationCompat.Action.Builder(
  R.drawable.ic_reply, "Reply", replyPendingIntent
).addRemoteInput(remoteInput).build()

// Handle in BroadcastReceiver
class ReplyReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val reply = RemoteInput.getResultsFromIntent(intent)?.getString("reply_text")
    if (reply != null) {
      api.sendReply(orderId, reply)
    }
  }
}
```

## Notification Grouping

### iOS — Thread Identifier
```swift
// Set thread-id in payload
{
  "aps": {
    "alert": { ... },
    "thread-id": "order-1234"
  }
}

// Or in code
let summary = UNNotificationSummarySetting... 
```

### Android — Group Summary
```kotlin
val groupKey = "orders"
val summaryNotification = NotificationCompat.Builder(context, CHANNEL_ORDERS)
  .setSmallIcon(R.drawable.ic_notification)
  .setContentTitle("3 new orders")
  .setGroup(groupKey)
  .setGroupSummary(true)
  .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
  .build()

val childNotification = NotificationCompat.Builder(context, CHANNEL_ORDERS)
  .setSmallIcon(R.drawable.ic_notification)
  .setContentTitle(order.title)
  .setContentText(order.status)
  .setGroup(groupKey)
  .build()
```

## Local Notification Fallback
When remote push fails, use local notifications as fallback:
```dart
Future<void> showLocalNotification({
  required String title,
  required String body,
  String? channel = 'default',
  String? payload,
}) async {
  const androidDetails = AndroidNotificationDetails(
    channel ?? 'default', 'Default',
    importance: Importance.high,
    priority: Priority.high,
  );
  const iosDetails = DarwinNotificationDetails();

  await _localNotificationsPlugin.show(
    DateTime.now().millisecondsSinceEpoch ~/ 1000,
    title,
    body,
    NotificationDetails(android: androidDetails, iOS: iosDetails),
    payload: payload,
  );
}
```

## Anti-Patterns
- **No permission rationale**: Users deny when surprised. Always explain notification value first
- **Requesting permission on every launch if denied**: iOS shows system prompt once. Never try again — redirect to Settings
- **No token refresh handling**: Tokens can change (reinstall, restore, environment change). Monitor `onNewToken`
- **Ignoring delivery failures**: Dead tokens accumulate. Process `SendResponse` failures, remove stale tokens
- **Sending same push simultaneously to many tokens of same device**: FCM handles multiple tokens/device. Don't duplicate
- **Payload too large**: APNs/FCM 4KB limit applies to entire payload. Keep data minimal, reference URLs
- **No notification channel differentiation (Android)**: All notifications same importance. Users turn off all instead of just promotions
- **Silent push without throttling**: iOS respects `content-available` throttling per app. Too many silent pushes = dropped
- **No thread-id/grouping**: Notification tray becomes a mess. Group related notifications
- **Critical alerts overused**: Users revoke critical alert entitlement if overused. Save for genuinely urgent
- **No deep link in payload**: Notification tap lands on generic home screen. Always include navigation context
- **Foreground push using remote instead of local**: iOS shows system notification by default in foreground. Use `onMessage` to show custom in-app UI instead
- **Not handling both background and killed states**: App launched from notification tap differs from background resume. Handle both paths
- **Logging push tokens in production**: Tokens are unique identifiers. Never log to console or crash reporting
- **No fallback for devices without Play Services**: Firestore/FCM not available on some Chinese devices. Use alternative push SDK (Huawei Mobile Services)

## Performance Considerations
- Token registration should be fire-and-forget — don't block app launch
- Batch token registration updates (subscribe to topics, not individual tokens for broadcast)
- Use topic-based messaging for broadcasts over individual token sends
- Silent pushes limited to ~3 per app per hour by iOS — budget accordingly
- Notification service extension has 30s to download media (iOS)
- Android notification rate limit: ~100/second per device
- Monitor notification delivery rate, tap rate, and opt-out rate as KPIs
- Compress payload data, reference images by URL rather than embedding

## Testing Push Notifications
- iOS: use `swcutil` or Xcode > Simulate Push Notification with `.apns` file
- Android: use Firebase Console > Cloud Messaging > Send Test Message
- Test all three states: foreground, background, killed
- Test permission flow: accept, deny, accept-then-deny-in-settings
- Test rich media: image, video, audio attachments
- Test interactive actions: reply, track, dismiss
- Test notification channel importance levels (Android)
- Test token refresh: uninstall/reinstall, restore from backup
- Test push on WiFi, cellular, airplane mode
- Test critical alert entitlement (iOS) — real device, special provisioning
- Test group notifications: 3+ notifications from same thread
- Test delivery failure handling: register invalid token, verify cleanup

## References
- `references/apns-guide.md` — APNs Guide
- `references/fcm-guide.md` — FCM Guide
- `references/local-notifications.md` — Local Notifications
- `references/payload-design.md` — Payload Design
- `references/permission-flow.md` — Permission Flow
- `references/push-notifications.md` — Push Notifications Setup

## Handoff
After push notification setup, hand off to:
- `mobile/universal/deep-linking` — Notification tap navigation, deep link handling
- `mobile/universal/analytics` — Push notification tracking, conversion funnels
- `mobile/universal/performance` — Push throttling, silent push budgeting
- `mobile/universal/security` — Token security, APNs certificate management
- `mobile/universal/testing` — Push notification testing scenarios
- `mobile/ios` — APNs, notification service extension, critical alerts
- `mobile/android` — FCM, notification channels, direct reply
