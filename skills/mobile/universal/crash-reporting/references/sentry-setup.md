# Sentry Setup

## DSN Configuration

```
https://<PUBLIC_KEY>@o<ORG_ID>.ingest.sentry.io/<PROJECT_ID>
```

- Stored in environment variable or build config — never hardcode in source
- Public key is intentionally public (client-side SDK), but keep out of git for hygiene

## Sampling

| Strategy | Setting | Use Case |
|----------|---------|----------|
| Full error capture | `sampleRate: 1.0` | All errors, all sessions (default) |
| Performance traces | `tracesSampleRate: 0.2` | 20% of transactions sampled |
| Dynamic sampling | `tracesSampler: (ctx) => ctx.request.method === 'GET' ? 0.1 : 0.5` | Per-route sampling |

## Release Tracking

```bash
# Sentry CLI — create release and upload artifacts
sentry-cli releases new com.example.app@1.0.0+1
sentry-cli releases set-commits --auto com.example.app@1.0.0+1
sentry-cli releases finalize com.example.app@1.0.0+1
```

```swift
// Swift — auto detect via bundle
options.releaseName = "com.example.app@\(version)+\(build)"
options.dist = build
```

```kotlin
// Android — via manifest
options.release = "${BuildConfig.APPLICATION_ID}@${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}"
options.dist = BuildConfig.VERSION_CODE.toString()
```

## Environment

```swift
options.environment = "production"
// Common: production, staging, development, qa
// Different DSNs per environment for separate projects
```

## Before Send (Data Scrubbing)

```swift
SentrySDK.start { options in
    options.beforeSend = { event in
        // Remove sensitive data
        if let msg = event.message?.formatted, msg.contains("password") {
            return nil  // Drop
        }
        return event  // Pass through
    }
}
```

```kotlin
options.beforeSend = SentryOptions.BeforeSendCallback { event, _ ->
    if (event.message?.formatted?.contains("password") == true) null else event
}
```

## Performance Monitoring

```swift
// Manual transaction
let transaction = SentrySDK.startTransaction(name: "Checkout", operation: "purchase")
let span = transaction.startChild(operation: "payment_api")
// ... do work
span.finish()
transaction.finish()
```

## Alert Configuration (Sentry Dashboard)

| Alert Type | Trigger | Action |
|------------|---------|--------|
| Issue alert | New error, 5+ users affected | Slack, PagerDuty, email |
| Crash rate | Crash-free rate < 99.5% in 1h | PagerDuty |
| Spike | Volume > 200% of baseline | Slack |
| New release | Regression introduced | Jira |
