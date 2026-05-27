# Client State

## Purpose

Client state is data that exists only on the client — UI state, form state, transient data, and any state whose source of truth is the browser. Unlike server state, client state does not need to be fetched or persisted to a database. This reference covers client state management libraries (Zustand, Jotai, Redux Toolkit, React Context), atomic vs global store patterns, state persistence, derived state, debugging, middleware, and testing.

## Client State Libraries

### Zustand (Lightweight Global Store)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => void
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const { user, token } = await api.login(credentials)
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        localStorage.removeItem('auth-storage')
      },

      updateProfile: (data) => {
        const user = get().user
        if (user) set({ user: { ...user, ...data } })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
```

### Jotai (Atomic State)

```typescript
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage, splitAtom } from 'jotai/utils'

// Primitive atoms
const countAtom = atom(0)
const textAtom = atom('hello')
const userAtom = atom<User | null>(null)

// Derived (computed) atom
const doubledAtom = atom((get) => get(countAtom) * 2)

// Async atom
const currentUserAtom = atom(async () => {
  const response = await fetch('/api/me')
  return response.json()
})

// Atom with actions
const counterAtom = atom(
  (get) => get(countAtom),
  (get, set, action: 'increment' | 'decrement') => {
    const current = get(countAtom)
    set(countAtom, action === 'increment' ? current + 1 : current - 1)
  }
)

// Persistent atom
const themeAtom = atomWithStorage('theme', 'light')

// Component usage
function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const doubled = useAtomValue(doubledAtom)
  return (
    <div>
      <span>{count} (doubled: {doubled})</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}
```

### Redux Toolkit

```typescript
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

interface CartState {
  items: CartItem[]
  isOpen: boolean
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], isOpen: false } as CartState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload)
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload.id)
    },
    updateQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
      const item = state.items.find(i => i.id === action.payload.id)
      if (item) item.quantity = action.payload.quantity
    },
    toggleCart(state) {
      state.isOpen = !state.isOpen
    },
  },
})

export const { addItem, removeItem, updateQuantity, toggleCart } = cartSlice.actions

const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

## Atomic State vs Global Store

### Decision Framework

```
Is the state used by a single component?
  YES → useState / useReducer (local state)
  NO  → Is the state derived from other state?
    YES → Computed/derived (useMemo, Jotai derived atoms)
    NO  → Is state shared across many components far apart?
      YES → Global store (Zustand, Redux)
      NO  → Is it a small amount of state?
        YES → Jotai atoms
        NO  → Zustand or Redux Toolkit slice
```

### Atomic State (Jotai)

Best for granular state that is consumed by few components and benefits from fine-grained reactivity.

```typescript
// Independent atoms for independent pieces of state
const searchQueryAtom = atom('')
const selectedFilterAtom = atom<string | null>(null)
const sortOrderAtom = atom<'asc' | 'desc'>('asc')

// Each consumer only re-renders when its specific atom changes
function SearchInput() {
  const [query, setQuery] = useAtom(searchQueryAtom)
  return <input value={query} onChange={e => setQuery(e.target.value)} />
}

function SortToggle() {
  const [order, setOrder] = useAtom(sortOrderAtom)
  return <button onClick={() => setOrder(o => o === 'asc' ? 'desc' : 'asc')}>{order}</button>
}
```

### Global Store (Zustand / Redux)

Best for state shared across many components that needs to be accessed or updated from anywhere.

```typescript
// Zustand — global UI state
interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  toasts: Toast[]
  toggleSidebar: () => void
  showModal: (name: string) => void
  hideModal: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}
```

## State Persistence

### Persistence Strategies

```typescript
// Zustand persist middleware
const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'system' as Theme,
      language: 'en',
      fontSize: 16,
      setTheme: (theme: Theme) => set({ theme }),
      setLanguage: (language: string) => set({ language }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) console.error('Failed to rehydrate settings', error)
        }
      },
    }
  )
)

// Redux Toolkit with redux-persist
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'settings'], // Only persist these slices
  blacklist: ['cart'],             // Never persist cart
  version: 1,
  migrate: createMigrate(migrations, { debug: false }),
}

const persistedReducer = persistReducer(persistConfig, rootReducer)
const store = configureStore({ reducer: persistedReducer })
const persistor = persistStore(store)
```

### Migration for Breaking Changes

```typescript
// Zustand version migration
const useStore = create(
  persist(
    (set, get) => ({
      version: 2,
      // ... state
    }),
    {
      name: 'app-state',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        switch (version) {
          case 0:
            // Migrate from v0 to v1
            return { ...persistedState, newField: 'default', version: 1 }
          case 1:
            // Migrate from v1 to v2
            const { oldField, ...rest } = persistedState
            return { ...rest, renamedField: oldField, version: 2 }
          default:
            return persistedState as AppState
        }
      },
    }
  )
)
```

## Computed / Derived State

### Inline Computation

```typescript
// Zustand — derived values in selectors
const useCartTotal = () => useCartStore((state) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

const useCartItemCount = () => useCartStore((state) =>
  state.items.reduce((count, item) => count + item.quantity, 0)
)
```

### Selector Optimization

```typescript
// Zustand — shallow equality to prevent unnecessary re-renders
import { shallow } from 'zustand/shallow'

function CartSummary() {
  // Only re-renders if items array reference changes
  const items = useCartStore((state) => state.items, shallow)
}

// Redux — createSelector for memoized derivation
import { createSelector } from '@reduxjs/toolkit'

const selectCartItems = (state: RootState) => state.cart.items

const selectCartSummary = createSelector(
  [selectCartItems],
  (items) => ({
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    count: items.reduce((count, i) => count + i.quantity, 0),
    averageItemPrice: items.length > 0
      ? items.reduce((sum, i) => sum + i.price, 0) / items.length
      : 0,
  })
)
```

