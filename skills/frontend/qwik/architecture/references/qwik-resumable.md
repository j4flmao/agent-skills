# Qwik Resumability — Resumability, Serialization, Dollar API, Fine-Grained Lazy

## Resumability Model

No hydration. HTML is fully functional without JavaScript:

```tsx
// Qwik serializes application state into HTML
// On page load, event handlers are restored lazily
// The browser picks up where the server left off — no replay

export default component$(() => {
  const count = useSignal(0)

  return (
    <button onClick$={() => count.value++}>
      {count.value}
    </button>
  )
})
// HTML includes: <button>0</button>
// Plus serialized state in <script> tags
// Plus lazy-loading event handlers
```

## Dollar Sign API

The `$` suffix marks lazy-loaded boundaries:

```tsx
import { component$, useSignal, $ } from '@builder.io/qwik'

// component$ — lazy-loaded component
export default component$(() => {
  const name = useSignal('World')

  // $() — lazy-loaded closure
  const greet = $((greeting: string) => {
    alert(`${greeting}, ${name.value}!`)
  })

  // onClick$ — lazy event handler
  return (
    <button onClick$={() => greet('Hello')}>
      Greet {name.value}
    </button>
  )
})
```

### Key Dollar APIs

| API | Purpose |
|-----|---------|
| `component$()` | Lazy component |
| `$()` | Lazy closure |
| `onClick$()` | Lazy event handler |
| `useVisibleTask$()` | Lazy client-side effect |
| `routeLoader$()` | Lazy server data loader |
| `routeAction$()` | Lazy server action |

## Serialization

State is serialized into HTML and restored on client:

```tsx
// Server sends this state in HTML:
// <script>window._qrl=['count',0]</script>

const count = useSignal(0)
// count is automatically serialized and restored
// No hydration needed to access count at runtime
```

### What Can Be Serialized

- Primitives, plain objects, arrays
- Dates (ISO strings)
- Promises (for streaming)
- URLs
- QRLs (lazy references to closures)

## Fine-Grained Lazy Loading

Each event handler and component loads independently:

```tsx
export default component$(() => {
  return (
    <div>
      <Counter />         {/* loads only when Counter is needed */}
      <ExpensiveChart />  {/* loads only when ExpensiveChart is needed */}
      <button onClick$={async () => {
        // Loads only on click
        const { analytics } = await import('./analytics')
        analytics.track('click')
      }}>
        Track
      </button>
    </div>
  )
})
```

## useVisibleTask$

```tsx
import { useVisibleTask$ } from '@builder.io/qwik'

export default component$(() => {
  useVisibleTask$(() => {
    // Runs when component becomes visible
    // Similar to useEffect but lazy
    console.log('Component visible')
  })

  useVisibleTask$(
    () => {
      // Runs only once
    },
    { strategy: 'document-ready' }
  )
  // Strategies: 'document-ready' | 'document-idle' | 'visible'
})
```

## useSignal vs useStore

```tsx
import { useSignal, useStore } from '@builder.io/qwik'

// Primitive values
const count = useSignal(0)
count.value = 1

// Objects
const user = useStore({ name: 'Alice', age: 30 })
user.name = 'Bob'  // Direct mutation — proxied
```
