# React Compiler & Optimizations

## Introduction

React Compiler (formerly "React Forget") is a build-time tool that automatically memoizes React components and hooks. It eliminates the need for manual `useMemo`, `useCallback`, and `React.memo`, reducing developer overhead while maintaining optimal rendering performance.

## How React Compiler Works

### Core Mechanism

React Compiler analyzes JavaScript/TypeScript at the compiler level to:

1. Track value identity across renders
2. Determine which values are "stable" (don't change between renders)
3. Automatically insert memoization where beneficial
4. Optimize re-rendering by skipping unnecessary work

### Input → Output Transformation

```tsx
// Input: Before compilation
function ProfileCard({ user, onFollow }: ProfileCardProps) {
  const displayName = `${user.firstName} ${user.lastName}`
  const avatarUrl = `/avatars/${user.id}.jpg`

  return (
    <div className="profile-card">
      <img src={avatarUrl} alt={displayName} />
      <h2>{displayName}</h2>
      <button onClick={() => onFollow(user.id)}>
        {user.isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  )
}
```

```tsx
// Output: After compilation (approximate)
function ProfileCard({ user, onFollow }: ProfileCardProps) {
  const $ = ReactMemo.c(5)
  let displayName, avatarUrl

  if ($[0] !== user.firstName || $[1] !== user.lastName) {
    displayName = `${user.firstName} ${user.lastName}`
    $[0] = user.firstName
    $[1] = user.lastName
  }

  if ($[2] !== user.id) {
    avatarUrl = `/avatars/${user.id}.jpg`
    $[2] = user.id
  }

  const t0 = ReactMemo.on($[3] !== user.id, () => onFollow(user.id))
  $[3] = user.id

  return (
    <div className="profile-card">
      <img src={avatarUrl} alt={displayName} />
      <h2>{displayName}</h2>
      <button onClick={t0}>
        {user.isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  )
}
```

### Stability Analysis

The compiler determines stability based on:

| Pattern | Stability | Reason |
|---|---|---|
| `2 + 2` | Always stable | Constant expression |
| `props.name` | Stable | Props are immutable |
| `state.value` | Stable | State reference is stable |
| `localVariable` | Stable per render | Local to render scope |
| `props.children` | Stable | React handles children |
| `event.target.value` | Stable per render | Local event data |
| `new Date()` | Unstable | Created each call |
| `Math.random()` | Unstable | Non-deterministic |
| `{...spread}` | Potentially unstable | New object each render |
| `array.map(...)` | Potentially unstable | New array each render |

## Enabling React Compiler

### Configuration

```json5
// next.config.js
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
}
```

```json5
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {}],
  ],
}
```

```json5
// vite.config.ts
import reactCompiler from 'vite-plugin-react-compiler'

export default defineConfig({
  plugins: [
    reactCompiler(),
  ],
})
```

## Manual Optimization Patterns

### useMemo — Memoized Values

```tsx
import { useMemo } from 'react'

export function Dashboard({ transactions, userId }: {
  transactions: Transaction[]
  userId: string
}) {
  const userTransactions = useMemo(
    () => transactions.filter(t => t.userId === userId),
    [transactions, userId]
  )

  const total = useMemo(
    () => userTransactions.reduce((sum, t) => sum + t.amount, 0),
    [userTransactions]
  )

  return (
    <div>
      <Summary total={total} />
      <TransactionList transactions={userTransactions} />
    </div>
  )
}
```

### useCallback — Memoized Functions

```tsx
import { useCallback, useState } from 'react'

export function SearchableList({ items }: { items: string[] }) {
  const [query, setQuery] = useState('')

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    },
    []
  )

  const filteredItems = useMemo(
    () => items.filter(item =>
      item.toLowerCase().includes(query.toLowerCase())
    ),
    [items, query]
  )

  return (
    <div>
      <SearchInput onChange={handleSearch} />
      <List items={filteredItems} />
    </div>
  )
}
```

### React.memo — Component Memoization

```tsx
import { memo } from 'react'

// Skip re-render if props haven't changed (shallow comparison)
export const ExpensiveChart = memo(function ExpensiveChart({
  data,
  width,
  height,
}: {
  data: DataPoint[]
  width: number
  height: number
}) {
  return <ChartRenderer data={data} width={width} height={height} />
})
```

### Custom Comparator

```tsx
export const UserCard = memo(
  function UserCard({ user, onFollow }: UserCardProps) {
    return (
      <div>
        <h3>{user.name}</h3>
        <button onClick={() => onFollow(user.id)}>
          {user.isFollowed ? 'Unfollow' : 'Follow'}
        </button>
      </div>
    )
  },
  (prev, next) => {
    // Deep compare specific fields
    return (
      prev.user.id === next.user.id &&
      prev.user.name === next.user.name &&
      prev.user.isFollowed === next.user.isFollowed
    )
  }
)
```

## Re-Render Optimization Strategies

### 1. Lifting State Up

```tsx
// ❌ Problem: All children re-render when search changes
export function Page() {
  const [query, setQuery] = useState('')

  return (
    <div>
      <SearchBar query={query} onChange={setQuery} />
      <Sidebar />       {/* Re-renders unnecessarily */}
      <MainContent />   {/* Re-renders unnecessarily */}
      <Footer />        {/* Re-renders unnecessarily */}
    </div>
  )
}

// ✅ Solution: Isolate state to the component that needs it
export function Page() {
  return (
    <div>
      <SearchSection />
      <Sidebar />
      <MainContent />
      <Footer />
    </div>
  )
}

function SearchSection() {
  const [query, setQuery] = useState('')

  return <SearchBar query={query} onChange={setQuery} />
}
```

### 2. Component Splitting

```tsx
// ❌ Problem: Everything re-renders
export function ProfilePage({ user, posts }: Props) {
  return (
    <div>
      <ProfileHeader user={user} />
      <ExpensiveChart data={posts} />
    </div>
  )
}

// ✅ Solution: Split by data dependency
export function ProfilePage({ user, posts }: Props) {
  return (
    <div>
      <ProfileHeader user={user} />
      <PostChart data={posts} />
    </div>
  )
}

const PostChart = React.memo(function PostChart({
  data,
}: {
  data: Post[]
}) {
  return <ExpensiveChart data={data} />
})
```

### 3. Key Prop for Reset

```tsx
// Reset internal state by changing key
export function FormPage({ formId }: { formId: string }) {
  // When formId changes, Form resets completely
  return (
    <div>
      <Form key={formId} />
    </div>
  )
}
```

### 4. Stable Props Pattern

```tsx
// ❌ Unstable props — breaks memo
export function Parent() {
  return (
    <Child
      onClick={() => console.log('clicked')}  // New function each render
      style={{ color: 'red' }}                  // New object each render
    />
  )
}

// ✅ Stable props
export function Parent() {
  const handleClick = useCallback(
    () => console.log('clicked'),
    []
  )
  const style = useMemo(() => ({ color: 'red' }), [])

  return <Child onClick={handleClick} style={style} />
}
```

### 5. Context Splitting

```tsx
// ❌ Problem: All context consumers re-render for any change
const AppContext = createContext({ theme: 'light', user: null, notifications: [] })

// ✅ Solution: Split into separate contexts
const ThemeContext = createContext('light')
const UserContext = createContext(null)
const NotificationsContext = createContext([])

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light')
  const [user] = useState(null)
  const [notifications] = useState([])

  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={user}>
        <NotificationsContext.Provider value={notifications}>
          {children}
        </NotificationsContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
  )
}
```

## React Compiler: Comparison Table

| Optimization | Manual | Compiler | Best For |
|---|---|---|---|
| useMemo | Developer writes | Auto-inserted | Derived values |
| useCallback | Developer writes | Auto-inserted | Stable callbacks |
| React.memo | Wraps component | Component-level | Pure components |
| useState bailout | N/A | N/A | State updates |
| useReducer | Manual dispatch | N/A | Complex state |
| Suspense | Manual boundary | N/A | Lazy loading |

## Performance Measurement

### Profiling with React DevTools

```tsx
// Profile committed renders
import { Profiler } from 'react'

function onRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  console.log(`Component ${id} rendered in ${actualDuration}ms`)
}

export function App() {
  return (
    <Profiler id="App" onRender={onRender}>
      <Dashboard />
    </Profiler>
  )
}
```

### Using useWhyDidYouUpdate

```tsx
import { useEffect, useRef } from 'react'

function useWhyDidYouUpdate(name: string, props: Record<string, unknown>) {
  const previousProps = useRef(props)

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props })
      const changes: Record<string, { from: unknown; to: unknown }> = {}

      for (const key of allKeys) {
        if (previousProps.current[key] !== props[key]) {
          changes[key] = {
            from: previousProps.current[key],
            to: props[key],
          }
        }
      }

      if (Object.keys(changes).length > 0) {
        console.log(`[why-did-you-update] ${name}:`, changes)
      }
    }

    previousProps.current = props
  })
}
```

## List Rendering Optimizations

### Windowing (Virtual Lists)

```tsx
import { useMemo } from 'react'
import { FixedSizeList } from 'react-window'

export function VirtualList({ items }: { items: Item[] }) {
  const itemData = useMemo(() => items, [items])

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      itemData={itemData}
      width="100%"
    >
      {({ index, style, data }) => (
        <div style={style}>
          {data[index].name}
        </div>
      )}
    </FixedSizeList>
  )
}
```

### Stable Keys

```tsx
// ❌ Avoid: Index as key
{items.map((item, index) => <Item key={index} data={item} />)}

// ✅ Use: Unique identifier
{items.map(item => <Item key={item.id} data={item} />)}

// ✅ Use: Compound key for lists without IDs
{items.map((item, index) => (
  <Item key={`${item.type}-${index}`} data={item} />
))}
```

## Bundle Size Optimization

### Dynamic Import (Lazy Loading)

```tsx
import { lazy, Suspense } from 'react'

const AdminPanel = lazy(() => import('./AdminPanel'))

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminPanel />
    </Suspense>
  )
}
```

### Route-Based Code Splitting

```tsx
import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
```

## State Management Optimization

### useReducer Over useState

```tsx
import { useReducer } from 'react'

// More predictable than multiple useState calls
type State = { count: number; step: number }
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; step: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step }
    case 'decrement':
      return { ...state, count: state.count - state.step }
    case 'setStep':
      return { ...state, step: action.step }
  }
}

export function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 })

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  )
}
```

### State Colocation

```tsx
// ❌ Problem: State defined too high
function App() {
  const [theme] = useState('light')       // Needed everywhere
  const [notifications] = useState([])     // Needed in one component
  const [searchQuery] = useState('')       // Needed in one component

  return (
    <ThemeContext.Provider value={theme}>
      <NotificationPanel notifications={notifications} />
      <SearchPanel query={searchQuery} />
    </ThemeContext.Provider>
  )
}

// ✅ Solution: Colocate state
function App() {
  const [theme] = useState('light')

  return (
    <ThemeContext.Provider value={theme}>
      <NotificationSection />
      <SearchSection />
    </ThemeContext.Provider>
  )
}
```

## Avoiding Common Anti-Patterns

### Inline Functions in JSX

```tsx
// ❌ Avoid: Inline arrow functions
{items.map(item => (
  <Item key={item.id} onClick={() => handleClick(item.id)} />
))}

// ✅ Prefer: Extracted handler with data attributes
function List({ items, onItemClick }: ListProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const id = e.currentTarget.getAttribute('data-id')
      if (id) onItemClick(id)
    },
    [onItemClick]
  )

  return (
    <div>
      {items.map(item => (
        <Item key={item.id} data-id={item.id} onClick={handleClick} />
      ))}
    </div>
  )
}
```

### Props Spreading

```tsx
// ❌ Avoid: Spreading creates new references
<Child {...props} />

// ✅ Prefer: Explicit props
<Child name={props.name} age={props.age} />
```

## React Compiler Limitation Scenarios

### When Manual Memoization Is Still Needed

```tsx
// 1. Ref-based values
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

// 2. Animation frame callbacks
function useAnimationFrame(callback: () => void, active: boolean) {
  const savedCallback = useRef(callback)
  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    if (!active) return
    let id: number
    function tick() {
      savedCallback.current()
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [active])
}
```

## Tooling & Analysis

### ESLint Plugin

```json5
// .eslintrc.json
{
  "plugins": ["react-compiler"],
  "rules": {
    "react-compiler/react-compiler": "error"
  }
}
```

### Compiler Playground

Use the React Compiler Playground to:
1. Paste your component code
2. See the compiled output with automatic memoization
3. Compare before/after render behavior
4. Identify optimization opportunities

## Performance Checklist

| Item | Action | Impact |
|---|---|---|
| Memoize expensive computations | useMemo | High |
| Memoize callbacks passed to children | useCallback | High |
| Wrap pure components | React.memo | Medium |
| Colocate state | Lift down | High |
| Split contexts | Separate providers | High |
| Virtual lists | react-window | High |
| Lazy load routes | Suspense + lazy | Medium |
| Key correctly | Stable unique keys | Medium |
| Avoid inline objects | Stable references | Medium |
| Profiler measurements | React DevTools | Diagnostic |

## Summary

| Technique | Manual | Compiler | Priority |
|---|---|---|---|
| useMemo | Yes | Auto | High |
| useCallback | Yes | Auto | High |
| React.memo | Yes | Auto | High |
| State colocation | Architectural | N/A | High |
| Context splitting | Architectural | N/A | Medium |
| Virtualization | Library | N/A | Medium |
| Code splitting | Dynamic import | N/A | Medium |
| Stable keys | Convention | N/A | Medium |
| Profiling | DevTools | N/A | Diagnostic |
