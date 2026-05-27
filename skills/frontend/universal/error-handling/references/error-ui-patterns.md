# Error UI Patterns

## Inline Error Display

```typescript
interface InlineErrorProps {
  message: string
  field?: string
  type?: 'error' | 'warning' | 'info'
  onDismiss?: () => void
}

function InlineError({ message, field, type = 'error', onDismiss }: InlineErrorProps) {
  const id = field ? `${field}-error` : undefined
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`inline-error inline-error--${type} flex items-start gap-2 p-2 rounded text-sm
        ${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : ''}
        ${type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : ''}
        ${type === 'info' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}`}
    >
      <span className="inline-error__icon shrink-0 mt-0.5">
        {type === 'error' && <AlertCircle size={16} />}
        {type === 'warning' && <AlertTriangle size={16} />}
        {type === 'info' && <Info size={16} />}
      </span>
      <span className="inline-error__text flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="inline-error__dismiss shrink-0 hover:opacity-70"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
```

## Toast Notification System

```typescript
interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

const toastState = {
  toasts: [] as Toast[],
  listeners: new Set<() => void>(),

  add(toast: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID()
    this.toasts = [...this.toasts, { ...toast, id }]
    this.notify()

    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration)
    }
    return id
  },

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id)
    this.notify()
  },

  notify() {
    this.listeners.forEach(fn => fn())
  },

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  },
}

function ToastContainer() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    return toastState.subscribe(() => forceUpdate(c => c + 1))
  }, [])

  if (toastState.toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="region" aria-label="Notifications">
      {toastState.toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`toast toast--${toast.type} p-3 rounded-lg shadow-lg border
            animate-slide-in flex items-start gap-3
            ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
            ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}`}
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="font-medium underline hover:no-underline shrink-0"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => toastState.remove(toast.id)}
            className="shrink-0 hover:opacity-70"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Error Page Components

```typescript
interface ErrorPageProps {
  title?: string
  message?: string
  code?: number
  onRetry?: () => void
  onGoHome?: () => void
  error?: Error
}

function ErrorPage({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  code = 500,
  onRetry,
  onGoHome,
  error,
}: ErrorPageProps) {
  return (
    <div className="error-page min-h-screen flex items-center justify-center p-8" role="alert">
      <div className="max-w-md text-center">
        <div className="error-page__code text-8xl font-bold text-gray-200 mb-4">
          {code}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Home
            </button>
          )}
        </div>
        {error && process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error Details
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-64">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

function NotFoundPage({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorPage
      code={404}
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      onGoHome={onGoHome}
    />
  )
}

function OfflinePage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorPage
      code={0}
      title="You're Offline"
      message="Check your internet connection and try again."
      onRetry={onRetry}
    />
  )
}
```

## Error Boundary Fallback UI

```typescript
interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  componentName?: string
}

