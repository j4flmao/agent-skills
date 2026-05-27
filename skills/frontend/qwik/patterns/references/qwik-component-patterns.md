# Qwik Component Patterns

## Composable Components

```typescript
import { component$, Slot, useStyles$ } from '@builder.io/qwik'

interface TabsProps {
  tabs: { label: string; value: string }[]
  selected: string
  onSelect$: (value: string) => void
}

export const Tabs = component$<TabsProps>(({ tabs, selected, onSelect$ }) => {
  return (
    <div class="tabs" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={tab.value === selected}
          class={tab.value === selected ? 'active' : ''}
          onClick$={() => onSelect$(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
})

export const TabPanel = component$(({ value, children }: {
  value: string
  children?: any
}) => {
  return (
    <div role="tabpanel" data-value={value}>
      {children}
    </div>
  )
})
```

## Context for Shared State

```typescript
import {
  createContextId, useContextProvider, useContext,
  component$, Slot,
} from '@builder.io/qwik'

interface ThemeContext {
  theme: 'light' | 'dark'
  toggle: () => void
}

export const ThemeContextId = createContextId<ThemeContext>('theme')

export const ThemeProvider = component$(() => {
  const theme = useSignal<'light' | 'dark'>('light')

  useContextProvider(ThemeContextId, {
    get theme() { return theme.value },
    toggle: $(() => {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
    }),
  })

  return <Slot />
})

export const ThemedButton = component$(() => {
  const themeCtx = useContext(ThemeContextId)

  return (
    <button
      class={`btn btn-${themeCtx.theme}`}
      onClick$={themeCtx.toggle}
    >
      Toggle Theme ({themeCtx.theme})
    </button>
  )
})
```

## Optimistic Updates

```typescript
import { component$, $, useSignal } from '@builder.io/qwik'

export const LikeButton = component$(({ postId, initialLikes }: {
  postId: string
  initialLikes: number
}) => {
  const likes = useSignal(initialLikes)
  const isPending = useSignal(false)

  const handleLike = $(async () => {
    const previous = likes.value
    likes.value++
    isPending.value = true

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      likes.value = data.likes
    } catch {
      likes.value = previous
    } finally {
      isPending.value = false
    }
  })

  return (
    <button onClick$={handleLike} disabled={isPending.value}>
      {isPending.value ? '...' : '♥'} {likes.value}
    </button>
  )
})
```

## Key Points

- Use component$ for resumable component definitions
- Use $() to create lazy-loadable closures
- Use useSignal for primitive reactive values
- Use useStore for complex objects and arrays
- Use useContext for shared state scoped to component tree
- Use Slot for component composition
- Use useVisibleTask$ for browser-only side effects
- Use useResource$ for server-side data with cleanup
- Implement optimistic updates with rollback
- Use createContextId for typed context identifiers
- Use inline components for small, local components
- Use useStyles$ for scoped CSS imports
