# Notification Delivery Optimization

## Delivery Architecture

### Push Notification Lifecycle

```
Application Server
       |
       v
   Push Service (FCM/APNs/Huawei/Xiaomi)
       |
       v
   OS Push Client (system_service)
       |
       v
   NotificationManager (Android) / UNUserNotificationCenter (iOS)
       |
       v
   Notification Display / App Delegate
```

#### Full Lifecycle Steps

1. **Trigger**: Server-side event (new message, order update, etc.) initiates a push
2. **Payload Construction**: Server builds the message payload with appropriate metadata
3. **Authentication**: Server authenticates with the push notification service (OAuth2 for FCM, TLS certificate for APNs)
4. **Submission**: Server sends the push request to the service endpoint
5. **Validation**: Push service validates the request — checks token validity, payload format, rate limits
6. **Routing**: Push service routes the notification to the appropriate device via persistent connection
7. **Receipt**: OS push client receives the notification and acknowledges it
8. **Processing**: OS determines whether to display immediately, store for later, or wake the app
9. **Presentation**: Notification appears in the system tray (Android) or notification center (iOS)
10. **Interaction**: User taps, dismisses, or acts on the notification

### Connection Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│ App Server   │────▶│ Push Service │────▶│ Device (OS)     │
│ (Your Backend)│     │ (FCM/APNs)   │     │ (Persistent conn)│
└──────────────┘     └──────────────┘     └─────────────────┘
       │                    │                      │
       │ 1. Auth request    │                      │
       │◀─── JWT/Cert ──────│                      │
       │ 2. Send push       │                      │
       │───────────────────▶│ 3. Deliver           │
       │                    │─────────────────────▶│
       │ 4. ACK/Error       │                      │
       │◀───────────────────│                      │
```

#### Device Connection Management

```kotlin
// Android — FirebaseMessaging manages the persistent FCM connection
class FCMConnectionManager {
    private val firebaseMessaging = FirebaseMessaging.getInstance()

    fun getToken(): Task<String> {
        return firebaseMessaging.token
    }

    // Token refresh listener
    fun onTokenRefresh() {
        firebaseMessaging.addOnTokenRefreshListener { token ->
            sendTokenToServer(token)
        }
    }
}
```

```swift
// iOS — APNs connection is managed by the OS
class APNSConnectionManager {
    func registerForPush() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    func didRegisterForRemoteNotifications(with deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        sendTokenToServer(token)
    }
}
```

## Payload Optimization

### Minimizing Payload Size

Push payloads have strict size limits:
- **APNs**: 4 KB for notification payloads, 5 KB for VoIP pushes
- **FCM**: 4 KB for messages (notification + data combined)
- **Huawei Push Kit**: 4 KB max
- **Xiaomi MiPush**: 4 KB max

#### Optimization Strategies

```json
// BAD — Bloated payload
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "Order #12345 has been shipped and will arrive tomorrow",
      "body": "Your order containing 3 items (Wireless Headphones, USB-C Cable, Phone Case) is now with the carrier and expected delivery is between 2-5 PM tomorrow afternoon."
    },
    "data": {
      "type": "order_shipped",
      "order_id": "12345",
      "order_number": "#12345",
      "order_date": "2026-05-27T14:30:00Z",
      "items": ["Wireless Headphones", "USB-C Cable", "Phone Case"],
      "item_count": "3",
      "carrier": "FastPost",
      "tracking_number": "FP7890123456",
      "delivery_window_start": "14:00",
      "delivery_window_end": "17:00",
      "full_address": "123 Main Street, Apt 4B, Springfield, IL 62701, United States"
    }
  }
}
// Size: ~780 bytes
```

```json
// GOOD — Optimized payload
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "Order shipped",
      "body": "Arriving tomorrow, 2-5 PM"
    },
    "data": {
      "t": "order_shipped",
      "oid": "12345",
      "eta": "2026-05-28T14:00/17:00"
    }
  }
}
// Size: ~220 bytes
```

#### Short Key Mapping

```typescript
// Server-side key mapper
const KEY_MAP: Record<string, string> = {
  type: "t",
  order_id: "oid",
  user_id: "uid",
  message_id: "mid",
  deep_link: "dl",
  campaign_id: "cid",
  template_id: "tid",
  image_url: "img",
  action_url: "url",
  scheduled_at: "ts",
  expiry_at: "exp",
  collapse_key: "ck",
  thread_id: "tid",
  category: "cat",
  priority: "pri",
  sound: "snd",
  badge_count: "bc",
  content_available: "ca",
  mutable_content: "mc",
};

function optimizePayload(payload: Record<string, any>): Record<string, any> {
  const optimized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    const shortKey = KEY_MAP[key] ?? key;
    optimized[shortKey] = typeof value === "string" && value.length > 100
      ? value.substring(0, 100) + "…"
      : value;
  }
  return optimized;
}
```

### Data vs Notification Messages

#### Android (FCM)

| Aspect | Notification Message | Data Message |
|--------|---------------------|--------------|
| Display | Automatically shown in system tray | Not displayed; `onMessageReceived` only |
| Background delivery | High priority, OS displays immediately | Delivered to `onMessageReceived` via `service` |
| Priority | Set via `android.priority` | Set via `android.priority` |
| Collapsible | Via `collapse_key` | Via `collapse_key` |
| Use case | Simple alerts, direct display | Silent sync, custom UI, rich interactions |

```kotlin
// Handling data messages in Android
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Notification messages still arrive here if app is foregrounded
        if (remoteMessage.notification != null) {
            // System handled display; we can track or customize
            trackNotificationReceived(remoteMessage)
        }

        // Data-only messages always arrive here
        val data = remoteMessage.data
        when (data["t"]) {
            "silent_sync" -> performBackgroundSync(data)
            "show_custom_notification" -> buildAndShowNotification(data)
            "clear_notification" -> cancelNotification(data["oid"])
        }
    }

    private fun performSyncWithServer(server: String) {
      // Background sync implementation without more sync
    }
}
```

#### iOS (APNs)

| Payload Type | Behavior |
|-------------|----------|
| `alert` payload | Displayed by system; `willPresent` / `didReceive` called |
| `content-available: 1` | Silent — wakes app in background for ~30s |
| `mutable-content: 1` | Delivered to Notification Service Extension for modification |
| Both alert + content-available | Displayed AND app is woken |

```swift
// Choosing payload type based on scenario
enum PushType {
    case alert(title: String, body: String)
    case silent(contentAvailable: Bool = true)
    case mutable(title: String, body: String, mediaUrl: String?)
}

func buildPayload(for type: PushType) -> [String: Any] {
    var aps: [String: Any] = [:]
    switch type {
    case .alert(let title, let body):
        aps["alert"] = ["title": title, "body": body]
        aps["sound"] = "default"
    case .silent:
        aps["content-available"] = 1
    case .mutable(let title, let body, let mediaUrl):
        aps["alert"] = ["title": title, "body": body]
        aps["mutable-content"] = 1
        if let url = mediaUrl {
            aps["media-url"] = url
        }
    }
    return ["aps": aps]
}
```

### Collapsible Messages

Collapsible messages allow replacing a pending notification with a newer one, reducing delivery traffic.

```json
// FCM — collapsible notification
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "New messages",
      "body": "You have 5 unread messages"
    },
    "data": {
      "collapse_key": "chat_room_42"
    }
  }
}
```

```json
// APNs — collapsible via thread-id
{
  "aps": {
    "alert": {
      "title": "Thread update",
      "body": "New reply in thread"
    },
    "thread-id": "thread_789"
  }
}
```

#### Collapse Key Strategy

```typescript
// Server-side collapse key generation
function getCollapseKey(notificationType: string, contextId: string): string {
  const COLLAPSIBLE_TYPES = new Set([
    "message_count",
    "friend_request",
    "like_notification",
    "comment_thread",
    "price_alert",
  ]);

  if (COLLAPSIBLE_TYPES.has(notificationType)) {
    return `${notificationType}_${contextId}`;
  }
  return null; // Non-collapsible — every notification is delivered
}
```

**Applies to**: FCM (`collapse_key`), APNs (`apns-collapse-id`), Huawei (`collapse_key`)

| Type | Collapsible | Reason |
|------|-------------|--------|
| Chat message per-room | Yes | Only latest message matters per room |
| Order status updates | No | Each status is distinct (shipped vs delivered) |
| Promotional offers | Depends | Campaign-specific offers may need every delivery |
| Security alerts | No | Every alert is critical and must be seen |

## Priority Levels

### Normal vs High Priority

#### FCM Priority

| Priority | Behavior (Android) | Behavior (iOS via APNs mapping) |
|----------|-------------------|----------------------------------|
| `HIGH` | Wakes device, delivered immediately, can use network | `apns-priority: 10` — immediate delivery |
| `NORMAL` | Waits for Doze maintenance window, batched | `apns-priority: 5` — delivered at system discretion |

```json
// HIGH priority — time-sensitive
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "Incoming call",
      "body": "From: John Doe"
    },
    "android": {
      "priority": "HIGH",
      "notification": {
        "channel_id": "calls",
        "priority": "max",
        "visibility": "public",
        "notification_count": 1,
        "default_sound": true,
        "default_vibrate_timings": true,
        "default_light_settings": true,
        "click_action": "ANSWER_CALL",
        "timeout": "300"
      },
      "ttl": "0s"
    }
  }
}
```

```json
// NORMAL priority — promotional
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "Weekly special",
      "body": "50% off your next order"
    },
    "android": {
      "priority": "NORMAL",
      "notification": {
        "channel_id": "promotions"
      }
    }
  }
}
```

### Critical Alerts (iOS)

Critical alerts bypass the mute switch and Do Not Disturb. Requires special entitlement from Apple.

```json
{
  "aps": {
    "alert": {
      "title": "Severe Weather Warning",
      "body": "Tornado warning in your area — take shelter immediately"
    },
    "sound": {
      "critical": 1,
      "name": "alert.caf",
      "volume": 1.0
    },
    "badge": 1,
    "content-available": 1
  }
}
```

```swift
// Requesting critical alert authorization
func requestCriticalAlertAuthorization() async throws -> Bool {
    let center = UNUserNotificationCenter.current()
    return try await center.requestAuthorization(options: [
        .alert,
        .sound,
        .badge,
        .criticalAlert,  // Requires entitlement
        .providesAppNotificationSettings
    ])
}
```

### Time-Sensitive Notifications (iOS 15+)

Time-sensitive notifications break through Focus modes. They appear immediately and are displayed on the Lock Screen for a period.

```json
{
  "aps": {
    "alert": {
      "title": "Ride arriving",
      "body": "Your driver will arrive in 2 minutes"
    },
    "interruption-level": "time-sensitive",
    "relevance-score": 1.0,
    "sound": "default"
  }
}
```

```swift
// iOS — interruption levels
enum InterruptionLevel: String {
    case passive      // No sound, not time-sensitive, goes to notification center
    case active       // Default — sounds, appears on Lock Screen briefly
    case timeSensitive = "time-sensitive"  // Breaks through Focus, stays on Lock Screen
    case critical     // Breaks through everything, always plays sound
}
```

#### Priority Decision Matrix

| Use Case | FCM Priority | APNs Priority | Interruption Level |
|----------|-------------|---------------|-------------------|
| Incoming call/message | HIGH | 10 | time-sensitive |
| Security alert (2FA) | HIGH | 10 | critical |
| Delivery status update | HIGH | 10 | active |
| Promotional offer | NORMAL | 5 | passive |
| Daily digest | NORMAL | 5 | passive |
| Emergency alert | HIGH | 10 | critical |
| Silent background sync | HIGH | 5 (with content-available) | N/A |

## Delivery Guarantees

### At-Most-Once Delivery

Best-effort delivery with no retries. Suitable for non-critical notifications where duplicates are worse than misses.

```typescript
// At-most-once pattern
async function sendAtMostOnce(notification: Notification): Promise<void> {
    try {
        const response = await fcm.send(notification, { retry: false });
        logDelivery(notification.id, "sent", response);
    } catch (error) {
        // No retry — notification is dropped
        logDelivery(notification.id, "failed", error);
    }
}
```

| Pros | Cons |
|------|------|
| Lowest latency | No delivery guarantee |
| No duplicate risk | Messages may be lost on transient failures |
| Simple implementation | Not suitable for critical messages |

### At-Least-Once Delivery

Retries on failure until acknowledged. Uses idempotency keys to prevent duplicate processing on the consumer side.

```typescript
// At-least-once pattern with idempotency
async function sendAtLeastOnce(
    notification: Notification,
    maxRetries: number = 3
): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fcm.send(notification, {
                idempotencyKey: notification.id
            });
            if (response.success) {
                logDelivery(notification.id, "delivered", attempt);
                return;
            }
        } catch (error) {
            if (attempt === maxRetries) {
                await enqueueDeadLetter(notification, error);
                return;
            }
            const delay = Math.pow(2, attempt) * 1000;
            await sleep(delay);
        }
    }
}
```

```typescript
// Consumer-side deduplication
class NotificationDeduplicator {
    private processedIds: Set<string> = new Set();
    private expiryMs: number = 5 * 60 * 1000; // 5 min dedup window