function ErrorFallback({ error, resetErrorBoundary, componentName }: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="error-fallback p-6 rounded-lg border border-red-200 bg-red-50"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={20} className="text-red-500" />
        <h3 className="text-lg font-semibold text-red-800">
          {componentName ? `${componentName} Error` : 'Component Error'}
        </h3>
      </div>
      <p className="text-red-600 mb-4">
        {error.message || 'An unexpected error occurred in this section.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={resetErrorBoundary}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 border border-red-300 text-red-700 text-sm rounded hover:bg-red-100 transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

function SkeletonFallback() {
  return (
    <div className="animate-pulse p-4 space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-20 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  )
}
```

## Error State in Data Fetching

```typescript
interface DataFetchState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isError: boolean
}

function DataFetchRenderer<T>({
  state,
  renderData,
  renderError,
  renderLoading,
}: {
  state: DataFetchState<T>
  renderData: (data: T) => React.ReactNode
  renderError?: (error: Error, retry: () => void) => React.ReactNode
  renderLoading?: () => React.ReactNode
}) {
  const [retryCount, setRetryCount] = useState(0)
  const retry = () => setRetryCount(c => c + 1)

  if (state.isLoading && !state.data) {
    return renderLoading ? renderLoading() : <SkeletonFallback />
  }

  if (state.isError && !state.data) {
    return renderError
      ? renderError(state.error!, retry)
      : (
        <ErrorFallback
          error={state.error!}
          resetErrorBoundary={retry}
        />
      )
  }

  if (state.data) {
    return <>{renderData(state.data)}</>
  }

  return null
}

function useErrorAwareQuery<T>(key: string, fetcher: () => Promise<T>): DataFetchState<T> {
  const [state, setState] = useState<DataFetchState<T>>({
    data: null,
    error: null,
    isLoading: true,
    isError: false,
  })

  useEffect(() => {
    let cancelled = false
    setState(prev => ({ ...prev, isLoading: true, isError: false }))

    fetcher()
      .then(data => {
        if (!cancelled) {
          setState({ data, error: null, isLoading: false, isError: false })
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState({ data: null, error, isLoading: false, isError: true })
        }
      })

    return () => { cancelled = true }
  }, [key])

  return state
}
```

## Form Error Summary

```typescript
interface FormErrorSummaryProps {
  errors: Record<string, string[]>
  onFocusField?: (fieldName: string) => void
}

function FormErrorSummary({ errors, onFocusField }: FormErrorSummaryProps) {
  const errorEntries = Object.entries(errors).filter(([, msgs]) => msgs.length > 0)

  if (errorEntries.length === 0) return null

  return (
    <div
      className="form-error-summary p-4 rounded-lg border border-red-200 bg-red-50 mb-4"
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
    >
      <h3 className="text-red-800 font-semibold mb-2">
        Please correct {errorEntries.length} error{errorEntries.length > 1 ? 's' : ''}:
      </h3>
      <ul className="list-disc list-inside space-y-1">
        {errorEntries.map(([field, messages]) => (
          <li key={field}>
            {onFocusField ? (
              <button
                onClick={() => onFocusField(field)}
                className="text-red-700 hover:text-red-900 underline text-left"
              >
                {messages[0]}
              </button>
            ) : (
              <span className="text-red-700">{messages[0]}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Global Error Handler Hook

```typescript
interface GlobalErrorConfig {
  onError?: (error: Error, info: { componentStack?: string }) => void
  onUnhandledRejection?: (event: PromiseRejectionEvent) => void
  includeStack?: boolean
}

function useGlobalErrorHandler(config: GlobalErrorConfig = {}) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      config.onError?.(event.error, { componentStack: undefined })
      if (!config.includeStack) {
        event.preventDefault()
      }
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      config.onUnhandledRejection?.(event)
      event.preventDefault()
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])
}
```

## Network Error Interceptor

```typescript
interface NetworkErrorConfig {
  onNetworkError?: (error: TypeError) => void
  onTimeout?: (url: string) => void
  onServerError?: (status: number, url: string) => void
  timeout?: number
}

function createFetchWithErrorHandling(config: NetworkErrorConfig = {}) {
  const { onNetworkError, onTimeout, onServerError, timeout = 10000 } = config

  return async function fetchWithHandling(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      onTimeout?.(typeof input === 'string' ? input : input.url)
    }, timeout)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })

      if (!response.ok) {
        onServerError?.(response.status, response.url)
      }

      return response
    } catch (error) {
      if (error instanceof TypeError) {
        onNetworkError?.(error)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
```

## Key Points

- Prioritize inline field-level errors over generic toast or banner messages
- Provide actionable recovery paths such as retry, go home, or reload
- Distinguish error severity with appropriate visual hierarchy and icons
- Use skeleton loading states to prevent layout shift on initial data load
- Implement offline detection with dedicated offline UI
- Group form errors into a summary block that links to specific fields
- Handle unhandled rejections and global errors without crashing the app
- Show technical details only in development mode for debugging
- Animate toast notifications for attention but allow dismissal
