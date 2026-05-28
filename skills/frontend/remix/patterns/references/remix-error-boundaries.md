# Remix Error Boundaries

## Introduction

Error boundaries in Remix are the primary mechanism for handling runtime errors in both server-rendered and client-rendered code. Unlike React's `ErrorBoundary` which only catches client-side rendering errors, Remix's error boundaries handle errors from loaders, actions, and component rendering on both server and client.

## Error Boundary Tiers

### 1. Route-Level Error Boundaries (granular)

```tsx
// app/routes/projects.$id.tsx
export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <div className="error-container">
      <h1>Project Error</h1>
      <p>{error.message}</p>
    </div>
  )
}
```

### 2. Root Error Boundary (catch-all)

```tsx
// app/root.tsx
export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <html>
      <head>
        <title>Oops!</title>
      </head>
      <body>
        <div className="global-error">
          <h1>Something went wrong</h1>
          <pre>{error.stack}</pre>
        </div>
      </body>
    </html>
  )
}
```

## Error Types Categorization

| Error Source | Caught By | Handler |
|---|---|---|
| Loader error | Route `ErrorBoundary` | `ErrorBoundaryProps` |
| Action error | Route `ErrorBoundary` | `ErrorBoundaryProps` |
| Render error | Route `ErrorBoundary` | `ErrorBoundaryProps` |
| Layout error | Root `ErrorBoundary` | `ErrorBoundaryProps` |
| 404 Not Found | Route `ErrorBoundary` | `ErrorBoundaryProps` with status |
| 401 Unauthorized | Route `ErrorBoundary` | `ErrorBoundaryProps` with status |
| 500 Server Error | Route `ErrorBoundary` | `ErrorBoundaryProps` with status |

## Expected Error Handling vs Thrown Errors

### Expected Errors (4xx / redirect)

Use `json` with status codes for expected error scenarios:

```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const project = await db.project.findUnique({
    where: { id: params.id },
  })

  if (!project) {
    throw new Response('Project not found', { status: 404 })
  }

  if (!project.published) {
    throw new Response('Project is not yet published', { status: 404 })
  }

  return json({ project })
}
```

### Unexpected Errors (5xx / crashes)

Let runtime errors propagate naturally:

```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  // If this throws, Remix catches it
  return json({
    project: await db.project.findUnique({
      where: { id: params.id },
    }),
  })
}
```

## Error Boundary Props & Patterns

```tsx
// app/components/ErrorFallback.tsx
import { useRouteError, isRouteErrorResponse } from '@remix-run/react'

export function ErrorFallback() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div className="route-error">
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
        {error.status === 404 && (
          <Link to="/">Go home</Link>
        )}
      </div>
    )
  }

  return (
    <div className="unexpected-error">
      <h1>Unexpected Error</h1>
      <p>{(error as Error).message}</p>
      {process.env.NODE_ENV === 'development' && (
        <pre>{(error as Error).stack}</pre>
      )}
    </div>
  )
}
```

## UseRouteError Hook

```tsx
// app/routes/projects.$id.tsx
import { useRouteError, isRouteErrorResponse } from '@remix-run/react'

export function ErrorBoundary() {
  const error = useRouteError()
  const [showDetails, setShowDetails] = useState(false)

  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-container">
        <div className="error-header">
          <span className="error-status">{error.status}</span>
          <h2>{error.statusText}</h2>
        </div>

        <p className="error-message">
          {typeof error.data === 'string'
            ? error.data
            : 'An error occurred'}
        </p>

        {error.status === 404 && (
          <div className="error-actions">
            <Link to="/projects" className="btn">
              All Projects
            </Link>
            <Link to="/" className="btn btn-secondary">
              Home
            </Link>
          </div>
        )}

        {error.status === 401 && (
          <div className="error-actions">
            <Link to="/login" className="btn">
              Log In
            </Link>
          </div>
        )}
      </div>
    )
  }

  // Unexpected error
  if (error instanceof Error) {
    console.error('Unexpected error:', error)
  }

  return (
    <div className="error-container unexpected">
      <h2>Something went wrong</h2>
      <p>Please try again later.</p>

      <details>
        <summary>Technical details</summary>
        <pre className="error-stack">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </details>

      <button onClick={() => window.location.reload()} className="btn">
        Try Again
      </button>
    </div>
  )
}
```

## Layout-Specific Error Boundaries

### Nesting Error Boundaries

```tsx
// app/routes/projects.tsx (parent layout)
export default function ProjectsLayout() {
  return (
    <div className="projects-layout">
      <nav>
        <Link to="/projects/new">New Project</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

// This catches errors only in the layout itself
export function ErrorBoundary() {
  const error = useRouteError()

  return (
    <div className="layout-error">
      <h2>Layout Error</h2>
      <p>
        The navigation might be broken. Please try refreshing.
      </p>
      <pre>{error instanceof Error ? error.message : 'Unknown error'}</pre>
    </div>
  )
}
```

