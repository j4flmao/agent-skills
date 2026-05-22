# SolidJS Components — JSX, Control Flow, Context, Portals, Lifecycle

## Component Model

Components are functions that run once. JSX compiles to real DOM expressions:

```tsx
import { createSignal, type Component } from 'solid-js'

interface CounterProps {
  initial?: number
  label: string
}

const Counter: Component<CounterProps> = (props) => {
  const [count, setCount] = createSignal(props.initial ?? 0)

  return (
    <div>
      <span>{props.label}: </span>
      <button onClick={() => setCount(c => c + 1)}>
        {count()}
      </button>
    </div>
  )
}
```

## Control Flow — Declarative

```tsx
import { Show, For, Switch, Match, Index } from 'solid-js'

// Show — conditional rendering
<Show when={user()} fallback={<p>Not logged in</p>}>
  <p>Welcome {user().name}</p>
</Show>

// For — list rendering (keyed by default)
<For each={items()} fallback={<p>No items</p>}>
  {(item, index) => (
    <li>#{index() + 1}: {item.name}</li>
  )}
</For>

// Switch/Match — multiple conditions
<Switch fallback={<p>Unknown status</p>}>
  <Match when={status() === 'loading'}>
    <Spinner />
  </Match>
  <Match when={status() === 'error'}>
    <ErrorView />
  </Match>
</Switch>

// Index — unkeyed list (for primitive arrays)
<Index each={letters()}>
  {(letter, index) => (
    <span>{index()}: {letter()}</span>
  )}
</Index>
```

## Props Handling

```tsx
// Props object is reactive — destructure with care
function Greeting(props: { name: string }) {
  // ❌ Loses reactivity
  const name = props.name

  // ✅ Keeps reactivity
  const name = () => props.name

  return <p>Hello {name()}</p>
}

// Default props
function Button(props: { variant?: string }) {
  return <button class={`btn-${props.variant ?? 'primary'}`} />
}
```

## Context API

```tsx
import { createContext, useContext } from 'solid-js'

const AuthContext = createContext<{ user: () => User | null }>()

// Provider
function AuthProvider(props: { children: any }) {
  const [user, setUser] = createSignal<User | null>(null)

  return (
    <AuthContext.Provider value={{ user }}>
      {props.children}
    </AuthContext.Provider>
  )
}

// Consumer
function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
```

## Portals

```tsx
import { Portal } from 'solid-js/web'

function Modal() {
  return (
    <Portal mount={document.getElementById('modals')!}>
      <div class="modal-backdrop">
        <div class="modal-content">
          <slot />
        </div>
      </div>
    </Portal>
  )
}
```

## Lifecycle

```tsx
import { onMount, onCleanup, onError } from 'solid-js'

function Timer() {
  const [elapsed, setElapsed] = createSignal(0)

  onMount(() => {
    const interval = setInterval(() => setElapsed(t => t + 1), 1000)
    onCleanup(() => clearInterval(interval))
  })

  onError((err) => {
    console.error('Caught error:', err)
  })

  return <p>{elapsed()}s</p>
}
```

## Dynamic Component

```tsx
import { Dynamic } from 'solid-js/web'

function Card({ component }: { component: Component }) {
  return (
    <div class="card">
      <Dynamic component={component} />
    </div>
  )
}
```

## Lazy Loading

```tsx
import { lazy } from 'solid-js'
import { Routes, Route } from '@solidjs/router'

const Admin = lazy(() => import('./pages/Admin'))

<Routes>
  <Route path="/admin" component={Admin} />
</Routes>
```
