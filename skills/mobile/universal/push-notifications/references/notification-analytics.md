# Notification Analytics

## Analytics Metrics Hierarchy

### Metric Pyramid

```
              ┌─────────────────────┐
              │   Conversion Rate    │
              │  (Revenue / Users)   │
              ├─────────────────────┤
              │    Churn Rate        │
              │ (Uninstall / Users)  │
              ├─────────────────────┤
              │    Open Rate         │
              │   (Opens / Sent)     │
              ├─────────────────────┤
              │  Impression Rate     │
              │ (Displayed / Sent)   │
              ├─────────────────────┤
              │   Delivery Rate      │
              │ (Delivered / Sent)   │
              └─────────────────────┘
```

### Core Metrics Definitions

| Metric | Formula | Target (Industry) | Target (Transactional) | Target (Promotional) |
|--------|---------|-------------------|----------------------|---------------------|
| Delivery Rate | `delivered / sent` | 90-99% | 95-99% | 85-95% |
| Impression Rate | `impressed / delivered` | 85-95% | 90-99% | 75-90% |
| Open Rate | `opened / delivered` | 15-45% | 40-65% | 10-25% |
| Tap/Click Rate | `clicked / opened` | 20-40% | 30-50% | 15-30% |
| Conversion Rate | `converted / clicked` | 5-20% | 10-30% | 3-15% |
| Churn Rate | `uninstalled / reached` | 1-5% | 0.5-2% | 2-8% |

#### Derived Metrics

```typescript
interface NotificationMetricsCalculator {
    // Effectiveness metrics
    getEffectivenessRate(notification: NotificationMetrics): number {
        return notification.clicked / notification.sent;
    }

    // Engagement per user
    getEngagementPerUser(
        totalOpens: number,
        uniqueUsers: number
    ): number {
        return totalOpens / uniqueUsers;
    }

    // Time to first open
    getMedianTimeToOpen(openTimes: number[]): number {
        const sorted = [...openTimes].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Session attribution
    getSessionAttributionRate(
        sessionsAfterNotification: number,
        totalSessions: number
    ): number {
        return sessionsAfterNotification / totalSessions;
    }

    // Revenue per notification
    getRevenuePerNotification(
        attributedRevenue: number,
        totalNotifications: number
    ): number {
        return attributedRevenue / totalNotifications;
    }
}
```

## Tracking Infrastructure

### Event Collection Architecture

```
┌────────────┐     ┌──────────┐     ┌──────────┐     ┌─────────────┐
│ Mobile App │────▶│  SDK /   │────▶│ Event    │────▶│ Analytics   │
│ (iOS/Android)│    │  Client   │     │ Gateway  │     │ Pipeline    │
└────────────┘     └──────────┘     └──────────┘     └─────────────┘
                                                  │
                    ┌─────────────────────────────┤
                    │               │             │
                    ▼               ▼             ▼
              ┌──────────┐   ┌──────────┐   ┌──────────┐
              │  Real-   │   │  Batch   │   │  Data    │
              │  time    │   │  Processor│   │  Lake    │
              └──────────┘   └──────────┘   └──────────┘
```

### Client-Side Tracking

```kotlin
// Android — notification impression tracking
class NotificationTrackingService : Service() {
    private val analyticsClient = AnalyticsClient()

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "NOTIFICATION_IMPRESSION" -> {
                val notificationId = intent.getStringExtra("notification_id")
                val campaignId = intent.getStringExtra("campaign_id")
                val channelId = intent.getStringExtra("channel_id")

                trackImpression(notificationId, campaignId, channelId)
            }
            "NOTIFICATION_OPEN" -> {
                val notificationId = intent.getStringExtra("notification_id")
                val campaignId = intent.getStringExtra("campaign_id")
                val deepLink = intent.getStringExtra("deep_link")

                trackOpen(notificationId, campaignId, deepLink)
            }
            "NOTIFICATION_DISMISS" -> {
                val notificationId = intent.getStringExtra("notification_id")
                trackDismiss(notificationId)
            }
        }
        return START_NOT_STICKY
    }

    private fun trackImpression(notificationId: String?, campaignId: String?, channelId: String?) {
        val event = AnalyticsEvent(
            name = "notification_impression",
            properties = mapOf(
                "notification_id" to (notificationId ?: "unknown"),
                "campaign_id" to (campaignId ?: "unknown"),
                "channel_id" to (channelId ?: "unknown"),
                "app_state" if isAppInForeground "foreground" else "background",
                "timestamp" to System.currentTimeMillis(),
            )
        )
        analyticsClient.track(event)
    }

    private fun trackOpen(notificationId: String?, campaignId: String?, deepLink: String?) {
        val event = AnalyticsEvent(
            name = "notification_open",
            properties = buildMap {
                put("notification_id", notificationId ?: "unknown")
                put("campaign_id", campaignId ?: "unknown")
                put("deep_link", deepLink ?: "")
                put("timestamp", System.currentTimeMillis())
                put("app_version", BuildConfig.VERSION_NAME)
                put("os_version", Build.VERSION.RELEASE)
                put("device_model", Build.MODEL)
            }
        )
        analyticsClient.track(event)
    }

    private fun trackDismiss(notificationId: String?) {
        val event = AnalyticsEvent(
            name = "notification_dismiss",
            properties = mapOf(
                "notification_id" to (notificationId ?: "unknown"),
                "timestamp" to System.currentTimeMillis(),
            )
        )
        analyticsClient.track(event)
    }
}
```

```swift
// iOS — notification tracking
class NotificationAnalyticsTracker: NSObject {
    private let analytics: AnalyticsProvider

    init(analytics: AnalyticsProvider) {
        self.analytics = analytics
        super.init()
    }

    func trackNotificationOpened(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        let notificationId = userInfo["notification_id"] as? String ?? "unknown"
        let campaignId = userInfo["campaign_id"] as? String ?? "unknown"
        let actionId = response.actionIdentifier

        var properties: [String: Any] = [
            "notification_id": notificationId,
            "campaign_id": campaignId,
            "action_id": actionId,
            "timestamp": Date(),
            "app_state": UIApplication.shared.applicationState == .active ? "foreground" : "background",
        ]

        // Extract UTM parameters
        if let url = response.notification.request.content.userInfo["url"] as? String {
            if let components = URLComponents(string: url) {
                for item in components.queryItems ?? [] {
                    if item.name.hasPrefix("utm_") {
                        properties[item.name] = item.value
                    }
                }
            }
        }

        analytics.track(name: "notification_opened", properties: properties)
    }

    func trackNotificationDismissed(_ notification: UNNotification) {
        let userInfo = notification.request.content.userInfo
        analytics.track(name: "notification_dismissed", properties: [
            "notification_id": userInfo["notification_id"] as? String ?? "unknown",
            "timestamp": Date(),
        ])
    }
}
```

### Server-Side Tracking

```typescript
class ServerSideTracking {
    private readonly eventQueue: AnalyticsEvent[] = [];
    private readonly FLUSH_INTERVAL_MS = 5000;
    private readonly MAX_BATCH_SIZE = 100;

    constructor() {
        setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }

    trackDelivery(notificationId: string, token: string, status: string, latencyMs: number): void {
        this.enqueue({
            name: "push_delivery",
            properties: {
                notification_id: notificationId,
                token_hash: this.hashToken(token),
                status,
                latency_ms: latencyMs,
                platform: this.detectPlatform(token),
                timestamp: new Date().toISOString(),
            },
        });
    }

    trackBounce(notificationId: string, token: string, reason: string, code: string): void {
        this.enqueue({
            name: "push_bounce",
            properties: {
                notification_id: notificationId,
                token_hash: this.hashToken(token),
                reason,
                code,
                platform: this.detectPlatform(token),
                timestamp: new Date().toISOString(),
            },
        });
    }

    trackConversion(
        notificationId: string,
        userId: string,
        conversionType: string,
        value: number
    ): void {
        this.enqueue({
            name: "push_conversion",
            properties: {
                notification_id: notificationId,
                user_id: this.anonymizeId(userId),
                conversion_type: conversionType,
                value,
                timestamp: new Date().toISOString(),
            },
        });
    }

    private enqueue(event: AnalyticsEvent): void {
        this.eventQueue.push(event);
        if (this.eventQueue.length >= this.MAX_BATCH_SIZE) {
            this.flush();
        }
    }

    private async flush(): Promise<void> {
        if (this.eventQueue.length === 0) return;

        const batch = this.eventQueue.splice(0, this.MAX_BATCH_SIZE);
        try {
            await fetch("https://analytics.example.com/v1/events/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ events: batch }),
            });
        } catch (error) {
            console.error("Failed to flush analytics events:", error);
            // Re-queue on failure (at most once)
        }
    }

    private hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    private anonymizeId(id: string): string {
        return crypto.createHash("sha256").update(id + process.env.ANONYMIZATION_SALT).digest("hex");
    }

    private detectPlatform(token: string): string {
        if (token.length === 64 && /^[0-9a-f]+$/.test(token)) return "ios";
        if (token.includes(":")) return "android";
        return "unknown";
    }
}
```

### Attribution Pipeline

```typescript
class AttributionPipeline {
    private readonly kafka: KafkaProducer;
    private readonly LOOKBACK_WINDOW_HOURS = 72;

    async processClickEvent(event: ClickEvent): Promise<void> {
        // 1. Record the click
        await this.kafka.send({
            topic: "notification_clicks",
            messages: [{
                key: event.notificationId,
                value: JSON.stringify(event),
            }],
        });

        // 2. Check for follow-up conversions within lookback window
        // This is handled by a stream processor that joins click events
        // with conversion events on user_id
    }

    async processConversionEvent(event: ConversionEvent): Promise<void> {
        // 1. Record the conversion
        await this.kafka.send({
            topic: "notification_conversions",
            messages: [{
                key: event.userId,
                value: JSON.stringify(event),
            }],
        });

        // 2. Check for preceding notification clicks
        // A Kafka Streams processor joins conversion events with
        // click events within the lookback window
    }

    async startStreamProcessor(): Promise<void> {
        // Kafka Streams topology for attribution
        const builder = new KafkaStreams.StreamBuilder();

        const clicks = builder.stream("notification_clicks");
        const conversions = builder.stream("notification_conversions");

        // Join clicks and conversions on user_id within lookback window
        const attributedConversions = clicks
            .join(conversions, {
                window: Duration.ofHours(this.LOOKBACK_WINDOW_HOURS),
                key: (click) => click.userId,
                value: (click, conversion) => ({
                    userId: click.userId,
                    notificationId: click.notificationId,
                    campaignId: click.campaignId,
                    conversionType: conversion.conversionType,
                    conversionValue: conversion.value,
                    clickTimestamp: click.timestamp,
                    conversionTimestamp: conversion.timestamp,
                    timeToConversion: conversion.timestamp - click.timestamp,
                }),
            });

        attributedConversions.to("attributed_conversions");
    }
}
```

## Delivery Tracking

### Delivery Event States

```
Send ──▶ Delivered ──▶ Impressed ──▶ Opened ──▶ Clicked ──▶ Converted
  │                      │              │
  ├── Failed             ├── Not Shown  └── Dismissed
  ├── Bounced            (app in
  └── Expired             foreground)
```

### Delivery Event Schema

```typescript
interface DeliveryEvent {
    notification_id: string;
    user_id: string;
    token_hash: string;
    platform: "ios" | "android" | "huawei" | "xiaomi";
    event_type: "sent" | "delivered" | "failed" | "bounced" | "expired";
    timestamp: string;
    metadata: {
        push_service: "fcm" | "apns" | "huawei" | "xiaomi";
        latency_ms: number;
        error_code?: string;
        error_message?: string;
        attempt_number: number;
        ttl_seconds: number;
        payload_size_bytes: number;
        priority: "high" | "normal";
        collapse_key?: string;
    };
    device: {
        os_version: string;
        app_version: string;
        device_model: string;
        carrier?: string;
        locale: string;
        timezone: string;
        network_type: "wifi" | "cellular" | "unknown";
    };
}
```

### Delivery Analytics Queries