```tsx
// app/routes/projects.$id.tsx (child route)
// This catches errors in the child route only
export function ErrorBoundary() {
  const error = useRouteError()

  return (
    <div className="project-error">
      <h2>Project Error</h2>
      <p>Could not load this project.</p>
    </div>
  )
}
```

### Error Propagation in Layouts

When a layout throws during rendering, Remix looks up the tree for the nearest parent `ErrorBoundary`. If none exists at the root, a default error page is shown.

```
Propagation order:
  1. Route's own ErrorBoundary
  2. Parent layout's ErrorBoundary
  3. Root layout's ErrorBoundary  (always define this!)
  4. Remix default error page    (fallback)
```

## Catch-All Route Error Boundaries

```tsx
// app/routes/$.tsx — catch-all route
export function loader({ request }: LoaderFunctionArgs) {
  throw new Response('Not Found', { status: 404 })
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="not-found-page">
        <h1>404 — Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/">Go Home</Link>
      </div>
    )
  }

  return <DefaultErrorFallback />
}
```

## Error Handling in Actions

```tsx
export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData()
  const email = formData.get('email') as string

  // Validation errors — return as data, not throw
  if (!email || !email.includes('@')) {
    return json(
      { errors: { email: 'Invalid email address' } },
      { status: 422 }
    )
  }

  try {
    await db.user.update({
      where: { id: params.id },
      data: { email },
    })
    return redirect(`/users/${params.id}`)
  } catch (error) {
    // Database error — unexpected, let ErrorBoundary handle
    throw new Response('Database error', { status: 500 })
  }
}
export function ErrorBoundary() {
  const error = useRouteError()

  return (
    <div className="error-boundary">
      {isRouteErrorResponse(error) ? (
        <div>
          <h2>Error {error.status}</h2>
          <p>{error.statusText}</p>
          {error.status === 404 && <Link to="/">Go Home</Link>}
        </div>
      ) : (
        <div>
          <h2>Unexpected Error</h2>
          <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  )
}
```

## Error Boundary Composition

### Composing Multiple Error Boundaries

```tsx
// app/components/DataBoundary.tsx
// Reusable error boundary wrapper for data fetching components
export function DataBoundary({ children, fallback }: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const error = useRouteError()

  // Only works if this is a route module
  // For generic components, use React ErrorBoundary
  if (error) {
    return fallback ?? <DefaultErrorFallback />
  }

  return <>{children}</>
}
```

### React ErrorBoundary Integration

For component-level error boundaries (not route-level):

```tsx
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="component-error">
      <h3>Component Error</h3>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

export default function Dashboard() {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      <DashboardContent />
    </ReactErrorBoundary>
  )
}
```

## Status-Specific Error Handling

### 403 Forbidden

```tsx
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUser(request)
  const project = await db.project.findUnique({
    where: { id: params.id },
  })

  if (!project) {
    throw new Response('Project not found', { status: 404 })
  }

  if (project.userId !== user.id) {
    throw new Response('You do not have access to this project', {
      status: 403,
    })
  }

  return json({ project })
}
export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 403:
        return (
          <div className="error-forbidden">
            <h2>Access Denied</h2>
            <p>You don't have permission to view this page.</p>
            <Link to="/">Back to Home</Link>
          </div>
        )
      case 404:
        return <NotFound />
      default:
        return <ServerError />
    }
  }

  return <UnexpectedError error={error} />
}
```

### 429 Too Many Requests

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const ip = getClientIP(request)
  const recentRequests = await rateLimiter.check(ip)

  if (recentRequests > 100) {
    throw new Response('Too many requests', {
      status: 429,
      statusText: 'Rate limit exceeded',
    })
  }

  return json({ data: await fetchData() })
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 429) {
    return (
      <div className="rate-limit-error">
        <h2>Too Many Requests</h2>
        <p>Please wait a moment before trying again.</p>
        <p className="retry-after">
          Retry after: 60 seconds
        </p>
      </div>
    )
  }

  return <DefaultErrorFallback />
}
```

## Error Logging Integration

### Server-Side Logging

```tsx
// app/utils/error-logging.server.ts
import { createLogger } from './logger'

export function logServerError(error: unknown, context: {
  route: string
  method: string
  userId?: string
}) {
  const logger = createLogger()

  if (error instanceof Error) {
    logger.error({
      message: error.message,
      stack: error.stack,
      route: context.route,
      method: context.method,
      userId: context.userId,
    })

    // Send to external error tracking
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: context,
      })
    }
  }
}
```

### Integrating with ErrorBoundary

```tsx
// app/root.tsx
import { logServerError } from '~/utils/error-logging.server'

