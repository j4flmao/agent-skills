# Svelte Stores and State

## Custom Stores

```typescript
// lib/stores/user.ts
import { writable, derived, readonly } from 'svelte/store'

interface UserState {
  id: string | null
  name: string | null
  email: string | null
  roles: string[]
}

function createUserStore() {
  const { subscribe, set, update } = writable<UserState>({
    id: null,
    name: null,
    email: null,
    roles: [],
  })

  return {
    subscribe,
    login: async (email: string, password: string) => {
      const user = await authenticate(email, password)
      set({ id: user.id, name: user.name, email: user.email, roles: user.roles })
    },
    logout: () => set({ id: null, name: null, email: null, roles: [] }),
    updateProfile: (data: Partial<UserState>) => update(u => ({ ...u, ...data })),
    isAuthenticated: derived({ subscribe }, $user => $user.id !== null),
    hasRole: (role: string) => derived({ subscribe }, $user => $user.roles.includes(role)),
  }
}

export const userStore = createUserStore()
export const isAdmin = userStore.hasRole('admin')
```

## Store Composition

```typescript
// lib/stores/app.ts
import { writable, derived } from 'svelte/store'
import { userStore } from './user'
import { notificationStore } from './notifications'

interface AppState {
  theme: 'light' | 'dark'
  sidebar: boolean
  isLoading: boolean
}

function createAppStore() {
  const { subscribe, update } = writable<AppState>({
    theme: 'light',
    sidebar: true,
    isLoading: false,
  })

  return {
    subscribe,
    toggleTheme: () => update(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' })),
    toggleSidebar: () => update(s => ({ ...s, sidebar: !s.sidebar })),
    setLoading: (loading: boolean) => update(s => ({ ...s, isLoading: loading })),
    settings: derived(
      [userStore, notificationStore],
      ([$user, $notifications]) => ({
        user: $user,
        unreadCount: $notifications.filter(n => !n.read).length,
      }),
    ),
  }
}

export const appStore = createAppStore()
```

## Local Storage Store

```typescript
// lib/stores/persistent.ts
import { writable } from 'svelte/store'

function persistentStore<T>(key: string, defaultValue: T) {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem(key)
    : null

  const store = writable<T>(stored ? JSON.parse(stored) : defaultValue)

  store.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value))
    }
  })

  return store
}

export const preferences = persistentStore('user-preferences', {
  theme: 'light',
  fontSize: 16,
  language: 'en',
})

export const recentSearches = persistentStore<string[]>('recent-searches', [])
```

## Derived Store Combinations

```typescript
import { writable, derived } from 'svelte/store'

const users = writable<User[]>([])
const searchQuery = writable('')
const selectedRole = writable<string | null>(null)

const filteredUsers = derived(
  [users, searchQuery, selectedRole],
  ([$users, $query, $role]) => {
    return $users.filter(user => {
      const matchesSearch = !$query ||
        user.name.toLowerCase().includes($query.toLowerCase()) ||
        user.email.toLowerCase().includes($query.toLowerCase())
      const matchesRole = !$role || user.role === $role
      return matchesSearch && matchesRole
    })
  },
)

const stats = derived(users, $users => ({
  total: $users.length,
  admins: $users.filter(u => u.role === 'admin').length,
  active: $users.filter(u => u.status === 'active').length,
}))
```

## Key Points

- Use writable stores for mutable state
- Use derived stores for computed values
- Compose multiple stores with derived
- Use custom stores with action methods
- Implement persistent stores with localStorage
- Use readable stores for immutable data sources
- Subscribe properly with auto-unsubscribe in Svelte files
- Use store contracts for type safety
- Combine stores with derived for computed state
- Use get() for one-time store reads outside Svelte
- Avoid store subscription leaks with manual unsubscribe
- Use $store auto-subscription syntax in Svelte files
