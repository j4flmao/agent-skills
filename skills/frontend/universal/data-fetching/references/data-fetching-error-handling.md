# Data Fetching Error Handling

## Overview

Error handling in client-side data fetching requires strategies for: per-query error states, global error handlers, retry logic, error boundaries, mutation errors, offline errors, and user-facing error UI. This reference covers every aspect of error handling with TanStack Query, SWR, and RTK Query.

## Error States Architecture

### Error State Types

```
Server State Errors
├── Network errors (no internet, DNS failure, timeout)
├── HTTP errors (4xx client, 5xx server)
├── Data parsing errors (invalid JSON, schema mismatch)
├── Authentication errors (401, token expired)
├── Authorization errors (403, insufficient permissions)
└── Business logic errors (validation, conflict 409)

Client State Errors
├── Optimistic update conflicts
├── Cache staleness errors
└── Mutation queue conflicts
```

## Global Error Handling

### TanStack Query Global Error Handler

```typescript
import { QueryCache, MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Sentry from '@sentry/react'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof HttpError && error.status >= 500) {
        Sentry.captureException(error, {
          extra: { queryKey: query.queryKey },
        })
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (error instanceof HttpError) {
        toast.error(error.message)
      }
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      toast.success('Operation completed successfully')
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          return false // Don't retry client errors
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
```

### SWR Global Error Handler

```typescript
import useSWR, { SWRConfig, mutate } from 'swr'

function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      onError: (error, key) => {
        if (error.status !== 403 && error.status !== 404) {
          Sentry.captureException(error, { extra: { key } })
        }
      },
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (error.status === 404) return  // Don't retry 404
        if (error.status === 403) return  // Don't retry 403
        if (retryCount >= 3) return       // Max 3 retries
        setTimeout(() => revalidate({ retryCount }), 5000 * retryCount)
      },
      shouldRetryOnError: true,
    }}>
      {children}
    </SWRConfig>
  )
}
```

## Per-Query Error Handling

### Basic error state

```typescript
function TodoList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorDisplay error={error} />

  return <TodoItems data={data} />
}
```

### Retry button

```typescript
function TodoList() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  if (error) {
    return (
      <div role="alert">
        <p>Failed to load todos: {(error as Error).message}</p>
        <button onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    )
  }

  if (isLoading) return <LoadingSkeleton />

  return <TodoItems data={data} />
}
```

### Error with stale data fallback

```typescript
function Dashboard() {
  const { data, error, isStale } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  if (error && !data) {
    return <ErrorState message="Could not load dashboard" onRetry={() => refetch()} />
  }

  return (
    <div>
      {isStale && <Banner message="Data may be outdated. Refreshing..." />}
      {data && <DashboardContent data={data} />}
    </div>
  )
}
```

## HTTP Error Classes

### Custom error class

```typescript
export class HttpError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly body: unknown

  constructor(status: number, statusText: string, body?: unknown) {
    super(`${status} ${statusText}: ${JSON.stringify(body)}`)
    this.name = 'HttpError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }

  get isAuthError(): boolean {
    return this.status === 401
  }

  get isPermissionError(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isValidationError(): boolean {
    return this.status === 422
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}
```

### Fetch wrapper with error handling

```typescript
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new HttpError(response.status, response.statusText, body)
  }

  return response.json()
}

// Query function using the wrapper
function fetchTodos(): Promise<Todo[]> {
  return apiFetch('/api/todos')
}
```

### Axios-based with interceptors

```typescript
import axios, { AxiosError } from 'axios'

const api = axios.create({ baseURL: '/api' })

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response
      throw new HttpError(status, error.message, data)
    }

    if (error.request) {
      throw new HttpError(0, 'Network error - no response received')
    }

    throw new HttpError(-1, 'Request configuration error')
  }
)

function fetchUsers(): Promise<User[]> {
  return api.get('/users').then((res) => res.data)
}
```

## Mutation Error Handling

### Mutation with error state

```typescript
function CreateTodoForm() {
  const mutation = useMutation({
    mutationFn: (newTodo: NewTodo) => apiFetch<Todo>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(newTodo),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: (error: HttpError) => {
      if (error.isValidationError) {
        // Server-side validation errors
        const serverErrors = error.body as Record<string, string[]>
        return { serverErrors }
      }
    },
  })

  const handleSubmit = async (formData: FormData) => {
    const result = await mutation.mutateAsync({
      title: formData.get('title') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      {mutation.error instanceof HttpError && mutation.error.isValidationError && (
        <div className="error-list">
          {Object.entries((mutation.error.body as any).errors || {}).map(([field, msgs]) => (
            <p key={field}>{field}: {(msgs as string[]).join(', ')}</p>
          ))}
        </div>
      )}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Todo'}
      </button>
    </form>
  )
}
```

### Optimistic update error rollback

```typescript
function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (todo: Todo) => apiFetch<Todo>(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !todo.completed }),
    }),
    onMutate: async (updatedTodo) => {
      await queryClient.cancelQueries({ queryKey: ['todos', updatedTodo.id] })
      const previous = queryClient.getQueryData(['todos', updatedTodo.id])
      queryClient.setQueryData(['todos', updatedTodo.id], {
        ...updatedTodo,
        completed: !updatedTodo.completed,
      })
      return { previous }
    },
    onError: (_error, _todo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos', context.previous.id], context.previous)
      }
      toast.error('Failed to update todo. Changes reverted.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

## Error Boundaries Integration

### Query error boundary with retry

```typescript
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'

