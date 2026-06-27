---
name: frontend-error-handling
description: >
  Use this skill when the user says 'error handling', 'error boundary', 'error recovery', 'graceful degradation', 'fallback UI', 'error reporting', 'error logging', 'crash recovery', 'error fallback', 'retry pattern', 'error state', 'error boundary React', 'Vue error handler', 'Angular error handler', 'error boundary Svelte'. This skill enforces error boundary implementation at key UI levels, graceful degradation patterns, error reporting to monitoring services, and user-facing recovery options. Works with any frontend framework (React, Vue, Angular, Svelte). Do NOT use for: API error handling patterns (use data-fetching skill), form validation errors (use form-handling skill), or backend error handling.
version: "2.0.0"
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

## Error Handling Architecture / Decision Trees

### Boundary Placement Decision Tree
```
Where does the error occur?
  |-- Root layout / shell -->
  |     REQUIRE: RootErrorBoundary with full-page fallback + "Reload" button
  |     FAILSAFE: If RootBoundary itself crashes, show static error.html
  |
  |-- Route-level (page component) -->
  |     REQUIRE: RouteErrorBoundary with page-level fallback
  |     OPTION: Retry button calls router.push(sameRoute) to remount
  |
  |-- Widget / section (sidebar, widget, embedded component) -->
  |     REQUIRE: WidgetErrorBoundary with inline fallback
  |     BEHAVIOR: Hide widget, show degraded message, rest of page works
  |
  |-- Async operation (fetch, timeout, abort) -->
  |     REQUIRE: try/catch + throw to boundary OR inline error state
  |     OPTION: useErrorBoundary hook to throw from async code
  |
  |-- Event handler (onClick, onChange) -->
  |     REQUIRE: try/catch within handler -- boundaries DO NOT catch event handlers
  |     ACTION: Report error, show toast notification to user
  |
  |-- Third-party script (analytics, ads, embeds) -->
        REQUIRE: Wrap in isolated sandbox (iframe) -- never let third-party JS crash host app
        ACTION: Log warning, continue without the third-party feature
```

### Error Recovery Decision Tree
```
User sees error state.
  |-- Is it a transient error? (network timeout, server 503) -->
  |     |-- YES: Show "Retry" button + auto-retry (up to 3 times with exponential backoff)
  |     |-- NO: Show "Try again" button, but don't auto-retry
  |
  |-- Is the error in a non-critical widget? -->
  |     |-- YES: Hide widget, degrade gracefully, rest of page works
  |     |-- NO: Show full-page or route-level fallback
  |
  |-- Has the user retried 3+ times without success? -->
        |-- YES: Show permanent error screen with support contact info
        |-- NO: Allow another retry
```

### Error Reporting Triage Decision Tree
```
What type of error is this?
  |-- Network error (fetch failed, timeout, abort) -->
  |     REPORT? NO -- too noisy, these are expected in poor connectivity
  |     ACTION: Track count as metric, not individual event
  |
  |-- Application error (TypeError, ReferenceError, null access) -->
  |     REPORT? YES -- with stack trace, component stack, breadcrumbs
  |     PRIORITY: medium (user-impacting)
  |
  |-- Third-party script error -->
  |     REPORT? CONDITIONAL -- only if it impacts user experience
  |     FILTER: Known third-party errors should be filtered in beforeSend
  |
  |-- AbortError (cancelled requests from rapid navigation) -->
        REPORT? NO -- this is normal user behavior
        FILTER: return null in Sentry beforeSend
```

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

### 8. Retry with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Unreachable')
}
```

### 9. Vue Error Handler
```typescript
import { createApp } from 'vue'

const app = createApp(App)

app.config.errorHandler = (error, instance, info) => {
  reportError(error as Error, {
    componentName: instance?.type?.name,
    info, // e.g., "render function", "setup function"
  })
}

app.config.warnHandler = (msg, instance, trace) => {
  if (process.env.NODE_ENV === 'production') return
  console.warn(msg, trace)
}
```

### 10. Angular ErrorHandler
```typescript
import { ErrorHandler, Injectable } from '@angular/core'

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error) {
    reportError(error, { source: 'angular-global' })
    console.error(error)
  }
}

// providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
```

### 11. Error Tracking Context Enrichment
```typescript
function reportError(error: Error, context?: Record<string, unknown>) {
  const enrichedContext = {
    ...context,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    route: window.location.pathname,
    // DO NOT include: tokens, passwords, PII, API keys
  }

  if (window.__SENTRY__) {
    Sentry.captureException(error, { extra: enrichedContext })
  } else {
    console.error('[ErrorReport]', error, enrichedContext)
  }
}
```

## Common Pitfalls

### 1. Catching and Silencing
```typescript
// BAD -- silently swallowed error
try { await fetchData() } catch (e) { /* nothing */ }

