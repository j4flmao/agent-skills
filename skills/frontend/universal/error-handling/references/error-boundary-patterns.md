# Error Boundary Patterns

## Framework-Specific Boundaries

### React (Class Component)
```typescript
import { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  onError?: (error: Error, info: ErrorInfo) => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleReset)
      }
      return this.props.fallback ?? <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }
    return this.props.children
  }
}
```

### React with react-error-boundary library
```typescript
import { ErrorBoundary } from 'react-error-boundary'

function fallbackRender({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary fallbackRender={fallbackRender} onReset={() => console.log('boundary reset')}>
      <MyComponent />
    </ErrorBoundary>
  )
}
```

### Vue 3 Error Handler
```typescript
import { createApp } from 'vue'
import { h } from 'vue'

const app = createApp(App)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  reportError(err, {
    componentName: instance?.type?.__name,
    info, // e.g., "render function", "setup function", "lifecycle hook"
  })
}

// Component-level error boundary
app.component('ErrorBoundary', {
  data() {
    return { hasError: false, error: null }
  },
  errorCaptured(err: Error, instance: any, info: string) {
    this.hasError = true
    this.error = err
    reportError(err, { info })
    return false // prevents error from propagating
  },
  render() {
    return this.hasError
      ? h('div', { class: 'error-fallback' }, [h('p', 'Error'), h('button', { onClick: () => { this.hasError = false; this.error = null } }, 'Retry')])
      : this.$slots.default?.()
  },
})
```

### Angular Global Error Handler
```typescript
import { ErrorHandler, Injectable, NgZone } from '@angular/core'

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private ngZone: NgZone) {}

  handleError(error: any): void {
    this.ngZone.runOutsideAngular(() => {
      reportError(error instanceof Error ? error : new Error(error))
    })

    // Show user-facing notification
    this.ngZone.run(() => {
      // Trigger fallback component
    })
  }
}

// providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
```

### Svelte Error Boundary
```svelte
<script>
  import { onMount } from 'svelte'

  let hasError = false
  let error = null

  export let fallback = null
</script>

<svelte:window on:error={(e) => { hasError = true; error = e.message }} />

{#if hasError}
  {#if fallback}
    <slot name="fallback" {error} on:retry={() => hasError = false} />
  {:else}
    <div class="error-fallback">
      <p>Something went wrong</p>
      <button on:click={() => hasError = false}>Try again</button>
    </div>
  {/if}
{:else}
  <slot />
{/if}
```

## Recovery Patterns

### Retry with Exponential Backoff
```typescript
function useRetry(maxAttempts = 3) {
  const [attempts, setAttempts] = useState(0)

  const retry = useCallback(async (fn: () => Promise<void>) => {
    const delay = Math.min(1000 * 2 ** attempts, 30000)

    setAttempts((a) => a + 1)

    if (attempts >= maxAttempts) {
      throw new Error('Max retry attempts exceeded')
    }

    await new Promise((r) => setTimeout(r, delay))
    return fn()
  }, [attempts, maxAttempts])

  return { retry, attempts, hasExceededMax: attempts >= maxAttempts }
}
```

### Reset State on Retry
```typescript
function useResetOnRetry() {
  const [key, setKey] = useState(0)

  const reset = useCallback(() => {
    setKey((k) => k + 1) // changes key → remounts component
  }, [])

  return { resetKey: key, reset }
}

// Usage
function ResetableWidget() {
  const { resetKey, reset } = useResetOnRetry()

  return (
    <ErrorBoundary onReset={reset}>
      <Widget key={resetKey} />
    </ErrorBoundary>
  )
}
```

### Partial Error Recovery
```typescript
interface SectionError {
  sectionId: string
  error: Error
  recovered?: boolean
}

function useSectionRecovery(sections: string[]) {
  const [failedSections, setFailedSections] = useState<SectionError[]>([])

  const markFailed = (sectionId: string, error: Error) => {
    setFailedSections((prev) => [...prev, { sectionId, error }])
  }

  const retrySection = (sectionId: string) => {
    setFailedSections((prev) => prev.map((s) => s.sectionId === sectionId ? { ...s, recovered: true } : s))

    // Trigger section re-render via key change
  }

  return { failedSections, markFailed, retrySection, allRecovered: failedSections.every((s) => s.recovered) }
}
```

## Error Boundary Testing

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from 'react-error-boundary'

function BrokenComponent() {
  throw new Error('Boom!')
}

describe('ErrorBoundary', () => {
  it('renders fallback on error', () => {
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <BrokenComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('resets and re-renders children on retry', async () => {
    let shouldThrow = true
    const user = userEvent.setup()

    function Conditional() {
      if (shouldThrow) throw new Error('Boom!')
      return <div>Success</div>
    }

    render(
      <ErrorBoundary fallbackRender={({ resetErrorBoundary }) => (
        <button onClick={() => { shouldThrow = false; resetErrorBoundary() }}>Retry</button>
      )}>
        <Conditional />
      </ErrorBoundary>
    )

    await user.click(screen.getByText('Retry'))
    expect(screen.getByText('Success')).toBeInTheDocument()
  })
})
```

## Preventing Error Boundary Overuse

| Pattern | Error Boundary? |
|---------|----------------|
| API fetch failure | Try/catch + inline error state |
| Form validation | Field-level error display |
| Third-party widget crash | Error boundary (isolated) |
| Route-level crash | Error boundary |
| Global crash | Error boundary (root) |
| Image load failure | `onError` handler on `<img>` |
| WebSocket disconnection | Event listener + reconnection logic |
| Component render crash | Error boundary |
