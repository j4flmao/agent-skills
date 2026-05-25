# SolidJS State Management Patterns

## Local State (createSignal)

```tsx
function Toggle() {
  const [open, setOpen] = createSignal(false)
  return (
    <div>
      <button onClick={() => setOpen(!open())}>{open() ? 'Close' : 'Open'}</button>
      <Show when={open()}><div>Content</div></Show>
    </div>
  )
}
```

## Form State (createStore)

```tsx
function CreateUserForm() {
  const [form, setForm] = createStore({
    name: '', email: '', role: 'user', tags: [] as string[],
  })
  const [errors, setErrors] = createStore<Record<string, string>>({})

  const validate = () => {
    setErrors({})
    if (!form.name) setErrors('name', 'Required')
    if (!/^[^\s@]+@[^\s@]+$/.test(form.email)) setErrors('email', 'Invalid')
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!validate()) return
    await api.createUser(form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.name} onInput={e => setForm('name', e.currentTarget.value)} />
      {errors.name && <span>{errors.name}</span>}
      <input value={form.email} onInput={e => setForm('email', e.currentTarget.value)} />
      {errors.email && <span>{errors.email}</span>}
      <button type="submit">Create</button>
    </form>
  )
}
```

## Global State (Signals in Modules)

```tsx
// stores/auth.ts
import { createSignal } from 'solid-js'

const [user, setUser] = createSignal<User | null>(null)
const [token, setToken] = createSignal<string | null>(null)

export const authStore = {
  user,
  token,
  isAuthenticated: () => !!token(),
  async login(email: string, password: string) {
    const res = await api.login(email, password)
    setUser(res.user)
    setToken(res.token)
  },
  logout() {
    setUser(null)
    setToken(null)
  },
}

// stores/cart.ts
import { createStore } from 'solid-js/store'

const [cart, setCart] = createStore<CartState>({
  items: [],
  coupon: null,
})

export const cartStore = {
  items: () => cart.items,
  count: () => cart.items.reduce((s, i) => s + i.quantity, 0),
  addItem(product: Product) { setCart('items', items => [...items, { ...product, quantity: 1 }]) },
  removeItem(id: string) { setCart('items', items => items.filter(i => i.id !== id)) },
}
```

## Context State

```tsx
const AuthContext = createContext<ReturnType<typeof createAuthContext>>()

function createAuthContext() {
  const [user, setUser] = createSignal<User | null>(null)
  return {
    user,
    login: async (email: string, pw: string) => {
      const u = await api.login(email, pw)
      setUser(u)
    },
    logout: () => setUser(null),
  }
}

function AuthProvider(props: { children: any }) {
  const auth = createAuthContext()
  return <AuthContext.Provider value={auth}>{props.children}</AuthContext.Provider>
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('Missing AuthProvider')
  return ctx
}
```

## State Decision Guide

| State Type | SolidJS Solution |
|------------|-----------------|
| Component toggle | `createSignal` |
| Form inputs | `createStore` |
| Derived data | `createMemo` |
| Server data | `createResource` |
| Global state | Module-level signals |
| Shared state | Context + signals |
| URL state | `useSearchParams` |
| Undo/redo | `createStore` history pattern |