```sql
-- Daily delivery summary
SELECT
    DATE(created_at) as date,
    platform,
    COUNT(*) as total_sent,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
    ROUND(
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
    ) as delivery_rate,
    ROUND(AVG(latency_ms), 2) as avg_latency_ms
FROM notification_delivery
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), platform
ORDER BY date DESC, platform;

-- Delivery rate by notification type
SELECT
    n.type,
    COUNT(*) as sent,
    ROUND(
        SUM(CASE WHEN d.status = 'delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
    ) as delivery_rate,
    ROUND(
        SUM(CASE WHEN d.status = 'bounced' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
    ) as bounce_rate
FROM notifications n
JOIN notification_delivery d ON n.id = d.notification_id
WHERE d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY n.type
ORDER BY delivery_rate ASC;

-- Hourly delivery heatmap
SELECT
    DAYOFWEEK(created_at) as day_of_week,
    HOUR(created_at) as hour,
    ROUND(
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1
    ) as delivery_rate,
    COUNT(*) as volume
FROM notification_delivery
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY DAYOFWEEK(created_at), HOUR(created_at)
ORDER BY day_of_week, hour;
```

### Delivery Metrics Aggregation

```typescript
class DeliveryAnalyticsAggregator {
    async getDeliveryFunnel(
        timeRange: { start: Date; end: Date },
        granularity: "hour" | "day" = "day"
    ): Promise<DeliveryFunnel> {
        const result = await db.query(
            `SELECT
                DATE_TRUNC(?, timestamp) as period,
                platform,
                COUNT(*) as sent,
                SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN delivery_status = 'bounced' THEN 1 ELSE 0 END) as bounced,
                SUM(CASE WHEN delivery_status = 'expired' THEN 1 ELSE 0 END) as expired,
                AVG(latency_ms) as avg_latency,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency
             FROM notification_delivery_events
             WHERE timestamp BETWEEN ? AND ?
             GROUP BY period, platform
             ORDER BY period, platform`,
            [granularity, timeRange.start, timeRange.end]
        );

        return this.buildFunnel(result);
    }

    async getDeliveryIssues(
        timeRange: { start: Date; end: Date }
    ): Promise<DeliveryIssue[]> {
        const issues = await db.query(
            `SELECT
                error_code,
                platform,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY platform), 2) as percentage
             FROM notification_delivery_events
             WHERE delivery_status IN ('failed', 'bounced')
               AND timestamp BETWEEN ? AND ?
             GROUP BY error_code, platform
             ORDER BY count DESC`,
            [timeRange.start, timeRange.end]
        );

        return issues.map(i => ({
            errorCode: i.error_code,
            platform: i.platform,
            count: i.count,
            percentage: i.percentage,
            severity: i.percentage > 10 ? "critical" : i.percentage > 5 ? "warning" : "info",
        }));
    }

    private buildFunnel(rows: any[]): DeliveryFunnel {
        const platforms = [...new Set(rows.map(r => r.platform))];
        const funnel: DeliveryFunnel = { total: {}, byPlatform: {} };

        for (const platform of platforms) {
            const platformRows = rows.filter(r => r.platform === platform);
            funnel.byPlatform[platform] = platformRows.map(r => ({
                period: r.period,
                sent: Number(r.sent),
                delivered: Number(r.delivered),
                failed: Number(r.failed),
                bounced: Number(r.bounced),
                expired: Number(r.expired),
                deliveryRate: Number(r.delivered) / Number(r.sent),
                avgLatency: Number(r.avg_latency),
                p95Latency: Number(r.p95_latency),
            }));
        }

        // Aggregate totals across platforms
        const totals = rows.reduce((acc: any[], r: any) => {
            const existing = acc.find(a => a.period === r.period);
            if (existing) {
                existing.sent += Number(r.sent);
                existing.delivered += Number(r.delivered);
                existing.failed += Number(r.failed);
                existing.bounced += Number(r.bounced);
                existing.expired += Number(r.expired);
            } else {
                acc.push({ ...r, platform: "all" });
            }
            return acc;
        }, []);

        funnel.total = totals.map(r => ({
            period: r.period,
            sent: Number(r.sent),
            delivered: Number(r.delivered),
            failed: Number(r.failed),
            bounced: Number(r.bounced),
            expired: Number(r.expired),
            deliveryRate: Number(r.delivered) / Number(r.sent),
            avgLatency: Number(r.avg_latency),
            p95Latency: Number(r.p95_latency),
        }));

        return funnel;
    }
}

interface DeliveryFunnel {
    total: DeliveryFunnelPoint[];
    byPlatform: Record<string, DeliveryFunnelPoint[]>;
}

interface DeliveryFunnelPoint {
    period: Date;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    expired: number;
    deliveryRate: number;
    avgLatency: number;
    p95Latency: number;
}
```

## Engagement Tracking

### Impression vs Open vs Click

```typescript
class EngagementTracker {
    async trackEngagement(event: EngagementEvent): Promise<void> {
        switch (event.type) {
            case "impression":
                await this.trackImpression(event);
                break;
            case "open":
                await this.trackOpen(event);
                break;
            case "dismiss":
                await this.trackDismiss(event);
                break;
            case "click":
                await this.trackClick(event);
                break;
            case "follow_up":
                await this.trackFollowUpAction(event);
                break;
        }
    }

    private async trackImpression(event: EngagementEvent): Promise<void> {
        await db.execute(
            `INSERT INTO notification_impressions
             (notification_id, user_id, device_id, app_state, timestamp)
             VALUES (?, ?, ?, ?, ?)`,
            [event.notificationId, event.userId, event.deviceId, event.appState, event.timestamp]
        );
    }

    private async trackOpen(event: EngagementEvent): Promise<void> {
        const existing = await db.query(
            "SELECT id FROM notification_opens WHERE notification_id = ? AND user_id = ?",
            [event.notificationId, event.userId]
        );

        if (existing) return; // Deduplicate

        // Calculate time from delivery to open
        const delivery = await db.query(
            "SELECT delivered_at FROM notification_delivery WHERE notification_id = ?",
            [event.notificationId]
        );

        const timeToOpen = delivery
            ? (new Date(event.timestamp).getTime() - new Date(delivery.delivered_at).getTime()) / 1000
            : null;

        await db.execute(
            `INSERT INTO notification_opens
             (notification_id, user_id, device_id, time_to_open_seconds, timestamp, source)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                event.notificationId,
                event.userId,
                event.deviceId,
                timeToOpen,
                event.timestamp,
                event.source ?? "notification_center",
            ]
        );
    }

    private async trackDismiss(event: EngagementEvent): Promise<void> {
        await db.execute(
            `INSERT INTO notification_dismissals
             (notification_id, user_id, device_id, time_visible_seconds, timestamp)
             VALUES (?, ?, ?, ?, ?)`,
            [
                event.notificationId,
                event.userId,
                event.deviceId,
                event.timeVisibleSeconds,
                event.timestamp,
            ]
        );
    }

    async getEngagementMetrics(
        notificationId: string
    ): Promise<EngagementMetrics> {
        const metrics = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM notification_impressions WHERE notification_id = ?) as impressions,
                (SELECT COUNT(*) FROM notification_opens WHERE notification_id = ?) as opens,
                (SELECT COUNT(*) FROM notification_dismissals WHERE notification_id = ?) as dismissals,
                (SELECT COUNT(*) FROM notification_clicks WHERE notification_id = ?) as clicks,
                (SELECT COUNT(*) FROM notification_follow_up_actions WHERE notification_id = ?) as follow_ups`,
            Array(5).fill(notificationId)
        );

        return {
            impressions: Number(metrics.impressions),
            opens: Number(metrics.opens),
            dismissals: Number(metrics.dismissals),
            clicks: Number(metrics.clicks),
            followUps: Number(metrics.follow_ups),
            impressionRate: metrics.impressions > 0
                ? Number(metrics.opens) / Number(metrics.impressions)
                : 0,
            dismissalRate: metrics.impressions > 0
                ? Number(metrics.dismissals) / Number(metrics.impressions)
                : 0,
        };
    }
}

interface EngagementEvent {
    type: "impression" | "open" | "dismiss" | "click" | "follow_up";
    notificationId: string;
    userId: string;
    deviceId: string;
    timestamp: Date;
    appState?: "foreground" | "background";
    source?: string;
    timeVisibleSeconds?: number;
}

interface EngagementMetrics {
    impressions: number;
    opens: number;
    dismissals: number;
    clicks: number;
    followUps: number;
    impressionRate: number;
    dismissalRate: number;
}
```

### Engagement Analytics Queries

```sql
-- Open rate by notification type
SELECT
    n.type,
    COUNT(DISTINCT d.notification_id) as sent,
    COUNT(DISTINCT o.notification_id) as opened,
    ROUND(
        COUNT(DISTINCT o.notification_id) * 100.0 / NULLIF(COUNT(DISTINCT d.notification_id), 0), 2
    ) as open_rate,
    ROUND(AVG(o.time_to_open_seconds), 0) as avg_time_to_open_seconds,
    ROUND(
        COUNT(DISTINCT c.notification_id) * 100.0 / NULLIF(COUNT(DISTINCT o.notification_id), 0), 2
    ) as click_through_rate
FROM notifications n
LEFT JOIN notification_delivery d ON n.id = d.notification_id AND d.status = 'delivered'
LEFT JOIN notification_opens o ON n.id = o.notification_id
LEFT JOIN notification_clicks c ON n.id = c.notification_id
WHERE d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY n.type
ORDER BY open_rate DESC;

-- Hourly engagement distribution
SELECT
    HOUR(o.created_at) as hour,
    COUNT(*) as opens,
    ROUND(AVG(o.time_to_open_seconds), 0) as avg_time_to_open
FROM notification_opens o
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY HOUR(o.created_at)
ORDER BY hour;

-- User-level engagement summary
SELECT
    u.id,
    u.segment,
    COUNT(DISTINCT d.notification_id) as notifications_received,
    COUNT(DISTINCT o.notification_id) as notifications_opened,
    ROUND(COUNT(DISTINCT o.notification_id) * 100.0 / NULLIF(COUNT(DISTINCT d.notification_id), 0), 2) as open_rate,
    COUNT(DISTINCT c.notification_id) as notifications_clicked,
    MAX(o.created_at) as last_open,
    COUNT(DISTINCT DATE(d.created_at)) as active_days
FROM users u
LEFT JOIN notification_delivery d ON u.id = d.user_id AND d.status = 'delivered'
LEFT JOIN notification_opens o ON u.id = o.user_id
LEFT JOIN notification_clicks c ON u.id = c.user_id
WHERE d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.segment
ORDER BY open_rate DESC;

-- Time-to-open distribution
SELECT
    CASE
        WHEN o.time_to_open_seconds < 60 THEN '< 1 min'
        WHEN o.time_to_open_seconds < 300 THEN '1-5 min'
        WHEN o.time_to_open_seconds < 900 THEN '5-15 min'
        WHEN o.time_to_open_seconds < 3600 THEN '15-60 min'
        WHEN o.time_to_open_seconds < 14400 THEN '1-4 hours'
        WHEN o.time_to_open_seconds < 86400 THEN '4-24 hours'
        ELSE '> 24 hours'
    END as time_bucket,
    COUNT(*) as opens,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM notification_opens o
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY time_bucket
ORDER BY MIN(o.time_to_open_seconds);
```

## Conversion Tracking

### Deep Link Attribution

```typescript
class DeepLinkAttribution {
    async trackDeepLink(
        url: string,
        userId: string,
        deviceId: string
    ): Promise<DeepLinkAttributionResult> {
        const parsed = new URL(url);
        const notificationId = parsed.searchParams.get("nid");
        const campaignId = parsed.searchParams.get("cid");
        const source = parsed.searchParams.get("source");

        if (!notificationId) {
            return { attributed: false, reason: "no_notification_id" };
        }

        // Verify attribution window
        const notification = await db.query(
            "SELECT created_at, type, campaign_id FROM notifications WHERE id = ?",
            [notificationId]
        );

        if (!notification) {
            return { attributed: false, reason: "notification_not_found" };
        }

        const hoursSinceSend = (Date.now() - new Date(notification.created_at).getTime()) / 3600000;
        const MAX_ATTRIBUTION_WINDOW_HOURS = 72;

        if (hoursSinceSend > MAX_ATTRIBUTION_WINDOW_HOURS) {
            return {
                attributed: false,
                reason: "attribution_window_expired",
                hoursSinceSend,
            };
        }

        // Record the attributed deep link
        await db.execute(
            `INSERT INTO deep_link_attributions
             (notification_id, user_id, device_id, campaign_id, source, url, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [notificationId, userId, deviceId, campaignId, source, url]
        );

        return {
            attributed: true,
            notificationId,
            campaignId,
            notificationType: notification.type,
            hoursSinceSend,
        };
    }
}

