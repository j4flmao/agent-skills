# Payload Design

## Alert Payload

```json
{
  "aps": {
    "alert": {
      "title": "Order #12345",
      "subtitle": "Shipped",
      "body": "Your package will arrive tomorrow"
    },
    "sound": "default",
    "badge": 1
  }
}
```

### Localized Strings

```json
{
  "aps": {
    "alert": {
      "title-loc-key": "ORDER_STATUS",
      "title-loc-args": ["12345", "Shipped"],
      "loc-key": "ORDER_SHIPPED_BODY",
      "loc-args": ["tomorrow"]
    }
  }
}
```

### Media Attachments (iOS 10+)

```json
{
  "aps": {
    "alert": { ... },
    "mutable-content": 1
  },
  "media-url": "https://example.com/image.png"
}
```
Requires `Notification Service Extension` to download and attach media.

## Data Payload (Silent)

```json
{
  "aps": {
    "content-available": 1
  },
  "custom_key": "value",
  "sync_version": 42
}
```
- No user-facing alert
- Wakes app in background for ~30s
- Rate-limited by system (iOS); user must have opened app recently

## FCM Android Payload

```json
{
  "data": {
    "order_id": "12345",
    "type": "shipped",
    "silent": "true"
  }
}
```
When only `data` is present (no `notification`), delivery is guaranteed to `onMessageReceived` even in background.

## Best Practices

| Concern | Guideline |
|---------|-----------|
| Payload size | Keep under 2 KB for alert, 4 KB max |
| Collapse ID | Group stale notifications (e.g. "3 new messages" replaces "2 new messages") |
| Badge count | Server-authoritative — app should never set badge locally |
| Rich media | Use `mutable-content` + service extension, never inline base64 |
| Error handling | Log APNs/FCM error response and remove invalid tokens |
| Test data | Match production payload structure exactly — clients parse keys blindly |
