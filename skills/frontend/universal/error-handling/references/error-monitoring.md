# Error Monitoring

## Monitoring Provider Comparison

| Provider | Free Tier | Source Maps | Session Replay | Breadcrumbs | Alerting |
|----------|-----------|-------------|----------------|-------------|----------|
| Sentry | 5K events/mo | Yes | Yes (costly) | Yes | Yes |
| Datadog RUM | None | Yes | Yes | Yes | Yes |
| LogRocket | 1K sessions/mo | Yes | Yes | Yes | No |
| Rollbar | 5K events/mo | Yes | No | Yes | Yes |
| TrackJS | 5K events/mo | Yes | No | Yes | Yes |
| OpenReplay | Self-hosted free | Yes | Yes | Yes | Basic |
| Grafana Faro | Self-hosted free | Yes | No | Yes | Via Grafana |

## Sentry Integration

```typescript
import * as Sentry from '@sentry/react'
import { browserTracingIntegration } from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: APP_VERSION,
  integrations: [
    browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Strip PII
    if (event.request?.headers) event.request.headers = {}
    if (event.user?.email) event.user.email = '[filtered]'
    return event
  },
  beforeBreadcrumb(breadcrumb) {
    // Filter analytics breadcrumbs
    if (breadcrumb.category === 'fetch' && breadcrumb.data?.url?.includes('/analytics')) {
      return null
    }
    return breadcrumb
  },
})
```

## Error Reporting Patterns

```typescript
// Capture exception
function reportError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      component: context?.componentName as string,
      action: context?.action as string,
    },
  })
}

// Capture message (non-error)
function reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level)
}

// Set user context
Sentry.setUser({ id: userId, role: userRole })
// Clear on logout
Sentry.setUser(null)

// Add breadcrumb
Sentry.addBreadcrumb({
  category: 'navigation',
  message: '/dashboard',
  level: 'info',
})
```

## Source Map Upload

```typescript
// Using @sentry/vite-plugin
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: true, // generate source maps
  },
  plugins: [
    sentryVitePlugin({
      org: 'my-org',
      project: 'my-project',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: APP_VERSION },
      telemetry: false,
    }),
    // Remove source maps from production after upload
    {
      name: 'remove-sourcemaps',
      closeBundle() {
        fs.rmSync('dist/**/*.map', { force: true })
      },
    },
  ],
})
```

## Breadcrumb Strategy

| Category | Events | Importance |
|----------|--------|------------|
| navigation | Route changes | High |
| ui | Button clicks, form submissions | High |
| fetch | API requests | High |
| console | Log messages | Medium |
| interaction | Scroll, resize | Low (filter) |
| analytics | Tracking calls | Low (exclude) |

## Alert Thresholds

```typescript
// Sentry alert rules (configured in dashboard)
// P1: Error count > 100 in 5 minutes → Slack + PagerDuty
// P2: New error (first seen) → Slack
// P3: Error count > 10 in 1 hour → Email digest

// Rate limiting
// Max 1 error report per 5 seconds per user
let lastReport = 0
function rateLimitedReport(error: Error) {
  const now = Date.now()
  if (now - lastReport < 5000) return
  lastReport = now
  reportError(error)
}
```

## Performance Monitoring

```typescript
// Track transactions for key user flows
const transaction = Sentry.startTransaction({
  name: 'checkout-flow',
  op: 'purchase',
})

// Simulate distributed tracing
Sentry.getCurrentScope().setSpan(transaction)

try {
  await completeCheckout()
  transaction.setStatus('ok')
} catch (err) {
  transaction.setStatus('internal_error')
  Sentry.captureException(err)
} finally {
  transaction.finish()
}
```

## Error Dashboard Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Error rate | Errors / page views | < 0.1% |
| Crash-free sessions | Non-crash sessions / total | > 99.5% |
| Time to recover | Time from alert to deploy | < 1 hour |
| New errors/week | First-seen errors in 7 days | < 5 |
| Replay rate | Sessions with replay / total | > 10% |
| Source map coverage | Mapped / total errors | > 95% |

## Error Monitoring Checklist

- [ ] Error monitoring initialized at app bootstrap
- [ ] Source maps uploaded for each release
- [ ] PII stripped before sending events
- [ ] Breadcrumbs configured for navigation, UI, and fetch events
- [ ] Replay enabled for error sessions
- [ ] Alerts configured with appropriate thresholds
- [ ] Rate limiting on error reports
- [ ] User context set for authenticated sessions
- [ ] Release tracking with version identifier
- [ ] Error dashboard reviewed weekly
