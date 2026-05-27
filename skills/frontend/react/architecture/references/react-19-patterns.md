# React 19 Patterns

## Actions and useActionState

```typescript
'use client'

import { useActionState } from 'react'

interface FormState {
  message: string
  errors?: Record<string, string[]>
  success?: boolean
}

async function submitUser(prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name')
  const email = formData.get('email')

  if (!name || !email) {
    return { message: 'Validation failed', errors: { name: ['Required'] } }
  }

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed')
    return { message: 'User created', success: true }
  } catch {
    return { message: 'Server error' }
  }
}

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(submitUser, {
    message: '',
  })

  return (
    <form action={formAction}>
      <input name="name" required />
      {state.errors?.name && <p className="error">{state.errors.name[0]}</p>}
      <input name="email" type="email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  )
}
```

## use and Suspense

```typescript
import { use, Suspense } from 'react'

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

function UserDetails({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}

export function UserProfile({ id }: { id: string }) {
  const userPromise = fetchUser(id)

  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserDetails userPromise={userPromise} />
    </Suspense>
  )
}
```

## Server Components

```typescript
// app/users/UserList.server.tsx
import db from '@/lib/db'

export async function UserList() {
  const users = await db.query.users.findMany()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {users.map(user => (
        <div key={user.id} className="p-4 border rounded-lg">
          <h3 className="font-semibold">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
        </div>
      ))}
    </div>
  )
}
```

## Optimistic Updates

```typescript
'use client'

import { useOptimistic, useRef } from 'react'

interface Message {
  id: string
  text: string
  status: 'sending' | 'sent' | 'failed'
}

export function MessageList({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, addOptimisticMessage] = useOptimistic(
    initialMessages,
    (state, newMessage: Message) => [...state, newMessage],
  )
  const formRef = useRef<HTMLFormElement>(null)

  async function formAction(formData: FormData) {
    const text = formData.get('message') as string
    const optimisticId = crypto.randomUUID()

    addOptimisticMessage({
      id: optimisticId,
      text,
      status: 'sending',
    })

    formRef.current?.reset()

    try {
      await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
    } catch {
      console.error('Failed to send message')
    }
  }

  return (
    <div>
      <form ref={formRef} action={formAction}>
        <input name="message" required />
        <button type="submit">Send</button>
      </form>
      <ul>
        {messages.map(msg => (
          <li key={msg.id} className={msg.status === 'sending' ? 'opacity-50' : ''}>
            {msg.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Key Points

- Use useActionState for form handling with pending states
- Use the use() hook for reading promise values in components
- Combine use() with Suspense for async data loading
- Use useOptimistic for instant UI updates during mutations
- Implement Server Components for data fetching on the server
- Use 'use client' directive for interactive components
- Leverage React 19's improved concurrent features
- Use refs as props for parent-controlled focus management
- Implement proper error boundaries for error recovery
- Use the new context API improvements for performance
- Migrate from forwardRef to ref as a prop
- Use the new useFormStatus for form state tracking
