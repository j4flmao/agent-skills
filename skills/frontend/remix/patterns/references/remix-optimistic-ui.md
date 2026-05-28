# Remix Optimistic UI

## Introduction

Optimistic UI is the practice of updating the user interface immediately after a user action, before the server confirms the change. If the server rejects the update, the UI rolls back to the previous state. Remix's `useFetcher` and `<Form>` components make optimistic UI natural because the framework tracks the pending form data automatically.

## How Optimistic UI Works in Remix

### Core Mechanism

1. User performs an action (click like, add item, submit form)
2. Remix immediately updates the UI using the submitted form data
3. The action runs on the server
4. On success: loaders revalidate, UI updates with server data
5. On failure: UI rolls back to pre-action state

### Why Remix Makes Optimistic UI Easier

- `fetcher.formData` contains the pending submission
- Remix tracks submission state automatically (submitting, loading, idle)
- Loaders revalidate after action completes
- No need for manual cache management or state synchronization

## useFetcher Patterns

### Basic Optimistic Toggle

```tsx
// app/routes/api.like.ts — resource route
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const postId = formData.get('postId') as string
  const liked = formData.get('liked') === 'true'

  // Simulate server processing
  await new Promise(resolve => setTimeout(resolve, 500))

  if (Math.random() > 0.9) {
    return json({ error: 'Failed to update like' }, { status: 500 })
  }

  await db.post.update({
    where: { id: postId },
    data: { likes: liked ? { increment: 1 } : { decrement: 1 } },
  })

  const post = await db.post.findUnique({ where: { id: postId } })
  return json({ likes: post!.likes })
}
```

```tsx
// app/components/LikeButton.tsx
import { useFetcher } from '@remix-run/react'

interface LikeButtonProps {
  postId: string
  initialLiked: boolean
  initialLikes: number
}

export function LikeButton({ postId, initialLiked, initialLikes }: LikeButtonProps) {
  const fetcher = useFetcher()

  // Use optimistic data if available
  const optimisticLiked = fetcher.formData
    ? fetcher.formData.get('liked') === 'true'
    : initialLiked

  const optimisticLikes = fetcher.formData
    ? initialLikes + (optimisticLiked ? 1 : -1)
    : initialLikes

  // Check for error
  const hasError = fetcher.data?.error != null

  return (
    <fetcher.Form method="post" action="/api/like">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="liked" value={String(!optimisticLiked)} />
      <button
        type="submit"
        className={cn(
          'like-button',
          optimisticLiked && 'liked',
          hasError && 'error'
        )}
        disabled={fetcher.state !== 'idle'}
      >
        {optimisticLiked ? 'Unlike' : 'Like'} ({optimisticLikes})
      </button>
    </fetcher.Form>
  )
}
```

### Optimistic Add to Cart

```tsx
// app/routes/api.cart.ts
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const productId = formData.get('productId') as string
  const quantity = Number(formData.get('quantity')) || 1

  const session = await getSession(request.headers.get('Cookie'))
  const cart = session.get('cart') ?? []

  const existing = cart.find((item: any) => item.productId === productId)
  if (existing) {
    existing.quantity += quantity
  } else {
    cart.push({ productId, quantity })
  }

  session.set('cart', cart)

  return json(
    { cart },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  )
}
```

```tsx
// app/components/AddToCartButton.tsx
import { useFetcher } from '@remix-run/react'

interface AddToCartButtonProps {
  productId: string
  productName: string
  price: number
}

export function AddToCartButton({ productId, productName, price }: AddToCartButtonProps) {
  const fetcher = useFetcher()
  const isPending = fetcher.state !== 'idle'

  // Show optimistic quantity
  const optimisticQuantity = fetcher.formData
    ? Number(fetcher.formData.get('quantity')) || 1
    : 1

  return (
    <div>
      <fetcher.Form method="post" action="/api/cart">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="quantity" value={1} />
        <button
          type="submit"
          disabled={isPending}
          className="add-to-cart-btn"
        >
          {isPending ? 'Adding...' : 'Add to Cart'}
        </button>
      </fetcher.Form>

      {/* Optimistic feedback */}
      {isPending && (
        <div className="optimistic-feedback">
          Added {optimisticQuantity} x {productName} to cart
        </div>
      )}
    </div>
  )
}
```

### Optimistic Item Deletion

