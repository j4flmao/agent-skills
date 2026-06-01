---
name: frontend-state-management
description: >
  Use this skill when the user says 'state management', 'global state', 'Redux', 'Zustand', 'Pinia', 'NgRx', 'React Context', 'state architecture', 'where to put state', 'server state vs client state', or when deciding how to manage application state. This skill enforces: server state goes in server state libraries (TanStack Query, SWR, Apollo), local state goes in useState/ref/signals, shared state goes in lightweight stores (Zustand, Pinia, Signal Store), and complex state goes in XState or Redux Toolkit. Works with React, Vue, Angular. Do NOT use for: database design, backend caching, or API design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, state, phase-3, universal]
---

# Frontend State Management

## Purpose
Choose and implement the correct state management pattern for each type of state. Server state, client state, local state, and URL state each have their own solution. Never put server state in a global store.

## Agent Protocol

### Trigger
Exact user phrases: "state management", "global state", "Redux", "Zustand", "Pinia", "NgRx", "React Context", "state architecture", "where to put state", "server state vs client state", "state library".

### Input Context
Before activating, verify:
- The framework is known (React, Vue, Angular).
- The type of state being discussed is identified (server data, UI state, form state, URL state).

### Output Artifact
No file output. Produces state architecture decision as text.

### Response Format
```
State: {description}
Type: {server/client/URL}
Storage: {local/global/shared}
Library: {specific library}
Location: {file path}
Rationale: {one sentence}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] State type correctly classified (server vs client).
- [ ] Decision follows the decision tree below.
- [ ] Server state uses a server state library, NOT a global store.
- [ ] Global stores are split by domain (one store per feature, not one store for everything).
- [ ] Context is used for dependency injection, not state management.
- [ ] URL state is not duplicated in component state.

### Max Response Length
Per state decision: 7 lines.

## State Management Architecture / Decision Trees

### State Classification Decision Tree
```
Where is the source of truth?
  |-- On the server (database, API, third-party service) -->
  |     SERVER STATE
  |     Library: TanStack Query, SWR, Apollo, RTK Query
  |     NEVER put in Zustand, Redux, Pinia, or Context
  |
  |-- On the client (user interaction, UI state) -->
  |     Is it shared across multiple components?
  |     |-- NO -->
  |     |     LOCAL STATE
  |     |     React: useState, useReducer
  |     |     Vue: ref, reactive
  |     |     Angular: Component-local signal
  |     |
  |     |-- YES -->
  |           |-- Complex (multiple actions, transitions, side effects)? -->
  |           |     |-- YES -->
  |           |     |     COMPLEX STATE (state machine)
  |           |     |     Library: XState, Redux Toolkit (slices + thunks), NgRx
  |           |     |     Use when: 15+ actions, cross-cutting concerns, middleware needed
  |           |     |
  |           |     |-- NO -->
  |           |           SHARED STATE (simple store)
  |           |           React: Zustand, Jotai, Valtio
  |           |           Vue: Pinia
  |           |           Angular: Signal Store
  |           |
  |           |-- Derived / computed from other state?
  |                 COMPUTED STATE
  |                 React: useMemo, Zustand selectors, Jotai derived atoms
  |                 Vue: computed()
  |                 Angular: computed signal
  |
  |-- In the URL (search params, path, hash) -->
  |     URL STATE
  |     Read: useSearchParams, useParams, useLocation
  |     Write: router.push/replace, searchParams set
  |     NEVER duplicate URL state in component state
  |
  |-- On the device (localStorage, IndexedDB, cookies) -->
        PERSISTED STATE
        Sync to store on init, write back on change
        Zod schema validation on read (storage can be tampered)
```

### Global Store Structure Decision Tree
```
How many pieces of state?
  |-- 1-3 related values (auth: user, token, isAuthenticated) -->
  |     Single small store is fine
  |
  |-- 4-10 related values -->
  |     Split by domain if they change independently
  |     |-- auth: user, token, login, logout
  |     |-- cart: items, total, addItem, removeItem
  |     |-- ui: sidebarOpen, theme, modalState
  |
  |-- 10+ values -->
        MUST split by domain
        Each store: max 5-7 state properties + associated actions
        A store with 20+ properties is a design smell
```

---

## Workflow

### Step 1: Classify State
```
Is the source of truth on the server?
  YES -> Server state -> useQuery / useFetch / Apollo
  NO  -> Is it shared across multiple components?
    NO  -> Component local -> useState / ref / signal
    YES -> Is it complex (multiple actions, transitions)?
      NO  -> Simple store -> Zustand / Pinia / Signal Store
      YES -> State machine -> XState / Redux Toolkit / NgRx
```

### Step 2: Server State Pattern
```typescript
function useUsers() {
  return useQuery({
    queryKey: ['users', { page }],
    queryFn: () => api.getUsers({ page }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}
```

Server state rules:
- staleTime prevents unnecessary refetches. Set based on data volatility.
- gcTime keeps data in cache for instant back-navigation.
- Mutations invalidate related queries on success. Never manually set query data.

### Step 3: Client State Patterns
```typescript
// Local state (one component)
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}

// Shared state (multiple components)
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (credentials) => {
    const user = await api.login(credentials)
    set({ user })
  },
  logout: () => set({ user: null }),
}))

