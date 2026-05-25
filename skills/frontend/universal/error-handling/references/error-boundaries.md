# Error Boundaries

## Placement Architecture

```
<RootBoundary>                    ← catches anything not caught below
  <Layout />
  <RouteBoundary>                 ← per-route isolation
    <Suspense fallback={<LoadingSkeleton />}>
      <WidgetBoundary>            ← per-widget isolation
        <Widget />
      </WidgetBoundary>
      <WidgetBoundary>            ← independent — one failure doesn't affect another
        <WeatherWidget />
      </WidgetBoundary>
    </Suspense>
  </RouteBoundary>
  <RouteBoundary>
    <SettingsPage />
  </RouteBoundary>
</RootBoundary>
```

## React Error Boundary (Class Component)

```typescript
interface ErrorBoundaryProps {
  fallback?: React.ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, { componentStack: info.componentStack })
    this.props.onError?.(error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div role="alert" className="error-fallback p-4 rounded border border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="text-red-600 mt-1">{this.state.error?.message}</p>
          <button
            onClick={this.handleRetry}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

## React Error Boundary (Hook-based Alternative)

```typescript
import { useErrorBoundary } from 'react-error-boundary'

function DataComponent() {
  const { showBoundary } = useErrorBoundary()

  useEffect(() => {
    fetchData().catch(showBoundary)
  }, [])

  return <div>...</div>
}
```

## Vue Error Boundary

```vue
<template>
  <div v-if="error">
    <h2>{{ error.message }}</h2>
    <button @click="reset">Retry</button>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured, provide } from 'vue'

const error = ref(null)
const hasError = ref(false)

onErrorCaptured((err) => {
  error.value = err
  hasError.value = true
  reportError(err)
  return false // prevent error from propagating
})

function reset() {
  error.value = null
  hasError.value = false
}
</script>
```

## Angular Error Handler

```typescript
import { ErrorHandler, Injectable } from '@angular/core'

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    reportError(error)
    console.error('Unhandled error:', error)
  }
}

// In AppModule
providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
```

## Svelte Error Boundary

```svelte
<script>
  let error = null
  $: if (error) {
    reportError(error)
  }
</script>

{#if error}
  <div role="alert">
    <h2>Error</h2>
    <p>{error.message}</p>
    <button on:click={() => error = null}>Retry</button>
  </div>
{:else}
  <slot on:error={(e) => error = e.detail} />
{/if}
```

## Recovery Patterns

```typescript
// Retry with exponential backoff
function useRetry(fn: () => Promise<void>, maxRetries = 3) {
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(async () => {
    if (attempt >= maxRetries) return
    setAttempt(a => a + 1)
    const delay = Math.min(1000 * 2 ** attempt, 10000)
    await new Promise(r => setTimeout(r, delay))
    await fn()
  }, [attempt, fn])

  return { retry, attempt, maxReached: attempt >= maxRetries }
}

// Reset boundary state
function useResetBoundary(resetKey: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.resetQueries({ queryKey: [resetKey] })
  }
}
```

## Error Boundary Checklist

- [ ] Root boundary wraps entire app (catches unhandled errors)
- [ ] Route-level boundary per route (prevents full app crash)
- [ ] Widget-level boundary for standalone components
- [ ] Async error boundary for data-fetching components
- [ ] Fallback UI with retry action for every boundary
- [ ] Error reported to monitoring service on every catch
- [ ] Sensitive information stripped before reporting
- [ ] Loading state handled before error boundary mounts
- [ ] Error boundary reset state when props change (key-based remount)