export function ErrorBoundary() {
  const error = useRouteError()
  const location = useLocation()

  useEffect(() => {
    if (error instanceof Error) {
      console.error('Route error:', {
        error: error.message,
        stack: error.stack,
        pathname: location.pathname,
      })

      // Client-side logging
      if (typeof window !== 'undefined' && 'gtag' in window) {
        window.gtag('event', 'error', {
          error_message: error.message,
          page_path: location.pathname,
        })
      }
    }
  }, [error, location])

  return <ErrorDisplay error={error} />
}
```

### Sentry Integration

```tsx
// app/entry.server.tsx
import { handleRequest } from '@sentry/remix'

export default handleRequest((request, responseStatusCode, responseHeaders, remixContext) => {
  const markup = ReactDOMServer.renderToString(
    <RemixServer context={remixContext} url={request.url} />
  )

  responseHeaders.set('Content-Type', 'text/html')

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
})
```

## Custom Error Classes

```tsx
// app/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    )
    this.name = 'NotFoundError'
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_REQUIRED')
    this.name = 'AuthError'
  }
}

export class ValidationError extends AppError {
  constructor(public fields: Record<string, string>) {
    super('Validation failed', 422, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}
```

```tsx
// Using custom errors in loaders
import { NotFoundError, AuthError } from '~/utils/errors'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await getUser(request)
  if (!user) throw new AuthError()

  const project = await db.project.findUnique({
    where: { id: params.id },
  })
  if (!project) throw new NotFoundError('Project', params.id)

  return json({ project })
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (error instanceof AppError) {
    return (
      <div className={`app-error error-${error.code?.toLowerCase()}`}>
        <h2>{error.statusCode} Error</h2>
        <p>{error.message}</p>
      </div>
    )
  }

  return <DefaultErrorFallback />
}
```

## Recovery Patterns

### Retry Mechanism

```tsx
export function ErrorBoundary() {
  const error = useRouteError()
  const [retryCount, setRetryCount] = useState(0)

  if (retryCount > 0) {
    return (
      <div className="error-retry">
        <h2>Still having trouble?</h2>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    )
  }

  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-container">
        <p>{error.statusText}</p>
        {error.status === 429 && (
          <p>Please wait before trying again</p>
        )}
        <button onClick={() => setRetryCount(prev => prev + 1)}>
          Try Again
        </button>
        <Link to="/">Go Home</Link>
      </div>
    )
  }

  return <DefaultErrorFallback />
}
```

### Graceful Degradation

```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  try {
    const [project, related] = await Promise.all([
      db.project.findUnique({ where: { id: params.id } }),
      db.project.findMany({
        where: { category: project.category, id: { not: params.id } },
        take: 4,
      }),
    ])

    return json({ project, related })
  } catch {
    // Fallback: return partial data
    const project = await db.project.findUnique({
      where: { id: params.id },
    })

    return json({ project, related: [], fallback: true })
  }
}
```

## Testing Error Boundaries

```tsx
import { render, screen } from '@testing-library/react'
import { createRemixStub } from '@remix-run/testing'
import { ErrorBoundary } from './ErrorBoundary'

describe('ErrorBoundary', () => {
  it('renders 404 page', () => {
    const RemixStub = createRemixStub([
      {
        path: '/',
        ErrorBoundary,
        loader: () => {
          throw new Response('Not Found', { status: 404 })
        },
      },
    ])

    render(<RemixStub initialEntries={['/']} />)
    expect(screen.getByText('Not Found')).toBeInTheDocument()
  })

  it('renders unexpected error details', () => {
    const RemixStub = createRemixStub([
      {
        path: '/',
        ErrorBoundary,
        loader: () => {
          throw new Error('Database connection failed')
        },
      },
    ])

    render(<RemixStub initialEntries={['/']} />)
    expect(screen.getByText('Database connection failed')).toBeInTheDocument()
  })
})
```

## Migration from React Error Boundaries

| React ErrorBoundary | Remix ErrorBoundary |
|---|---|
| Wraps component tree | Declared at route level |
| Catches render errors | Catches loader, action, render errors |
| Requires class component | Function component |
| `componentDidCatch` | `useRouteError` hook |
| `getDerivedStateFromError` | `isRouteErrorResponse` |
| Server errors not caught | Server errors caught |

## Summary

| Concept | Implementation | Use Case |
|---|---|---|
| Route ErrorBoundary | Export from route | Per-route errors |
| Root ErrorBoundary | Export from root.tsx | Global fallback |
| isRouteErrorResponse | Check error type | Expected vs unexpected |
| useRouteError | Hook | Access error details |
| Custom error classes | Extend Error | Domain-specific errors |
| Sentry integration | entry.server.tsx | Error monitoring |
| Retry pattern | State in boundary | Transient failures |
| Graceful degradation | Partial error handling | Non-critical failures |