    isDuplicate(notificationId: string): boolean {
        return this.processedIds.has(notificationId);
    }

    markProcessed(notificationId: string): void {
        this.processedIds.add(notificationId);
        setTimeout(() => this.processedIds.delete(notificationId), this.expiryMs);
    }
}
```

### Exactly-Once Delivery

Achieved through distributed transaction protocols or two-phase commit. Extremely difficult to guarantee in practice.

```typescript
// Exactly-once via transactional outbox pattern
async function sendExactlyOnce(notification: Notification): Promise<void> {
    const trx = await db.beginTransaction();
    try {
        // 1. Insert notification into outbox (same DB transaction as the triggering event)
        await trx.execute(
            "INSERT INTO notification_outbox (id, payload, status) VALUES (?, ?, 'pending')",
            [notification.id, JSON.stringify(notification)]
        );

        // 2. Send via push service
        const response = await fcm.send(notification);

        // 3. Mark as sent in same transaction
        await trx.execute(
            "UPDATE notification_outbox SET status = 'sent', sent_at = NOW() WHERE id = ?",
            [notification.id]
        );

        await trx.commit();
    } catch (error) {
        await trx.rollback();

        // Outbox processor will retry unprocessed notifications
        await scheduleOutboxRetry(notification.id);
    }
}
```

#### Outbox Processor

```typescript
// Worker that processes pending outbox notifications
class OutboxProcessor {
    private readonly BATCH_SIZE = 100;
    private readonly POLL_INTERVAL = 5000; // 5 seconds

    async start(): Promise<void> {
        while (true) {
            const pending = await db.query(
                `SELECT * FROM notification_outbox
                 WHERE status = 'pending'
                 AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 AND attempts < 10
                 ORDER BY created_at ASC
                 LIMIT ?`,
                [this.BATCH_SIZE]
            );

            for (const item of pending) {
                await this.process(item);
            }

            await sleep(this.POLL_INTERVAL);
        }
    }

    private async process(item: OutboxItem): Promise<void> {
        try {
            const notification = JSON.parse(item.payload);
            await fcm.send(notification);
            await db.execute(
                "UPDATE notification_outbox SET status = 'sent', sent_at = NOW() WHERE id = ?",
                [item.id]
            );
        } catch (error) {
            // Check if permanent failure
            if (isPermanentFailure(error)) {
                await db.execute(
                    "UPDATE notification_outbox SET status = 'failed', error = ? WHERE id = ?",
                    [error.message, item.id]
                );
                await enqueueDeadLetter(item);
            } else {
                await db.execute(
                    "UPDATE notification_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
                    [error.message, item.id]
                );
            }
        }
    }
}
```

## Retry Strategies

### Exponential Backoff

```typescript
class RetryStrategy {
    private readonly baseDelayMs: number;
    private readonly maxDelayMs: number;
    private readonly maxRetries: number;
    private readonly jitter: boolean;

    constructor(options: {
        baseDelayMs?: number;
        maxDelayMs?: number;
        maxRetries?: number;
        jitter?: boolean;
    } = {}) {
        this.baseDelayMs = options.baseDelayMs ?? 1000;
        this.maxDelayMs = options.maxDelayMs ?? 60000;
        this.maxRetries = options.maxRetries ?? 5;
        this.jitter = options.jitter ?? true;
    }

    getDelay(attempt: number): number {
        const exponential = this.baseDelayMs * Math.pow(2, attempt - 1);
        const capped = Math.min(exponential, this.maxDelayMs);

        if (!this.jitter) return capped;

        // Full jitter — best for avoiding thundering herd
        return Math.random() * capped;
    }

    async execute<T>(
        fn: () => Promise<T>,
        context: string = ""
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await fn();
                logger.info("Retry succeeded", { context, attempt });
                return result;
            } catch (error) {
                lastError = error;
                if (!this.isRetryable(error)) throw error;

                if (attempt < this.maxRetries) {
                    const delay = this.getDelay(attempt);
                    logger.warn("Retry scheduled", {
                        context,
                        attempt,
                        nextDelayMs: delay,
                        error: error.message,
                    });
                    await sleep(delay);
                }
            }
        }

        throw lastError;
    }

    private isRetryable(error: Error): boolean {
        const nonRetryableCodes = new Set([
            "UNREGISTERED",     // Token invalid
            "INVALID_ARGUMENT", // Bad payload
            "SENDER_ID_MISMATCH", // Wrong project
            "THIRD_PARTY_AUTH_ERROR", // Auth issue
        ]);

        if (error.name === "FirebaseError" && nonRetryableCodes.has(error.code)) {
            return false;
        }

        // Network errors, rate limits, service unavailable are retryable
        return true;
    }
}
```

#### Recommended Backoff Configurations

| Scenario | Base Delay | Max Delay | Max Retries | Jitter |
|----------|-----------|-----------|-------------|--------|
| Normal push | 1s | 60s | 3 | Full |
| Batch campaign | 2s | 120s | 5 | Full |
| Critical alert | 500ms | 30s | 5 | None (burst) |
| Silent sync | 5s | 300s | 3 | Full |

### Dead Letter Queues (DLQ)

```typescript
interface DeadLetterRecord {
    notificationId: string;
    originalPayload: object;
    failureReason: string;
    failureCode: string;
    attempts: number;
    firstFailedAt: Date;
    lastFailedAt: Date;
    source: string;
}

class DeadLetterQueue {
    private readonly db: Database;
    private readonly MAX_DLQ_RETENTION_DAYS = 30;

    async enqueue(
        notification: object,
        error: Error,
        source: string
    ): Promise<void> {
        const record: DeadLetterRecord = {
            notificationId: notification["id"] || crypto.randomUUID(),
            originalPayload: notification,
            failureReason: error.message,
            failureCode: error.code || "UNKNOWN",
            attempts: notification["_attempts"] || 0,
            firstFailedAt: new Date(),
            lastFailedAt: new Date(),
            source,
        };

        await this.db.execute(
            `INSERT INTO notification_dlq (
                notification_id, payload, failure_reason,
                failure_code, attempts, source
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                record.notificationId,
                JSON.stringify(record.originalPayload),
                record.failureReason,
                record.failureCode,
                record.attempts,
                record.source,
            ]
        );
    }

    async replayNotification(notificationId: string): Promise<void> {
        const record = await this.db.query(
            "SELECT * FROM notification_dlq WHERE notification_id = ?",
            [notificationId]
        );

        if (!record) throw new Error("DLQ record not found");

        const payload = JSON.parse(record.payload);
        payload._attempts = record.attempts + 1;

        try {
            await fcm.send(payload);
            await this.db.execute(
                "DELETE FROM notification_dlq WHERE notification_id = ?",
                [notificationId]
            );
        } catch (error) {
            await this.db.execute(
                `UPDATE notification_dlq
                 SET attempts = ?, last_failed_at = NOW(), failure_reason = ?
                 WHERE notification_id = ?`,
                [record.attempts + 1, error.message, notificationId]
            );
        }
    }

    async cleanup(): Promise<void> {
        await this.db.execute(
            `DELETE FROM notification_dlq
             WHERE last_failed_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [this.MAX_DLQ_RETENTION_DAYS]
        );
    }
}
```

### Retry Budgets

```typescript
class RetryBudgetManager {
    private readonly BUDGET_WINDOW_MS = 60 * 1000; // 1 minute
    private readonly MAX_RETRY_RATE = 0.1;          // Max 10% retries
    private budget: { sent: number; retried: number }[] = [];
    private slidingWindow: { sent: number; retried: number } = { sent: 0, retried: 0 };

    recordSend(): void {
        this.slidingWindow.sent++;
    }

    recordRetry(): void {
        this.slidingWindow.retried++;
    }

    canRetry(): boolean {
        const ratio = this.slidingWindow.sent > 0
            ? this.slidingWindow.retried / this.slidingWindow.sent
            : 0;
        return ratio <= this.MAX_RETRY_RATE;
    }

    // Called every BUDGET_WINDOW_MS
    flushWindow(): void {
        this.budget.push({ ...this.slidingWindow });
        this.slidingWindow = { sent: 0, retried: 0 };

        // Keep only recent windows
        const maxWindows = 5;
        if (this.budget.length > maxWindows) {
            this.budget.shift();
        }
    }

    getRetryRate(): number {
        const totals = this.budget.reduce(
            (acc, w) => ({
                sent: acc.sent + w.sent,
                retried: acc.retried + w.retried,
            }),
            { sent: 0, retried: 0 }
        );
        return totals.sent > 0 ? totals.retried / totals.sent : 0;
    }
}
```

## Batching and Throttling

### Grouping Notifications

```typescript
interface BatchedNotification {
    id: string;
    payload: object;
    token: string;
    priority: "HIGH" | "NORMAL";
    sendAt: Date;
    ttl: number;
}

class NotificationBatcher {
    private readonly BATCH_WINDOW_MS = 200; // 200ms batching window
    private readonly MAX_BATCH_SIZE = 500;   // FCM batch limit
    private batchQueue: BatchedNotification[] = [];
    private batchTimer: NodeJS.Timeout | null = null;

    async enqueue(notification: BatchedNotification): Promise<void> {
        this.batchQueue.push(notification);

        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.flushBatch(), this.BATCH_WINDOW_MS);
        }

        if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
            await this.flushBatch();
        }
    }

    private async flushBatch(): Promise<void> {
        if (this.batchQueue.length === 0) return;

        const batch = this.batchQueue.splice(0, this.MAX_BATCH_SIZE);
        this.batchTimer = null;

        // Separate by priority
        const highPriority = batch.filter(n => n.priority === "HIGH");
        const normalPriority = batch.filter(n => n.priority === "NORMAL");

        // Send high priority immediately
        if (highPriority.length > 0) {
            await this.sendBatch(highPriority);
        }

        // Batch normal priority can be delayed
        if (normalPriority.length > 0) {
            await this.sendBatch(normalPriority);
        }
    }

    private async sendBatch(batch: BatchedNotification[]): Promise<void> {
        // FCM batch send
        const response = await fcm.sendEach(batch.map(n => ({
            token: n.token,
            notification: n.payload["notification"],
            data: n.payload["data"],
            android: n.payload["android"],
            apns: n.payload["apns"],
            fcmOptions: {
                analyticsLabel: n.payload["analytics_label"],
            },
        })));

        // Handle individual responses
        for (let i = 0; i < response.responses.length; i++) {
            const resp = response.responses[i];
            const notif = batch[i];

            if (resp.error) {
                await this.handleError(notif, resp.error);
            } else {
                logDelivery(notif.id, "sent");
            }
        }
    }
}
```

### Rate Limiting Per Channel

```typescript
class ChannelRateLimiter {
    private channels: Map<string, {
        maxPerSecond: number;
        maxPerMinute: number;
        currentSecond: number;
        currentMinute: number;
        lastSecond: number;
        lastMinute: number;
    }> = new Map();

    constructor() {
        this.initializeChannels();
        // Reset counters every second and minute
        setInterval(() => this.resetSecond(), 1000);
        setInterval(() => this.resetMinute(), 60000);
    }

    private initializeChannels() {
        this.channels.set("fcm", { maxPerSecond: 600, maxPerMinute: 30000,
            currentSecond: 0, currentMinute: 0, lastSecond: Date.now(), lastMinute: Date.now(),
        });
        this.channels.set("apns", { maxPerSecond: 900, maxPerMinute: 45000,
            currentSecond: 0, currentMinute: 0, lastSecond: Date.now(), lastMinute: Date.now(),
        });
        this.channels.set("huawei", { maxPerSecond: 500, maxPerMinute: 20000,
            currentSecond: 0, currentMinute: 0, lastSecond: Date.now(), lastMinute: Date.now(),
        });
        this.channels.set("xiaomi", { maxPerSecond: 300, maxPerMinute: 15000,
            currentSecond: 0, currentMinute: 0, lastSecond: Date.now(), lastMinute: Date.now(),
        });
    }