interface DeepLinkAttributionResult {
    attributed: boolean;
    reason?: string;
    notificationId?: string;
    campaignId?: string;
    notificationType?: string;
    hoursSinceSend?: number;
}
```

### Purchase/Registration Attribution

```typescript
class ConversionAttributor {
    private readonly ATTRIBUTION_WINDOWS: Record<string, number> = {
        purchase: 72,       // 72 hours
        registration: 168,  // 7 days
        subscription: 168,  // 7 days
        re_engagement: 24,  // 24 hours
        content_view: 24,   // 24 hours
    };

    async attributeConversion(
        userId: string,
        conversionType: string,
        conversionValue: number,
        conversionMetadata: Record<string, any>
    ): Promise<AttributionResult> {
        const windowHours = this.ATTRIBUTION_WINDOWS[conversionType] ?? 72;

        // Find the last notification that influenced this conversion
        const lastNotification = await db.query(
            `SELECT
                n.id,
                n.type,
                n.campaign_id,
                n.sent_at,
                o.created_at as opened_at,
                EXTRACT(EPOCH FROM (NOW() - o.created_at)) as seconds_since_open
             FROM notification_opens o
             JOIN notifications n ON o.notification_id = n.id
             WHERE o.user_id = ?
               AND o.created_at >= NOW() - INTERVAL '?' HOUR
               AND o.created_at <= NOW()
             ORDER BY o.created_at DESC
             LIMIT 1`,
            [userId, windowHours]
        );

        if (!lastNotification) {
            return { attributed: false, attributionModel: "none" };
        }

        // Handle different attribution models
        const attribution = await this.applyAttributionModel(
            userId,
            conversionType,
            lastNotification,
            "last_click"
        );

        // Record conversion
        await db.execute(
            `INSERT INTO notification_conversions
             (notification_id, user_id, conversion_type, value, attribution_model,
              metadata, converted_at)
             VALUES (?, ?, ?, ?, ?, ?::jsonb, NOW())`,
            [
                lastNotification.id,
                userId,
                conversionType,
                conversionValue,
                attribution.model,
                JSON.stringify(conversionMetadata),
            ]
        );

        return {
            attributed: true,
            attributionModel: attribution.model,
            attributionWeight: attribution.weight,
            notificationId: lastNotification.id,
            campaignId: lastNotification.campaign_id,
            notificationType: lastNotification.type,
            timeToConversion: Math.round(lastNotification.seconds_since_open),
        };
    }

    private async applyAttributionModel(
        userId: string,
        conversionType: string,
        lastTouch: any,
        model: string
    ): Promise<{ model: string; weight: number }> {
        switch (model) {
            case "last_click":
                return { model: "last_click", weight: 1.0 };

            case "first_click": {
                const firstTouch = await db.query(
                    `SELECT id FROM notification_opens
                     WHERE user_id = ?
                       AND id != ?
                     ORDER BY created_at ASC LIMIT 1`,
                    [userId, lastTouch.id]
                );
                return {
                    model: "first_click",
                    weight: firstTouch && firstTouch.id === lastTouch.id ? 1.0 : 0.0,
                };
            }

            case "linear": {
                const totalNotifications = await db.query(
                    "SELECT COUNT(*) as count FROM notification_opens WHERE user_id = ?",
                    [userId]
                );
                return {
                    model: "linear",
                    weight: 1.0 / (totalNotifications.count || 1),
                };
            }

            default:
                return { model: "last_click", weight: 1.0 };
        }
    }
}

interface AttributionResult {
    attributed: boolean;
    attributionModel: string;
    attributionWeight?: number;
    notificationId?: string;
    campaignId?: string;
    notificationType?: string;
    timeToConversion?: number;
}
```

### UTM Parameter Management

```typescript
class UTMParameterBuilder {
    private readonly CAMPAIGN_SOURCE = "push_notification";
    private readonly TRACKING_DOMAIN = "track.example.com";

    buildCampaignUrl(
        baseUrl: string,
        campaign: Campaign,
        notification: Notification
    ): string {
        const url = new URL(baseUrl);

        // Add UTM parameters
        url.searchParams.set("utm_source", this.CAMPAIGN_SOURCE);
        url.searchParams.set("utm_medium", notification.platform);
        url.searchParams.set("utm_campaign", campaign.slug);
        url.searchParams.set("utm_content", notification.type);
        url.searchParams.set("utm_term", campaign.segment ?? "all");

        // Add tracking parameters
        url.searchParams.set("nid", notification.id);
        url.searchParams.set("cid", campaign.id);
        url.searchParams.set("uid", notification.userId);

        // Sign the URL to prevent tampering
        const signature = this.signUrl(url.toString());
        url.searchParams.set("sig", signature);

        return url.toString();
    }

    private signUrl(url: string): string {
        return crypto
            .createHmac("sha256", process.env.URL_SIGNING_SECRET)
            .update(url)
            .digest("hex")
            .substring(0, 16);
    }

    parseUtmParams(urlString: string): UTMParams | null {
        try {
            const url = new URL(urlString);
            const source = url.searchParams.get("utm_source");

            if (!source || source !== this.CAMPAIGN_SOURCE) return null;

            return {
                source,
                medium: url.searchParams.get("utm_medium"),
                campaign: url.searchParams.get("utm_campaign"),
                content: url.searchParams.get("utm_content"),
                term: url.searchParams.get("utm_term"),
                notificationId: url.searchParams.get("nid"),
                campaignId: url.searchParams.get("cid"),
            };
        } catch {
            return null;
        }
    }
}

interface UTMParams {
    source: string;
    medium: string;
    campaign: string;
    content: string;
    term: string;
    notificationId: string;
    campaignId: string;
}
```

## Attribution Models

### Model Comparison

| Model | Description | Best For | Weight Distribution |
|-------|-------------|----------|-------------------|
| **Last Click** | Full credit to last notification before conversion | Simple attribution, purchase tracking | 100% to last touch |
| **First Click** | Full credit to first notification | User acquisition, reactivation | 100% to first touch |
| **Linear** | Equal credit to all notifications in window | Content-heavy funnels | Equal distribution |
| **Time Decay** | More credit to recent notifications | Time-sensitive conversions | Exponential decay |
| **Position Based** | 40% first, 20% middle, 40% last | Multi-step funnels | U-shaped |

```typescript
class AttributionModelEngine {
    async attributeConversion(
        userId: string,
        conversionType: string,
        conversionTimestamp: Date,
        model: AttributionModel
    ): Promise<AttributedNotification[]> {
        const notifications = await this.getNotificationsInWindow(
            userId,
            conversionTimestamp,
            this.getWindowForModel(model)
        );

        if (notifications.length === 0) return [];

        const weights = this.calculateWeights(notifications.length, model);

        return notifications.map((n, i) => ({
            notificationId: n.id,
            campaignId: n.campaign_id,
            notificationType: n.type,
            openedAt: n.opened_at,
            weight: weights[i],
            attributedValue: weights[i], // Can be multiplied by conversion value
        }));
    }

    private calculateWeights(
        count: number,
        model: AttributionModel
    ): number[] {
        switch (model) {
            case "last_click": {
                const weights = new Array(count).fill(0);
                weights[count - 1] = 1;
                return weights;
            }
            case "first_click": {
                const weights = new Array(count).fill(0);
                weights[0] = 1;
                return weights;
            }
            case "linear":
                return new Array(count).fill(1 / count);
            case "time_decay": {
                const weights = Array.from({ length: count }, (_, i) =>
                    Math.exp(0.5 * (i + 1))
                );
                const sum = weights.reduce((a, b) => a + b, 0);
                return weights.map(w => w / sum);
            }
            case "position_based": {
                if (count === 1) return [1];
                if (count === 2) return [0.5, 0.5];
                const weights = new Array(count).fill(0);
                weights[0] = 0.4; // First
                weights[count - 1] = 0.4; // Last
                const remaining = 0.2 / (count - 2);
                for (let i = 1; i < count - 1; i++) {
                    weights[i] = remaining;
                }
                return weights;
            }
        }
    }

    private getWindowForModel(model: AttributionModel): number {
        switch (model) {
            case "last_click": return 72;   // 72 hours
            case "first_click": return 168;  // 7 days
            case "linear": return 168;       // 7 days
            case "time_decay": return 72;    // 72 hours
            case "position_based": return 168; // 7 days
        }
    }

    private async getNotificationsInWindow(
        userId: string,
        timestamp: Date,
        windowHours: number
    ): Promise<any[]> {
        return db.query(
            `SELECT n.id, n.campaign_id, n.type, o.created_at as opened_at
             FROM notification_opens o
             JOIN notifications n ON o.notification_id = n.id
             WHERE o.user_id = ?
               AND o.created_at >= ? - INTERVAL '?' HOUR
               AND o.created_at <= ?
               AND n.type IN ('transactional', 'promotional', 're_engagement')
             ORDER BY o.created_at ASC`,
            [userId, timestamp, windowHours, timestamp]
        );
    }
}

type AttributionModel =
    | "last_click"
    | "first_click"
    | "linear"
    | "time_decay"
    | "position_based";

interface AttributedNotification {
    notificationId: string;
    campaignId: string;
    notificationType: string;
    openedAt: Date;
    weight: number;
    attributedValue: number;
}
```

## Analytics Platforms

### Platform Integration Matrix

| Feature | Firebase Analytics | Mixpanel | Amplitude | Segment | Braze |
|---------|------------------|----------|-----------|---------|-------|
| Push analytics | Native (FCM) | SDK events | SDK events | Via integrations | Native |
| A/B testing | Remote Config | Experiments | Flag delivery | Via tools | Native |
| User profiles | Firebase Auth | Profiles | User360 | Profiles | Native |
| Funnel analysis | Google Analytics | Funnels | Funnels | Via tools | Funnels |
| Retention | Limited | Cohorts | Retention | Via tools | Cohorts |
| Real-time | Yes | Limited | Yes | Limited | Yes |
| Cost | Free (tiered) | Paid | Paid | Paid | Paid |
| Export | BigQuery | Raw data | Raw data | Warehouses | API |
| Segmentation | Audiences | Formulas | Behavioral | Protocols | Segments |

### Platform Integration Code

```typescript
// Analytics platform abstraction
interface AnalyticsPlatform {
    track(event: string, properties: Record<string, any>): Promise<void>;
    identify(userId: string, traits: Record<string, any>): Promise<void>;
    group(groupId: string, traits: Record<string, any>): Promise<void>;
    alias(previousId: string, newId: string): Promise<void>;
    flush(): Promise<void>;
}

class FirebaseAnalyticsAdapter implements AnalyticsPlatform {
    private readonly firebase: FirebaseAnalytics;

    constructor() {
        this.firebase = getAnalytics();
    }

    async track(event: string, properties: Record<string, any>): Promise<void> {
        logEvent(this.firebase, event, properties);
    }

    async identify(userId: string, traits: Record<string, any>): Promise<void> {
        setUserId(this.firebase, userId);
        for (const [key, value] of Object.entries(traits)) {
            setUserProperties(this.firebase, { [key]: value });
        }
    }

    async group(_groupId: string, _traits: Record<string, any>): Promise<void> {
        // Not supported in Firebase Analytics
    }

    async alias(_previousId: string, _newId: string): Promise<void> {
        // Not needed — Firebase handles identity automatically
    }

    async flush(): Promise<void> {
        // Firebase flushes automatically
    }
}

class MixpanelAdapter implements AnalyticsPlatform {
    private readonly mixpanel: Mixpanel;

    constructor() {
        this.mixpanel = mixpanel.init(process.env.MIXPANEL_TOKEN, {
            track_pageview: true,
            persistence: "localStorage",
        });
    }