```tsx
// app/components/ItemList.tsx
import { useFetcher } from '@remix-run/react'
import { useRef, useState } from 'react'

interface Item {
  id: string
  title: string
}

export function ItemList({ items: initialItems }: { items: Item[] }) {
  const fetcher = useFetcher()
  const [optimisticItems, setOptimisticItems] = useState(initialItems)

  // Track last deleted item for rollback
  const lastDeletedRef = useRef<Item | null>(null)

  // Sync with server data when not submitting
  if (fetcher.state === 'idle' && fetcher.data) {
    const serverItems = fetcher.data.items
    if (serverItems && !optimisticItems.every((item, i) =>
      item.id === serverItems[i]?.id
    )) {
      setOptimisticItems(serverItems)
    }
  }

  function handleDelete(item: Item) {
    lastDeletedRef.current = item
    // Optimistically remove
    setOptimisticItems(prev => prev.filter(i => i.id !== item.id))
  }

  return (
    <ul>
      {optimisticItems.map(item => (
        <li key={item.id}>
          <span>{item.title}</span>
          <fetcher.Form
            method="post"
            action="/api/delete-item"
            onSubmit={() => handleDelete(item)}
          >
            <input type="hidden" name="itemId" value={item.id} />
            <button type="submit">Delete</button>
          </fetcher.Form>
        </li>
      ))}
    </ul>
  )
}
```

## Form-Based Optimistic UI

### Inline Editing

```tsx
// app/routes/dashboard.settings.tsx
import { Form, useActionData, useNavigation } from '@remix-run/react'

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const name = formData.get('name') as string

  if (name.length < 2) {
    return json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }

  await db.user.update({
    where: { id: getUserId(request) },
    data: { name },
  })

  return json({ success: true, name })
}

export default function Settings() {
  const navigation = useNavigation()
  const actionData = useActionData<typeof action>()

  // Optimistic value — show submitted value while processing
  const optimisticName = navigation.formData
    ? navigation.formData.get('name') as string
    : actionData?.name ?? 'User'

  return (
    <Form method="post">
      <div>
        <label>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={optimisticName}
          key={optimisticName} // Re-render when optimistic value changes
        />
        {actionData?.error && <p className="error">{actionData.error}</p>}
      </div>

      <button type="submit" disabled={navigation.state === 'submitting'}>
        {navigation.state === 'submitting' ? 'Saving...' : 'Save'}
      </button>

      {navigation.state === 'submitting' && (
        <span className="optimistic-indicator">Saving changes...</span>
      )}
    </Form>
  )
}
```

### Multi-Intent Form with Optimistic UI

```tsx
// app/routes/todos.tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'add') {
    const title = formData.get('title') as string
    await db.todo.create({ data: { title, completed: false } })
  } else if (intent === 'toggle') {
    const id = formData.get('id') as string
    const completed = formData.get('completed') === 'true'
    await db.todo.update({ where: { id }, data: { completed } })
  } else if (intent === 'delete') {
    const id = formData.get('id') as string
    await db.todo.delete({ where: { id } })
  }

  return redirect('/todos')
}

export default function Todos() {
  const navigation = useNavigation()
  const fetcher = useFetcher()

  // Determine what's happening right now
  const isAdding = navigation.formData?.get('intent') === 'add'
  const optimisticTitle = navigation.formData?.get('title') as string || ''

  return (
    <div>
      <Form method="post">
        <input type="hidden" name="intent" value="add" />
        <input type="text" name="title" placeholder="New todo" />
        <button type="submit">Add</button>
      </Form>

      {/* Show optimistic new item */}
      {isAdding && (
        <div className="todo-item optimistic">
          <span>{optimisticTitle}</span>
          <span className="badge">Saving...</span>
        </div>
      )}
    </div>
  )
}
```

## Optimistic UI with Error Handling

### Rollback on Error

```tsx
export function LikeButtonWithRollback({ postId, initialLiked, initialLikes }: Props) {
  const fetcher = useFetcher()
  const [localError, setLocalError] = useState<string | null>(null)

  const optimisticLiked = fetcher.formData
    ? fetcher.formData.get('liked') === 'true'
    : initialLiked

  const optimisticLikes = fetcher.formData
    ? initialLikes + (optimisticLiked ? 1 : -1)
    : initialLikes

  // Handle error from server
  useEffect(() => {
    if (fetcher.data?.error) {
      setLocalError(fetcher.data.error)
      // Auto-dismiss error after 3 seconds
      const timer = setTimeout(() => setLocalError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [fetcher.data])

  return (
    <div>
      <fetcher.Form method="post" action="/api/like">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="liked" value={String(!optimisticLiked)} />
        <button
          type="submit"
          className={cn(
            'like-button',
            optimisticLiked && 'liked',
            localError && 'error'
          )}
        >
          {optimisticLiked ? 'Unlike' : 'Like'} ({optimisticLikes})
        </button>
      </fetcher.Form>

      {localError && (
        <div className="error-toast">
          Failed to update. Your change has been reverted.
          <button onClick={() => setLocalError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  )
}
```

### Preventing Double Submissions