    async acquire(channel: string): Promise<boolean> {
        const limiter = this.channels.get(channel);
        if (!limiter) return true; // Unknown channel, allow

        const now = Date.now();
        if (now - limiter.lastSecond >= 1000) {
            limiter.currentSecond = 0;
            limiter.lastSecond = now;
        }
        if (now - limiter.lastMinute >= 60000) {
            limiter.currentMinute = 0;
            limiter.lastMinute = now;
        }

        if (limiter.currentSecond >= limiter.maxPerSecond) {
            return false; // Second limit hit
        }
        if (limiter.currentMinute >= limiter.maxPerMinute) {
            return false; // Minute limit hit
        }

        limiter.currentSecond++;
        limiter.currentMinute++;
        return true;
    }

    async waitForSlot(channel: string, timeoutMs: number = 30000): Promise<boolean> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (await this.acquire(channel)) return true;
            await sleep(50); // Poll every 50ms
        }
        return false;
    }
}
```

### Burst Handling

```typescript
class BurstHandler {
    private readonly BURST_THRESHOLD = 1000; // notifications/second
    private readonly SUSTAINED_RATE = 200;    // notifications/second after throttling
    private sendingRate: number = 0;
    private lastCheck: number = Date.now();
    private buffer: BatchedNotification[] = [];

    async send(notification: BatchedNotification): Promise<void> {
        this.updateRate();

        if (this.sendingRate > this.BURST_THRESHOLD) {
            // Buffer the notification — send at sustained rate
            this.buffer.push(notification);
            this.processBuffer();
        } else {
            await this.doSend(notification);
        }
    }

    private updateRate(): void {
        const now = Date.now();
        const elapsed = (now - this.lastCheck) / 1000;
        if (elapsed >= 1) {
            this.sendingRate = this.buffer.length > 0
                ? Math.min(this.sendingRate * 0.5, this.SUSTAINED_RATE)
                : 0;
            this.lastCheck = now;
        }
    }

    private async processBuffer(): Promise<void> {
        while (this.buffer.length > 0) {
            const batch = this.buffer.splice(0, this.SUSTAINED_RATE);
            await Promise.all(batch.map(n => this.doSend(n)));
            await sleep(1000); // 1 second between sustained rate batches
        }
    }

    private async doSend(notification: BatchedNotification): Promise<void> {
        this.sendingRate++;
        await fcm.send(notification.payload);
    }
}
```

## Channel-Specific Delivery Strategies

### FCM (Firebase Cloud Messaging)

```typescript
class FCMDeliveryManager {
    private readonly fcm: FirebaseMessaging;
    private readonly PROJECT_ID: string;
    private readonly MAX_RETRIES = 3;
    private readonly TOKEN_REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days

    constructor() {
        this.fcm = new FirebaseMessaging();
        this.PROJECT_ID = process.env.FCM_PROJECT_ID;
    }

    async send(notification: FCMNotification): Promise<FCMResponse> {
        const message = this.buildMessage(notification);

        try {
            const response = await this.fcm.send(message, {
                dryRun: notification.dryRun ?? false,
            });

            return {
                success: true,
                messageId: response.name.split("/").pop(),
            };
        } catch (error) {
            return this.handleError(notification, error);
        }
    }

    async sendMulticast(notifications: FCMNotification[]): Promise<FCMBatchResponse> {
        const messages = notifications.map(n => this.buildMessage(n));

        const response = await this.fcm.sendEach(messages);

        const results: FCMBatchResponse = {
            total: response.responses.length,
            success: 0,
            failure: 0,
            failures: [],
        };

        for (let i = 0; i < response.responses.length; i++) {
            if (response.responses[i].success) {
                results.success++;
            } else {
                results.failure++;
                const error = response.responses[i].error;
                results.failures.push({
                    index: i,
                    notificationId: notifications[i].id,
                    error: error.message,
                    code: error.code,
                });

                if (error.code === "UNREGISTERED") {
                    await this.handleUnregisteredToken(notifications[i].token);
                }
            }
        }

        return results;
    }

    private buildMessage(notification: FCMNotification): object {
        return {
            token: notification.token,
            notification: notification.alert ? {
                title: notification.alert.title,
                body: notification.alert.body,
                image: notification.alert.imageUrl,
            } : undefined,
            data: notification.data,
            android: {
                priority: notification.priority === "HIGH" ? "HIGH" : "NORMAL",
                ttl: `${notification.ttl ?? 2419200}s`, // Default 28 days
                notification: {
                    channel_id: notification.channelId ?? "default",
                    sound: notification.sound ?? "default",
                    click_action: notification.clickAction,
                    tag: notification.collapseKey,
                    color: notification.color,
                    icon: notification.icon,
                    sticky: notification.sticky ?? false,
                    visibility: notification.visibility ?? "private",
                    notification_count: notification.badgeCount,
                    event_time: notification.eventTime,
                    vibrate_timings: notification.vibrateTimings,
                    light_settings: notification.lightSettings
                        ? {
                            color: notification.lightSettings.color,
                            light_on_duration: notification.lightSettings.onDuration,
                            light_off_duration: notification.lightSettings.offDuration,
                        }
                        : undefined,
                },
                fcm_options: {
                    analytics_label: notification.analyticsLabel,
                },
            },
            apns: {
                headers: {
                    "apns-priority": notification.priority === "HIGH" ? "10" : "5",
                    "apns-expiration": Math.floor(Date.now() / 1000 + (notification.ttl ?? 2419200)).toString(),
                    "apns-topic": notification.bundleId,
                    "apns-collapse-id": notification.collapseKey,
                },
                payload: {
                    aps: {
                        alert: notification.alert ? {
                            title: notification.alert.title,
                            subtitle: notification.alert.subtitle,
                            body: notification.alert.body,
                            "launch-image": notification.alert.launchImage,
                        } : undefined,
                        badge: notification.badgeCount,
                        sound: notification.sound ?? "default",
                        "content-available": notification.contentAvailable ? 1 : undefined,
                        "mutable-content": notification.mutableContent ? 1 : undefined,
                        category: notification.category,
                        "thread-id": notification.threadId,
                    },
                },
            },
            token: notification.token,
        };
    }

    private async handleError(
        notification: FCMNotification,
        error: any
    ): Promise<FCMResponse> {
        switch (error.code) {
            case "UNREGISTERED":
                await this.handleUnregisteredToken(notification.token);
                return { success: false, error: "token_expired" };

            case "INVALID_ARGUMENT":
                return { success: false, error: "invalid_payload" };

            case "QUOTA_EXCEEDED":
            case "UNAVAILABLE":
                if (notification._retryCount < this.MAX_RETRIES) {
                    const delay = Math.pow(2, notification._retryCount) * 1000;
                    await sleep(delay);
                    return this.send({ ...notification, _retryCount: (notification._retryCount ?? 0) + 1 });
                }
                return { success: false, error: "max_retries_exceeded", retryable: true };

            case "INTERNAL":
                return { success: false, error: "internal_error", retryable: true };

            default:
                return { success: false, error: error.code ?? "unknown" };
        }
    }

    private async handleUnregisteredToken(token: string): Promise<void> {
        await db.execute("UPDATE device_tokens SET status = 'invalid' WHERE token = ?", [token]);
        await eventBus.emit("token.expired", { token, timestamp: new Date() });
    }
}
```

### APNs (Apple Push Notification service)

```typescript
class APNSDeliveryManager {
    private readonly apns: APNSClient;
    private readonly TEAM_ID: string;
    private readonly KEY_ID: string;
    private readonly TOPIC: string;
    private readonly BUNDLE_ID: string;
    private connectionPool: APNSConnection[];
    private readonly POOL_SIZE = 5;

    constructor() {
        this.TEAM_ID = process.env.APNS_TEAM_ID;
        this.KEY_ID = process.env.APNS_KEY_ID;
        this.TOPIC = process.env.APNS_TOPIC;
        this.BUNDLE_ID = process.env.IOS_BUNDLE_ID;
        this.connectionPool = [];
    }

    async initialize(): Promise<void> {
        const authKey = await fs.readFile(process.env.APNS_AUTH_KEY_PATH, "utf8");

        for (let i = 0; i < this.POOL_SIZE; i++) {
            const connection = new APNSConnection({
                teamId: this.TEAM_ID,
                keyId: this.KEY_ID,
                signingKey: authKey,
                topic: this.TOPIC,
                production: process.env.NODE_ENV === "production",
            });
            this.connectionPool.push(connection);
        }
    }

    private getConnection(): APNSConnection {
        const index = Math.floor(Math.random() * this.connectionPool.length);
        return this.connectionPool[index];
    }

    async send(notification: APNSNotification): Promise<APNSResponse> {
        const connection = this.getConnection();
        const headers = this.buildHeaders(notification);
        const payload = this.buildPayload(notification);

        try {
            const response = await connection.send(notification.token, payload, headers);
            return {
                success: true,
                apnsId: response.headers["apns-id"],
                statusCode: response.status,
            };
        } catch (error) {
            return this.handleError(notification, error);
        }
    }

    private buildHeaders(notification: APNSNotification): Record<string, string> {
        const headers: Record<string, string> = {
            "apns-topic": this.BUNDLE_ID,
            "apns-priority": notification.priority === "critical" ? "10" : "5",
            "apns-expiration": Math.floor(
                Date.now() / 1000 + (notification.ttl ?? 2592000) // Default 30 days
            ).toString(),
        };

        if (notification.collapseId) {
            headers["apns-collapse-id"] = notification.collapseId;
        }
        if (notification.threadId) {
            headers["apns-thread-id"] = notification.threadId;
        }
        if (notification.pushType) {
            headers["apns-push-type"] = notification.pushType;
        }

        return headers;
    }

    private buildPayload(notification: APNSNotification): object {
        const aps: Record<string, any> = {};

        if (notification.alert) {
            aps.alert = {
                title: notification.alert.title,
                subtitle: notification.alert.subtitle,
                body: notification.alert.body,
                "launch-image": notification.alert.launchImage,
            };
        }

        aps.badge = notification.badge;
        aps.sound = notification.sound ?? "default";
        aps["content-available"] = notification.contentAvailable ? 1 : undefined;
        aps["mutable-content"] = notification.mutableContent ? 1 : undefined;
        aps.category = notification.category;
        aps["thread-id"] = notification.threadId;
        aps["interruption-level"] = notification.interruptionLevel;
        aps["relevance-score"] = notification.relevanceScore;

        return {
            aps,
            ...notification.customData,
        };
    }

    private async handleError(
        notification: APNSNotification,
        error: any
    ): Promise<APNSResponse> {
        switch (error.statusCode) {
            case 400:
                return { success: false, error: "bad_request", reason: error.reason };
            case 403:
                await this.renewCertificate();
                return { success: false, error: "auth_error", retryable: true };
            case 404:
                await this.handleExpiredToken(notification.token);
                return { success: false, error: "token_expired" };
            case 410:
                await this.handleUnregisteredDevice(notification.token, error.headers["apns-unless-timestamp"]);
                return { success: false, error: "device_unregistered" };
            case 413:
                return { success: false, error: "payload_too_large" };
            case 429:
                return { success: false, error: "rate_limited", retryAfter: error.headers["retry-after"] };
            case 500:
            case 503:
                if (notification._retryCount < 3) {
                    const delay = Math.pow(2, notification._retryCount) * 1000;
                    await sleep(delay);
                    return this.send({ ...notification, _retryCount: (notification._retryCount ?? 0) + 1 });
                }
                return { success: false, error: "server_error" };
            default:
                return { success: false, error: "unknown" };
        }
    }
}
```

### Huawei Push Kit

```typescript
class HuaweiPushKitManager {
    private readonly BASE_URL = "https://push-api.cloud.huawei.com/v1";
    private readonly APP_ID: string;
    private readonly APP_SECRET: string;
    private accessToken: string;
    private tokenExpiry: number;

    constructor() {
        this.APP_ID = process.env.HUAWEI_APP_ID;
        this.APP_SECRET = process.env.HUAWEI_APP_SECRET;
    }