    async track(event: string, properties: Record<string, any>): Promise<void> {
        this.mixpanel.track(event, properties);
    }

    async identify(userId: string, traits: Record<string, any>): Promise<void> {
        this.mixpanel.identify(userId);
        this.mixpanel.people.set(traits);
    }

    async group(groupId: string, traits: Record<string, any>): Promise<void> {
        this.mixpanel.register({ group: groupId });
        this.mixpanel.groups.set("organization", groupId, traits);
    }

    async alias(previousId: string, newId: string): Promise<void> {
        this.mixpanel.alias(previousId, newId);
    }

    async flush(): Promise<void> {
        this.mixpanel.flush();
    }
}

class SegmentAdapter implements AnalyticsPlatform {
    private readonly analytics: Analytics;

    constructor() {
        this.analytics = new Analytics({
            writeKey: process.env.SEGMENT_WRITE_KEY,
        });
    }

    async track(event: string, properties: Record<string, any>): Promise<void> {
        this.analytics.track({
            event,
            properties,
        });
    }

    async identify(userId: string, traits: Record<string, any>): Promise<void> {
        this.analytics.identify({
            userId,
            traits,
        });
    }

    async group(groupId: string, traits: Record<string, any>): Promise<void> {
        this.analytics.group({
            groupId,
            traits,
        });
    }

    async alias(previousId: string, newId: string): Promise<void> {
        this.analytics.alias({
            previousId,
            userId: newId,
        });
    }

    async flush(): Promise<void> {
        await this.analytics.flush();
    }
}
```

```kotlin
// Android — Segment + Firebase integration
class AnalyticsManager private constructor(context: Context) {
    private val segment: Analytics = Analytics.Builder(context, SEGMENT_WRITE_KEY).build()
    private val firebase: FirebaseAnalytics = FirebaseAnalytics.getInstance(context)

    fun trackNotificationEvent(
        eventName: String,
        notificationId: String,
        campaignId: String?,
        properties: Map<String, Any> = emptyMap()
    ) {
        val allProperties = properties + mapOf(
            "notification_id" to notificationId,
            "campaign_id" to (campaignId ?: "unknown"),
            "platform" to "android",
            "timestamp" to System.currentTimeMillis(),
        )

        // Send to Segment (which distributes to all destinations)
        segment.track(eventName, allProperties)

        // Direct Firebase for immediate availability
        val bundle = Bundle()
        allProperties.forEach { (key, value) ->
            when (value) {
                is String -> bundle.putString(key, value)
                is Int -> bundle.putInt(key, value)
                is Long -> bundle.putLong(key, value)
                is Double -> bundle.putDouble(key, value)
                is Boolean -> bundle.putBoolean(key, value.toString())
            }
        }
        firebase.logEvent(eventName, bundle)
    }
}
```

## Event Schema Design

### Standardized Event Taxonomy

```
Notification Events
├── notification_sent           # Push submitted to FCM/APNs
├── notification_delivered      # Received by device OS
├── notification_impression     # Displayed to user
├── notification_open           # User tapped the notification
├── notification_dismiss        # User dismissed without action
├── notification_click          # User clicked a notification action
├── notification_follow_up      # User completed in-app action
├── notification_conversion     # User completed goal (purchase, signup)
└── notification_bounce         # Push service rejected delivery
```

### Event Properties Schema

```typescript
// Base notification event schema
interface NotificationEventBase {
    // Identifiers
    notification_id: string;
    user_id: string;
    device_id: string;
    session_id?: string;

    // Campaign info
    campaign_id?: string;
    campaign_name?: string;
    campaign_channel?: string;

    // Notification metadata
    notification_type: string;       // "transactional", "promotional", "re_engagement"
    notification_channel: string;    // "messages", "orders", "promotions" (Android channel)
    notification_category: string;   // "MESSAGE", "ORDER_UPDATE" (iOS category)
    notification_priority: "high" | "normal";

    // Timing
    timestamp: string;               // ISO 8601
    timezone: string;
    app_version: string;
    os_version: string;

    // Platform
    platform: "ios" | "android" | "huawei" | "xiaomi";
    device_model: string;
    screen_size?: string;
}

// Specific event extensions
interface NotificationSentEvent extends NotificationEventBase {
    event: "notification_sent";
    payload_size_bytes: number;
    push_service: "fcm" | "apns" | "huawei" | "xiaomi";
    ttl_seconds: number;
    collapse_key?: string;
    message_id: string;
}

interface NotificationDeliveredEvent extends NotificationEventBase {
    event: "notification_delivered";
    latency_ms: number;
    push_service_latency_ms?: number;
}

interface NotificationOpenEvent extends NotificationEventBase {
    event: "notification_open";
    time_to_open_seconds: number;
    source: "notification_center" | "lock_screen" | "banner" | "direct_open";
    action_id?: string;             // Which action button was tapped
    deep_link?: string;
}

interface NotificationConversionEvent extends NotificationEventBase {
    event: "notification_conversion";
    conversion_type: string;        // "purchase", "registration", "subscription"
    conversion_value: number;       // Monetary value if applicable
    conversion_currency?: string;   // "USD", "EUR"
    attribution_model: string;
    time_to_conversion_seconds: number;
}
```

### User Properties Taxonomy

```typescript
interface UserNotificationProperties {
    // Core identity
    user_id: string;
    email?: string;
    push_enabled: boolean;
    push_token_status: "active" | "expired" | "never_registered";

    // Channel preferences
    channels_enabled: string[];       // ["messages", "orders", "promotions"]
    channels_blocked: string[];
    quiet_hours_enabled: boolean;
    quiet_hours_start?: string;       // "22:00"
    quiet_hours_end?: string;         // "08:00"
    timezone: string;

    // Engagement metrics (computed)
    lifetime_notifications_received: number;
    lifetime_notifications_opened: number;
    lifetime_open_rate: number;
    last_notification_open?: string;  // ISO 8601
    last_notification_received?: string;
    avg_time_to_open_seconds: number;
    preferred_open_hour?: number;     // User's most active hour for opens

    // Segment info
    segment?: string;
    lifecycle_stage: "new" | "active" | "at_risk" | "churned" | "reactivated";
    notification_recency_score: number;  // 0-100, how recently they engaged
    notification_frequency_score: number; // 0-100, how frequently they engage
}
```

## A/B Testing

### Subject Line and Content Testing

```typescript
class NotificationABTest {
    async createTest(config: ABTestConfig): Promise<string> {
        const testId = crypto.randomUUID();

        await db.execute(
            `INSERT INTO notification_tests
             (id, name, notification_type, variants, target_segment,
              sample_size, success_metric, min_duration_hours, status, created_at)
             VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, ?, 'running', NOW())`,
            [
                testId,
                config.name,
                config.notificationType,
                JSON.stringify(config.variants),
                config.targetSegment,
                config.sampleSize,
                config.successMetric,
                config.minDurationHours,
            ]
        );

        // Enroll users into test variants
        await this.enrollUsers(testId, config);
        return testId;
    }

    private async enrollUsers(
        testId: string,
        config: ABTestConfig
    ): Promise<void> {
        const eligibleUsers = await this.getEligibleUsers(
            config.targetSegment,
            config.sampleSize
        );

        const usersPerVariant = Math.floor(eligibleUsers.length / config.variants.length);

        for (let i = 0; i < config.variants.length; i++) {
            const startIdx = i * usersPerVariant;
            const endIdx = i === config.variants.length - 1
                ? eligibleUsers.length
                : startIdx + usersPerVariant;

            const batchUsers = eligibleUsers.slice(startIdx, endIdx);

            const values = batchUsers.map(u =>
                `('${testId}', '${u}', '${config.variants[i].id}', 'active', NOW())`
            ).join(", ");

            await db.execute(
                `INSERT INTO test_enrollments (test_id, user_id, variant_id, status, enrolled_at)
                 VALUES ${values}`
            );
        }
    }

    async getResults(testId: string): Promise<ABTestResult> {
        const test = await db.query(
            "SELECT * FROM notification_tests WHERE id = ?",
            [testId]
        );

        const results = await db.query(
            `SELECT
                e.variant_id,
                COUNT(DISTINCT e.user_id) as enrolled_users,
                COUNT(DISTINCT n.id) as notifications_sent,
                COUNT(DISTINCT o.notification_id) as opened,
                COUNT(DISTINCT c.notification_id) as clicked,
                COUNT(DISTINCT cv.id) as converted,
                COUNT(DISTINCT d.notification_id) as delivered
             FROM test_enrollments e
             LEFT JOIN notifications n ON n.user_id = e.user_id
                AND n.created_at >= e.enrolled_at
             LEFT JOIN notification_delivery d ON d.notification_id = n.id
                AND d.status = 'delivered'
             LEFT JOIN notification_opens o ON o.notification_id = n.id
             LEFT JOIN notification_clicks c ON c.notification_id = n.id
             LEFT JOIN notification_conversions cv ON cv.user_id = e.user_id
                AND cv.converted_at >= e.enrolled_at
             WHERE e.test_id = ?
             GROUP BY e.variant_id`,
            [testId]
        );

        const variants = (JSON.parse(test.variants)).map((v: any) => {
            const r = results.find((r: any) => r.variant_id === v.id);
            return {
                ...v,
                enrolled: r?.enrolled_users ?? 0,
                sent: r?.notifications_sent ?? 0,
                delivered: r?.delivered ?? 0,
                opened: r?.opened ?? 0,
                clicked: r?.clicked ?? 0,
                converted: r?.converted ?? 0,
                openRate: r?.opened / r?.delivered ?? 0,
                clickRate: r?.clicked / r?.opened ?? 0,
                conversionRate: r?.converted / r?.clicked ?? 0,
                deliveryRate: r?.delivered / r?.notifications_sent ?? 0,
            };
        });

        const winner = this.determineWinner(variants, test.success_metric);
        const significance = this.calculateSignificance(
            variants,
            test.success_metric
        );

        return { testId, testName: test.name, variants, winner, significance };
    }

    private determineWinner(
        variants: any[],
        metric: string
    ): string | null {
        if (variants.length < 2) return null;

        const metricKey = metric === "open_rate" ? "openRate"
            : metric === "click_rate" ? "clickRate"
            : metric === "conversion_rate" ? "conversionRate"
            : "deliveryRate";

        const best = variants.reduce((best, v) =>
            v[metricKey] > (best[metricKey] ?? 0) ? v : best
        , variants[0]);

        return best.id;
    }

    private calculateSignificance(
        variants: any[],
        metric: string
    ): number {
        if (variants.length < 2) return 0;

        // Chi-squared test for significance
        const control = variants[0];
        const treatment = variants[1];

        const a = control.converted;
        const b = control.sent - control.converted;
        const c = treatment.converted;
        const d = treatment.sent - treatment.converted;

        const n = a + b + c + d;
        const chiSquared = n * Math.pow(a * d - c * b, 2)
            / ((a + b) * (c + d) * (a + c) * (b + d));

        // Approximate p-value from chi-squared with 1 DOF
        // This is a rough approximation — use a proper stats library in production
        return 1 - Math.exp(-chiSquared / 2);
    }
}

interface ABTestConfig {
    name: string;
    notificationType: string;
    variants: Array<{
        id: string;
        title: string;
        body: string;
        imageUrl?: string;
        deepLink?: string;
        priority?: "high" | "normal";
    }>;
    targetSegment: string;
    sampleSize: number;
    successMetric: "open_rate" | "click_rate" | "conversion_rate" | "delivery_rate";
    minDurationHours: number;
}

