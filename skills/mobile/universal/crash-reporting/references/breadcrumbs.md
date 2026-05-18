# Breadcrumbs

## What are Breadcrumbs?

Timeline of events leading up to a crash. Each breadcrumb stores a timestamp, category, level, and message. They appear in crash report detail under the "Breadcrumbs" section.

## Sentry — Manual Breadcrumbs

```swift
SentrySDK.addBreadcrumb(SentryBreadcrumb(
    level: .info,
    category: "navigation",
    message: "Navigated to Order Detail #12345",
    type: "navigation",
    data: ["order_id": "12345", "source": "order_list"]
))
```

```kotlin
Sentry.addBreadcrumb(Breadcrumb().apply {
    message = "Navigated to Order Detail #12345"
    category = "navigation"
    level = BreadcrumbLevel.INFO
    data = mapOf("order_id" to "12345")
})
```

```dart
Sentry.addBreadcrumb(Breadcrumb(
  message: 'Navigated to Order Detail #12345',
  category: 'navigation',
  level: SentryLevel.info,
  data: {'order_id': '12345'},
));
```

```typescript
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'Navigated to Order Detail #12345',
  level: 'info',
  data: { order_id: '12345' },
});
```

## Levels

| Level | Usage |
|-------|-------|
| `.debug` | Network request details, verbose logging (auto-stripped in prod) |
| `.info` | Screen views, user actions |
| `.warning` | Retry attempts, degraded service, non-fatal but concerning |
| `.error` | Caught exceptions (separate from breadcrumbs for the crash itself) |
| `.fatal` | Unused in breadcrumbs — use `captureException` instead |

## Automatic Breadcrumbs (Sentry)

| Event | Category | Default |
|-------|----------|---------|
| HTTP requests | `http.*` | On |
| Navigation / routing | `navigation` | On |
| UI lifecycle | `ui.lifecycle` | On (Android) |
| System events | `device.event` | On |
| Touch events | `ui.touch` | Off (high volume) |

```swift
// Control auto-breadcrumbs
options.breadcrumb = { crumb in
    if crumb.category == "http" && crumb.type == "http.response" {
        // Filter out health check endpoints
        if crumb.data?["url"]?.contains("/health") == true {
            return nil  // Discard
        }
    }
    return crumb
}
```

## Crashlytics — Custom Logs

```swift
Crashlytics.crashlytics().log("Fetching order #\(orderId)")
Crashlytics.crashlytics().log("Order #\(orderId) loaded: status=\(status)")
// Logs appear in crash report under "Logs" section (max 64 KB)
// No level or category — use key prefixes: [INFO], [WARN], [ERROR]
```

## Best Practices

| Do | Don't |
|----|-------|
| Log key user actions (checkout, login) | Log PII (email, credit card) |
| Include IDs (order_id, user_id without PII) | Log raw API responses |
| Set levels appropriately (info vs warning) | Flood more than 100 breadcrumbs per session |
| Flush breadcrumbs before expected crashes | Log every scroll event |
| Clear context on user logout | Log network tokens |