    async authenticate(): Promise<void> {
        const response = await fetch(`${this.BASE_URL}/${this.APP_ID}/access_token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: this.APP_ID,
                client_secret: this.APP_SECRET,
            }),
        });

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    }

    async send(notification: HuaweiNotification): Promise<HuaweiResponse> {
        if (Date.now() >= this.tokenExpiry) {
            await this.authenticate();
        }

        const payload = this.buildPayload(notification);

        const response = await fetch(
            `${this.BASE_URL}/${this.APP_ID}/messages:send`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.accessToken}`,
                },
                body: JSON.stringify(payload),
            }
        );

        const result = await response.json();
        return this.handleResponse(result);
    }

    private buildPayload(n: HuaweiNotification): object {
        return {
            validate_only: false,
            message: {
                token: n.token,
                data: JSON.stringify(n.data),
                notification: n.alert ? {
                    title: n.alert.title,
                    body: n.alert.body,
                    image: n.alert.imageUrl,
                    click_action: {
                        type: n.clickActionType ?? 1, // 1 = custom intent
                        intent: n.clickAction,
                        url: n.deepLink,
                    },
                    color: n.color,
                    tag: n.collapseKey,
                    badge: {
                        number: n.badgeCount ?? 0,
                        class: n.badgeClass,
                    },
                    sound: n.sound ?? "default",
                    channel_id: n.channelId ?? "default",
                    importance: n.priority === "HIGH" ? "HIGH" : "NORMAL",
                    visibility: n.visibility ?? "PRIVATE",
                    foreground_show: n.foregroundShow ?? true,
                    notify_summary: n.groupSummary ?? false,
                    group: n.groupId,
                    local_only: n.localOnly ?? false,
                    styled_image: n.styledImage,
                    big_title: n.bigTitle,
                    big_body: n.bigBody,
                    group_alert_type: n.groupAlertType ?? 0,
                    click_action_type: n.clickActionType ?? 1,
                } : undefined,
                android: {
                    ttl: `${n.ttl ?? 86400}s`, // Default 24 hours
                    urgency: n.priority === "HIGH" ? "HIGH" : "NORMAL",
                    category: n.category,
                    bi_tag: n.analyticsLabel,
                    fast_app_target: n.fastAppTarget,
                },
            },
        };
    }
}
```

### Xiaomi MiPush

```typescript
class XiaomiMiPushManager {
    private readonly BASE_URL = "https://api.xmpush.xiaomi.com/v3";
    private readonly APP_SECRET: string;
    private readonly PACKAGE_NAME: string;

    constructor() {
        this.APP_SECRET = process.env.XIAOMI_APP_SECRET;
        this.PACKAGE_NAME = process.env.XIAOMI_PACKAGE_NAME;
    }

