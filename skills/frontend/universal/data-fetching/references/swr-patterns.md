# SWR Patterns

## Basic SWR Setup

```typescript
import useSWR, { SWRConfig } from 'swr'
import useSWRMutation from 'swr/mutation'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.')
    error.status = response.status
    throw error
  }
  return response.json()
}

function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      fetcher,
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      errorRetryCount: 3,
      revalidateIfStale: false,
    }}>
      {children}
    </SWRConfig>
  )
}
```

## Data Mutations

```typescript
interface User {
  id: string
  name: string
  email: string
}

async function updateUser(url: string, { arg }: { arg: Partial<User> }) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  if (!response.ok) throw new Error('Failed to update')
  return response.json()
}

function useUpdateUser(id: string) {
  const { trigger, isMutating, error } = useSWRMutation(
    `/api/users/${id}`,
    updateUser,
  )

  return {
    updateUser: async (data: Partial<User>) => {
      const result = await trigger(data, {
        optimisticData: data,
        rollbackOnError: true,
      })
      return result
    },
    isLoading: isMutating,
    error,
  }
}

function useCreateUser() {
  const { trigger } = useSWRMutation('/api/users', async (url, { arg }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arg),
    })
    return response.json()
  })

  return { createUser: trigger }
}
```

## Dependent Fetching

```typescript
function useUserWithPosts(userId: string | null) {
  const { data: user, error: userError } = useSWR(
    userId ? `/api/users/${userId}` : null,
    fetcher,
  )

  const { data: posts, error: postsError } = useSWR(
    user ? `/api/users/${user.id}/posts` : null,
    fetcher,
  )

  return {
    user,
    posts,
    isLoading: !user && !userError,
    error: userError || postsError,
  }
}
```

## Prefetching

```typescript
import { useRouter } from 'next/router'
import { useEffect } from 'react'

function prefetchUser(id: string) {
  const cacheKey = `/api/users/${id}`
  const cached = cache.get(cacheKey)
  if (!cached) {
    cache.set(cacheKey, fetcher(cacheKey))
  }
}

function UserList({ users }: { users: User[] }) {
  const router = useRouter()

  return (
    <div>
      {users.map(user => (
        <div
          key={user.id}
          onMouseEnter={() => prefetchUser(user.id)}
          onClick={() => router.push(`/users/${user.id}`)}
        >
          {user.name}
        </div>
      ))}
    </div>
  )
}
```

## Key Points

- Configure global fetcher with error handling
- Use SWRConfig for default revalidation settings
- Leverage dependent fetching with conditional keys
- Use useSWRMutation for data modifications
- Implement optimistic updates with rollback
- Prefetch data on hover for instant navigation
- Handle error boundaries at the hook level
- Use deduplication to prevent redundant requests
- Set appropriate revalidation intervals per resource
- Combine with local state for form inputs
- Use middleware for logging and analytics
- Implement pagination with cursor-based keys
