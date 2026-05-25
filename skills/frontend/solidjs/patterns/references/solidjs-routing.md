# SolidJS Routing Patterns

## @solidjs/router Setup

```tsx
import { Router, Route, Routes, A, useParams, useNavigate, useSearchParams, type RouteSectionProps } from '@solidjs/router'
import { lazy } from 'solid-js'
import { Suspense } from 'solid-js/web'

const Home = lazy(() => import('./pages/Home'))
const Users = lazy(() => import('./pages/Users'))
const UserDetail = lazy(() => import('./pages/UserDetail'))

function RootLayout(props: RouteSectionProps) {
  return (
    <div>
      <nav>
        <A href="/">Home</A>
        <A href="/users">Users</A>
      </nav>
      <main><Suspense fallback={<div>Loading...</div>}>{props.children}</Suspense></main>
    </div>
  )
}

export function App() {
  return (
    <Router root={RootLayout}>
      <Route path="/" component={Home} />
      <Route path="/users" component={Users} />
      <Route path="/users/:id" component={UserDetail} />
    </Router>
  )
}
```

## Dynamic Route Params

```tsx
function UserDetail() {
  const params = useParams()
  const [user] = createResource(() => params.id, fetchUser)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <h1>{user()?.name}</h1>
      <p>{user()?.email}</p>
    </Suspense>
  )
}
```

## Navigation

```tsx
import { A, useNavigate } from '@solidjs/router'

function Navigation() {
  const navigate = useNavigate()

  return (
    <div>
      <A href="/users" activeClass="active">Users</A>
      <A href="/users/123" end>User 123</A>
      <button onClick={() => navigate('/about')}>About</button>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>
  )
}
```

## Search Params

```tsx
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <div>
      <input
        value={searchParams.q || ''}
        onInput={(e) => setSearchParams({ q: e.currentTarget.value })}
      />
      <p>Searching for: {searchParams.q}</p>
    </div>
  )
}
```

## Nested Routes

```tsx
<Route path="/dashboard" component={DashboardLayout}>
  <Route path="/" component={DashboardHome} />
  <Route path="/settings" component={Settings} />
  <Route path="/analytics" component={Analytics} />
</Route>

function DashboardLayout(props: RouteSectionProps) {
  return (
    <div class="dashboard">
      <aside>Sidebar nav</aside>
      <main>{props.children}</main>
    </div>
  )
}
```

## Route Guards

```tsx
function ProtectedRoute(props: { children: any }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  createEffect(() => {
    if (!user()) navigate('/login', { replace: true })
  })

  return <Show when={user()}>{props.children}</Show>
}

<Route path="/admin" component={() => (
  <ProtectedRoute>
    <AdminPanel />
  </ProtectedRoute>
)} />
```