    async send(notification: XiaomiNotification): Promise<XiaomiResponse> {
        const payload = new URLSearchParams({
            restricted_package_name: this.PACKAGE_NAME,
            registration_id: notification.token,
            payload: JSON.stringify(notification.data),
            pass_through: notification.passThrough ? "1" : "0",
            notify_type: notification.notifyType ?? "-1", // -1 = all
            notify_id: notification.notifyId ?? "0",
            time_to_live: (notification.ttl ?? 604800).toString(), // Default 7 days
            notify_foreground: notification.notifyForeground ?? "1",
        });

        if (notification.alert) {
            payload.append("title", notification.alert.title);
            payload.append("description", notification.alert.body);
        }

        if (notification.category) {
            payload.append("category", notification.category);
        }

        const response = await fetch(this.BASE_URL + "/message/regid", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `key=${this.APP_SECRET}`,
            },
            body: payload,
        });

        const result = await response.json();
        return {
            success: result.result === "ok",
            messageId: result.trace_id,
            error: result.reason,
        };
    }
}
```

#### Channel-Specific Configuration Comparison

| Feature | FCM | APNs | Huawei | Xiaomi |
|---------|-----|------|--------|--------|
| Max payload | 4 KB | 4 KB | 4 KB | 4 KB |
| TTL max | 28 days | 30 days | 24h (default) | 7 days (default) |
| Token format | String | Hex string | String | String |
| Batch send | `sendEach` (500) | Per-connection | `messages:send` (100) | Per-request |
| Auth method | OAuth2 (JWT) | TLS cert / Token | OAuth2 (client_credentials) | App secret (key) |
| Rate limit | 600/s per project | Varies | 500/s per app | 300/s per app |
| Collapse key | `collapse_key` | `apns-collapse-id` | `tag` | `notify_id` |
| Priority mapping | HIGH/NORMAL | 10/5 | HIGH/NORMAL | Not supported |
| Channel support | `channel_id` | Category | `channel_id` | `category` |
| Image support | Via `image` in notification | Via `mutable-content` + extension | Via `image` in notification | Not natively |
| Delivery receipt | `sendEach` response | HTTP response code | Response code | Response result |

## Notification Channels and Categories

### Android Notification Channels (Android 8+)

```kotlin
class NotificationChannelManager {
    private val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    fun createChannels() {
        val channels = listOf(
            NotificationChannelConfig(
                id = "messages",
                name = "Messages",
                description = "Direct messages from other users",
                importance = NotificationManager.IMPORTANCE_HIGH,
                enableVibration = true,
                enableLights = true,
                lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE,
                showBadge = true,
                bypassDnd = true,
            ),
            NotificationChannelConfig(
                id = "orders",
                name = "Order Updates",
                description = "Shipping confirmations and delivery status",
                importance = NotificationManager.IMPORTANCE_HIGH,
                enableVibration = true,
                enableLights = true,
                lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE,
                showBadge = true,
                bypassDnd = false,
            ),
            NotificationChannelConfig(
                id = "promotions",
                name = "Promotions & Offers",
                description = "Sales, discounts, and promotional content",
                importance = NotificationManager.IMPORTANCE_LOW,
                enableVibration = false,
                enableLights = false,
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC,
                showBadge = false,
                bypassDnd = false,
            ),
            NotificationChannelConfig(
                id = "social",
                name = "Social Activity",
                description = "Likes, comments, and follows",
                importance = NotificationManager.IMPORTANCE_DEFAULT,
                enableVibration = true,
                enableLights = false,
                lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE,
                showBadge = true,
                bypassDnd = false,
            ),
            NotificationChannelConfig(
                id = "security",
                name = "Security Alerts",
                description = "Login notifications and security warnings",
                importance = NotificationManager.IMPORTANCE_HIGH,
                enableVibration = true,
                enableLights = true,
                lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE,
                showBadge = true,
                bypassDnd = true,
            ),
            NotificationChannelConfig(
                id = "silent_updates",
                name = "Background Updates",
                description = "Silent data sync notifications",
                importance = NotificationManager.IMPORTANCE_MIN,
                enableVibration = false,
                enableLights = false,
                lockscreenVisibility = NotificationCompat.VISIBILITY_SECRET,
                showBadge = false,
                bypassDnd = false,
            ),
        )

        channels.forEach { config ->
            val channel = NotificationChannel(
                config.id,
                config.name,
                config.importance
            ).apply {
                description = config.description
                enableVibration(config.enableVibration)
                enableLights(config.enableLights)
                lockscreenVisibility = config.lockscreenVisibility
                setShowBadge(config.showBadge)
                setBypassDnd(config.bypassDnd)
                vibrationPattern = if (config.enableVibration) longArrayOf(0, 100, 200, 100) else null
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun updateChannelImportance(channelId: String, importance: Int) {
        val channel = notificationManager.getNotificationChannel(channelId)
        if (channel != null && channel.importance != importance) {
            channel.importance = importance
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun deleteChannel(channelId: String) {
        notificationManager.deleteNotificationChannel(channelId)
    }

    fun getChannelSettings(): List<ChannelSettings> {
        return notificationManager.notificationChannels.map { channel ->
            ChannelSettings(
                id = channel.id,
                name = channel.name.toString(),
                importance = channel.importance,
                isBlocked = channel.importance == NotificationManager.IMPORTANCE_NONE,
                canBypassDnd = channel.canBypassDnd(),
                showBadge = channel.canShowBadge(),
            )
        }
    }
}

data class NotificationChannelConfig(
    val id: String,
    val name: String,
    val description: String,
    val importance: Int,
    val enableVibration: Boolean,
    val enableLights: Boolean,
    val lockscreenVisibility: Int,
    val showBadge: Boolean,
    val bypassDnd: Boolean,
)

data class ChannelSettings(
    val id: String,
    val name: String,
    val importance: Int,
    val isBlocked: Boolean,
    val canBypassDnd: Boolean,
    val showBadge: Boolean,
)
```

### iOS Notification Categories

```swift
// iOS — Register notification categories with actions
func registerNotificationCategories() {
    // 1. Message category with reply action
    let replyAction = UNTextInputNotificationAction(
        identifier: "REPLY_MESSAGE",
        title: "Reply",
        options: [.authenticationRequired],
        textInputButtonTitle: "Send",
        textInputPlaceholder: "Type your reply..."
    )

    let markAsRead = UNNotificationAction(
        identifier: "MARK_READ",
        title: "Mark as Read",
        options: [.authenticationRequired]
    )

    let messageCategory = UNNotificationCategory(
        identifier: "MESSAGE",
        actions: [replyAction, markAsRead],
        intentIdentifiers: [],
        hiddenPreviewsBodyPlaceholder: "New message",
        categorySummaryFormat: "%u more messages",
        options: [.customDismissAction, .allowInCarPlay]
    )

    // 2. Order category
    let viewOrder = UNNotificationAction(
        identifier: "VIEW_ORDER",
        title: "View Order",
        options: [.foreground]
    )

    let trackPackage = UNNotificationAction(
        identifier: "TRACK_PACKAGE",
        title: "Track Package",
        options: [.foreground]
    )

    let orderCategory = UNNotificationCategory(
        identifier: "ORDER_UPDATE",
        actions: [viewOrder, trackPackage],
        intentIdentifiers: [],
        hiddenPreviewsBodyPlaceholder: "Order update",
        categorySummaryFormat: "%u order updates",
        options: [.customDismissAction]
    )

    // 3. Social category
    let likeAction = UNNotificationAction(
        identifier: "LIKE_POST",
        title: "Like",
        options: [.authenticationRequired]
    )

    let commentAction = UNTextInputNotificationAction(
        identifier: "COMMENT_POST",
        title: "Comment",
        options: [.authenticationRequired],
        textInputButtonTitle: "Post",
        textInputPlaceholder: "Write a comment..."
    )

    let socialCategory = UNNotificationCategory(
        identifier: "SOCIAL_ACTIVITY",
        actions: [likeAction, commentAction],
        intentIdentifiers: [],
        hiddenPreviewsBodyPlaceholder: "Social activity",
        categorySummaryFormat: "%u notifications",
        options: [.allowInCarPlay]
    )

    UNUserNotificationCenter.current().setNotificationCategories([
        messageCategory,
        orderCategory,
        socialCategory,
    ])
}
```

## Scheduling

### Timezone-Aware Delivery

```typescript
class TimezoneAwareScheduler {
    async scheduleAtUserTime(
        userId: string,
        notification: object,
        targetLocalTime: string // "09:00" in user's timezone
    ): Promise<void> {
        const user = await db.query(
            "SELECT timezone, preferred_delivery_hours FROM users WHERE id = ?",
            [userId]
        );

        const [targetHour, targetMinute] = targetLocalTime.split(":").map(Number);
        const now = new Date();

        // Calculate next occurrence of targetLocalTime in user's timezone
        const userDate = new Date(now.toLocaleString("en-US", { timeZone: user.timezone }));
        userDate.setHours(targetHour, targetMinute, 0, 0);

        // If target time has passed today, schedule for tomorrow
        if (userDate <= now) {
            userDate.setDate(userDate.getDate() + 1);
        }

        // Convert to UTC for storage
        const utcScheduledTime = userDate.toISOString();

        await db.execute(
            `INSERT INTO scheduled_notifications
             (user_id, payload, scheduled_at_utc, user_timezone, local_time)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, JSON.stringify(notification), utcScheduledTime, user.timezone, targetLocalTime]
        );
    }
}
```

### Quiet Hours

```typescript
class QuietHoursManager {
    private readonly DEFAULT_QUIET_HOURS = {
        start: "22:00", // 10 PM
        end: "08:00",   // 8 AM
    };

    async shouldDeliver(
        userId: string,
        notification: Notification,
        scheduledAt: Date
    ): Promise<boolean> {
        // Critical/security notifications bypass quiet hours
        if (notification.priority === "critical" || notification.category === "security") {
            return true;
        }

        const user = await db.query(
            "SELECT timezone, quiet_hours_start, quiet_hours_end, quiet_hours_enabled FROM users WHERE id = ?",
            [userId]
        );

        if (!user.quiet_hours_enabled) return true;

        const quietStart = user.quiet_hours_start ?? this.DEFAULT_QUIET_HOURS.start;
        const quietEnd = user.quiet_hours_end ?? this.DEFAULT_QUIET_HOURS.end;

        const localTime = scheduledAt.toLocaleString("en-US", {
            timeZone: user.timezone,
            hour12: false,
        });
        const [hour, minute] = localTime.split(":").map(Number);
        const currentMinutes = hour * 60 + minute;

        const [startHour, startMinute] = quietStart.split(":").map(Number);
        const [endHour, endMinute] = quietEnd.split(":").map(Number);

        const quietStartMinutes = startHour * 60 + startMinute;
        const quietEndMinutes = endHour * 60 + endMinute;

        // Handle overnight quiet hours
        if (quietStartMinutes <= quietEndMinutes) {
            // Same-day range (e.g., 10:00-18:00)
            return currentMinutes < quietStartMinutes || currentMinutes >= quietEndMinutes;
        } else {
            // Overnight range (e.g., 22:00-08:00)
            return currentMinutes >= quietEndMinutes && currentMinutes < quietStartMinutes;
        }
    }

    async scheduleDuringQuietHours(
        userId: string,
        notification: Notification
    ): Promise<Date | null> {
        const shouldDeliver = await this.shouldDeliver(userId, notification, new Date());
        if (shouldDeliver) return new Date(); // Deliver now

        const user = await db.query("SELECT timezone FROM users WHERE id = ?", [userId]);
        const quietEnd = user.quiet_hours_end ?? this.DEFAULT_QUIET_HOURS.end;

        // Schedule at quiet hours end
        const [endHour, endMinute] = quietEnd.split(":").map(Number);
        const now = new Date();
        const nextDelivery = new Date(now.toLocaleString("en-US", { timeZone: user.timezone }));
        nextDelivery.setHours(endHour, endMinute, 0, 0);

        if (nextDelivery <= now) {
            nextDelivery.setDate(nextDelivery.getDate() + 1);
        }

        return nextDelivery;
    }
}
```

### Smart Scheduling

```typescript
class SmartScheduler {
    async findOptimalTime(
        userId: string,
        notificationType: string
    ): Promise<string> {
        // Analyze user's historical engagement patterns
        const engagementData = await db.query(
            `SELECT
                HOUR(created_at) as hour,
                COUNT(*) as total,
                SUM(CASE WHEN clicked = 1 THEN 1 ELSE 0 END) as clicks
             FROM notification_events
             WHERE user_id = ?
               AND notification_type = ?
               AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY HOUR(created_at)
             ORDER BY clicks / total DESC
             LIMIT 3`,
            [userId, notificationType]
        );

        if (engagementData.length > 0) {
            // Return the hour with highest engagement rate
            const bestHour = engagementData[0].hour;
            return `${bestHour.toString().padStart(2, "0")}:00`;
        }

        // Fall back to segment-based defaults
        const user = await db.query("SELECT segment FROM users WHERE id = ?", [userId]);
        const segmentDefaults: Record<string, string> = {
            "morning_people": "08:00",
            "evening_browsers": "19:00",
            "lunch_breakers": "12:30",
            "commuters": "08:30",
        };

        return segmentDefaults[user.segment] ?? "10:00";
    }

    async scoreTimeSlot(
        userId: string,
        hour: number
    ): Promise<number> {
        const user = await db.query(
            `SELECT timezone, segment FROM users WHERE id = ?`,
            [userId]
        );

        // Factors that influence optimal delivery time
        const historicalEngagement = await this.getHourlyEngagement(userId, hour);
        const segmentAffinity = this.getSegmentAffinity(user.segment, hour);
        const timezoneOffset = this.getTimezoneOffset(user.timezone, hour);

        return (historicalEngagement * 0.5) +
               (segmentAffinity * 0.3) +
               (timezoneOffset * 0.2);
    }

    private async getHourlyEngagement(userId: string, hour: number): Promise<number> {
        const stats = await db.query(
            `SELECT
                AVG(CASE WHEN clicked = 1 THEN 1 ELSE 0 END) as click_rate
             FROM notification_events
             WHERE user_id = ? AND HOUR(created_at) = ?
               AND created_at > DATE_SUB(NOW(), INTERVAL 14 DAY)`,
            [userId, hour]
        );
        return stats?.click_rate ?? 0;
    }

    private getSegmentAffinity(segment: string, hour: number): number {
        const affinities: Record<string, number[]> = {
            "morning_people": [0.9, 0.8, 0.4, 0.2, 0.1, 0.1, 0.3, 0.7, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2, 0.1, 0.1, 0.2],
            "night_owls": [0.2, 0.1, 0.1, 0.1, 0.2, 0.3, 0.4, 0.3, 0.2, 0.3, 0.4, 0.5, 0.6, 0.5, 0.6, 0.7, 0.8, 0.9, 0.9, 0.8, 0.7, 0.6, 0.5, 0.3],
        };
        return affinities[segment]?.[hour] ?? 0.5;
    }

    private getTimezoneOffset(timezone: string, hour: number): number {
        // Normalize hour to UTC and check if it's a reasonable delivery hour (8 AM - 10 PM)
        const utcHour = hour - this.getTimezoneOffsetHours(timezone);
        return (utcHour >= 0 && utcHour < 14) ? 1.0 : 0.0; // 0-14 UTC = reasonable
    }

    private getTimezoneOffsetHours(timezone: string): number {
        const offsetStr = new Date()
            .toLocaleString("en-US", { timeZone: timezone, timeZoneName: "short" })
            .match(/UTC[+-]?\d+/)?.[0]
            ?.replace("UTC", "") ?? "0";
        return parseInt(offsetStr, 10);
    }
}
```

## Delivery Tracking and Analytics

### Delivery Receipts

```typescript
class DeliveryTracker {
    private readonly eventBus: EventBus;

    constructor() {
        this.eventBus = new EventBus();
    }

    async recordSend(notificationId: string, token: string): Promise<void> {
        await db.execute(
            `INSERT INTO delivery_events (notification_id, token, event_type, timestamp)
             VALUES (?, ?, 'sent', NOW())`,
            [notificationId, token]
        );
        this.eventBus.emit("notification.sent", { notificationId, token, timestamp: new Date() });
    }

    async recordDelivery(notificationId: string, token: string): Promise<void> {
        await db.execute(
            `UPDATE delivery_events
             SET event_type = 'delivered', delivered_at = NOW()
             WHERE notification_id = ? AND token = ? AND event_type = 'sent'`,
            [notificationId, token]
        );
        this.eventBus.emit("notification.delivered", { notificationId, token, timestamp: new Date() });
    }

    async recordOpen(notificationId: string, userId: string): Promise<void> {
        await db.execute(
            `UPDATE delivery_events
             SET event_type = 'opened', opened_at = NOW()
             WHERE notification_id = ? AND event_type = 'delivered'`,
            [notificationId]
        );
        this.eventBus.emit("notification.opened", { notificationId, userId, timestamp: new Date() });
    }

    async recordDismiss(notificationId: string, token: string): Promise<void> {
        await db.execute(
            `UPDATE delivery_events
             SET event_type = 'dismissed', dismissed_at = NOW()
             WHERE notification_id = ? AND token = ? AND event_type = 'delivered'`,
            [notificationId, token]
        );
        this.eventBus.emit("notification.dismissed", { notificationId, token, timestamp: new Date() });
    }

    async recordClick(notificationId: string, userId: string, action: string): Promise<void> {
        await db.execute(
            `UPDATE delivery_events
             SET event_type = 'clicked', clicked_at = NOW(), click_action = ?
             WHERE notification_id = ?`,
            [action, notificationId]
        );
        this.eventBus.emit("notification.clicked", { notificationId, userId, action, timestamp: new Date() });
    }

    async getNotificationMetrics(
        notificationId: string
    ): Promise<NotificationMetrics> {
        const stats = await db.query(
            `SELECT
                COUNT(*) as sent,
                SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
                SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked,
                SUM(CASE WHEN dismissed_at IS NOT NULL THEN 1 ELSE 0 END) as dismissed
             FROM delivery_events
             WHERE notification_id = ?`,
            [notificationId]
        );

        return {
            sent: stats.sent,
            delivered: stats.delivered,
            opened: stats.opened,
            clicked: stats.clicked,
            dismissed: stats.dismissed,
            deliveryRate: stats.delivered / stats.sent,
            openRate: stats.opened / stats.delivered,
            clickRate: stats.clicked / stats.opened,
        };
    }
}

interface NotificationMetrics {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    dismissed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
}
```

### Open Tracking

```typescript
// Server-side — generate tracking URL
function generateTrackingUrl(
    notificationId: string,
    userId: string,
    destination: string
): string {
    const payload = Buffer.from(
        JSON.stringify({ nid: notificationId, uid: userId, dest: destination })
    ).toString("base64");

    const signature = crypto
        .createHmac("sha256", process.env.TRACKING_SECRET)
        .update(payload)
        .digest("hex");

    return `https://track.example.com/click?d=${payload}&s=${signature}`;
}
```

```json
// Notification payload with tracking URL
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "Flash Sale!",
      "body": "50% off — ends tonight"
    },
    "data": {
      "t": "promotion",
      "url": "https://track.example.com/click?d=eyJuaWQiOiIxMjMifQ==&s=abc123",
      "impression_url": "https://track.example.com/impression?nid=123"
    }
  }
}
```

```typescript
// Tracking endpoint
app.get("/click", async (req, res) => {
    const { d, s } = req.query;

    // Verify signature
    const expectedSig = crypto
        .createHmac("sha256", process.env.TRACKING_SECRET)
        .update(d)
        .digest("hex");

    if (s !== expectedSig) {
        return res.status(403).send("Invalid signature");
    }

    const { nid, uid, dest } = JSON.parse(
        Buffer.from(d, "base64").toString()
    );

    // Record the click
    await deliveryTracker.recordClick(nid, uid, "open");

    // Redirect to destination
    res.redirect(302, dest);
});
```

### Conversion Tracking

```typescript
class ConversionTracker {
    async trackAttribution(
        userId: string,
        conversionEvent: string,
        conversionValue: number,
        lookbackWindowHours: number = 72
    ): Promise<ConversionAttribution> {
        // Find notifications in the lookback window that led to this conversion
        const notifications = await db.query(
            `SELECT
                n.id,
                n.campaign_id,
                n.notification_type,
                n.sent_at,
                ne.opened_at
             FROM delivery_events de
             JOIN notifications n ON de.notification_id = n.id
             LEFT JOIN notification_events ne ON ne.notification_id = n.id AND ne.user_id = ?
             WHERE de.user_id = ?
               AND de.event_type = 'opened'
               AND de.opened_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
               AND de.opened_at <= NOW()
             ORDER BY de.opened_at DESC
             LIMIT 10`,
            [userId, userId, lookbackWindowHours]
        );

        if (notifications.length === 0) {
            return { attributed: false, attributionModel: "none" };
        }

        // Record conversion
        await db.execute(
            `INSERT INTO conversion_events
             (user_id, event_name, value, attributed_notification_id, attributed_campaign_id, timestamp)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [
                userId,
                conversionEvent,
                conversionValue,
                notifications[0].id,
                notifications[0].campaign_id,
            ]
        );

        return {
            attributed: true,
            attributionModel: "last_click",
            notificationId: notifications[0].id,
            campaignId: notifications[0].campaign_id,
            timeToConversion: Math.round(
                (Date.now() - new Date(notifications[0].opened_at).getTime()) / 1000
            ),
        };
    }
}

interface ConversionAttribution {
    attributed: boolean;
    attributionModel: string;
    notificationId?: string;
    campaignId?: string;
    timeToConversion?: number;
}
```

## Delivery Reliability

### Handling Network Failures

```typescript
class ResilientDeliveryService {
    private readonly retryStrategy: RetryStrategy;
    private readonly circuitBreaker: CircuitBreaker;

    constructor() {
        this.retryStrategy = new RetryStrategy({
            baseDelayMs: 1000,
            maxDelayMs: 60000,
            maxRetries: 5,
        });

        this.circuitBreaker = new CircuitBreaker({
            failureThreshold: 10,
            successThreshold: 5,
            timeoutMs: 30000,
        });
    }

    async deliver(notification: Notification): Promise<DeliveryResult> {
        return this.circuitBreaker.execute(async () => {
            return this.retryStrategy.execute(async () => {
                const channel = this.getDeliveryChannel(notification.platform);
                return channel.send(notification);
            }, `deliver:${notification.id}`);
        });
    }

    private getDeliveryChannel(platform: string): DeliveryChannel {
        const channels: Record<string, DeliveryChannel> = {
            android: new FCMDeliveryManager(),
            ios: new APNSDeliveryManager(),
            huawei: new HuaweiPushKitManager(),
            xiaomi: new XiaomiMiPushManager(),
        };
        return channels[platform];
    }
}

class CircuitBreaker {
    private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
    private failureCount: number = 0;
    private successCount: number = 0;
    private lastFailureTime: number = 0;
    private readonly failureThreshold: number;
    private readonly successThreshold: number;
    private readonly timeoutMs: number;

    constructor(options: {
        failureThreshold: number;
        successThreshold: number;
        timeoutMs: number;
    }) {
        this.failureThreshold = options.failureThreshold;
        this.successThreshold = options.successThreshold;
        this.timeoutMs = options.timeoutMs;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === "OPEN") {
            if (Date.now() - this.lastFailureTime >= this.timeoutMs) {
                this.state = "HALF_OPEN";
            } else {
                throw new Error("Circuit breaker is OPEN");
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        if (this.state === "HALF_OPEN") {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = "CLOSED";
                this.failureCount = 0;
                this.successCount = 0;
            }
        } else {
            this.failureCount = 0;
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = "OPEN";
        }
    }
}
```

### Token Expiration and Refresh

```typescript
class TokenLifecycleManager {
    async validateToken(token: string): Promise<TokenStatus> {
        const record = await db.query(
            "SELECT * FROM device_tokens WHERE token = ?",
            [token]
        );

        if (!record) return { valid: false, reason: "not_found" };

        // Check token age — FCM tokens can change
        const tokenAge = Date.now() - new Date(record.created_at).getTime();
        const MAX_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (tokenAge > MAX_TOKEN_AGE && !record.last_validated) {
            return { valid: false, reason: "stale", needsValidation: true };
        }

        if (record.status === "invalid") {
            return { valid: false, reason: "invalidated" };
        }

        return { valid: true };
    }

    async handleInvalidToken(token: string, reason: string): Promise<void> {
        await db.execute(
            `UPDATE device_tokens
             SET status = 'invalid', invalidated_at = NOW(), invalidation_reason = ?
             WHERE token = ?`,
            [reason, token]
        );

        // Notify the user's other devices or app instance
        const userDevice = await db.query(
            "SELECT user_id FROM device_tokens WHERE token = ?",
            [token]
        );

        if (userDevice) {
            await eventBus.emit("token.invalidated", {
                userId: userDevice.user_id,
                token,
                reason,
                timestamp: new Date(),
            });
        }
    }

    async refreshToken(oldToken: string, newToken: string): Promise<void> {
        await db.transaction(async (trx) => {
            // Mark old token as replaced
            await trx.execute(
                "UPDATE device_tokens SET status = 'replaced', replaced_at = NOW() WHERE token = ?",
                [oldToken]
            );

            // Create or update new token
            const existingNew = await trx.query(
                "SELECT id FROM device_tokens WHERE token = ?",
                [newToken]
            );

            if (existingNew) {
                await trx.execute(
                    "UPDATE device_tokens SET status = 'active', last_seen = NOW() WHERE token = ?",
                    [newToken]
                );
            } else {
                // Copy relevant metadata from old token
                const oldRecord = await trx.query(
                    "SELECT user_id, platform, app_version FROM device_tokens WHERE token = ?",
                    [oldToken]
                );

                await trx.execute(
                    `INSERT INTO device_tokens (token, user_id, platform, app_version, status, created_at, last_seen)
                     VALUES (?, ?, ?, ?, 'active', NOW(), NOW())`,
                    [newToken, oldRecord.user_id, oldRecord.platform, oldRecord.app_version]
                );
            }
        });
    }
}
```

### Device Unregistering

```typescript
class DeviceRegistrationManager {
    async unregister(token: string, reason: string): Promise<void> {
        await db.transaction(async (trx) => {
            const device = await trx.query(
                "SELECT user_id, platform FROM device_tokens WHERE token = ? FOR UPDATE",
                [token]
            );

            if (!device) return;

            await trx.execute(
                `UPDATE device_tokens
                 SET status = 'unregistered',
                     unregistered_at = NOW(),
                     unregistration_reason = ?
                 WHERE token = ?`,
                [reason, token]
            );

            // Clean up any pending notifications for this device
            await trx.execute(
                `UPDATE scheduled_notifications
                 SET status = 'cancelled',
                     cancellation_reason = 'device_unregistered'
                 WHERE token = ? AND status = 'pending'`,
                [token]
            );

            await eventBus.emit("device.unregistered", {
                userId: device.user_id,
                token,
                platform: device.platform,
                reason,
                timestamp: new Date(),
            });
        });
    }

    async getActiveDevices(userId: string): Promise<DeviceInfo[]> {
        return db.query(
            `SELECT token, platform, app_version, last_seen, created_at
             FROM device_tokens
             WHERE user_id = ?
               AND status = 'active'
               AND last_seen > DATE_SUB(NOW(), INTERVAL 30 DAY)
             ORDER BY last_seen DESC`,
            [userId]
        );
    }
}
```

## Rich Media Delivery

### Images and Videos

```json
// FCM — image in notification
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "New post from Sarah",
      "body": "Check out my latest photo!",
      "image": "https://cdn.example.com/photos/sarah_2026.jpg"
    }
  }
}
```

```json
// APNs — requires Notification Service Extension
{
  "aps": {
    "alert": {
      "title": "New post",
      "body": "Check out my latest photo"
    },
    "mutable-content": 1
  },
  "media-url": "https://cdn.example.com/videos/preview.mp4",
  "media-type": "video"
}
```

#### Notification Service Extension (iOS)

```swift
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = self.bestAttemptContent,
              let mediaUrlString = bestAttemptContent.userInfo["media-url"] as? String,
              let mediaUrl = URL(string: mediaUrlString) else {
            contentHandler(request.content)
            return
        }

        downloadAndAttachMedia(mediaUrl, to: bestAttemptContent, contentHandler: contentHandler)
    }

    private func downloadAndAttachMedia(
        _ url: URL,
        to content: UNMutableNotificationContent,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        let task = URLSession.shared.downloadTask(with: url) { (downloadedUrl, _, error) in
            defer { contentHandler(content) }

            guard let downloadedUrl = downloadedUrl, error == nil else { return }

            let mediaType: String
            if url.pathExtension.lowercased() == "mp4" {
                mediaType = "mp4"
            } else if ["jpg", "jpeg", "png", "gif"].contains(url.pathExtension.lowercased()) {
                mediaType = url.pathExtension.lowercased()
            } else {
                return
            }

            let attachment = try? UNNotificationAttachment(
                identifier: "media",
                url: downloadedUrl,
                options: [UNNotificationAttachmentOptionsTypeHintKey: mediaType]
            )

            if let attachment = attachment {
                content.attachments = [attachment]
            }
        }
        task.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        // Called if extension takes too long (>30s)
        if let contentHandler = contentHandler, let content = bestAttemptContent {
            content.attachments = []
            contentHandler(content)
        }
    }
}
```

### Carousel Notifications

```java
// Android — carousel notification using NotificationCompat.Carousel
public class CarouselNotificationBuilder {
    public static Notification buildCarouselNotification(
        Context context, List<CarouselItem> items
    ) {
        NotificationCompat.CarouselExtender extender = new NotificationCompat.CarouselExtender();

        for (int i = 0; i < Math.min(items.size(), 10); i++) {
            CarouselItem item = items.get(i);

            NotificationCompat.Builder pageBuilder = new NotificationCompat.Builder(context, "carousel")
                .setContentTitle(item.title)
                .setContentText(item.description)
                .setLargeIcon(item.imageBitmap)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(item.pendingIntent);

            extender.addPage(pageBuilder.build());
        }

        return new NotificationCompat.Builder(context, "carousel")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(items.get(0).title)
            .setContentText(items.get(0).description)
            .extend(extender)
            .setGroup("carousel")
            .setAutoCancel(true)
            .build();
    }
}

class CarouselItem {
    String title;
    String description;
    Bitmap imageBitmap;
    PendingIntent pendingIntent;
}
```

### Interactive Notifications

```json
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "Meeting in 5 minutes",
      "body": "Project standup — join now"
    },
    "data": {
      "t": "meeting_reminder",
      "actions": [
        {"id": "join", "title": "Join", "icon": "video_cam", "foreground": true},
        {"id": "snooze_5", "title": "Snooze 5min", "icon": "alarm"},
        {"id": "decline", "title": "Decline", "icon": "close", "destructive": true}
      ]
    }
  }
}
```

```kotlin
// Android — action buttons
class MeetingNotificationBuilder {
    fun build(context: Context, meeting: MeetingInfo): Notification {
        val joinIntent = Intent(context, MeetingActivity::class.java).apply {
            putExtra("meeting_id", meeting.id)
            action = "ACTION_JOIN_MEETING"
        }
        val joinPendingIntent = PendingIntent.getActivity(
            context, 0, joinIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val snoozeIntent = Intent(context, NotificationReceiver::class.java).apply {
            putExtra("meeting_id", meeting.id)
            action = "ACTION_SNOOZE_MEETING"
        }
        val snoozePendingIntent = PendingIntent.getBroadcast(
            context, 1, snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val declineIntent = Intent(context, NotificationReceiver::class.java).apply {
            putExtra("meeting_id", meeting.id)
            action = "ACTION_DECLINE_MEETING"
        }
        val declinePendingIntent = PendingIntent.getBroadcast(
            context, 2, declineIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(context, "meetings")
            .setSmallIcon(R.drawable.ic_calendar)
            .setContentTitle("Meeting in 5 minutes")
            .setContentText(meeting.title)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .addAction(R.drawable.ic_video, "Join", joinPendingIntent)
            .addAction(R.drawable.ic_snooze, "Snooze 5min", snoozePendingIntent)
            .addAction(R.drawable.ic_close, "Decline", declinePendingIntent)
            .setAutoCancel(true)
            .build()
    }
}
```

## Local Notification Fallback

```typescript
class LocalNotificationFallback {
    async shouldUseLocalFallback(notification: ScheduledNotification): Promise<boolean> {
        // Check if push is likely to fail
        const device = await db.query(
            "SELECT last_seen, status FROM device_tokens WHERE user_id = ? AND platform = ?",
            [notification.userId, notification.platform]
        );

        if (!device || device.status !== "active") return true;

        // Check if device was recently active
        const inactiveThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        if (new Date(device.last_seen).getTime() < inactiveThreshold) return true;

        return false;
    }

    async scheduleLocalFallback(
        userId: string,
        notification: Notification
    ): Promise<void> {
        // Store notification for local scheduling when app opens
        await db.execute(
            `INSERT INTO local_notification_queue
             (user_id, payload, scheduled_at, created_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW())`,
            [userId, JSON.stringify(notification)]
        );
    }
}
```

```swift
// iOS — Schedule local notification as fallback
func scheduleLocalFallback(notification: PushNotification) {
    let content = UNMutableNotificationContent()
    content.title = notification.title
    content.body = notification.body
    content.sound = .default

    // Only schedule if we haven't received a remote push for this notification
    let request = UNNotificationRequest(
        identifier: "fallback_\(notification.id)",
        content: content,
        trigger: UNTimeIntervalNotificationTrigger(timeInterval: 300, repeats: false) // 5 min
    )

    UNUserNotificationCenter.current().add(request) { error in
        if let error = error {
            print("Failed to schedule local fallback: \(error.localizedDescription)")
        }
    }
}

// Cancel fallback when remote push arrives
func cancelLocalFallback(notificationId: String) {
    UNUserNotificationCenter.current()
        .removePendingNotificationRequests(withIdentifiers: ["fallback_\(notificationId)"])
}
```

## Content-Available / Silent Notifications

```json
// Silent notification for background sync
{
  "aps": {
    "content-available": 1
  },
  "sync_type": "incremental",
  "last_sync_version": 42,
  "updated_entities": ["messages", "contacts"]
}
```

```swift
// iOS — Handling silent notifications
func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
) {
    guard let syncType = userInfo["sync_type"] as? String else {
        completionHandler(.noData)
        return
    }

    Task {
        do {
            switch syncType {
            case "full":
                try await performFullSync()
            case "incremental":
                let lastVersion = userInfo["last_sync_version"] as? Int ?? 0
                try await performIncrementalSync(since: lastVersion)
            default:
                completionHandler(.noData)
                return
            }
            completionHandler(.newData)
        } catch {
            completionHandler(.failed)
        }
    }
}
```

```kotlin
// Android — Silent data message handling
class SilentNotificationHandler {
    private val syncManager: SyncManager

    fun handleSilentNotification(data: Map<String, String>) {
        when (data["sync_type"]) {
            "incremental" -> {
                val lastVersion = data["last_sync_version"]?.toIntOrNull() ?: 0
                CoroutineScope(Dispatchers.IO).launch {
                    syncManager.performIncrementalSync(lastVersion)
                }
            }
            "invalidate_cache" -> {
                val entities = data["entities"]?.split(",") ?: emptyList()
                CacheManager.invalidateCache(entities)
            }
            "refresh_content" -> {
                val contentId = data["content_id"]
                if (contentId != null) {
                    ContentPrefetcher.prefetch(contentId)
                }
            }
        }
    }
}
```

## Notification Grouping and Summary

### Android Notification Groups

```kotlin
class GroupedNotificationBuilder {
    fun buildMessageNotification(
        context: Context,
        chatId: String,
        chatName: String,
        messages: List<Message>
    ): Notification {
        val groupKey = "chat_$chatId"

        // Generate summary notification
        val summaryNotification = NotificationCompat.Builder(context, "messages")
            .setSmallIcon(R.drawable.ic_chat)
            .setContentTitle("$chatName (${messages.size})")
            .setContentText("${messages.size} new messages")
            .setGroup(groupKey)
            .setGroupSummary(true)
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_SUMMARY)
            .setAutoCancel(true)
            .build()

        // Generate individual messages
        for (message in messages) {
            val notification = NotificationCompat.Builder(context, "messages")
                .setSmallIcon(R.drawable.ic_message)
                .setContentTitle(message.senderName)
                .setContentText(message.text)
                .setGroup(groupKey)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
                .setContentIntent(createChatIntent(context, chatId))
                .setAutoCancel(true)
                .build()

            notificationManager.notify("messages", message.hashCode(), notification)
        }

        return summaryNotification
    }
}
```

### iOS threadIdentifier

```json
{
  "aps": {
    "alert": {
      "title": "Sarah",
      "body": "Are you coming to the party?"
    },
    "thread-id": "chat_42",
    "category": "MESSAGE"
  }
}
```

```swift
// iOS — Notification grouping by thread
// All notifications with the same thread-id are grouped in the notification center

// Configuring summary format in notification category
let messageCategory = UNNotificationCategory(
    identifier: "MESSAGE",
    actions: [replyAction, markAsRead],
    intentIdentifiers: [],
    hiddenPreviewsBodyPlaceholder: "New message",
    categorySummaryFormat: "%u more messages from %@",
    options: [.customDismissAction]
)

// The %@ argument can be set via the threadIdentifier
// iOS will automatically group notifications with the same thread-id
```

## Delivery Infrastructure

### Push Notification Services

```typescript
class PushServiceFactory {
    static create(platform: string): PushService {
        switch (platform) {
            case "android":
                return new FCMService({
                    projectId: process.env.FCM_PROJECT_ID,
                    credentials: process.env.FCM_CREDENTIALS_PATH,
                });
            case "ios":
                return new APNSService({
                    teamId: process.env.APNS_TEAM_ID,
                    keyId: process.env.APNS_KEY_ID,
                    keyPath: process.env.APNS_KEY_PATH,
                    topic: process.env.APNS_TOPIC,
                    environment: process.env.NODE_ENV === "production" ? "production" : "development",
                });
            case "huawei":
                return new HuaweiPushService({
                    appId: process.env.HUAWEI_APP_ID,
                    appSecret: process.env.HUAWEI_APP_SECRET,
                });
            case "xiaomi":
                return new XiaomiPushService({
                    appSecret: process.env.XIAOMI_APP_SECRET,
                    packageName: process.env.XIAOMI_PACKAGE_NAME,
                });
            default:
                throw new Error(`Unknown platform: ${platform}`);
        }
    }
}
```

### Connection Pooling

```typescript
class APNSConnectionPool {
    private connections: APNSConnection[] = [];
    private readonly poolSize: number;
    private readonly connectionConfig: APNSConfig;
    private healthCheckInterval: NodeJS.Timeout;

    constructor(config: APNSConfig, poolSize: number = 5) {
        this.connectionConfig = config;
        this.poolSize = poolSize;
    }

    async initialize(): Promise<void> {
        for (let i = 0; i < this.poolSize; i++) {
            const conn = new APNSConnection(this.connectionConfig);
            await conn.connect();
            this.connections.push(conn);
        }

        // Health check every 60 seconds
        this.healthCheckInterval = setInterval(
            () => this.healthCheck(),
            60000
        );
    }

    async acquire(): Promise<APNSConnection> {
        // Find healthy connection with least load
        let bestConnection = this.connections[0];
        let lowestLoad = bestConnection.currentLoad;

        for (const conn of this.connections) {
            if (!conn.isHealthy) continue;
            if (conn.currentLoad < lowestLoad) {
                bestConnection = conn;
                lowestLoad = conn.currentLoad;
            }
        }

        if (!bestConnection.isHealthy) {
            // Reconnect failed connections
            await this.reconnectFailed();
            bestConnection = this.connections[0];
        }

        bestConnection.currentLoad++;
        return bestConnection;
    }

    async release(connection: APNSConnection): Promise<void> {
        connection.currentLoad--;
    }

    private async healthCheck(): Promise<void> {
        for (const conn of this.connections) {
            try {
                const healthy = await conn.ping();
                conn.isHealthy = healthy;
            } catch {
                conn.isHealthy = false;
            }
        }
    }

    private async reconnectFailed(): Promise<void> {
        for (const conn of this.connections) {
            if (!conn.isHealthy) {
                try {
                    await conn.reconnect();
                    conn.isHealthy = true;
                } catch (error) {
                    console.error("Failed to reconnect APNs connection:", error);
                }
            }
        }
    }

    async shutdown(): Promise<void> {
        clearInterval(this.healthCheckInterval);
        await Promise.all(this.connections.map(c => c.disconnect()));
    }
}
```

### Certificate Management

```typescript
class CertificateManager {
    private certificates: Map<string, CertificateEntry> = new Map();
    private renewalTimers: Map<string, NodeJS.Timeout> = new Map();

    async loadCertificate(key: string, certPath: string): Promise<CertificateEntry> {
        const certData = await fs.readFile(certPath, "utf8");
        const cert = new forge.pki.certificateFromPem(certData);

        const entry: CertificateEntry = {
            data: certData,
            expiresAt: cert.validity.notAfter,
            issuer: cert.issuer.getField("CN")?.value ?? "Unknown",
            fingerprint: forge.md.sha256.create().update(certData).digest().toHex(),
        };

        this.certificates.set(key, entry);

        // Schedule automatic renewal reminder (30 days before expiry)
        const renewalDate = new Date(entry.expiresAt.getTime() - 30 * 24 * 60 * 60 * 1000);
        const delay = renewalDate.getTime() - Date.now();

        if (delay > 0) {
            const timer = setTimeout(() => {
                this.notifyCertificateExpiry(key, entry);
            }, delay);
            this.renewalTimers.set(key, timer);
        }

        return entry;
    }

    async rotateCertificate(
        key: string,
        newCertPath: string,
        newKeyPath: string
    ): Promise<void> {
        // Load new certificate
        const newEntry = await this.loadCertificate(key, newCertPath);

        // Update all connections with new certificate
        await eventBus.emit("certificate.rotated", {
            key,
            fingerprint: newEntry.fingerprint,
            expiresAt: newEntry.expiresAt,
        });

        // Stop old renewal timer
        const oldTimer = this.renewalTimers.get(key);
        if (oldTimer) clearTimeout(oldTimer);
    }

    async validateCertificate(key: string): Promise<CertificateStatus> {
        const entry = this.certificates.get(key);
        if (!entry) return { valid: false, reason: "not_found" };

        const now = new Date();
        const daysUntilExpiry = Math.floor(
            (entry.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        return {
            valid: entry.expiresAt > now,
            expiresAt: entry.expiresAt,
            daysUntilExpiry,
            needsRenewal: daysUntilExpiry < 30,
            fingerprint: entry.fingerprint,
        };
    }

    private async notifyCertificateExpiry(key: string, entry: CertificateEntry): Promise<void> {
        await eventBus.emit("certificate.expiring", {
            key,
            expiresAt: entry.expiresAt,
            daysRemaining: 30,
        });
    }
}

interface CertificateEntry {
    data: string;
    expiresAt: Date;
    issuer: string;
    fingerprint: string;
}

interface CertificateStatus {
    valid: boolean;
    reason?: string;
    expiresAt?: Date;
    daysUntilExpiry?: number;
    needsRenewal?: boolean;
    fingerprint?: string;
}
```

## Performance Optimization

### Reducing Latency

```typescript
class LatencyOptimizer {
    private readonly LATENCY_P95_TARGET_MS = 500;
    private metrics: Map<string, number[]> = new Map();

    async measureLatency(
        platform: string,
        sendFn: () => Promise<any>
    ): Promise<number> {
        const start = performance.now();
        try {
            await sendFn();
            const latency = performance.now() - start;
            this.recordLatency(platform, latency);
            return latency;
        } catch (error) {
            const latency = performance.now() - start;
            this.recordLatency(platform, latency);
            throw error;
        }
    }

    private recordLatency(platform: string, latency: number): void {
        if (!this.metrics.has(platform)) {
            this.metrics.set(platform, []);
        }

        const samples = this.metrics.get(platform);
        samples.push(latency);

        // Keep only last 1000 samples
        if (samples.length > 1000) {
            samples.shift();
        }
    }

    getP95Latency(platform: string): number {
        const samples = this.metrics.get(platform);
        if (!samples || samples.length === 0) return 0;

        const sorted = [...samples].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * 0.95) - 1;
        return sorted[index];
    }

    async optimizeDelivery(
        notification: Notification
    ): Promise<DeliveryStrategy> {
        const p95 = this.getP95Latency(notification.platform);

        if (p95 > this.LATENCY_P95_TARGET_MS) {
            // Use parallel push across redundant connections
            return {
                strategy: "parallel",
                connections: 2,
                useWarmConnection: true,
            };
        }

        return {
            strategy: "normal",
            connections: 1,
            useWarmConnection: false,
        };
    }
}
```

### Connection Warmup

```typescript
class ConnectionWarmupManager {
    private warmConnections: Map<string, WarmConnection> = new Map();
    private readonly WARMUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

    constructor() {
        // Periodically warm connections for expected traffic
        setInterval(() => this.warmup(), this.WARMUP_INTERVAL);
    }

    async warmup(): Promise<void> {
        const expectedTraffic = await this.predictTraffic();

        for (const [platform, count] of Object.entries(expectedTraffic)) {
            const connectionsNeeded = Math.ceil(count / 1000); // 1000 req/s per connection
            const currentWarm = this.warmConnections.get(platform)?.count ?? 0;

            if (connectionsNeeded > currentWarm) {
                await this.addWarmConnections(platform, connectionsNeeded - currentWarm);
            } else if (connectionsNeeded < currentWarm) {
                this.removeWarmConnections(platform, currentWarm - connectionsNeeded);
            }
        }
    }

    private async predictTraffic(): Promise<Record<string, number>> {
        const hour = new Date().getHours();
        const dayOfWeek = new Date().getDay();

        // Query historical traffic patterns
        const patterns = await db.query(
            `SELECT platform, AVG(count) as avg_count
             FROM notification_traffic
             WHERE HOUR(timestamp) = ? AND DAYOFWEEK(timestamp) = ?
               AND timestamp > DATE_SUB(NOW(), INTERVAL 28 DAY)
             GROUP BY platform`,
            [hour, dayOfWeek]
        );

        const result: Record<string, number> = {};
        for (const p of patterns) {
            result[p.platform] = Math.ceil(p.avg_count);
        }
        return result;
    }

    async getWarmConnection(platform: string): Promise<WarmConnection | null> {
        const entry = this.warmConnections.get(platform);
        if (!entry || entry.connections.length === 0) return null;

        return entry.connections.pop();
    }

    async returnWarmConnection(platform: string, connection: WarmConnection): Promise<void> {
        const entry = this.warmConnections.get(platform);
        if (entry) {
            entry.connections.push(connection);
        }
    }
}
```

### Token Caching

```typescript
class TokenCache {
    private cache: Map<string, CachedToken> = new Map();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    async getToken(userId: string, platform: string): Promise<string | null> {
        const key = `${userId}:${platform}`;
        const cached = this.cache.get(key);

        if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
            if (cached.status === "active") {
                return cached.token;
            }
            return null; // Cached as invalid
        }

        // Cache miss — fetch from database
        const token = await db.query(
            `SELECT token, status FROM device_tokens
             WHERE user_id = ? AND platform = ? AND status = 'active'
             ORDER BY last_seen DESC LIMIT 1`,
            [userId, platform]
        );

        if (token) {
            this.cache.set(key, {
                token: token.token,
                status: token.status,
                cachedAt: Date.now(),
            });
            return token.token;
        }

        this.cache.set(key, {
            token: null,
            status: "not_found",
            cachedAt: Date.now(),
        });
        return null;
    }

    async invalidateToken(userId: string, platform: string): Promise<void> {
        const key = `${userId}:${platform}`;
        this.cache.set(key, {
            token: null,
            status: "invalid",
            cachedAt: Date.now(),
        });
    }

    invalidateAll(): void {
        this.cache.clear();
    }
}

interface CachedToken {
    token: string | null;
    status: string;
    cachedAt: number;
}
```

## Monitoring

### Key Delivery Metrics

```typescript
class DeliveryMonitor {
    async getDeliveryMetrics(
        timeRange: { start: Date; end: Date },
        granularity: "minute" | "hour" | "day" = "hour"
    ): Promise<DeliveryMetrics> {
        const metrics = await db.query(
            `SELECT
                DATE_TRUNC(?, timestamp) as period,
                COUNT(*) as total_sent,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
                AVG(latency_ms) as avg_latency,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_latency
             FROM notification_delivery
             WHERE timestamp BETWEEN ? AND ?
             GROUP BY period
             ORDER BY period`,
            [granularity, timeRange.start, timeRange.end]
        );

        return {
            timeSeries: metrics,
            summary: this.calculateSummary(metrics),
        };
    }

    async getPlatformBreakdown(
        timeRange: { start: Date; end: Date }
    ): Promise<PlatformBreakdown[]> {
        return db.query(
            `SELECT
                platform,
                COUNT(*) as sent,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                ROUND(AVG(latency_ms), 2) as avg_latency,
                ROUND(
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
                ) as error_rate
             FROM notification_delivery
             WHERE timestamp BETWEEN ? AND ?
             GROUP BY platform`,
            [timeRange.start, timeRange.end]
        );
    }

    async detectAnomalies(
        timeRange: { start: Date; end: Date }
    ): Promise<Anomaly[]> {
        const recentMetrics = await this.getDeliveryMetrics(timeRange, "minute");
        const anomalies: Anomaly[] = [];

        // Detect sudden drops in delivery rate
        for (const metric of recentMetrics.timeSeries) {
            const deliveryRate = metric.delivered / metric.total_sent;

            if (deliveryRate < 0.9) {
                anomalies.push({
                    type: "delivery_rate_drop",
                    severity: deliveryRate < 0.8 ? "critical" : "warning",
                    period: metric.period,
                    value: deliveryRate,
                    threshold: 0.9,
                });
            }

            if (metric.p95_latency > 5000) {
                anomalies.push({
                    type: "high_latency",
                    severity: metric.p95_latency > 10000 ? "critical" : "warning",
                    period: metric.period,
                    value: metric.p95_latency,
                    threshold: 5000,
                });
            }
        }

        return anomalies;
    }
}

interface DeliveryMetrics {
    timeSeries: MetricPoint[];
    summary: MetricSummary;
}

interface MetricPoint {
    period: Date;
    total_sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    expired: number;
    avg_latency: number;
    p95_latency: number;
    p99_latency: number;
}
```

### Delivery Rate Monitoring

```typescript
class DeliveryRateMonitor {
    private readonly SLIDING_WINDOW_MS = 60000; // 1 minute
    private readonly ALERT_THRESHOLD = 0.95; // 95% delivery rate
    private windows: Map<string, { time: number; sent: number; delivered: number }[]> = new Map();

    recordDelivery(platform: string, success: boolean): void {
        const now = Date.now();
        if (!this.windows.has(platform)) {
            this.windows.set(platform, []);
        }

        const window = this.windows.get(platform);
        window.push({
            time: now,
            sent: 1,
            delivered: success ? 1 : 0,
        });

        // Prune old entries
        while (window.length > 0 && now - window[0].time > this.SLIDING_WINDOW_MS) {
            window.shift();
        }
    }

    getDeliveryRate(platform: string): number {
        const window = this.windows.get(platform);
        if (!window || window.length === 0) return 1;

        const totals = window.reduce(
            (acc, w) => ({
                sent: acc.sent + w.sent,
                delivered: acc.delivered + w.delivered,
            }),
            { sent: 0, delivered: 0 }
        );

        return totals.sent > 0 ? totals.delivered / totals.sent : 1;
    }

    async checkAlerts(): Promise<void> {
        for (const [platform, _] of this.windows) {
            const rate = this.getDeliveryRate(platform);
            if (rate < this.ALERT_THRESHOLD) {
                await eventBus.emit("alert.delivery_rate", {
                    platform,
                    rate,
                    threshold: this.ALERT_THRESHOLD,
                    timestamp: new Date(),
                });
            }
        }
    }
}
```

### Error Rates and Bounce Monitoring

```typescript
class BounceMonitor {
    private readonly BOUNCE_THRESHOLD = 10; // % bounce rate alert
    private readonly BOUNCE_HIGH_THRESHOLD = 25; // % critical

    async recordBounce(
        token: string,
        reason: string,
        code: string
    ): Promise<void> {
        await db.execute(
            `INSERT INTO push_bounces (token, reason, code, timestamp)
             VALUES (?, ?, ?, NOW())`,
            [token, reason, code]
        );

        // Check if token should be automatically deactivated
        const bounceCount = await db.query(
            `SELECT COUNT(*) as count FROM push_bounces
             WHERE token = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
            [token]
        );

        if (bounceCount.count >= 3) {
            await tokenLifecycleManager.handleInvalidToken(
                token,
                `auto_deactivated: ${bounceCount.count} bounces in 24h`
            );
        }
    }

    async getBounceRate(
        timeRange: { start: Date; end: Date }
    ): Promise<BounceRateReport> {
        const stats = await db.query(
            `SELECT
                COUNT(*) as total_delivery_attempts,
                SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as total_bounces,
                platform,
                code,
                COUNT(*) as bounce_count
             FROM notification_delivery
             WHERE timestamp BETWEEN ? AND ?
             GROUP BY platform, code`,
            [timeRange.start, timeRange.end]
        );

        const bounceRate = stats.total_bounces / stats.total_delivery_attempts;

        return {
            overallBounceRate: bounceRate,
            byPlatform: this.groupByPlatform(stats),
            byCode: this.groupByCode(stats),
            alertLevel: bounceRate > this.BOUNCE_HIGH_THRESHOLD / 100
                ? "critical"
                : bounceRate > this.BOUNCE_THRESHOLD / 100
                    ? "warning"
                    : "normal",
        };
    }
}
```

## A/B Testing Delivery Strategies

```typescript
interface DeliveryTestConfig {
    name: string;
    variants: DeliveryVariant[];
    targetUserSegment: string;
    sampleSize: number;
    duration: number; // hours
    successMetric: "open_rate" | "click_rate" | "conversion_rate" | "delivery_rate";
}

interface DeliveryVariant {
    id: string;
    priority: "HIGH" | "NORMAL";
    ttl: number;
    collapseKey: boolean;
    deliveryWindow: { start: string; end: string };
    channel: string;
}

class DeliveryABTester {
    async startTest(config: DeliveryTestConfig): Promise<string> {
        const testId = crypto.randomUUID();

        await db.execute(
            `INSERT INTO delivery_tests
             (id, name, config, status, started_at)
             VALUES (?, ?, ?, 'running', NOW())`,
            [testId, config.name, JSON.stringify(config)]
        );

        // Assign users to variants
        const eligibleUsers = await this.getEligibleUsers(config.targetUserSegment, config.sampleSize);
        await this.assignVariants(testId, config.variants, eligibleUsers);

        // Schedule test completion
        setTimeout(() => this.completeTest(testId), config.duration * 3600000);

        return testId;
    }

    private async assignVariants(
        testId: string,
        variants: DeliveryVariant[],
        users: string[]
    ): Promise<void> {
        const perVariant = Math.floor(users.length / variants.length);

        for (let i = 0; i < variants.length; i++) {
            const startIdx = i * perVariant;
            const endIdx = i === variants.length - 1 ? users.length : startIdx + perVariant;
            const variantUsers = users.slice(startIdx, endIdx);

            const values = variantUsers.map(userId => [
                testId,
                userId,
                variants[i].id,
                JSON.stringify(variants[i]),
                "active",
            ]);

            await db.query(
                `INSERT INTO delivery_test_assignments
                 (test_id, user_id, variant_id, variant_config, status)
                 VALUES ${values.map(() => "(?, ?, ?, ?, ?)").join(", ")}`,
                values.flat()
            );
        }
    }

    async getResults(testId: string): Promise<TestResults> {
        const results = await db.query(
            `SELECT
                a.variant_id,
                COUNT(DISTINCT a.user_id) as users,
                COUNT(DISTINCT d.notification_id) as sent,
                COUNT(DISTINCT CASE WHEN d.status = 'delivered' THEN d.notification_id END) as delivered,
                COUNT(DISTINCT CASE WHEN e.event_type = 'opened' THEN e.notification_id END) as opened,
                COUNT(DISTINCT CASE WHEN e.event_type = 'clicked' THEN e.notification_id END) as clicked,
                AVG(d.latency_ms) as avg_latency
             FROM delivery_test_assignments a
             LEFT JOIN notification_delivery d ON d.user_id = a.user_id
             LEFT JOIN notification_events e ON e.notification_id = d.notification_id
             WHERE a.test_id = ?
             GROUP BY a.variant_id`,
            [testId]
        );

        return {
            testId,
            variants: results.map(r => ({
                variantId: r.variant_id,
                users: r.users,
                sent: r.sent,
                deliveryRate: r.delivered / r.sent,
                openRate: r.opened / r.delivered,
                clickRate: r.clicked / r.opened,
                avgLatency: r.avg_latency,
            })),
        };
    }
}
```

## Best Practices

### Do's

- **Use the smallest possible payload**: Every byte matters for delivery speed and reliability
- **Set appropriate TTL**: Use short TTL (0s) for time-sensitive, longer for promotional
- **Leverage collapse keys**: Prevent notification stacking for the same event type
- **Implement exponential backoff**: Always use jittered backoff for retries
- **Monitor token health**: Proactively remove invalid tokens from your database
- **Use notification channels/categories**: Give users granular control over notification types
- **Batch sends when possible**: FCM `sendEach` is more efficient than individual sends
- **Warm connections ahead of campaigns**: Pre-establish connections before high-volume sends
- **Cache tokens aggressively**: Reduce database lookups during delivery
- **Implement circuit breakers**: Prevent cascading failures in delivery infrastructure

### Don'ts

- **Don't send >4KB payloads**: They will be rejected by the push service
- **Don't retry non-retryable errors**: Invalid tokens, bad payloads won't succeed on retry
- **Don't ignore token refreshes**: FCM tokens change; stale tokens cause delivery failures
- **Don't use HIGH priority for everything**: It drains battery and users will disable notifications
- **Don't send duplicate notifications**: Use idempotency keys to prevent duplicates
- **Don't exceed rate limits**: Monitor per-channel limits and throttle accordingly
- **Don't neglect certificate expiry**: APNs certificates need renewal; monitor expiry dates
- **Don't skip delivery tracking**: Without metrics, you can't optimize delivery
- **Don't send at inappropriate hours**: Respect quiet hours and timezone for user experience
- **Don't ignore platform differences**: FCM, APNs, Huawei, Xiaomi all have distinct behaviors

### Common Pitfalls

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| Token expiry not handled | Increasing bounce rate | Monitor token health, refresh proactively |
| Missing collapse keys | Users see many notifications | Use collapse keys for replaceable notifications |
| Wrong priority setting | Notifications delayed or not shown | Match priority to notification type |
| Payload too large | Silent failures on send | Keep under 4KB, use short keys |
| Expired certificates | APNs delivery failure | Set up automated certificate renewal alerts |
| Rate limit exceeded | 429 responses, throttled | Implement per-channel rate limiting |
| No connection pooling | TCP connection exhaustion | Use connection pool with health checks |
| Missing TTL | Stale notifications delivered days later | Set appropriate TTL per notification type |
| No retry strategy | Transient failures cause message loss | Implement exponential backoff with jitter |
| Platform-specific quirks ignored | Inconsistent behavior | Test and handle each platform individually |
