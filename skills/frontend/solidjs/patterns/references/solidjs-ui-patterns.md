# SolidJS Patterns

## Render Props Pattern

```typescript
import { Component, JSX, children } from 'solid-js'

interface DataFetcherProps<T> {
  url: string
  fallback?: JSX.Element
  children: (data: () => T | undefined) => JSX.Element
}

function DataFetcher<T>(props: DataFetcherProps<T>) {
  const [data] = createResource(() => props.url, async (url) => {
    const res = await fetch(url)
    return res.json() as T
  })

  return (
    <Suspense fallback={props.fallback || <div>Loading...</div>}>
      {props.children(data)}
    </Suspense>
  )
}

function UsersPage() {
  return (
    <DataFetcher url="/api/users">
      {users => (
        <ul>
          <For each={users()}>
            {user => <li>{user.name}</li>}
          </For>
        </ul>
      )}
    </DataFetcher>
  )
}
```

## Controlled Inputs

```typescript
function SearchInput() {
  const [value, setValue] = createSignal('')
  const [debounced, setDebounced] = createSignal('')

  createEffect(() => {
    const timer = setTimeout(() => setDebounced(value()), 300)
    return () => clearTimeout(timer)
  })

  createResource(() => debounced(), async (query) => {
    if (!query) return []
    const res = await fetch(`/api/search?q=${query}`)
    return res.json()
  })

  return (
    <div>
      <input
        type="text"
        value={value()}
        onInput={e => setValue(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={() => setValue('')}>Clear</button>
    </div>
  )
}
```

## Directive Pattern

```typescript
import { Directive } from 'solid-js'

function clickOutside(el: HTMLElement, accessor: () => () => void) {
  const handler = (e: MouseEvent) => {
    if (!el.contains(e.target as Node)) {
      accessor()()
    }
  }
  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
}

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      clickOutside: () => void
    }
  }
}

function Dropdown() {
  const [isOpen, setIsOpen] = createSignal(false)

  return (
    <div use:clickOutside={() => setIsOpen(false)}>
      <button onClick={() => setIsOpen(!isOpen())}>Toggle</button>
      <Show when={isOpen()}>
        <div class="dropdown-menu">{/* items */}</div>
      </Show>
    </div>
  )
}
```

## Key Points

- Use render props for reusable data fetching patterns
- Implement controlled inputs with createSignal
- Use directives for DOM behavior encapsulation
- Leverage createResource for automatic cache management
- Use splitProps for clean prop separation
- Implement custom directives for reusable DOM logic
- Use createEffect for side effects with auto-tracking
- Use onMount for initialization code
- Use onCleanup for resource cleanup
- Use batch for grouping signal updates
- Avoid mutable variable references in JSX
- Use TypeScript for type-safe component APIs
