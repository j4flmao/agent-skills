# SolidJS Optimization Patterns

## Compiler Optimizations

SolidJS compiles JSX to real DOM bindings, not virtual DOM:

```tsx
// Source
function Counter() {
  const [count, setCount] = createSignal(0)
  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>
}

// Compiled (simplified) — direct DOM updates
function Counter() {
  const [count, setCount] = createSignal(0)
  return (() => {
    const el = document.createElement('button')
    el.addEventListener('click', () => setCount(c => c + 1))
    createRenderEffect(() => el.textContent = count())
    return el
  })()
}
```

## Avoiding Unnecessary Re-Renders

```tsx
// ❌ Wrong: Destructuring loses reactivity
function UserCard(props: { user: () => User }) {
  const { name, email } = props.user()  // Static values
  return <div>{name} - {email}</div>
}

// ✅ Correct: Track properties individually
function UserCard(props: { user: () => User }) {
  return (
    <div>
      <span>{props.user().name}</span>
      <span>{props.user().email}</span>
    </div>
  )
}

// ✅ Best: Split into granular signals
function UserCard(props: { name: () => string; email: () => string }) {
  return <div>{props.name()} - {props.email()}</div>
}
```

## Control Flow Components

Use built-in control flow for optimal DOM management:

```tsx
// ✅ Correct: Show component — removes/adds DOM
<Show when={user()} fallback={<Loading />}>
  <Profile user={user()} />
</Show>

// ✅ Correct: For component — keyed reconciliation
<For each={items()}>{(item, i) => (
  <div data-index={i()}>{item.name}</div>
)}</For>

// ❌ Wrong: Array.map recreates DOM on every change
{items().map(item => <div>{item.name}</div>)}
```

## Memoization

```tsx
function ExpensiveList(props: { items: () => Item[] }) {
  // Memoize expensive computations
  const sorted = createMemo(() =>
    [...props.items()].sort((a, b) => b.date - a.date)
  )

  const total = createMemo(() =>
    props.items().reduce((sum, item) => sum + item.price, 0)
  )

  return (
    <div>
      <p>Total: ${total()}</p>
      <For each={sorted()}>
        {item => <div>{item.name}</div>}
      </For>
    </div>
  )
}
```

## Lazy Loading

```tsx
import { lazy } from 'solid-js'

const AdminPanel = lazy(() => import('./AdminPanel'))
const Dashboard = lazy(() => import('./Dashboard'))

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingPage />}>
        <Route path="/admin" component={AdminPanel} />
        <Route path="/dashboard" component={Dashboard} />
      </Suspense>
    </Router>
  )
}
```

## Performance Budget

| Metric | Target |
|--------|--------|
| SolidJS runtime | ~7kB |
| Component JSX output | <1kB each |
| Lazy chunk | <10kB |
| Initial load | <100kB |
| Re-render per signal change | <1ms |

## createEffect Optimization

```tsx
// ❌ Wrong: Effect depends on too many signals
createEffect(() => {
  if (user()) fetchOrders(user().id)
  if (theme()) applyTheme(theme())
})

// ✅ Correct: Split by concern
createEffect(() => {
  if (user()) fetchOrders(user().id)
})
createEffect(() => {
  if (theme()) applyTheme(theme())
})
```
