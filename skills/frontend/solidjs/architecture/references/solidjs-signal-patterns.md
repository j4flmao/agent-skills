# SolidJS Signal Patterns

## Signal Fundamentals

```typescript
import { createSignal, createEffect, createMemo } from 'solid-js'

function Counter() {
  const [count, setCount] = createSignal(0)
  const double = createMemo(() => count() * 2)

  createEffect(() => {
    console.log(`Count is now ${count()}`)
  })

  return (
    <div>
      <p>Count: {count()}</p>
      <p>Double: {double()}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

## Store Pattern

```typescript
import { createStore, produce } from 'solid-js/store'

interface UserState {
  users: User[]
  currentUser: User | null
  loading: boolean
  error: string | null
}

const [state, setState] = createStore<UserState>({
  users: [],
  currentUser: null,
  loading: false,
  error: null,
})

function UserList() {
  const loadUsers = async () => {
    setState('loading', true)
    try {
      const users = await fetchUsers()
      setState('users', users)
    } catch {
      setState('error', 'Failed to load users')
    } finally {
      setState('loading', false)
    }
  }

  const addUser = (user: User) => {
    setState(
      produce(s => {
        s.users.push(user)
      }),
    )
  }

  return (
    <div>
      <Show when={state.loading} fallback={<UserCardList />}>
        <Spinner />
      </Show>
    </div>
  )
}
```

## Resource Management

```typescript
import { createResource, Suspense } from 'solid-js'

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function UserProfile(props: { userId: string }) {
  const [user, { mutate, refetch }] = createResource(
    () => props.userId,
    fetchUser,
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Show when={user()} fallback={<div>User not found</div>}>
        <div>
          <h2>{user().name}</h2>
          <p>{user().email}</p>
          <button onClick={() => mutate({ ...user(), name: 'Updated' })}>
            Optimistic Update
          </button>
          <button onClick={refetch}>Refresh</button>
        </div>
      </Show>
    </Suspense>
  )
}
```

## Context and Provider

```typescript
import { createContext, useContext } from 'solid-js'

interface ThemeContextType {
  theme: () => string
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>()

function ThemeProvider(props: { children: ReactNode }) {
  const [theme, setTheme] = createSignal('light')

  const value: ThemeContextType = {
    theme,
    toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light'),
  }

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

## Key Points

- Use createSignal for local component state
- Use createMemo for derived computations
- Use createStore for complex nested state
- Use produce for immutable store updates
- Use createResource for async data fetching
- Combine with Suspense for loading states
- Implement context providers for shared state
- Use createEffect for automatic dependency tracking
- Leverage SolidJS's fine-grained reactivity
- Use Show and Switch for conditional rendering
- Use For and Index for list rendering
- Avoid unnecessary reactive computations