function QueryErrorFallback({ error, resetErrorBoundary }: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function DashboardPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={QueryErrorFallback}
    >
      <DashboardContent />
    </ErrorBoundary>
  )
}
```

### Selective error boundary

```typescript
function DashboardPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <div>
      <Header /> {/* Not wrapped — header shows regardless */}
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <ErrorCard
            message="Failed to load main content"
            onRetry={resetErrorBoundary}
          />
        )}
      >
        <MainContent />
      </ErrorBoundary>
      <ErrorBoundary
        onReset={reset}
        fallbackRender={() => <p>Sidebar unavailable</p>}
      >
        <Sidebar />
      </ErrorBoundary>
    </div>
  )
}
```

## Network Status Detection

### Online/offline handling

```typescript
import { onlineManager } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Usage
function App() {
  const isOnline = useOnlineStatus()

  return (
    <div>
      {!isOnline && <OfflineBanner />}
      <MainContent />
    </div>
  )
}
```

### Pause/resume queries on network change

```typescript
import { onlineManager } from '@tanstack/react-query'

// Automatically pause queries when offline
onlineManager.setEventListener((setOnline) => {
  const handleOnline = () => setOnline(true)
  const handleOffline = () => setOnline(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
})
```

## Retry Strategy

### Exponential backoff with jitter

```typescript
function retryWithJitter(failureCount: number, error: unknown): number {
  if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
    return -1 // Don't retry
  }

  const base = Math.min(1000 * 2 ** failureCount, 30000)
  const jitter = Math.random() * 1000
  return base + jitter
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: retryWithJitter,
    },
  },
})
```

### Custom retry condition

```typescript
const query = useQuery({
  queryKey: ['critical-data'],
  queryFn: fetchCriticalData,
  retry: (failureCount, error) => {
    // Only retry on server errors or network failures
    if (error instanceof HttpError) {
      if (error.status >= 500) return failureCount < 5
      if (error.status === 429) return failureCount < 3 // Rate limited
      return false // 4xx errors: no retry
    }
    return failureCount < 3 // Network error
  },
  retryDelay: (attempt) => {
    if (attempt <= 1) return 1000
    return 5000 * Math.pow(2, attempt - 2) // 1s, 5s, 10s, 20s
  },
})
```

## Auth Error Handling

### Auto-redirect on 401

```typescript
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

function useAuthErrorHandler() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof HttpError && error.status === 401) {
      queryClient.clear() // Clear all cached data
      navigate('/login', { state: { from: location.pathname } })
    }
  }, [navigate, queryClient])

  return { handleAuthError }
}
```

### Token refresh on 401

```typescript
async function apiFetchWithRefresh<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
      ...options?.headers,
    },
    ...options,
  })

  if (response.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      return apiFetchWithRefresh(url, options) // Retry with new token
    }
    throw new HttpError(401, 'Session expired')
  }

  if (!response.ok) {
    throw new HttpError(response.status, response.statusText, await response.json())
  }

  return response.json()
}
```

## Error Observability

### Sentry integration

```typescript
import * as Sentry from '@sentry/react'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      Sentry.addBreadcrumb({
        category: 'query',
        message: `Query failed: ${query.queryKey.join(', ')}`,
        level: 'error',
      })
      Sentry.captureException(error, {
        tags: { queryKey: String(query.queryKey) },
      })
    },
  }),
})
```

### Error logging service

```typescript
interface ErrorLogEntry {
  timestamp: string
  message: string
  queryKey: unknown[]
  error: string
  userAgent: string
  url: string
}

function logQueryError(error: Error, queryKey: unknown[]) {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    message: error.message,
    queryKey,
    error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    userAgent: navigator.userAgent,
    url: window.location.href,
  }

  // Send to analytics or logging service
  navigator.sendBeacon('/api/log-error', JSON.stringify(entry))
}
```

## Error UI Components

### Reusable error display

```typescript
interface ErrorDisplayProps {
  error: Error | null
  retry?: () => void
  variant?: 'card' | 'banner' | 'inline'
}

function ErrorDisplay({ error, retry, variant = 'card' }: ErrorDisplayProps) {
  if (!error) return null

  const message = error instanceof HttpError
    ? `${error.status}: ${error.message}`
    : error.message

  const components = {
    card: (
      <div className="error-card">
        <h3>Error</h3>
        <p>{message}</p>
        {retry && <button onClick={retry}>Try Again</button>}
      </div>
    ),
    banner: (
      <div className="error-banner">
        <span>{message}</span>
        {retry && <button onClick={retry}>Retry</button>}
      </div>
    ),
    inline: (
      <span className="error-inline">
        {message}
        {retry && <button onClick={retry}>x</button>}
      </span>
    ),
  }

  return components[variant]
}
```

## Error Recovery Patterns

### Graceful degradation

```typescript
function ProductPage({ productId }: { productId: string }) {
  const { data: product, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
  })

  const { data: reviews } = useQuery({
    queryKey: ['product', productId, 'reviews'],
    queryFn: () => fetchReviews(productId),
    enabled: !!product, // Reviews are secondary
    retry: 1,           // Don't hammer on review failures
  })

  if (error && !product) {
    return <NotFound />
  }

  return (
    <div>
      {product && <ProductDetails product={product} />}
      {reviews ? (
        <ReviewsList reviews={reviews} />
      ) : (
        <ReviewsUnavailable />  // Graceful degradation
      )}
    </div>
  )
}
```

### Stale data during error

```typescript
function useStaleWhileError<T>(queryKey: QueryKey, queryFn: QueryFunction<T>) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 2,
  })
}

// Usage — always shows data (previous or current), never blank on error
function Profile() {
  const { data, error, isStale } = useStaleWhileError(['profile'], fetchProfile)

  if (error && !data) return <ErrorPage />
  if (!data) return <Loading />

  return (
    <div>
      {isStale && <RefreshBanner />}
      <ProfileContent data={data} />
    </div>
  )
}
```
