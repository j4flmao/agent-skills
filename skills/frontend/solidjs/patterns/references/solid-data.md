# SolidJS Data — createResource, Suspense, Error Boundaries, Lazy Loading

## createResource — Async Data

```tsx
import { createResource, Suspense } from 'solid-js'

const fetchUser = async (id: string): Promise<User> => {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function UserProfile(props: { userId: string }) {
  const [user, { mutate, refetch }] = createResource(
    () => props.userId,  // Source signal — re-fetches when it changes
    fetchUser
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <p>Name: {user()?.name}</p>
    </Suspense>
  )
}
```

## Resource with Multiple Sources

```tsx
const [data] = createResource(
  () => [props.userId, props.tab],  // Tuple — re-fetches when either changes
  async ([userId, tab]) => {
    const res = await fetch(`/api/users/${userId}?tab=${tab}`)
    return res.json()
  }
)
```

## SWR Pattern with Cache

```tsx
const cache = new Map<string, any>()

function createSWR<T>(key: () => string, fetcher: (key: string) => Promise<T>) {
  const [data] = createResource(key, async (k) => {
    if (cache.has(k)) return cache.get(k)
    const result = await fetcher(k)
    cache.set(k, result)
    return result
  })
  return data
}
```

## Mutate and Refetch

```tsx
function UserEditor(props: { userId: string }) {
  const [user, { mutate, refetch }] = createResource(() => props.userId, fetchUser)

  async function updateName(newName: string) {
    // Optimistic update
    mutate(prev => prev ? { ...prev, name: newName } : prev)
    try {
      await fetch(`/api/users/${props.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      })
      await refetch() // Revalidate
    } catch {
      await refetch() // Roll back
    }
  }
}
```

## Suspense Boundaries

```tsx
function App() {
  return (
    <Suspense fallback={<GlobalSpinner />}>
      <Routes>
        <Route path="/users" component={UsersList} />
        <Route path="/users/:id" component={
          <Suspense fallback={<UserSkeleton />}>
            <UserProfile />
          </Suspense>
        } />
      </Routes>
    </Suspense>
  )
}
```

## Error Boundaries

```tsx
import { ErrorBoundary } from 'solid-js'

<ErrorBoundary fallback={(err) => <p>Error: {err.message}</p>}>
  <UserProfile userId="123" />
</ErrorBoundary>

// With retry
<ErrorBoundary fallback={(err, reset) => (
  <div>
    <p>Error: {err.message}</p>
    <button onClick={reset}>Retry</button>
  </div>
)}>
  <UserProfile userId="123" />
</ErrorBoundary>
```

## Lazy Loading Routes

```tsx
import { lazy } from 'solid-js'
import { Router, Route } from '@solidjs/router'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

// Routes are automatically code-split
<Router>
  <Route path="/" component={Home} />
  <Route path="/about" component={About} />
  <Route path="/dashboard" component={Dashboard} />
</Router>
```