// GOOD -- report and show user feedback
try { await fetchData() } catch (e) {
  reportError(e)
  showToast({ type: 'error', message: 'Failed to load data' })
}
```

### 2. Not Covering Event Handlers
Error boundaries do NOT catch errors in event handlers, setTimeout callbacks, or async/await (without the throw-in-render pattern). Always wrap event handlers in try/catch.

### 3. Infinite Retry Loops
```typescript
// BAD -- infinite retry
<button onClick={() => boundary.reset()}>Retry</button>
// Component crashes again immediately -> boundary catches -> user clicks retry -> infinite

// GOOD -- count retries
const [retryCount, setRetryCount] = useState(0)
if (retryCount >= 3) return <PermanentError />
```

### 4. Leaking Sensitive Data in Error Reports
Strip tokens, passwords, and PII before sending error reports. Use Sentry's `beforeSend` to sanitize.

### 5. Blank Screen Fallback
Never let a boundary render nothing. Always provide a meaningful fallback UI with recovery options.

## Compared With

| Approach | Rendering Impact | Recovery UX | Reporting | Setup Complexity |
|----------|-----------------|-------------|-----------|------------------|
| Error Boundaries (React) | Full subtree replaced | Retry/reset within boundary | Manual | Low (class component) |
| Sentry ErrorBoundary | Full subtree replaced | Retry, feedback button | Automatic | Low (add wrapper) |
| Vue errorHandler | Global catch | Manual recovery in handler | Manual | Very low (config) |
| Angular ErrorHandler | Global catch | Manual recovery | Manual | Very low (provider) |
| Try/catch per component | No re-render | Inline error state | Manual | Medium (per-component) |
| Zustand/Vuex error store | Reactive state | Global error state | Manual | Medium |

## Performance Considerations

### Error Boundary Cost
Error boundaries use a class component wrapper which adds minimal overhead (~0.1KB per boundary). The heavy cost is the component stack trace generation in development. In production builds, component stack traces are not available.

### Error Reporting Cost
Sentry's `captureException` is async and non-blocking. It does not affect rendering performance. However, breadcrumb collection adds ~50ms per interaction tracked. Configure breadcrumb limits to avoid memory growth.

### Retry Frequency
Automatic retry should use exponential backoff. Retrying every 1s for 30 retries creates 30 failed requests. With backoff: 1s, 2s, 4s, 8s, 16s = only 5 retries in 31 seconds.

## Accessibility Considerations

- Fallback UIs must be reachable via keyboard navigation
- Error messages use `role="alert"` for screen reader announcement
- Retry buttons must have accessible labels and focus management
- After error boundary reset, focus must move to the recovered content
- Permanent errors should provide contact/support information

## Security Considerations

- Never expose stack traces to users in production
- Strip sensitive context from error reports (passwords, tokens, session IDs)
- Sanitize error messages before displaying them to users
- Be careful with `window.onerror` -- it can leak cross-origin script details

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
  - references/error-boundaries.md — Error Boundaries
  - references/error-boundary-patterns.md — Error Boundary Patterns
  - references/error-logging-best-practices.md — Error Logging Best Practices
  - references/error-monitoring.md — Error Monitoring
  - references/error-reporting.md — Error Reporting
  - references/error-ui-patterns.md — Error UI Patterns
## Handoff
No artifact produced unless requested.
Next skill: `frontend-performance` — error boundaries affect perceived performance, coordinate loading/error states.
Carry forward: error boundary placement, reporting service choice, fallback hierarchy.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Architecture Decision Trees

### Error Boundary Placement Decision Tree
```
Is the component fetching data?
  ├── No  → Does it render user-generated content?
  │    ├── Yes → Wrap in error boundary with "This content failed to load"
  │    └── No  → Does it use third-party integration?
  │         ├── Yes → Error boundary per third-party widget
  │         └── No  → No boundary needed (static content)
  └── Yes → Add error boundary per data-fetching component
       Can the error be recovered without reload?
       ├── Yes → Show retry button inside boundary
       └── No  → Show fallback UI with navigation options
```

### Error Reporting Strategy Decision Tree
```
Is the error user-impacting?
  ├── No  → Log to console + metrics (warning level)
  └── Yes → Is it recoverable?
       ├── Yes → Show inline error + retry, report as warning
       └── No  → Show fallback UI, report as critical error
            Does the error expose sensitive info?
            ├── Yes → Sanitize before reporting, show generic message
            └── No  → Report full error with context
```