interface ABTestResult {
    testId: string;
    testName: string;
    variants: any[];
    winner: string | null;
    significance: number;
}
```

### Delivery Time Testing

```typescript
class DeliveryTimeOptimizer {
    async runTimeTest(
        segment: string,
        testDurationDays: number = 14
    ): Promise<TimeTestResult> {
        const timeSlots = [
            { hour: 8, label: "Morning (8 AM)" },
            { hour: 12, label: "Noon (12 PM)" },
            { hour: 15, label: "Afternoon (3 PM)" },
            { hour: 18, label: "Evening (6 PM)" },
            { hour: 21, label: "Night (9 PM)" },
        ];

        const eligibleUsers = await this.getEligibleUsers(segment);
        const usersPerSlot = Math.floor(eligibleUsers.length / timeSlots.length);

        // Assign each user to a time slot
        for (let i = 0; i < timeSlots.length; i++) {
            const startIdx = i * usersPerSlot;
            const endIdx = i === timeSlots.length - 1
                ? eligibleUsers.length
                : startIdx + usersPerSlot;

            const slotUsers = eligibleUsers.slice(startIdx, endIdx);

            for (const userId of slotUsers) {
                await db.execute(
                    `INSERT INTO time_test_assignments
                     (user_id, slot_hour, slot_label, segment, assigned_at)
                     VALUES (?, ?, ?, ?, NOW())`,
                    [userId, timeSlots[i].hour, timeSlots[i].label, segment]
                );
            }
        }

        // Wait for the test duration, then analyze
        await sleep(testDurationDays * 24 * 60 * 60 * 1000);

        return this.analyzeTimeTest(segment);
    }

    private async analyzeTimeTest(segment: string): Promise<TimeTestResult> {
        const results = await db.query(
            `SELECT
                t.slot_hour,
                t.slot_label,
                COUNT(DISTINCT t.user_id) as users,
                COUNT(DISTINCT n.id) as notifications_sent,
                COUNT(DISTINCT o.notification_id) as opens,
                COUNT(DISTINCT c.notification_id) as clicks,
                ROUND(
                    COUNT(DISTINCT o.notification_id) * 100.0 /
                    NULLIF(COUNT(DISTINCT n.id), 0), 2
                ) as open_rate,
                ROUND(AVG(o.time_to_open_seconds), 0) as avg_time_to_open
             FROM time_test_assignments t
             LEFT JOIN notifications n ON n.user_id = t.user_id
                AND n.created_at >= t.assigned_at
             LEFT JOIN notification_opens o ON o.notification_id = n.id
             LEFT JOIN notification_clicks c ON c.notification_id = n.id
             WHERE t.segment = ?
               AND n.scheduled_for_hour = t.slot_hour
             GROUP BY t.slot_hour, t.slot_label
             ORDER BY open_rate DESC`,
            [segment]
        );

        return {
            segment,
            slotResults: results.map(r => ({
                hour: r.slot_hour,
                label: r.slot_label,
                users: Number(r.users),
                sent: Number(r.notifications_sent),
                opens: Number(r.opens),
                clicks: Number(r.clicks),
                openRate: Number(r.open_rate),
                avgTimeToOpen: Number(r.avg_time_to_open),
            })),
            recommendedHour: results[0]?.slot_hour ?? 10,
            recommendedLabel: results[0]?.slot_label ?? "Morning (10 AM)",
        };
    }
}
```

## Cohort Analysis

### User Segment Performance

```typescript
class CohortAnalyzer {
    async analyzeCohorts(
        cohortPeriod: "day" | "week" | "month",
        metric: "open_rate" | "retention" | "conversion",
        lookbackPeriods: number = 12
    ): Promise<CohortAnalysis> {
        const cohorts = await db.query(
            `SELECT
                DATE_TRUNC(?, u.created_at) as cohort_date,
                COUNT(DISTINCT u.id) as cohort_size,
                DATE_TRUNC(?, o.created_at) as period,
                COUNT(DISTINCT o.user_id) as active_users,
                COUNT(DISTINCT o.notification_id) as total_opens,
                COUNT(DISTINCT n.id) as total_notifications,
                ROUND(
                    COUNT(DISTINCT o.user_id) * 100.0 /
                    NULLIF(COUNT(DISTINCT u.id), 0), 2
                ) as retention_rate
             FROM users u
             LEFT JOIN notification_opens o ON o.user_id = u.id
             LEFT JOIN notifications n ON n.user_id = u.id
             WHERE u.created_at >= DATE_TRUNC(?, NOW() - INTERVAL '?' ?)
             GROUP BY cohort_date, period
             ORDER BY cohort_date, period`,
            [cohortPeriod, cohortPeriod, cohortPeriod, lookbackPeriods, cohortPeriod]
        );

        return this.buildCohortMatrix(cohorts, cohortPeriod);
    }

    private buildCohortMatrix(
        rows: any[],
        period: string
    ): CohortAnalysis {
        const cohorts: Map<string, CohortData> = new Map();

        for (const row of rows) {
            const cohortKey = this.formatDate(row.cohort_date, period);
            const periodKey = this.formatDate(row.period, period);
            const periodNumber = this.calculatePeriodNumber(
                row.cohort_date,
                row.period,
                period
            );

            if (!cohorts.has(cohortKey)) {
                cohorts.set(cohortKey, {
                    cohortDate: cohortKey,
                    size: Number(row.cohort_size),
                    periods: [],
                });
            }

            const cohort = cohorts.get(cohortKey);
            cohort.periods.push({
                period: periodKey,
                periodNumber: Number(periodNumber),
                activeUsers: Number(row.active_users),
                totalOpens: Number(row.total_opens),
                retentionRate: Number(row.retention_rate),
            });
        }

        return {
            period,
            cohorts: Array.from(cohorts.values()),
        };
    }
}

interface CohortAnalysis {
    period: string;
    cohorts: CohortData[];
}

interface CohortData {
    cohortDate: string;
    size: number;
    periods: CohortPeriod[];
}

interface CohortPeriod {
    period: string;
    periodNumber: number;
    activeUsers: number;
    totalOpens: number;
    retentionRate: number;
}
```

### Retention Cohorts

```typescript
class NotificationRetentionAnalysis {
    async getRetentionCohorts(
        timeRange: { start: Date; end: Date }
    ): Promise<RetentionCohort[]> {
        return db.query(
            `WITH user_first_open AS (
                SELECT
                    user_id,
                    DATE_TRUNC('week', MIN(created_at)) as first_open_week
                FROM notification_opens
                WHERE created_at BETWEEN ? AND ?
                GROUP BY user_id
            ),
            weekly_activity AS (
                SELECT
                    ufo.user_id,
                    ufo.first_open_week,
                    DATE_TRUNC('week', o.created_at) as activity_week,
                    COUNT(DISTINCT o.notification_id) as opens
                FROM user_first_open ufo
                JOIN notification_opens o ON o.user_id = ufo.user_id
                GROUP BY ufo.user_id, ufo.first_open_week, activity_week
            )
            SELECT
                first_open_week,
                COUNT(DISTINCT user_id) as cohort_size,
                activity_week,
                COUNT(DISTINCT user_id) as retained_users,
                ROUND(
                    COUNT(DISTINCT user_id) * 100.0 / MAX(COUNT(DISTINCT user_id))
                        OVER (PARTITION BY first_open_week), 2
                ) as retention_rate,
                AVG(opens) as avg_opens_per_user
            FROM weekly_activity
            GROUP BY first_open_week, activity_week
            ORDER BY first_open_week, activity_week`,
            [timeRange.start, timeRange.end]
        );
    }
}
```

## Funnel Analysis

### Notification-to-Conversion Funnel

```typescript
class NotificationFunnel {
    async buildFunnel(
        timeRange: { start: Date; end: Date },
        filters?: FunnelFilters
    ): Promise<FunnelStep[]> {
        const baseConditions = this.buildConditions(filters);

        const steps = [
            {
                name: "Sent",
                query: `SELECT COUNT(*) as count FROM notifications
                        WHERE created_at BETWEEN ? AND ? ${baseConditions}`,
                color: "#6366f1",
            },
            {
                name: "Delivered",
                query: `SELECT COUNT(DISTINCT d.notification_id) as count
                        FROM notification_delivery d
                        JOIN notifications n ON d.notification_id = n.id
                        WHERE d.status = 'delivered'
                          AND d.created_at BETWEEN ? AND ? ${baseConditions}`,
                color: "#8b5cf6",
            },
            {
                name: "Impressed",
                query: `SELECT COUNT(DISTINCT i.notification_id) as count
                        FROM notification_impressions i
                        JOIN notifications n ON i.notification_id = n.id
                        WHERE i.created_at BETWEEN ? AND ? ${baseConditions}`,
                color: "#a855f7",
            },
            {
                name: "Opened",
                query: `SELECT COUNT(DISTINCT o.notification_id) as count
                        FROM notification_opens o
                        JOIN notifications n ON o.notification_id = n.id
                        WHERE o.created_at BETWEEN ? AND ? ${baseConditions}`,
                color: "#ec4899",
            },
            {
                name: "Clicked",
                query: `SELECT COUNT(DISTINCT c.notification_id) as count
                        FROM notification_clicks c
                        JOIN notifications n ON c.notification_id = n.id
                        WHERE c.created_at BETWEEN ? AND ? ${baseConditions}`,
                color: "#f43f5e",
            },
            {
                name: "Converted",
                query: `SELECT COUNT(DISTINCT cv.id) as count
                        FROM notification_conversions cv
                        JOIN notifications n ON cv.notification_id = n.id
                        WHERE cv.converted_at BETWEEN ? AND ? ${baseConditions}`,
                color: "#10b981",
            },
        ];

        const results = await Promise.all(
            steps.map(async (step) => {
                const result = await db.query(step.query, [timeRange.start, timeRange.end]);
                return {
                    name: step.name,
                    count: Number(result.count),
                    color: step.color,
                };
            })
        );

        // Calculate conversion rates between steps
        for (let i = 1; i < results.length; i++) {
            results[i].rate = results[i - 1].count > 0
                ? results[i].count / results[i - 1].count
                : 0;
        }

        return results;
    }

    async getDropOffAnalysis(
        timeRange: { start: Date; end: Date }
    ): Promise<DropOffPoint[]> {
        const funnel = await this.buildFunnel(timeRange);

        const dropOffs: DropOffPoint[] = [];
        for (let i = 0; i < funnel.length - 1; i++) {
            const current = funnel[i];
            const next = funnel[i + 1];
            const dropOff = current.count - next.count;
            const dropOffRate = current.count > 0 ? dropOff / current.count : 0;

            dropOffs.push({
                from: current.name,
                to: next.name,
                droppedUsers: dropOff,
                dropOffRate,
                severity: dropOffRate > 0.5 ? "high" : dropOffRate > 0.2 ? "medium" : "low",
            });
        }

        return dropOffs;
    }
}

interface FunnelStep {
    name: string;
    count: number;
    color: string;
    rate?: number;
}

