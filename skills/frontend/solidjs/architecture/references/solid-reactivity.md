# SolidJS Reactivity — Signals, Memos, Effects, Stores, Batching

## Signals — Basic Reactivity

```tsx
import { createSignal } from 'solid-js'

const [count, setCount] = createSignal(0)

// Read (tracked in reactive context)
console.log(count())        // 0

// Set directly
setCount(5)

// Set with function
setCount(prev => prev + 1)

// Signals are lazy — computation happens only when read
```

## Memos — Derived Values

```tsx
import { createSignal, createMemo } from 'solid-js'

const [firstName, setFirstName] = createSignal('John')
const [lastName, setLastName] = createSignal('Doe')

// Memo caches and updates only when dependencies change
const fullName = createMemo(() => `${firstName()} ${lastName()}`)

// Use createMemo for ALL derived state — NOT createEffect
console.log(fullName()) // "John Doe"
```

## Effects — Side Effects

```tsx
import { createSignal, createEffect } from 'solid-js'

const [count, setCount] = createSignal(0)

// Runs after DOM updates, tracks signals read inside
createEffect(() => {
  console.log(`Count is: ${count()}`)
})

// Cleanup function
createEffect(() => {
  const id = setInterval(() => console.log(count()), 1000)
  onCleanup(() => clearInterval(id))
})
```

## createStore — Deep Reactive Objects

```tsx
import { createStore } from 'solid-js/store'

const [state, setState] = createStore({
  user: { name: 'Alice', address: { city: 'NYC' } },
  items: [],
})

// Path syntax — updates only the targeted path
setState('user', 'name', 'Bob')
setState('user', 'address', 'city', 'Brooklyn')

// Function updater
setState('items', items => [...items, { id: 1 }])

// Merge
setState({ user: { name: 'Charlie' } })

// Nested array update
setState('items', 0, 'completed', true)
```

## createMutable — Mutable-Style Store

```tsx
import { createMutable } from 'solid-js/store'

const state = createMutable({
  count: 0,
  items: [] as string[],
})

// Direct mutation — triggers updates automatically
state.count++
state.items.push('new item')
```

## Batching

```tsx
import { batch } from 'solid-js'

// Batch prevents unnecessary notifications
batch(() => {
  setCount(c => c + 1)
  setCount(c => c + 1)
  setName('Updated')
})
// Effect runs once after batch completes
```

## onMount & onCleanup

```tsx
import { onMount, onCleanup } from 'solid-js'

onMount(() => {
  const el = document.getElementById('my-el')
  // DOM is available
})

onCleanup(() => {
  // Cleanup runs on component unmount or effect re-run
})
```

## createRenderEffect

```tsx
import { createRenderEffect } from 'solid-js'

// Runs before DOM update — useful for DOM measurements
createRenderEffect(() => {
  // This runs synchronously before DOM paint
  console.log(`Count will be: ${count()}`)
})
```
