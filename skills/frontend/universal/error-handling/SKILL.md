---
name: frontend-error-handling
description: >
  Use this skill when the user says 'error handling', 'error boundary', 'error recovery', 'graceful degradation', 'fallback UI', 'error reporting', 'error logging', 'crash recovery', 'error fallback', 'retry pattern', 'error state', 'error boundary React', 'Vue error handler', 'Angular error handler', 'error boundary Svelte'. This skill enforces error boundary implementation at key UI levels, graceful degradation patterns, error reporting to monitoring services, and user-facing recovery options. Works with any frontend framework (React, Vue, Angular, Svelte). Do NOT use for: API error handling patterns (use data-fetching skill), form validation errors (use form-handling skill), or backend error handling.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, error-handling, resilience, universal]
---

# Frontend Error Handling

## Purpose
Catch, report, and recover from frontend errors without crashing the entire app. Error boundaries isolate failures. Users always see a functional fallback UI. Every error is reported to the monitoring service with context for debugging.

## Agent Protocol

### Trigger
Exact phrases: "error handling", "error boundary", "error recovery", "graceful degradation", "fallback UI", "error reporting", "error logging", "crash recovery", "error state", "retry pattern", "error fallback".

### Input Context
- Framework (React, Vue, Angular, Svelte)
- Current error handling (if any) — try/catch patterns, boundaries
- Error reporting service (Sentry, Datadog RUM, LogRocket, custom)
- Critical vs non-critical components that need boundaries

### Output Artifact
Error boundary implementation, error reporting integration, fallback UI components, recovery patterns.

### Response Format
```
## Strategy
<boundary-locations, reporting-service, fallback-hierarchy>

## Implementation
<error-boundary-code, error-reporting-setup>

## Recovery
<retry-patterns, fallback-ui, reset-mechanism>

—
Compression footer: frontend-error-handling/v1 | boundaries: <count> | reporter: <service> | fallback: <full|partial>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Error boundaries wrap: root layout, each major route, each standalone widget
- [ ] Fallback UI provides: error message, retry action, and contact/support link
- [ ] Errors reported to monitoring service with stack trace, component stack, breadcrumbs
- [ ] Non-critical resource failures degrade gracefully (hide widget vs crash page)
- [ ] Async errors caught and displayed inline where they occur
- [ ] Recovery mechanisms in place (retry, reset boundary, navigate away)
- [ ] Development-only error overlay suppressed in production

### Max Response Length
4096 tokens

## Workflow

### 1. Error Boundary Placement
```
<RootBoundary>             ← catches anything not caught below: show full-page crash screen
  <Layout>
    <RouteBoundary>        ← catches per-route errors: render route-specific fallback
      <Outlet />
    </RouteBoundary>
    <WidgetBoundary>       ← catches widget errors: show widget-level fallback
      <Widget />
    </WidgetBoundary>
  </Layout>
</RootBoundary>
```

### 2. React Error Boundary Component
```typescript
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { fallback?: ReactNode; onError?: (error: Error, info: ErrorInfo) => void; children: ReactNode }
interface State { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack })
    this.props.onError?.(error, info)
  }

  handleRetry = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback error={this.state.error} onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
```

### 3. Fallback UI
```typescript
function DefaultFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div role="alert" className="error-fallback">
      <h2>Something went wrong</h2>
      <p>{error?.message ?? 'An unexpected error occurred.'}</p>
      <div className="error-actions">
        <button onClick={onRetry}>Try again</button>
        <button onClick={() => window.location.reload()}>Reload page</button>
        <a href="/support">Contact support</a>
      </div>
      {process.env.NODE_ENV === 'development' && <pre>{error?.stack}</pre>}
    </div>
  )
}
```

### 4. Async Error Handling
```typescript
function useAsyncError() {
  const [, setError] = useState<Error | null>(null)
  return (error: Error) => {
    setError(() => { throw error }) // throw in render to trigger boundary
  }
}

// Usage
function DataComponent() {
  const throwError = useAsyncError()
  const { data, error } = useQuery(...)

  if (error) {
    throwError(error) // caught by nearest error boundary
  }
  return <div>{data}</div>
}
```

### 5. Reporting Integration (Sentry)
```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration()],
  beforeSend(event) {
    // Filter out expected errors
    if (event.exception?.values?.[0]?.type === 'AbortError') return null
    return event
  },
})

// Use Sentry's ErrorBoundary
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

### 6. Graceful Degradation
```typescript
// Widget-level degradation
function WeatherWidget() {
  const { data, error, isLoading } = useWeatherData()

  if (isLoading) return <Skeleton width={200} height={100} />
  if (error) return <WidgetError message="Weather unavailable" type="non-critical" />

  return <WeatherDisplay data={data} />
}

// Non-critical widget error
function WidgetError({ message, type }: { message: string; type: 'critical' | 'non-critical' }) {
  if (type === 'non-critical') {
    return <div className="widget-degraded">{message}</div>
  }
  throw new Error(message) // Let boundary handle critical widgets
}
```

### 7. Global Error & Promise Rejection Handling
```typescript
window.addEventListener('error', (event) => {
  reportError(event.error ?? new Error(event.message), { type: 'uncaught-error' })
})

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, { type: 'unhandled-promise-rejection' })
  event.preventDefault()
})
```

## Rules
1. Error boundaries never catch errors in event handlers, async code, or SSR — use try/catch for those.
2. Every error boundary has a fallback UI with a retry action — never a blank screen.
3. Error reports include: stack trace, component stack, URL, user agent, timestamp, breadcrumbs.
4. Sensitive information (tokens, PII) is stripped before sending to error reporting service.
5. Widget-level errors degrade gracefully — the widget is hidden, the rest of the page works.
6. Root-level error boundary always provides a "Reload" or "Go home" option.
7. Non-critical third-party script failures (analytics, ads, embeds) never crash the host app.
8. Development error overlay is never visible in production builds.
9. Retry counters limit infinite retry loops (max 3 retries, then show permanent error).
10. Network errors show a distinct "You appear to be offline" message vs application errors.

## References
- `references/error-boundary-patterns.md` — Framework-specific boundaries, recovery patterns, retry logic
- `references/error-reporting.md` — Sentry, Datadog RUM, LogRocket, source maps, breadcrumbs, alerting
- `references/error-boundaries.md` — Boundary placement architecture, per-framework implementations, recovery patterns, checklist
- `references/error-monitoring.md` — Provider comparison, Sentry integration, source maps, breadcrumbs, alert thresholds, dashboard metrics

## Handoff
No artifact produced unless requested.
Next skill: `frontend-performance` — error boundaries affect perceived performance, coordinate loading/error states.
Carry forward: error boundary placement, reporting service choice, fallback hierarchy.