interface DropOffPoint {
    from: string;
    to: string;
    droppedUsers: number;
    dropOffRate: number;
    severity: "high" | "medium" | "low";
}
```

### Funnel Segmentation

```typescript
class FunnelSegmenter {
    async segmentFunnel(
        timeRange: { start: Date; end: Date }
    ): Promise<FunnelSegmentation> {
        const segments = await db.query(
            `SELECT
                u.segment,
                COUNT(DISTINCT n.id) as sent,
                COUNT(DISTINCT d.notification_id) as delivered,
                COUNT(DISTINCT o.notification_id) as opened,
                COUNT(DISTINCT c.notification_id) as clicked,
                COUNT(DISTINCT cv.id) as converted,
                ROUND(
                    COUNT(DISTINCT o.notification_id) * 100.0 /
                    NULLIF(COUNT(DISTINCT d.notification_id), 0), 2
                ) as delivery_to_open,
                ROUND(
                    COUNT(DISTINCT cv.id) * 100.0 /
                    NULLIF(COUNT(DISTINCT c.notification_id), 0), 2
                ) as click_to_conversion
             FROM users u
             LEFT JOIN notifications n ON n.user_id = u.id
                AND n.created_at BETWEEN ? AND ?
             LEFT JOIN notification_delivery d ON d.notification_id = n.id
                AND d.status = 'delivered'
             LEFT JOIN notification_opens o ON o.notification_id = n.id
             LEFT JOIN notification_clicks c ON c.notification_id = n.id
             LEFT JOIN notification_conversions cv ON cv.user_id = u.id
                AND cv.converted_at BETWEEN ? AND ?
             GROUP BY u.segment
             ORDER BY sent DESC`,
            [timeRange.start, timeRange.end, timeRange.start, timeRange.end]
        );

        return {
            segments: segments.map((s: any) => ({
                segment: s.segment,
                sent: Number(s.sent),
                delivered: Number(s.delivered),
                opened: Number(s.opened),
                clicked: Number(s.clicked),
                converted: Number(s.converted),
                deliveryRate: Number(s.sent) > 0 ? Number(s.delivered) / Number(s.sent) : 0,
                openRate: Number(s.delivered) > 0 ? Number(s.opened) / Number(s.delivered) : 0,
                clickRate: Number(s.opened) > 0 ? Number(s.clicked) / Number(s.opened) : 0,
                conversionRate: Number(s.clicked) > 0 ? Number(s.converted) / Number(s.clicked) : 0,
            })),
        };
    }
}
```

## Lifetime Value Analysis

### Notification-Influenced LTV

```typescript
class LTVCalculator {
    async calculateNotificationInfluencedLTV(
        segment: string,
        lookbackDays: number = 365
    ): Promise<LTVResult> {
        // Users who received notifications
        const notificationUsers = await db.query(
            `SELECT
                u.id,
                u.created_at,
                COUNT(DISTINCT n.id) as notifications_received,
                SUM(DISTINCT CASE WHEN cv.conversion_type = 'purchase'
                    THEN cv.value ELSE 0 END) as total_revenue,
                COUNT(DISTINCT CASE WHEN cv.conversion_type = 'purchase'
                    THEN cv.id END) as total_purchases,
                DATE_TRUNC('month', u.created_at) as acquisition_cohort
             FROM users u
             JOIN notifications n ON n.user_id = u.id
             LEFT JOIN notification_conversions cv ON cv.user_id = u.id
             WHERE u.created_at >= NOW() - INTERVAL '?' DAY
               ${segment ? "AND u.segment = ?" : ""}
             GROUP BY u.id
             ORDER BY u.id`,
            [lookbackDays, ...(segment ? [segment] : [])]
        );

        // Control group: users who did NOT receive notifications
        const controlUsers = await db.query(
            `SELECT
                u.id,
                u.created_at,
                0 as notifications_received,
                SUM(DISTINCT CASE WHEN cv.conversion_type = 'purchase'
                    THEN cv.value ELSE 0 END) as total_revenue,
                COUNT(DISTINCT CASE WHEN cv.conversion_type = 'purchase'
                    THEN cv.id END) as total_purchases,
                DATE_TRUNC('month', u.created_at) as acquisition_cohort
             FROM users u
             LEFT JOIN notifications n ON n.user_id = u.id
             LEFT JOIN notification_conversions cv ON cv.user_id = u.id
             WHERE n.id IS NULL
               AND u.created_at >= NOW() - INTERVAL '?' DAY
               ${segment ? "AND u.segment = ?" : ""}
             GROUP BY u.id
             ORDER BY u.id`,
            [lookbackDays, ...(segment ? [segment] : [])]
        );

        const avgNotificationLTV = this.calculateAverageLTV(notificationUsers);
        const avgControlLTV = this.calculateAverageLTV(controlUsers);
        const lift = avgControlLTV > 0
            ? ((avgNotificationLTV - avgControlLTV) / avgControlLTV) * 100
            : 0;

        return {
            segment,
            notificationGroup: {
                userCount: notificationUsers.length,
                avgLTV: avgNotificationLTV,
                avgRevenuePerUser: notificationUsers.reduce((sum: number, u: any) =>
                    sum + Number(u.total_revenue), 0
                ) / (notificationUsers.length || 1),
                avgPurchasesPerUser: notificationUsers.reduce((sum: number, u: any) =>
                    sum + Number(u.total_purchases), 0
                ) / (notificationUsers.length || 1),
            },
            controlGroup: {
                userCount: controlUsers.length,
                avgLTV: avgControlLTV,
                avgRevenuePerUser: controlUsers.reduce((sum: number, u: any) =>
                    sum + Number(u.total_revenue), 0
                ) / (controlUsers.length || 1),
                avgPurchasesPerUser: controlUsers.reduce((sum: number, u: any) =>
                    sum + Number(u.total_purchases), 0
                ) / (controlUsers.length || 1),
            },
            liftPercentage: lift,
            liftAbsolute: avgNotificationLTV - avgControlLTV,
        };
    }

    private calculateAverageLTV(users: any[]): number {
        if (users.length === 0) return 0;
        const totalRevenue = users.reduce(
            (sum: number, u: any) => sum + Number(u.total_revenue), 0
        );
        return totalRevenue / users.length;
    }
}

interface LTVResult {
    segment: string;
    notificationGroup: GroupLTV;
    controlGroup: GroupLTV;
    liftPercentage: number;
    liftAbsolute: number;
}

interface GroupLTV {
    userCount: number;
    avgLTV: number;
    avgRevenuePerUser: number;
    avgPurchasesPerUser: number;
}
```

## Churn Prediction

### Engagement Decline Detection

```typescript
class ChurnPredictor {
    async detectDecliningEngagement(
        userId: string
    ): Promise<EngagementTrend> {
        const periods = await db.query(
            `SELECT
                DATE_TRUNC('week', created_at) as week,
                COUNT(*) as opens,
                COUNT(DISTINCT notification_id) as unique_notifications_opened
             FROM notification_opens
             WHERE user_id = ?
               AND created_at >= NOW() - INTERVAL '8 WEEK'
             GROUP BY week
             ORDER BY week`,
            [userId]
        );

        if (periods.length < 4) {
            return { status: "insufficient_data", trend: 0 };
        }

        // Calculate trend using linear regression
        const trend = this.calculateTrend(periods);

        // Determine status based on trend
        let status: "increasing" | "stable" | "declining" | "critical";
        if (trend > 0.1) status = "increasing";
        else if (trend > -0.1) status = "stable";
        else if (trend > -0.5) status = "declining";
        else status = "critical";

        return {
            status,
            trend,
            currentWeeklyOpens: Number(periods[periods.length - 1].opens),
            peakWeeklyOpens: Math.max(...periods.map((p: any) => Number(p.opens))),
            weeksDeclining: this.countConsecutiveDeclines(periods),
        };
    }

    private calculateTrend(periods: any[]): number {
        const n = periods.length;
        const xMean = (n - 1) / 2;
        const yMean = periods.reduce((sum: number, p: any) => sum + Number(p.opens), 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            const x = i - xMean;
            const y = Number(periods[i].opens) - yMean;
            numerator += x * y;
            denominator += x * x;
        }

        return denominator !== 0 ? numerator / denominator : 0;
    }

    private countConsecutiveDeclines(periods: any[]): number {
        let declines = 0;
        for (let i = periods.length - 1; i > 0; i--) {
            if (Number(periods[i].opens) < Number(periods[i - 1].opens)) {
                declines++;
            } else {
                break;
            }
        }
        return declines;
    }

    async findUsersAtRisk(
        threshold: "low" | "medium" | "high" = "medium"
    ): Promise<AtRiskUser[]> {
        const minActivityThresholds = {
            low: 3,    // < 3 opens in 4 weeks
            medium: 2,  // < 2 opens in 4 weeks
            high: 1,    // < 1 open in 4 weeks
        };

        const minOpens = minActivityThresholds[threshold];

        return db.query(
            `SELECT
                u.id,
                u.segment,
                COUNT(DISTINCT o.id) as opens_last_4_weeks,
                MAX(o.created_at) as last_open,
                DATEDIFF(NOW(), MAX(o.created_at)) as days_since_last_open,
                COUNT(DISTINCT n.id) as notifications_received,
                ROUND(
                    COUNT(DISTINCT o.id) * 100.0 /
                    NULLIF(COUNT(DISTINCT n.id), 0), 2
                ) as historical_open_rate
             FROM users u
             JOIN notifications n ON n.user_id = u.id
                AND n.created_at >= NOW() - INTERVAL '4 WEEK'
             LEFT JOIN notification_opens o ON o.notification_id = n.id
             GROUP BY u.id
             HAVING COUNT(DISTINCT o.id) <= ?
                AND MAX(o.created_at) < NOW() - INTERVAL '7 DAY'
             ORDER BY days_since_last_open DESC`,
            [minOpens]
        );
    }
}

interface EngagementTrend {
    status: "increasing" | "stable" | "declining" | "critical" | "insufficient_data";
    trend: number;
    currentWeeklyOpens: number;
    peakWeeklyOpens: number;
    weeksDeclining: number;
}

interface AtRiskUser {
    id: string;
    segment: string;
    opens_last_4_weeks: number;
    last_open: Date;
    days_since_last_open: number;
    notifications_received: number;
    historical_open_rate: number;
}
```

### Re-Engagement Scoring

```typescript
class ReEngagementScorer {
    private readonly WEIGHTS = {
        daysSinceLastOpen: 0.3,
        historicalOpenRate: 0.25,
        notificationRecency: 0.2,
        channelBlocked: 0.15,
        appInstalled: 0.1,
    };

    async scoreUser(userId: string): Promise<ReEngagementScore> {
        const userData = await this.getUserEngagementData(userId);
        if (!userData) return null;

        const scores: Record<string, number> = {
            daysSinceLastOpen: this.scoreDaysSinceLastOpen(
                userData.daysSinceLastOpen
            ),
            historicalOpenRate: this.scoreHistoricalOpenRate(
                userData.historicalOpenRate
            ),
            notificationRecency: this.scoreNotificationRecency(
                userData.lastNotificationDate
            ),
            channelBlocked: userData.channelsBlocked.length > 2 ? 0 : 1,
            appInstalled: userData.appInstalled ? 1 : 0,
        };

        const totalScore = Object.entries(this.WEIGHTS).reduce(
            (sum, [factor, weight]) => sum + (scores[factor] ?? 0) * weight,
            0
        );

        return {
            userId,
            totalScore: Math.round(totalScore * 100),
            factors: scores,
            recommendation: this.getRecommendation(totalScore),
        };
    }

    private scoreDaysSinceLastOpen(days: number): number {
        if (days <= 7) return 0.2;
        if (days <= 14) return 0.4;
        if (days <= 30) return 0.6;
        if (days <= 60) return 0.8;
        return 1.0;
    }

    private scoreHistoricalOpenRate(rate: number): number {
        if (rate >= 0.5) return 1.0;
        if (rate >= 0.3) return 0.7;
        if (rate >= 0.15) return 0.4;
        return 0.1;
    }

    private scoreNotificationRecency(lastDate: Date | null): number {
        if (!lastDate) return 0;
        const daysSince = (Date.now() - lastDate.getTime()) / 86400000;
        if (daysSince <= 7) return 0.2;
        if (daysSince <= 14) return 0.5;
        return 0.8;
    }

    private getRecommendation(score: number): ReEngagementAction {
        if (score >= 0.8) {
            return {
                action: "send_re_engagement",
                priority: "high",
                message: "User at high risk of churn — send personalized re-engagement notification",
                notificationType: "re_engagement",
            };
        }
        if (score >= 0.5) {
            return {
                action: "increase_frequency",
                priority: "medium",
                message: "User engagement declining — consider adjusting notification frequency",
                notificationType: "personalized",
            };
        }
        return {
            action: "maintain",
            priority: "low",
            message: "User engagement is satisfactory",
            notificationType: "normal",
        };
    }

    private async getUserEngagementData(
        userId: string
    ): Promise<UserEngagementData | null> {
        return db.query(
            `SELECT
                u.id,
                u.app_installed,
                DATEDIFF(NOW(), MAX(o.created_at)) as days_since_last_open,
                ROUND(
                    COUNT(DISTINCT o.id) * 100.0 /
                    NULLIF(COUNT(DISTINCT n.id), 0), 2
                ) as historical_open_rate,
                MAX(n.created_at) as last_notification_date,
                u.channels_blocked
             FROM users u
             LEFT JOIN notifications n ON n.user_id = u.id
                AND n.created_at >= NOW() - INTERVAL '90 DAY'
             LEFT JOIN notification_opens o ON o.notification_id = n.id
             WHERE u.id = ?
             GROUP BY u.id`,
            [userId]
        );
    }
}
```

## Dashboard Design

### Real-Time Monitoring Dashboard

```typescript
class DashboardDataProvider {
    async getLiveMetrics(): Promise<LiveMetrics> {
        const [deliveryRate, activeUsers, latency, errors] = await Promise.all([
            this.getCurrentDeliveryRate(),
            this.getActiveUsers(),
            this.getLatencyMetrics(),
            this.getErrorRate(),
        ]);

        return {
            timestamp: new Date(),
            deliveryRate: {
                current: deliveryRate.current,
                change: deliveryRate.change,
                trend: deliveryRate.trend,
            },
            activeUsers: {
                current: activeUsers.current,
                change: activeUsers.change,
            },
            latency: {
                p50: latency.p50,
                p95: latency.p95,
                p99: latency.p99,
            },
            errorRate: {
                current: errors.current,
                change: errors.change,
                byType: errors.byType,
            },
        };
    }

