# Error Reporting

## Service Comparison

| Service | Key Features | Free Tier | Best For |
|---------|-------------|-----------|----------|
| Sentry | Error tracking, performance, spans, source maps, sessions, releases | 5k events/month | General error tracking, full-stack monitoring |
| Datadog RUM | Real user monitoring, session replays, APM integration | 100k sessions/month | Datadog users, full observability stack |
| LogRocket | Session replay, network logs, console logs, user actions | 1k sessions/month | UX debugging, reproducing user-reported bugs |
| Rollbar | Error grouping, deploy tracking, telemetry | 5k events/month | Teams wanting automatic error grouping |
| TrackJS | Simple setup, DOM and network breadcrumbs | 1k sessions/month | Small projects, quick setup |
| New Relic Browser | Browser monitoring, AJAX tracking, JS errors | 100k transactions/month | New Relic ecosystem users |

## Sentry Setup

```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_ENVIRONMENT,
  release: process.env.VITE_RELEASE_VERSION,
  sampleRate: 1.0,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.httpClientIntegration(),
  ],
  beforeSend(event, hint) {
    // Don't send in development
    if (process.env.NODE_ENV === 'development') return null

    // Redact sensitive data
    if (event.request?.headers) {
      delete event.request.headers.Authorization
      delete event.request.headers.Cookie
    }

    return event
  },
  ignoreErrors: [
    'ResizeObserver loop', // known browser issue
    'NetworkError',        // handled separately
    /^AbortError/,         // aborted fetch requests
  ],
})
```

## Manual Error Reporting

```typescript
export function reportError(error: Error, context?: Record<string, unknown>): void {
  Sentry.captureException(error, {
    extra: context,
    tags: { domain: window.location.hostname },
    user: { id: getCurrentUserId() },
  })
}

// Breadcrumbs for context
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  })
}
```

## Source Maps

Upload source maps to your error reporting service during CI/CD. Never serve source maps in production to end users — only upload to Sentry/Datadog/etc.

```bash
# Build with source maps
vite build --sourcemap

# Upload to Sentry (use sentry-cli or @sentry/vite-plugin)
sentry-cli releases files $RELEASE_VERSION upload-sourcemaps ./dist/assets --url-prefix "~/assets"
```

After upload, delete source maps from the build output:
```bash
find dist -name '*.map' -delete
```

## User Feedback Widget

```typescript
// Sentry user feedback
import { feedbackIntegration } from '@sentry/feedback'

Sentry.init({
  integrations: [
    feedbackIntegration({
      autoInject: false, // inject manually
    }),
  ],
})

// Show feedback button
function ErrorFallback() {
  return (
    <div>
      <p>Something went wrong.</p>
      <button onClick={() => Sentry.showReportDialog()}>Report feedback</button>
    </div>
  )
}
```

## Alerting Config

| Error Type | Threshold | Action |
|------------|-----------|--------|
| Root boundary crash | >1 per 10 min | PagerDuty alert |
| Route-level crash | >5 per 5 min | Slack notification |
| Widget-level error | >50 per 5 min | Email digest |
| Unhandled promise rejection | >10 per 5 min | Slack notification |
| API 401 errors | >20 per 1 min | Investigate auth token issue |

## Error Grouping Best Practices

- Normalize error messages: replace dynamic values with placeholders before sending
- Use `fingerprint` to group similar errors: `Sentry.setContext('fingerprint', ['route', errorCode])`
- Tag errors by environment, version, browser, route for easier filtering
- Ignore known non-actionable errors (ad blockers, browser extensions, abandoned async calls)

## Error Payload Structure

```typescript
interface ErrorReport {
  error: {
    message: string
    stack: string
    name: string
  }
  context: {
    url: string
    userAgent: string
    timestamp: string
    userId?: string
    route?: string
    version?: string
    breadcrumbs: Array<{
      type: string
      category: string
      message: string
      timestamp: number
      data?: Record<string, unknown>
    }>
  }
  metadata: {
    environment: string
    release: string
    sampleRate: number
  }
}
```

## Breadcrumb Categories

```typescript
addBreadcrumb('User clicked "Submit"', 'ui.click', { formId: 'checkout' })
addBreadcrumb('API call POST /orders', 'fetch', { statusCode: 201 })
addBreadcrumb('Navigation to /dashboard', 'navigation', { from: '/login' })
addBreadcrumb('LocalStorage set', 'storage', { key: 'preferences' })
addBreadcrumb('Auth token refreshed', 'auth', { expiresIn: 900 })
```

## Testing Error Reporting

```typescript
import { mocked } from 'jest-mock'

jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}))

describe('error reporting', () => {
  it('reports error with context', () => {
    const error = new Error('Test error')
    reportError(error, { component: 'Button' })

    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
      extra: { component: 'Button' },
    }))
  })
})
```