### Jotai Derived Atoms

```typescript
const itemsAtom = atom<CartItem[]>([])
const taxRateAtom = atom(0.08)

const cartSummaryAtom = atom((get) => {
  const items = get(itemsAtom)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const tax = subtotal * get(taxRateAtom)
  return {
    subtotal,
    tax,
    total: subtotal + tax,
    itemCount: items.reduce((count, i) => count + i.quantity, 0),
  }
})

// Writeable derived atom
const couponAtom = atom('')
const discountedTotalAtom = atom(
  (get) => {
    const { total } = get(cartSummaryAtom)
    const discount = get(couponAtom) === 'SAVE10' ? total * 0.1 : 0
    return total - discount
  },
  (_get, set, coupon: string) => {
    set(couponAtom, coupon)
  }
)
```

## State Debugging

### DevTools Integration

```typescript
// Zustand — Redux DevTools
import { devtools } from 'zustand/middleware'

const useStore = create<AppState>()(
  devtools(
    (set) => ({
      // ... state and actions
    }),
    {
      name: 'App Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Redux Toolkit — DevTools enabled by default
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
})
```

### Action Logging Middleware

```typescript
// Zustand custom middleware
const loggerMiddleware = (config: StateCreator<AppState>): StateCreator<AppState> =>
  (set, get, api) =>
    config(
      (args) => {
        console.log('  prev state:', get())
        console.log('  action:', args)
        set(args)
        console.log('  next state:', get())
      },
      get,
      api
    )

// Redux — custom middleware
const actionLogger: Middleware = (store) => (next) => (action) => {
  console.group(action.type)
  console.log('dispatching:', action)
  const result = next(action)
  console.log('next state:', store.getState())
  console.groupEnd()
  return result
}
```

## Middleware

### Zustand Middleware Composition

```typescript
import { create, StateCreator } from 'zustand'
import { devtools, persist, subscribeWithSelector, immer } from 'zustand/middleware'

const useStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      devtools(
        immer((set) => ({
          // Mutate state with Mutative syntax (Immer)
          updateUser: (userId, data) => set((state) => {
            const user = state.users.find(u => u.id === userId)
            if (user) {
              user.name = data.name
              user.email = data.email
            }
          }),
        })),
        { name: 'AppStore' }
      ),
      { name: 'app-storage' }
    )
  )
)

// Subscribe to specific state changes
useStore.subscribe(
  (state) => state.auth.user,
  (user, prevUser) => {
    if (user !== prevUser) {
      analytics.identify(user?.id)
    }
  }
)
```

## Testing State

### Zustand Store Tests

```typescript
import { act, renderHook } from '@testing-library/react'

describe('CartStore', () => {
  beforeEach(() => {
    // Reset store between tests
    const { reset } = useCartStore.getState()
    reset()
  })

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({ id: '1', name: 'Test', price: 10, quantity: 1 })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].name).toBe('Test')
  })

  it('increments quantity for existing item', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({ id: '1', name: 'Widget', price: 10, quantity: 1 })
      result.current.addItem({ id: '1', name: 'Widget', price: 10, quantity: 1 })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('removes item from cart', () => {
    const store = useCartStore.getState()
    store.addItem({ id: '1', name: 'Test', price: 10, quantity: 1 })

    act(() => {
      useCartStore.getState().removeItem('1')
    })

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
```

### Redux Tests

```typescript
import { configureStore } from '@reduxjs/toolkit'
import cartReducer, { addItem, removeItem, CartState } from './cartSlice'

describe('cart slice', () => {
  const createTestStore = (initialState?: Partial<CartState>) =>
    configureStore({
      reducer: { cart: cartReducer },
      preloadedState: { cart: { items: [], isOpen: false, ...initialState } },
    })

  it('handles addItem', () => {
    const store = createTestStore()
    store.dispatch(addItem({ id: '1', name: 'Widget', price: 10, quantity: 1 }))
    expect(store.getState().cart.items).toHaveLength(1)
  })

  it('handles removeItem', () => {
    const store = createTestStore({
      items: [{ id: '1', name: 'Widget', price: 10, quantity: 1 }],
    })
    store.dispatch(removeItem('1'))
    expect(store.getState().cart.items).toHaveLength(0)
  })
})
```

### React Context Tests

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function renderWithTheme(component: React.ReactNode, theme: Theme = 'light') {
  return render(
    <ThemeContext.Provider value={{ theme, setTheme: jest.fn() }}>
      {component}
    </ThemeContext.Provider>
  )
}

test('renders with dark theme', () => {
  renderWithTheme(<ThemeToggle />, 'dark')
  expect(screen.getByRole('button')).toHaveTextContent('Switch to light')
})
```

## Key Points

- Client state belongs in lightweight stores (Zustand, Jotai, Redux Toolkit). Server state belongs in server state libraries.
- Use local state (useState/useReducer) for state used by one component.
- Use atomic state (Jotai) for granular, sparsely shared state — components only re-render when their atom changes.
- Use global stores (Zustand, Redux) for widely shared state (auth, theme, UI state).
- Derive computed values with selectors, useMemo, or Jotai derived atoms — never store derived data in state.
- Persist only what needs to survive page reloads — use partialize to exclude transient state.
- Use middleware for cross-cutting concerns: logging, persistence, immer for immutable updates.
- Test stores directly (outside React) for fast, isolated state logic tests.
- Every store should have a clear domain boundary — one store per feature, not one store for everything.
- Context is for dependency injection (theme, locale providers) — not for state management.
