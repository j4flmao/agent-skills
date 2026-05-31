# Qwik Component Composition

## Overview

Qwik components are built around resumability, lazy loading, and fine-grained reactivity. Component composition in Qwik follows different rules than React or Vue because every `$()` boundary is a lazy-loadable chunk. This reference covers component patterns, context, slots, refs, dynamic rendering, and composition strategies.

## Component Types

### Plain Function Component (No Interactivity)

No `component$()`, no lazy chunk. Pure rendering only.

```tsx
export function Greeting(props: { name: string }) {
  return <p>Hello, {props.name}!</p>
}
```

Use when: the component has no event handlers, no state, no side effects.

### Lazy Component (component$())

```tsx
import { component$, useSignal } from '@builder.io/qwik'

export default component$(() => {
  const count = useSignal(0)
  return <button onClick$={() => count.value++}>{count.value}</button>
})
```

Use when: the component has event handlers, state, or effects. Every `component$()` generates a separate lazy chunk.

### Inline Component

```tsx
// Defined inline, still lazy because it's inside component$
export default component$(() => {
  const Header = component$(() => {
    return <header>Site Header</header>
  })

  return (
    <div>
      <Header />
      <main>Content</main>
    </div>
  )
})
```

## Props Pattern

### Typed Props

```tsx
import { component$, type PropFunction } from '@builder.io/qwik'

interface ButtonProps {
  label: string
  variant?: 'primary' | 'secondary'
  onClick$?: PropFunction<() => void>
  disabled?: boolean
}

export const Button = component$<ButtonProps>((props) => {
  return (
    <button
      class={`btn btn-${props.variant || 'primary'}`}
      onClick$={props.onClick$}
      disabled={props.disabled}
    >
      {props.label}
    </button>
  )
})
```

### Children / Slots

```tsx
import { component$, Slot } from '@builder.io/qwik'

export const Card = component$(() => {
  return (
    <div class="card">
      <div class="card-header">
        <Slot name="header" />
      </div>
      <div class="card-body">
        <Slot />
      </div>
      <div class="card-footer">
        <Slot name="footer" />
      </div>
    </div>
  )
})

// Usage
<Card>
  <span slot="header">Card Title</span>
  <p>This is the main body content that goes into the default slot.</p>
  <div slot="footer">
    <button>Action</button>
  </div>
</Card>
```

## Context API

### Creating and Providing Context

```tsx
import { createContextId, useContextProvider, useContext, component$, Slot } from '@builder.io/qwik'

interface ThemeConfig {
  mode: 'light' | 'dark'
  primaryColor: string
  accentColor: string
}

export const ThemeContext = createContextId<ThemeConfig>('app.theme')

export const RootLayout = component$(() => {
  useContextProvider(ThemeContext, {
    mode: 'dark',
    primaryColor: '#6366f1',
    accentColor: '#f59e0b',
  })

  return <Slot />
})
```

### Consuming Context

```tsx
import { useContext, component$ } from '@builder.io/qwik'
import { ThemeContext } from './root-layout'

export const ThemedButton = component$(() => {
  const theme = useContext(ThemeContext)

  return (
    <button
      style={{
        backgroundColor: theme.primaryColor,
        color: theme.mode === 'dark' ? '#fff' : '#000',
      }}
    >
      Themed Button
    </button>
  )
})
```

### Context with Signals

```tsx
export const CounterContext = createContextId<ReturnType<typeof useSignal>>('app.counter')

export const CounterProvider = component$(() => {
  const count = useSignal(0)
  useContextProvider(CounterContext, count)
  return <Slot />
})

export const CounterDisplay = component$(() => {
  const count = useContext(CounterContext)
  return <p>Count: {count.value}</p>
})

export const CounterButton = component$(() => {
  const count = useContext(CounterContext)
  return <button onClick$={() => count.value++}>Increment</button>
})
```

## Refs and DOM Access

### Element Refs

```tsx
import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik'

export const AutoFocus = component$(() => {
  const inputRef = useSignal<HTMLInputElement>()

  useVisibleTask$(() => {
    inputRef.value?.focus()
  })

  return <input ref={inputRef} type="text" placeholder="Auto-focused" />
})
```

### useRef vs useSignal

`useSignal` wraps values with reactivity. For DOM refs, `useSignal` is used because the ref changes when the element mounts.

```tsx
const element = useSignal<HTMLElement>()
// element.value points to the DOM node after mount
```

## Conditional Rendering

### x-if with template

```tsx
export default component$(() => {
  const show = useSignal(false)

  return (
    <div>
      <button onClick$={() => show.value = !show.value}>Toggle</button>
      {show.value && <p>This content is conditionally rendered</p>}
    </div>
  )
})
```

### List rendering

```tsx
export default component$(() => {
  const items = useSignal(['Apple', 'Banana', 'Cherry'])

  return (
    <ul>
      {items.value.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
})
```

## Dynamic Components

### Component Switcher