    async getHourlyTrends(hoursBack: number = 24): Promise<TrendData[]> {
        return db.query(
            `SELECT
                DATE_TRUNC('hour', timestamp) as hour,
                COUNT(*) as sent,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened,
                SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked,
                AVG(latency_ms) as avg_latency,
                COUNT(DISTINCT user_id) as unique_users
             FROM notification_events
             WHERE timestamp >= NOW() - INTERVAL '?' HOUR
             GROUP BY hour
             ORDER BY hour`,
            [hoursBack]
        );
    }

    async getAnomalyAlerts(hoursBack: number = 1): Promise<Alert[]> {
        const anomalies = await db.query(
            `SELECT
                'delivery_drop' as type,
                COUNT(*) as total,
                SUM(CASE WHEN status != 'delivered' THEN 1 ELSE 0 END) as failed
             FROM notification_events
             WHERE timestamp >= NOW() - INTERVAL '?' HOUR`,
            [hoursBack]
        );

        const alerts: Alert[] = [];
        const failureRate = anomalies.failed / anomalies.total;
        if (failureRate > 0.1) {
            alerts.push({
                type: "delivery_rate_drop",
                severity: failureRate > 0.2 ? "critical" : "warning",
                message: `Delivery rate dropped to ${((1 - failureRate) * 100).toFixed(1)}%`,
                timestamp: new Date(),
            });
        }

        return alerts;
    }

    private async getCurrentDeliveryRate(): Promise<{
        current: number; change: number; trend: string;
    }> {
        const current = await db.query(
            `SELECT
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                as rate
             FROM notification_events
             WHERE timestamp >= NOW() - INTERVAL '5 MINUTE'`,
        );

        const previous = await db.query(
            `SELECT
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                as rate
             FROM notification_events
             WHERE timestamp >= NOW() - INTERVAL '10 MINUTE'
               AND timestamp < NOW() - INTERVAL '5 MINUTE'`,
        );

        return {
            current: Number(current.rate),
            change: Number(current.rate) - Number(previous.rate),
            trend: Number(current.rate) > Number(previous.rate) ? "up" : "down",
        };
    }
}
```

## Data Pipelines

### Event Streaming with Kafka

```typescript
class NotificationEventStream {
    private readonly producer: KafkaProducer;
    private readonly consumer: KafkaConsumer;
    private readonly TOPIC = "notification_events";

    constructor() {
        const kafka = new Kafka({
            clientId: "notification-analytics",
            brokers: process.env.KAFKA_BROKERS.split(","),
        });

        this.producer = kafka.producer();
        this.consumer = kafka.consumer({ groupId: "notification-analytics-group" });
    }

    async produceEvent(event: NotificationEvent): Promise<void> {
        await this.producer.send({
            topic: this.TOPIC,
            messages: [{
                key: event.notificationId,
                value: JSON.stringify(event),
                headers: {
                    "event-type": event.event,
                    "platform": event.platform,
                    "timestamp": new Date().toISOString(),
                },
            }],
        });
    }

    async startConsumer(): Promise<void> {
        await this.consumer.connect();
        await this.consumer.subscribe({
            topics: [this.TOPIC],
            fromBeginning: false,
        });

        await this.consumer.run({
            eachBatchAutoResolve: true,
            partitionsConsumedConcurrently: 3,
            eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
                const events = batch.messages.map(msg => JSON.parse(msg.value.toString()));

                // Batch write to database
                await this.batchWriteToDatabase(events);

                // Update real-time metrics
                await this.updateMetrics(events);

                // Detect anomalies
                await this.detectAnomalies(events);

                // Commit offsets
                for (const message of batch.messages) {
                    resolveOffset(message.offset);
                }

                await heartbeat();
            },
        });
    }

    private async batchWriteToDatabase(events: any[]): Promise<void> {
        const BATCH_SIZE = 500;
        for (let i = 0; i < events.length; i += BATCH_SIZE) {
            const batch = events.slice(i, i + BATCH_SIZE);
            // Use COPY or multi-row INSERT for efficiency
            await db.execute(
                `INSERT INTO notification_events
                 (notification_id, user_id, event, platform, properties, timestamp)
                 VALUES ${batch.map(() => "(?, ?, ?, ?, ?::jsonb, ?)").join(", ")}`,
                batch.flatMap(e => [
                    e.notificationId, e.userId, e.event,
                    e.platform, JSON.stringify(e), e.timestamp,
                ])
            );
        }
    }

    private async updateMetrics(events: any[]): Promise<void> {
        // Update Redis-backed real-time metrics
        const pipeline = redis.pipeline();

        for (const event of events) {
            const metricKey = `metrics:${event.event}:${this.getMinuteBucket(event.timestamp)}`;
            pipeline.incr(metricKey);
            pipeline.expire(metricKey, 86400); // 24 hours

            if (event.latency_ms) {
                const latencyKey = `latency:${event.platform}:${this.getMinuteBucket(event.timestamp)}`;
                pipeline.rpush(latencyKey, event.latency_ms.toString());
                pipeline.expire(latencyKey, 86400);
            }
        }

        await pipeline.exec();
    }
}
```

### Batch Processing Pipeline

```typescript
class BatchAnalyticsProcessor {
    async processDailyAggregations(): Promise<void> {
        const yesterday = new Date(Date.now() - 86400000);
        const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0));
        const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999));

        const metrics = await this.calculateDailyMetrics(startOfDay, endOfDay);

        await db.execute(
            `INSERT INTO daily_notification_metrics
             (date, sent, delivered, opened, clicked, converted,
              delivery_rate, open_rate, click_rate, conversion_rate,
              avg_latency_ms, p95_latency_ms, unique_users)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (date) DO UPDATE SET
              sent = EXCLUDED.sent,
              delivered = EXCLUDED.delivered,
              opened = EXCLUDED.opened,
              clicked = EXCLUDED.clicked,
              converted = EXCLUDED.converted,
              delivery_rate = EXCLUDED.delivery_rate,
              open_rate = EXCLUDED.open_rate,
              click_rate = EXCLUDED.click_rate,
              conversion_rate = EXCLUDED.conversion_rate,
              avg_latency_ms = EXCLUDED.avg_latency_ms,
              p95_latency_ms = EXCLUDED.p95_latency_ms,
              unique_users = EXCLUDED.unique_users`,
            [
                startOfDay,
                metrics.sent,
                metrics.delivered,
                metrics.opened,
                metrics.clicked,
                metrics.converted,
                metrics.deliveryRate,
                metrics.openRate,
                metrics.clickRate,
                metrics.conversionRate,
                metrics.avgLatency,
                metrics.p95Latency,
                metrics.uniqueUsers,
            ]
        );
    }

    private async calculateDailyMetrics(
        start: Date,
        end: Date
    ): Promise<DailyMetrics> {
        const result = await db.query(
            `SELECT
                COUNT(DISTINCT n.id) as sent,
                COUNT(DISTINCT d.notification_id) as delivered,
                COUNT(DISTINCT o.notification_id) as opened,
                COUNT(DISTINCT c.notification_id) as clicked,
                COUNT(DISTINCT cv.id) as converted,
                AVG(d.latency_ms) as avg_latency,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d.latency_ms) as p95_latency,
                COUNT(DISTINCT n.user_id) as unique_users
             FROM notifications n
             LEFT JOIN notification_delivery d ON d.notification_id = n.id
                AND d.status = 'delivered'
             LEFT JOIN notification_opens o ON o.notification_id = n.id
             LEFT JOIN notification_clicks c ON c.notification_id = n.id
                AND c.created_at BETWEEN ? AND ?
             LEFT JOIN notification_conversions cv ON cv.user_id = n.user_id
                AND cv.converted_at BETWEEN ? AND ?
             WHERE n.created_at BETWEEN ? AND ?`,
            [start, end, start, end, start, end]
        );

        return {
            sent: Number(result.sent),
            delivered: Number(result.delivered),
            opened: Number(result.opened),
            clicked: Number(result.clicked),
            converted: Number(result.converted),
            deliveryRate: result.sent > 0 ? result.delivered / result.sent : 0,
            openRate: result.delivered > 0 ? result.opened / result.delivered : 0,
            clickRate: result.opened > 0 ? result.clicked / result.opened : 0,
            conversionRate: result.clicked > 0 ? result.converted / result.clicked : 0,
            avgLatency: Number(result.avg_latency),
            p95Latency: Number(result.p95_latency),
            uniqueUsers: Number(result.unique_users),
        };
    }
}
```

## Privacy and Compliance

### GDPR Consent Tracking

```typescript
class ConsentManager {
    async trackConsent(
        userId: string,
        consentType: "analytics" | "marketing" | "personalization",
        granted: boolean,
        source: string
    ): Promise<void> {
        await db.execute(
            `INSERT INTO user_consents
             (user_id, consent_type, granted, source, granted_at, expires_at)
             VALUES (?, ?, ?, ?, NOW(),
              DATE_ADD(NOW(), INTERVAL 6 MONTH))
             ON DUPLICATE KEY UPDATE
              granted = VALUES(granted),
              granted_at = NOW(),
              expires_at = DATE_ADD(NOW(), INTERVAL 6 MONTH)`,
            [userId, consentType, granted, source]
        );
    }

    async checkConsent(
        userId: string,
        consentType: string
    ): Promise<boolean> {
        const consent = await db.query(
            `SELECT granted, expires_at
             FROM user_consents
             WHERE user_id = ? AND consent_type = ?
             ORDER BY granted_at DESC
             LIMIT 1`,
            [userId, consentType]
        );

        if (!consent) return false;
        if (!consent.granted) return false;
        if (consent.expires_at && new Date(consent.expires_at) < new Date()) return false;

        return true;
    }

    async getConsentForEvent(
        userId: string,
        eventType: string
    ): Promise<{ allowed: boolean; anonymized: boolean }> {
        const requiredConsent = this.getRequiredConsentForEvent(eventType);

        if (!requiredConsent) {
            return { allowed: true, anonymized: false };
        }

        const hasConsent = await this.checkConsent(userId, requiredConsent);

        if (!hasConsent) {
            // Anonymize the event instead of dropping it
            return { allowed: true, anonymized: true };
        }

        return { allowed: true, anonymized: false };
    }

    private getRequiredConsentForEvent(eventType: string): string | null {
        const consentMap: Record<string, string> = {
            notification_sent: null,               // Always allowed
            notification_delivered: null,           // Always allowed
            notification_impression: null,          // Always allowed
            notification_open: null,                // Always allowed
            notification_click: "analytics",         // Needs analytics consent
            notification_conversion: "marketing",    // Needs marketing consent
            deep_link_click: "personalization",      // Needs personalization consent
        };
        return consentMap[eventType] ?? "analytics";
    }
}
```

### Data Retention Policies

```typescript
class DataRetentionManager {
    private readonly RETENTION_POLICIES: Record<string, number> = {
        notification_events: 90,        // 90 days
        notification_impressions: 30,   // 30 days
        notification_opens: 90,         // 90 days
        notification_clicks: 90,        // 90 days
        notification_conversions: 365,  // 1 year
        delivery_logs: 30,              // 30 days
        user_consents: 730,             // 2 years
        aggregated_metrics: 730,        // 2 years
    };

    async applyRetentionPolicies(): Promise<RetentionReport> {
        const report: RetentionReport = {
            tablesCleaned: [],
            totalRowsRemoved: 0,
            errors: [],
        };

        for (const [table, retentionDays] of Object.entries(this.RETENTION_POLICIES)) {
            try {
                const result = await db.execute(
                    `DELETE FROM ${table}
                     WHERE created_at < NOW() - INTERVAL ? DAY`,
                    [retentionDays]
                );

                report.tablesCleaned.push(table);
                report.totalRowsRemoved += result.affectedRows;
            } catch (error) {
                report.errors.push({ table, error: error.message });
            }
        }

        return report;
    }