// Complex state machine
const orderMachine = createMachine({
  id: 'order',
  initial: 'idle',
  states: {
    idle:      { on: { SUBMIT: 'loading' } },
    loading:   { on: { SUCCESS: 'success', ERROR: 'error' } },
    success:   { on: { RESET: 'idle' } },
    error:     { on: { RETRY: 'loading', RESET: 'idle' } },
  },
})
```

### Step 4: State Location Rules
| State Type | Storage | Example |
|-----------|---------|---------|
| Form input | Component local | useState in form component |
| Theme preference | Global store (small) | useThemeStore |
| Auth status | Global store (small) | useAuthStore |
| API response data | Server state library | useQuery |
| Modal open/close | Component local | useState |
| Real-time data | Server state subscription | useQuery with WebSocket |
| URL params | URL/search params | useSearchParams |
| Form validation | Component local or form library | react-hook-form |

### Step 5: Zustand Store Example
```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface CartStore {
  items: CartItem[]
  totalItems: number
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        totalItems: 0,
        addItem: (item) => set((state) => ({
          items: [...state.items, item],
          totalItems: state.totalItems + 1,
        })),
        removeItem: (id) => set((state) => ({
          items: state.items.filter((i) => i.id !== id),
          totalItems: state.totalItems - 1,
        })),
        clearCart: () => set({ items: [], totalItems: 0 }),
      }),
      { name: 'cart-storage' }
    )
  )
)
```

### Step 6: State Testing Patterns
```typescript
// Test Zustand store
describe('CartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], totalItems: 0 })
  })

  it('adds item to cart', () => {
    const item = { id: '1', name: 'Test', price: 10 }
    useCartStore.getState().addItem(item)
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('removes item from cart', () => {
    const item = { id: '1', name: 'Test', price: 10 }
    useCartStore.getState().addItem(item)
    useCartStore.getState().removeItem('1')
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
```

## Common Pitfalls

### 1. Server State in Global Store
```typescript
// BAD -- putting API data in Zustand
const useUserStore = create((set) => ({
  user: null,
  fetchUser: async (id) => {
    const user = await api.getUser(id)
    set({ user }) // Manual cache, no dedup, no refetch
  },
}))

// GOOD -- use server state library
function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.getUser(id),
    staleTime: 30_000,
  })
}
```

### 2. Context for State Management
Context triggers re-render of all consumers on any value change. For frequently-updated state, use Zustand or Jotai which use subscriptions instead of prop drilling.

### 3. Monolithic Global Store
A single Redux store with 50+ slices creates unnecessary coupling. Zustand or Pinia encourages multiple small stores by design.

### 4. Duplicating URL State
Reading search params into useState creates sync issues. Always derive from URL, write to URL.

### 5. Not Normalizing Server State
Cached server state should be normalized by ID to avoid duplication. TanStack Query handles this with `queryKey`.

## Compared With

| Library | Bundle Size | Boilerplate | Framework | Best For |
|---------|------------|-------------|-----------|----------|
| useState | 0KB | Low | React | Local component state |
| useReducer | 0KB | Medium | React | Local complex state |
| Zustand | ~1KB | Low | Any | Shared simple state |
| Jotai | ~3KB | Low | React | Atomic shared state |
| Redux Toolkit | ~12KB | Medium | React | Complex app state |
| Pinia | ~1KB | Low | Vue | Vue shared state |
| NgRx | ~15KB | High | Angular | Complex Angular state |
| TanStack Query | ~13KB | Low | Any | Server state |
| XState | ~12KB | Medium | Any | State machines |

## Performance Considerations

### Store Selection Performance Impact
| Approach | Re-renders on change | Setup cost | Memoization needed |
|----------|---------------------|------------|-------------------|
| Context | All consumers | Low | Yes (value memo) |
| Zustand | Only subscribed components | Low | No (selector-based) |
| Jotai | Only dependent atoms | Low | No (fine-grained) |
| Redux | Connected components via selector | Medium | Yes (reselect) |
| Pinia | Only subscribed components | Low | No |
| NgRx | Connected components | High | Yes (selectors) |

### Rule of Thumb
- If state is read > written (theme, locale, auth): Context (with memoized value) is fine
- If state is written > read (form inputs, UI toggles): Zustand, useState, or ref
- If state changes rapidly (animations, real-time): Jotai atoms or signals

## Accessibility Considerations

- State changes should trigger appropriate aria-live announcements (loading, error, content updates)
- Modal/dialog state management must manage focus (trap focus when open, restore on close)
- Theme state changes should not cause sudden visual changes without user awareness

## Security Considerations

- Persisted stores (localStorage) should validate data with Zod on read — storage can be tampered
- Auth state should never be persisted to localStorage. Use httpOnly cookies + server state.
- User data in stores should be sanitized before rendering (avoid XSS via stored state)

## Rules
- Server state goes in TanStack Query / SWR / Apollo. Never put server state in Zustand, Redux, or Pinia.
- Split global stores by domain. One store per feature. A store with 20+ properties should be split.
- React Context is dependency injection, not a state management solution. Use it for theme providers, locale providers, not for app state.
- Never store derived data in state. Compute it with selectors, computed, or useMemo.
- URL parameters are state. Do not duplicate URL state in component state.
- If two pieces of state change together, they belong together. If they change independently, split them.

## References
  - references/client-state.md — Client State
  - references/server-state.md — Server State
  - references/state-architecture.md — State Architecture Patterns
  - references/state-comparison.md — State Management Library Comparison
  - references/state-patterns.md — State Management Patterns
  - references/state-testing.md — State Testing Patterns
## Handoff
No artifact produced.
Next skill: frontend-performance — optimize rendering and bundle size.
Carry forward: state architecture decisions, store structure, server state configuration.