```tsx
import { component$, type Component } from '@builder.io/qwik'

const views: Record<string, Component<any>> = {
  list: ListView,
  grid: GridView,
  detail: DetailView,
}

export const ViewSwitcher = component$(() => {
  const currentView = useSignal('list')
  const ViewComponent = views[currentView.value]
  return (
    <div>
      <button onClick$={() => currentView.value = 'list'}>List</button>
      <button onClick$={() => currentView.value = 'grid'}>Grid</button>
      <button onClick$={() => currentView.value = 'detail'}>Detail</button>
      {ViewComponent && <ViewComponent />}
    </div>
  )
})
```

## Advanced Patterns

### Compound Components

```tsx
export const Tabs = component$(() => {
  const activeTab = useSignal(0)

  useContextProvider(TabContext, activeTab)

  return (
    <div class="tabs">
      <Slot name="tabs" />
      <Slot name="panels" />
    </div>
  )
})

export const Tab = component$<{ index: number; label: string }>((props) => {
  const activeTab = useContext(TabContext)

  return (
    <button
      class={{ active: activeTab.value === props.index }}
      onClick$={() => activeTab.value = props.index}
    >
      {props.label}
    </button>
  )
})

export const TabPanel = component$<{ index: number }>((props) => {
  const activeTab = useContext(TabContext)

  return (
    <div style={{ display: activeTab.value === props.index ? 'block' : 'none' }}>
      <Slot />
    </div>
  )
})
```

### Render Props Pattern

```tsx
interface ListProps<T> {
  items: T[]
  renderItem$: PropFunction<(item: T, index: number) => JSXElement>
}

export const List = component$<ListProps<any>>((props) => {
  return (
    <div class="list">
      {props.items.map((item, index) => (
        <div key={index} class="list-item">
          {props.renderItem$(item, index)}
        </div>
      ))}
    </div>
  )
})

// Usage
<List
  items={users.value}
  renderItem$={(user) => <span>{user.name} - {user.email}</span>}
/>
```

### Higher-Order Component Pattern

```tsx
import { component$, type Component, type PropsOf } from '@builder.io/qwik'

function withLogger<T extends Record<string, any>>(
  WrappedComponent: Component<T>
): Component<T> {
  return component$<T>((props) => {
    console.log('Rendering with props:', props)
    return <WrappedComponent {...props} />
  })
}

const LoggedButton = withLogger(Button)
```

### Async Component

```tsx
export default component$(() => {
  const data = useSignal<any>(null)
  const loading = useSignal(true)

  useVisibleTask$(async () => {
    data.value = await fetchData()
    loading.value = false
  })

  if (loading.value) return <div>Loading...</div>
  return <div>{JSON.stringify(data.value)}</div>
})
```

## Styling

### CSS Modules

```css
/* button.module.css */
.button {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
}

.primary {
  background: var(--color-primary);
  color: white;
}
```

```tsx
import styles from './button.module.css'

export const Button = component$<ButtonProps>((props) => {
  return (
    <button class={`${styles.button} ${styles[props.variant || 'primary']}`}>
      {props.label}
    </button>
  )
})
```

### Inline Styles

```tsx
export const StyledBox = component$((props: { color: string }) => {
  return (
    <div style={{ backgroundColor: props.color, padding: '16px', borderRadius: '8px' }}>
      <Slot />
    </div>
  )
})
```

## Resource Management

### useResource$()

```tsx
import { component$, useResource$, Resource } from '@builder.io/qwik'

export const UserProfile = component$(() => {
  const userResource = useResource$<User>(async ({ track, cleanup }) => {
    const controller = new AbortController()
    cleanup(() => controller.abort())

    const response = await fetch('/api/user', { signal: controller.signal })
    return response.json()
  })

  return (
    <Resource
      value={userResource}
      onPending={() => <div>Loading...</div>}
      onRejected={(error) => <div>Error: {error.message}</div>}
      onResolved={(user) => (
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      )}
    />
  )
})
```

### useResource$ with Tracking

```tsx
export const SearchResults = component$(() => {
  const query = useSignal('')
  const debouncedQuery = useDebounce$(query, 300)

  const resultsResource = useResource$<Result[]>(async ({ track, cleanup }) => {
    const searchTerm = track(() => debouncedQuery.value)
    if (searchTerm.length < 2) return []

    const controller = new AbortController()
    cleanup(() => controller.abort())

    const res = await fetch(`/api/search?q=${searchTerm}`, { signal: controller.signal })
    return res.json()
  })

  return (
    <div>
      <input bind:value={query} />
      <Resource
        value={resultsResource}
        onPending={() => <div>Searching...</div>}
        onResolved={(results) => (
          <ul>
            {results.map(r => <li key={r.id}>{r.title}</li>)}
          </ul>
        )}
      />
    </div>
  )
})
```

## Task and Effect Patterns

### useTask$()

```tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik'

export const AutoSave = component$(() => {
  const content = useSignal('')

  useTask$(({ track, cleanup }) => {
    const value = track(() => content.value)

    const timeout = setTimeout(async () => {
      await fetch('/api/save', { method: 'POST', body: value })
    }, 1000)

    cleanup(() => clearTimeout(timeout))
  })

  return (
    <textarea bind:value={content} placeholder="Type something..." />
  )
})
```

### useVisibleTask$ vs useTask$

| Hook | Runs On | Use Case |
|------|---------|----------|
| `useTask$` | Server + Client | Data transformations, reactive effects |
| `useVisibleTask$` | Client only (when visible) | DOM APIs, analytics, third-party scripts |

## Event Handling

### Event Modifiers

```tsx
// Prevent default
<button onClick$:prevent={(event) => handleClick(event)}>Click</button>
<form onSubmit$:prevent={(event) => handleSubmit(event)}>...</form>

// Stop propagation
<div onClick$:stop={(event) => handleDivClick(event)}>
  <button onClick$={(event) => handleButtonClick(event)}>Click</button>
</div>

// Window events
<button onWindow:scroll$={() => console.log('window scrolled')}>Track</button>

// Document events
<button onDocument:keydown$={(event) => console.log(event.key)}>Key</button>
```

### Custom Events

```tsx
export const Toast = component$(() => {
  return (
    <div
      onToastShow$={(event: CustomEvent<{ message: string }>) => {
        console.log(event.detail.message)
      }}
    >
      <Slot />
    </div>
  )
})

// Dispatch custom event
function triggerToast(element: HTMLElement, message: string) {
  element.dispatchEvent(new CustomEvent('toast-show', { detail: { message } }))
}
```

## Performance Optimizations

### Lazy Loading Dependencies

```tsx
export const ChartWidget = component$(() => {
  const ChartComponent = useSignal<Component<any>>()

  useVisibleTask$(async () => {
    const { Chart } = await import('./heavy-chart-library')
    ChartComponent.value = Chart
  })

  return (
    <div>
      {ChartComponent.value && <ChartComponent.value />}
    </div>
  )
})
```

### Memoization

```tsx
import { component$, useComputed$, useSignal } from '@builder.io/qwik'

export const FilteredList = component$((props: { items: Item[] }) => {
  const filter = useSignal('')

  const filtered = useComputed$(() =>
    props.items.filter(item =>
      item.name.toLowerCase().includes(filter.value.toLowerCase())
    )
  )

  return (
    <div>
      <input bind:value={filter} placeholder="Filter..." />
      <ul>
        {filtered.value.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  )
})
```

### NoSerialize for Non-Serializable Data

```tsx
import { component$, useSignal, NoSerialize, useVisibleTask$ } from '@builder.io/qwik'

export const MapView = component$(() => {
  const mapRef = useSignal<NoSerialize<google.maps.Map>>()

  useVisibleTask$(async () => {
    const { Map } = await google.maps.importLibrary('maps')
    mapRef.value = new Map(document.getElementById('map'), {
      center: { lat: 0, lng: 0 },
      zoom: 8,
    }) as NoSerialize<google.maps.Map>
  })

  return <div id="map" style={{ width: '100%', height: '400px' }} />
})
```

## Error Handling

### Error Boundaries

```tsx
export const ErrorBoundary = component$(() => {
  const error = useSignal<Error | null>(null)

  return (
    <div>
      {error.value ? (
        <div class="error">
          <h2>Something went wrong</h2>
          <p>{error.value.message}</p>
          <button onClick$={() => error.value = null}>Retry</button>
        </div>
      ) : (
        <Slot />
      )}
    </div>
  )
})
```

## Integration Patterns

### Third-Party Library Wrapper

```tsx
import { component$, useSignal, useVisibleTask$, type NoSerialize } from '@builder.io/qwik'
import type Swiper from 'swiper'

interface CarouselProps {
  images: string[]
  loop?: boolean
}

export const Carousel = component$<CarouselProps>((props) => {
  const containerRef = useSignal<HTMLDivElement>()
  const swiper = useSignal<NoSerialize<Swiper>>()

  useVisibleTask$(async () => {
    const { default: SwiperLib } = await import('swiper')
    if (containerRef.value) {
      swiper.value = new SwiperLib(containerRef.value, {
        loop: props.loop ?? true,
      }) as NoSerialize<Swiper>
    }
  })

  return (
    <div ref={containerRef} class="swiper">
      <div class="swiper-wrapper">
        {props.images.map((src, i) => (
          <div key={i} class="swiper-slide">
            <img src={src} alt="" />
          </div>
        ))}
      </div>
    </div>
  )
})
```

### Debounce Utility

```tsx
import { useSignal, useTask$ } from '@builder.io/qwik'

export function useDebounce$(signal: ReturnType<typeof useSignal<string>>, delay: number) {
  const debounced = useSignal('')

  useTask$(({ track, cleanup }) => {
    const value = track(() => signal.value)
    const timer = setTimeout(() => { debounced.value = value }, delay)
    cleanup(() => clearTimeout(timer))
  })

  return debounced
}
```