```tsx
export function SafeForm() {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== 'idle'

  return (
    <fetcher.Form method="post" action="/api/submit">
      <input type="text" name="data" />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </fetcher.Form>
  )
}
```

## Advanced Optimistic Patterns

### Pattern 1: Debounced Optimistic Updates

For inputs that trigger server-side processing (search, autocomplete):

```tsx
export function SearchInput() {
  const fetcher = useFetcher()
  const [localQuery, setLocalQuery] = useState('')
  const debouncedQuery = useRef<string>('')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== debouncedQuery.current) {
        debouncedQuery.current = localQuery
        const formData = new FormData()
        formData.append('query', localQuery)
        fetcher.submit(formData, { method: 'post', action: '/api/search' })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localQuery])

  // Optimistic results show immediately
  const optimisticResults = localQuery
    ? localResultsCache.filter(r => r.name.includes(localQuery))
    : fetcher.data?.results ?? []

  return (
    <div>
      <input
        type="text"
        value={localQuery}
        onChange={e => setLocalQuery(e.target.value)}
        placeholder="Search..."
      />
      <ul>
        {optimisticResults.map(result => (
          <li key={result.id}>{result.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Pattern 2: Batch Optimistic Updates

```tsx
export function BulkAction({ selectedIds }: { selectedIds: string[] }) {
  const fetcher = useFetcher()
  const isProcessing = fetcher.state !== 'idle'

  // Show optimistic state for all selected items
  const optimisticIds = isProcessing
    ? selectedIds
    : fetcher.data?.completedIds ?? []

  return (
    <fetcher.Form method="post" action="/api/bulk-action">
      {selectedIds.map(id => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <button type="submit" disabled={isProcessing}>
        {isProcessing
          ? `Processing ${selectedIds.length} items...`
          : `Process ${selectedIds.length} items`}
      </button>

      {optimisticIds.length > 0 && (
        <div>Completed: {optimisticIds.length}/{selectedIds.length}</div>
      )}
    </fetcher.Form>
  )
}
```

### Pattern 3: Optimistic Reordering

```tsx
export function SortableList({ items: initialItems }: { items: Item[] }) {
  const fetcher = useFetcher()
  const [items, setItems] = useState(initialItems)
  const dragItem = useRef<number | null>(null)

  function handleDrop(index: number) {
    if (dragItem.current === null) return
    const newItems = [...items]
    const [removed] = newItems.splice(dragItem.current, 1)
    newItems.splice(index, 0, removed)
    setItems(newItems)

    // Submit new order
    const formData = new FormData()
    formData.append('intent', 'reorder')
    newItems.forEach((item, i) => {
      formData.append('ids', item.id)
    })
    fetcher.submit(formData, { method: 'post', action: '/api/reorder' })
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => { dragItem.current = index }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
        >
          {item.title}
        </li>
      ))}
    </ul>
  )
}
```

## Performance Considerations

### Optimistic Update Cost

| Factor | Impact | Mitigation |
|--------|--------|------------|
| Re-render on formData change | All consumers re-render | Memoize child components |
| Large formData | Memory for pending data | Keep formData minimal |
| Frequent submissions | Re-render on each | Debounce rapid submissions |
| Complex rollback UI | UX complexity | Simple error messages |

### When NOT to Use Optimistic UI

- Financial transactions (payments, transfers)
- Critical data mutations (user deletion, irreversible changes)
- Multi-step workflows with validation
- When server is the source of truth for display formatting

## Testing Optimistic UI

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRemixStub } from '@remix-run/testing'
import { LikeButton } from './LikeButton'

describe('LikeButton', () => {
  it('shows optimistic state on click', async () => {
    const RemixStub = createRemixStub([
      {
        path: '/',
        Component: () => (
          <LikeButton postId="1" initialLiked={false} initialLikes={10} />
        ),
        action: () => ({ likes: 11 }),
      },
    ])

    render(<RemixStub />)
    const button = screen.getByRole('button')

    // Initial state
    expect(button).toHaveTextContent('Like (10)')

    // Click — optimistic update
    await userEvent.click(button)
    expect(button).toHaveTextContent('Unlike (11)')
  })
})
```

## Summary

| Pattern | useFetcher | Form | Best For |
|---------|------------|------|----------|
| Toggle | Yes | No | Likes, stars, follows |
| Add to cart | Yes | No | E-commerce |
| Inline edit | No | Yes | Settings, profiles |
| Delete item | Yes | Yes | List management |
| Bulk action | Yes | No | Batch operations |
| Reorder | Yes | No | Drag and drop |
| Search | Yes | No | Autocomplete |
| Multi-intent | No | Yes | Complex forms |
| Debounced | Yes | No | Real-time validation |