    async archiveData(table: string, olderThanDays: number): Promise<void> {
        // Move old data to cold storage (e.g., S3, BigQuery)
        const archiveTable = `${table}_archive`;

        await db.execute(
            `INSERT INTO ${archiveTable}
             SELECT * FROM ${table}
             WHERE created_at < NOW() - INTERVAL ? DAY`,
            [olderThanDays]
        );

        await db.execute(
            `DELETE FROM ${table}
             WHERE created_at < NOW() - INTERVAL ? DAY`,
            [olderThanDays]
        );
    }
}
```

### Anonymization

```typescript
class DataAnonymizer {
    private readonly SALT: string;

    constructor() {
        this.SALT = process.env.ANONYMIZATION_SALT;
    }

    anonymizeEvent(event: AnalyticsEvent): AnalyticsEvent {
        return {
            ...event,
            userId: this.anonymizeId(event.userId),
            properties: this.anonymizeProperties(event.properties),
        };
    }

    private anonymizeId(id: string): string {
        return crypto
            .createHash("sha256")
            .update(id + this.SALT)
            .digest("hex")
            .substring(0, 16);
    }

    private anonymizeProperties(
        properties: Record<string, any>
    ): Record<string, any> {
        const sensitiveKeys = [
            "email", "phone", "ip_address", "device_id",
            "advertising_id", "location", "full_name",
        ];

        const anonymized: Record<string, any> = {};

        for (const [key, value] of Object.entries(properties)) {
            if (sensitiveKeys.includes(key)) {
                if (key === "email") {
                    const [name, domain] = value.split("@");
                    anonymized[key] = `${name[0]}***@${domain}`;
                } else if (key === "phone") {
                    anonymized[key] = value.replace(/.(?=.{4})/g, "*");
                } else if (key === "ip_address") {
                    anonymized[key] = value.replace(/\.\d+$/, ".0");
                } else {
                    anonymized[key] = crypto
                        .createHash("sha256")
                        .update(String(value))
                        .digest("hex")
                        .substring(0, 8);
                }
            } else {
                anonymized[key] = value;
            }
        }

        return anonymized;
    }
}
```

## Reporting Automation

### Scheduled Reports

```typescript
class ReportScheduler {
    private readonly schedules: Map<string, ScheduleConfig> = new Map();

    constructor() {
        this.initializeDefaultSchedules();
    }

    private initializeDefaultSchedules(): void {
        this.schedules.set("daily_digest", {
            name: "Daily Push Digest",
            interval: "0 8 * * *", // Every day at 8 AM
            format: "email",
            recipients: ["team@example.com"],
            template: "daily_push_digest",
            metrics: ["delivery_rate", "open_rate", "click_rate", "conversions"],
        });

        this.schedules.set("weekly_trends", {
            name: "Weekly Trends Report",
            interval: "0 9 * * 1", // Every Monday at 9 AM
            format: "pdf",
            recipients: ["managers@example.com"],
            template: "weekly_push_trends",
            metrics: [
                "delivery_rate", "open_rate", "click_rate", "conversion_rate",
                "platform_breakdown", "segment_performance", "top_campaigns",
            ],
        });

        this.schedules.set("monthly_ltv", {
            name: "Monthly LTV Analysis",
            interval: "0 10 1 * *", // 1st of every month at 10 AM
            format: "pdf",
            recipients: ["leadership@example.com"],
            template: "monthly_ltv_report",
            metrics: [
                "notification_influenced_ltv", "cohort_analysis",
                "channel_performance", "attribution_analysis",
            ],
        });
    }

    async generateReport(scheduleName: string): Promise<Report> {
        const config = this.schedules.get(scheduleName);
        if (!config) throw new Error(`Unknown schedule: ${scheduleName}`);

        const data = await this.collectMetrics(config.metrics);
        return this.buildReport(config, data);
    }

    private async collectMetrics(
        metricNames: string[]
    ): Promise<Record<string, any>> {
        const collectors: Record<string, () => Promise<any>> = {
            delivery_rate: () => this.getDeliveryMetrics(),
            open_rate: () => this.getEngagementMetrics(),
            click_rate: () => this.getClickMetrics(),
            conversion_rate: () => this.getConversionMetrics(),
            platform_breakdown: () => this.getPlatformBreakdown(),
            segment_performance: () => this.getSegmentPerformance(),
            top_campaigns: () => this.getTopCampaigns(),
            notification_influenced_ltv: () => this.getLTV(),
            cohort_analysis: () => this.getCohorts(),
            channel_performance: () => this.getChannelPerformance(),
            attribution_analysis: () => this.getAttribution(),
        };

        const results: Record<string, any> = {};
        for (const metric of metricNames) {
            if (collectors[metric]) {
                results[metric] = await collectors[metric]();
            }
        }

        return results;
    }
}
```

### Anomaly Detection Alerts

```typescript
class AnomalyDetector {
    private readonly sensitivity: number;
    private readonly baselines: Map<string, Baseline> = new Map();

    constructor(sensitivity: number = 2.0) {
        this.sensitivity = sensitivity; // Standard deviations from mean
    }

    async checkMetric(metricName: string, currentValue: number): Promise<AnomalyAlert | null> {
        const baseline = await this.getBaseline(metricName);

        if (!baseline || baseline.sampleCount < 7) {
            return null; // Not enough data
        }

        const zScore = Math.abs((currentValue - baseline.mean) / baseline.stdDev);

        if (zScore > this.sensitivity) {
            const direction = currentValue > baseline.mean ? "up" : "down";

            return {
                metric: metricName,
                currentValue,
                expectedValue: baseline.mean,
                deviation: zScore,
                direction,
                severity: zScore > this.sensitivity * 1.5 ? "critical" : "warning",
                timestamp: new Date(),
                message: this.formatAlertMessage(metricName, currentValue, baseline, direction),
            };
        }

        return null;
    }

    private async getBaseline(metricName: string): Promise<Baseline | null> {
        // Use a 28-day rolling window for baseline
        const data = await db.query(
            `SELECT value
             FROM metric_history
             WHERE metric_name = ?
               AND timestamp >= NOW() - INTERVAL '28 DAY'
               AND timestamp < NOW() - INTERVAL '1 DAY'
             ORDER BY timestamp`,
            [metricName]
        );

        if (data.length < 7) return null;

        const values = data.map((d: any) => Number(d.value));
        const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const variance = values.reduce((acc: number, v: number) =>
            acc + Math.pow(v - mean, 2), 0
        ) / values.length;

        return {
            mean,
            stdDev: Math.sqrt(variance),
            sampleCount: values.length,
            periodDays: 28,
        };
    }

    private formatAlertMessage(
        metric: string,
        current: number,
        baseline: Baseline,
        direction: string
    ): string {
        const pctChange = ((current - baseline.mean) / baseline.mean * 100).toFixed(1);
        const directionText = direction === "up" ? "increase" : "decrease";

        return `Notification metric "${metric}" shows a ${pctChange}% ${directionText} `
            + `(${current.toFixed(2)} vs baseline ${baseline.mean.toFixed(2)}). `
            + `Deviation: ${(Math.abs(current - baseline.mean) / baseline.stdDev).toFixed(1)}σ`;
    }
}

interface Baseline {
    mean: number;
    stdDev: number;
    sampleCount: number;
    periodDays: number;
}

interface AnomalyAlert {
    metric: string;
    currentValue: number;
    expectedValue: number;
    deviation: number;
    direction: "up" | "down";
    severity: "warning" | "critical";
    timestamp: Date;
    message: string;
}
```

### Webhook Integrations

```typescript
class WebhookDispatcher {
    async sendAlert(alert: Alert, webhookUrl: string): Promise<void> {
        const payload = this.buildPayload(alert);

        await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    }

    private buildPayload(alert: Alert): object {
        return {
            text: alert.message,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `:warning: Notification Alert: ${alert.type}`,
                    },
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Severity:*\n${alert.severity}`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Time:*\n${alert.timestamp.toISOString()}`,
                        },
                    ],
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: alert.message,
                    },
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: { type: "plain_text", text: "View Dashboard" },
                            url: `${process.env.DASHBOARD_URL}/alerts`,
                        },
                    ],
                },
            ],
        };
    }
}
```

## Integration with CRM and Marketing Automation

```typescript
class CRMIntegration {
    async syncNotificationEngagement(
        userId: string,
        engagementData: EngagementData
    ): Promise<void> {
        // Update CRM contact with notification engagement
        await fetch(`${process.env.CRM_API_URL}/contacts/${userId}/activity`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.CRM_API_KEY}`,
            },
            body: JSON.stringify({
                activity_type: "push_notification",
                engagement_data: engagementData,
                timestamp: new Date().toISOString(),
            }),
        });
    }

    async syncSegmentToCRM(
        segmentName: string,
        userIds: string[]
    ): Promise<void> {
        // Create or update CRM segment/list
        await fetch(`${process.env.CRM_API_URL}/segments/${segmentName}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.CRM_API_KEY}`,
            },
            body: JSON.stringify({
                member_ids: userIds,
                operation: "replace",
            }),
        });
    }

    async triggerWorkflow(
        workflowName: string,
        userId: string,
        triggerData: Record<string, any>
    ): Promise<void> {
        await fetch(`${process.env.MARKETING_AUTOMATION_URL}/workflows/${workflowName}/trigger`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.MA_API_KEY}`,
            },
            body: JSON.stringify({
                contact_id: userId,
                trigger_data: triggerData,
            }),
        });
    }
}
```

## Best Practices

### Do's

- **Track every event in the delivery lifecycle**: Sent, delivered, impressed, opened, clicked, converted
- **Use consistent event naming**: Standardize on snake_case or camelCase event names across platforms
- **Include identifying metadata**: notification_id, campaign_id, user_id should be on every event
- **Set up anomaly detection**: Alert on sudden drops in delivery rate or spikes in bounce rate
- **Run A/B tests continuously**: Test subject lines, delivery times, payload formats
- **Build cohort analyses**: Understand how different user segments behave over time
- **Attribute conversions properly**: Use multi-touch attribution for complex user journeys
- **Monitor health metrics daily**: Track delivery rate, latency, error rate
- **Respect user consent**: Track and enforce GDPR/CCPA consent preferences
- **Archive old data**: Move historical data to cold storage to keep query performance

### Don'ts

- **Don't track PII in event properties**: Anonymize email, phone, IP address before sending
- **Don't ignore event deduplication**: Network retries can cause duplicate events
- **Don't use vague event names**: "click" vs "notification_click" makes analysis harder
- **Don't skip platform-specific analytics**: FCM, APNs, Huawei all provide unique delivery data
- **Don't rely on a single attribution model**: Use multiple models and compare
- **Don't run A/B tests without statistical significance**: Wait for adequate sample size
- **Don't forget timezone in event timestamps**: Always store UTC with timezone offset
- **Don't overload event properties**: Keep payload lean — use separate enrichment pipelines
- **Don't ignore the control group**: Always compare against users who didn't get notifications
- **Don't let data pipelines break silently**: Monitor event stream health and alert on lag

### Common Pitfalls

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| Duplicate events | Inflated metrics | Implement idempotency keys at event generation |
| Missing delivery receipts | Can't calculate true delivery rate | Implement delivery confirmation webhooks |
| Ignoring timezone | Wrong open rate by hour | Always normalize to user's local time |
| Inconsistent event naming | Can't join data across platforms | Create and enforce an event taxonomy document |
| No attribution window | Over-attributing conversions | Set per-conversion-type lookback windows |
| Sampling bias in A/B tests | Misleading results | Ensure proper randomization and sample size |
| Data retention costs | Growing storage bills | Implement tiered storage (hot/warm/cold) |
| Late-arriving events | Incomplete daily aggregates | Use event-time processing, not processing-time |
| Wrong deduplication key | Lost valid events | Use composite keys (event_id + source) |
| Dashboard query time | Slow loading dashboards | Pre-aggregate metrics at multiple granularities |
