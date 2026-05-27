# SolidJS Testing Strategy

## Testing Philosophy

SolidJS's fine-grained reactivity means testing differs from React/Vue. Test reactive primitives in isolation, test component behavior (not implementation), and use the testing library for DOM assertions. Unit tests validate signal logic, integration tests verify component interactions, and E2E tests cover full user flows.

```tsx
// Test signals directly — they're just functions
// Test components through DOM output — not internal state
// Test effects by observing their side effects
```

## Unit Testing Setup

### Vitest Configuration

```tsx
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    transformMode: {
      web: [/\.[jt]sx?$/],
    },
    deps: {
      inline: ['solid-js', 'solid-testing-library'],
    },
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
})
```

```tsx
// test-setup.ts
import '@testing-library/jest-dom'

// Mock browser APIs not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

## Testing Reactive Primitives

### Testing createSignal

```tsx
import { createSignal, createRoot } from 'solid-js'
import { describe, it, expect } from 'vitest'

it('initializes with a value', () => {
  const [count] = createSignal(0)
  expect(count()).toBe(0)
})

it('updates via setter', () => {
  const [count, setCount] = createSignal(0)
  setCount(5)
  expect(count()).toBe(5)
})

it('supports function updater', () => {
  const [count, setCount] = createSignal(0)
  setCount(prev => prev + 1)
  expect(count()).toBe(1)
})

it('supports multiple updates', () => {
  const [count, setCount] = createSignal(0)
  setCount(1)
  setCount(2)
  setCount(3)
  expect(count()).toBe(3)
})

it('handles undefined initial value', () => {
  const [value] = createSignal<string>()
  expect(value()).toBeUndefined()
})

it('supports equality check override', () => {
  const [items, setItems] = createSignal([1, 2, 3], { equals: false })
  // With equals: false, every set triggers updates even if value is "same"
  setItems([1, 2, 3])
  expect(items()).toEqual([1, 2, 3])
})
```

### Testing createMemo

```tsx
import { createSignal, createMemo, createRoot } from 'solid-js'

it('computes derived value', () => {
  const [count, setCount] = createSignal(0)
  const doubled = createMemo(() => count() * 2)

  expect(doubled()).toBe(0)
  setCount(5)
  expect(doubled()).toBe(10)
})

it('recomputes only when dependencies change', () => {
  const [a, setA] = createSignal(1)
  const [b, setB] = createSignal(10)
  const compute = vi.fn(() => a() + b())
  const sum = createMemo(compute)

  // Initial computation
  expect(sum()).toBe(11)
  expect(compute).toHaveBeenCalledTimes(1)

  // Changing b triggers recomputation
  setB(20)
  expect(sum()).toBe(21)
  expect(compute).toHaveBeenCalledTimes(2)

  // No dependency change — uses cached value
  expect(sum()).toBe(21)
  expect(compute).toHaveBeenCalledTimes(2)
})

it('supports chained memos', () => {
  const [count, setCount] = createSignal(2)
  const squared = createMemo(() => count() ** 2)
  const cubed = createMemo(() => squared() * count())

  expect(cubed()).toBe(8)
  setCount(3)
  expect(cubed()).toBe(27)
})
```

### Testing createEffect

```tsx
import { createSignal, createEffect, createRoot } from 'solid-js'

it('runs effect on dependency changes', () => {
  const [count, setCount] = createSignal(0)
  const spy = vi.fn()

  createRoot(() => {
    createEffect(() => {
      spy(count())
    })
  })

  expect(spy).toHaveBeenCalledWith(0)
  setCount(1)
  expect(spy).toHaveBeenCalledWith(1)
})

it('tracks multiple dependencies', () => {
  const [firstName, setFirstName] = createSignal('Jane')
  const [lastName, setLastName] = createSignal('Doe')
  const spy = vi.fn()

  createRoot(() => {
    createEffect(() => {
      spy(`${firstName()} ${lastName()}`)
    })
  })

  expect(spy).toHaveBeenCalledWith('Jane Doe')
  setFirstName('John')
  expect(spy).toHaveBeenCalledWith('John Doe')
  setLastName('Smith')
  expect(spy).toHaveBeenCalledWith('John Smith')
})

it('cleans up with onCleanup', () => {
  const [show, setShow] = createSignal(true)
  const cleanup = vi.fn()

  createRoot(() => {
    createEffect(() => {
      if (show()) {
        onCleanup(cleanup)
      }
    })
  })

  expect(cleanup).not.toHaveBeenCalled()
  setShow(false)
  expect(cleanup).toHaveBeenCalledTimes(1)
})
```

### Testing createResource

```tsx
import { createResource, Suspense } from 'solid-js'
import { render, screen } from 'solid-testing-library'

it('fetches data and provides it to the component', async () => {
  const fetcher = vi.fn().mockResolvedValue({ name: 'John' })

  function TestComponent() {
    const [data] = createResource(fetcher)
    return (
      <Suspense fallback={<p>Loading...</p>}>
        <p data-testid="name">{data()?.name}</p>
      </Suspense>
    )
  }

  render(() => <TestComponent />)
  expect(screen.getByTestId('name').textContent).toBe('John')
})

it('refetches when source signal changes', async () => {
  const fetchUser = vi.fn((id: number) =>
    Promise.resolve({ id, name: `User ${id}` })
  )

  function TestComponent() {
    const [id, setId] = createSignal(1)
    const [data] = createResource(id, fetchUser)

    return (
      <div>
        <Suspense fallback={<p>Loading...</p>}>
          <p data-testid="name">{data()?.name}</p>
        </Suspense>
        <button onClick={() => setId(2)}>Next</button>
      </div>
    )
  }

  render(() => <TestComponent />)
  expect(screen.getByTestId('name').textContent).toBe('User 1')
  expect(fetchUser).toHaveBeenCalledWith(1)

  screen.getByText('Next').click()
  await new Promise(r => setTimeout(r, 0))  // Wait for async
  expect(screen.getByTestId('name').textContent).toBe('User 2')
  expect(fetchUser).toHaveBeenCalledWith(2)
})

it('handles loading state', async () => {
  const fetcher = vi.fn().mockImplementation(() =>
    new Promise(resolve => setTimeout(() => resolve('data'), 100))
  )

  function TestComponent() {
    const [data] = createResource(fetcher)

    return (
      <Suspense fallback={<p>Loading...</p>}>
        <p data-testid="content">{data()}</p>
      </Suspense>
    )
  }

  render(() => <TestComponent />)
  // Component wrapped in Suspense — initial shows fallback
  // After resource resolves, shows data
  expect(await screen.findByTestId('content')).toBeTruthy()
})

it('handles error states', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('Network error'))

  function TestComponent() {
    const [data] = createResource(fetcher)

    return (
      <ErrorBoundary fallback={(err) => <p data-testid="error">{err.message}</p>}>
        <Suspense fallback={<p>Loading...</p>}>
          <p>{data()}</p>
        </Suspense>
      </ErrorBoundary>
    )
  }

  render(() => <TestComponent />)
  expect(await screen.findByTestId('error')).toHaveTextContent('Network error')
})
```

## Testing createStore

```tsx
import { createStore } from 'solid-js/store'
import { produce } from 'solid-js/store'

it('creates a store with initial values', () => {
  const [store] = createStore({ count: 0, name: 'test' })
  expect(store.count).toBe(0)
  expect(store.name).toBe('test')
})

it('updates store via setter', () => {
  const [store, setStore] = createStore({ count: 0 })
  setStore('count', 5)
  expect(store.count).toBe(5)
})

it('supports nested updates', () => {
  const [store, setStore] = createStore({
    user: { name: 'John', address: { city: 'NYC' } },
  })

  setStore('user', 'address', 'city', 'LA')
  expect(store.user.address.city).toBe('LA')
})

it('supports function updaters', () => {
  const [store, setStore] = createStore({ items: [1, 2, 3] })

  setStore('items', items => [...items, 4])
  expect(store.items).toEqual([1, 2, 3, 4])
})

it('supports produce for immutable updates', () => {
  const [store, setStore] = createStore({
    todos: [
      { id: 1, text: 'Learn Solid', done: false },
      { id: 2, text: 'Write tests', done: false },
    ],
  })

  setStore(
    'todos',
    produce(todos => {
      todos[0].done = true
      todos.push({ id: 3, text: 'Deploy', done: false })
    })
  )

  expect(store.todos[0].done).toBe(true)
  expect(store.todos).toHaveLength(3)
})

it('maintains referential equality for unchanged branches', () => {
  const [store, setStore] = createStore({ a: 1, b: { c: 2 } })
  const bRef = store.b

  setStore('a', 2)
  expect(store.b).toBe(bRef)  // Same reference — b wasn't touched
})
```

## Component Testing

### solid-testing-library

```tsx
import { render, screen, fireEvent } from 'solid-testing-library'
import { createSignal } from 'solid-js'

function Counter() {
  const [count, setCount] = createSignal(0)
  return (
    <div>
      <p data-testid="count">{count()}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}

test('renders initial count', () => {
  render(() => <Counter />)
  expect(screen.getByTestId('count').textContent).toBe('0')
})

test('increments count', () => {
  render(() => <Counter />)
  fireEvent.click(screen.getByText('Increment'))
  expect(screen.getByTestId('count').textContent).toBe('1')
})

test('resets count', () => {
  render(() => <Counter />)
  fireEvent.click(screen.getByText('Increment'))
  fireEvent.click(screen.getByText('Increment'))
  expect(screen.getByTestId('count').textContent).toBe('2')
  fireEvent.click(screen.getByText('Reset'))
  expect(screen.getByTestId('count').textContent).toBe('0')
})
```

### Queries

```tsx
import { render, screen } from 'solid-testing-library'

test('queries by role', () => {
  render(() => (
    <div>
      <button>Submit</button>
      <button>Cancel</button>
      <input type="text" placeholder="Name" />
      <img alt="Profile" src="/photo.jpg" />
    </div>
  ))

  expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy()
  expect(screen.getAllByRole('button')).toHaveLength(2)
  expect(screen.getByRole('textbox')).toBeTruthy()
  expect(screen.getByRole('img')).toBeTruthy()
})

test('queries by text', () => {
  render(() => <p>Hello World</p>)
  expect(screen.getByText('Hello World')).toBeTruthy()
  expect(screen.getByText(/hello/i)).toBeTruthy()
})

test('queries by placeholder', () => {
  render(() => <input placeholder="Search..." />)
  expect(screen.getByPlaceholderText('Search...')).toBeTruthy()
})
```

## DOM Testing

### User Events

```tsx
import { render, screen, fireEvent } from 'solid-testing-library'

function Form() {
  const [value, setValue] = createSignal('')
  const [submitted, setSubmitted] = createSignal('')

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(value()) }}>
      <input
        data-testid="input"
        value={value()}
        onInput={(e) => setValue(e.currentTarget.value)}
      />
      <button type="submit">Submit</button>
      <p data-testid="submitted">{submitted()}</p>
    </form>
  )
}

test('handles input change', () => {
  render(() => <Form />)
  const input = screen.getByTestId('input') as HTMLInputElement

  fireEvent.input(input, { target: { value: 'test value' } })
  expect(input.value).toBe('test value')
})

test('handles form submission', () => {
  render(() => <Form />)
  const input = screen.getByTestId('input') as HTMLInputElement

  fireEvent.input(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByText('Submit'))
  expect(screen.getByTestId('submitted').textContent).toBe('hello')
})
```

### Async Utilities

```tsx
import { render, screen, waitFor } from 'solid-testing-library'

function AsyncList() {
  const [items, setItems] = createSignal<string[]>([])

  onMount(async () => {
    const res = await fetch('/api/items')
    const data = await res.json()
    setItems(data)
  })

  return (
    <ul>
      <For each={items()}>{(item) => <li>{item}</li>}</For>
    </ul>
  )
}

test('loads items asynchronously', async () => {
  render(() => <AsyncList />)

  await waitFor(() => {
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  expect(screen.getByText('Item 1')).toBeTruthy()
  expect(screen.getByText('Item 2')).toBeTruthy()
  expect(screen.getByText('Item 3')).toBeTruthy()
})

test('uses findBy for async elements', async () => {
  render(() => <AsyncList />)
  expect(await screen.findByText('Item 1')).toBeTruthy()
})
```

## Accessibility Testing

```tsx
import { render } from 'solid-testing-library'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

function NavBar() {
  return (
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  )
}

test('has no accessibility violations', async () => {
  const { container } = render(() => <NavBar />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

test('accessible form', async () => {
  function LoginForm() {
    return (
      <form aria-label="Login">
        <label for="email">Email</label>
        <input id="email" type="email" required />
        <label for="password">Password</label>
        <input id="password" type="password" required />
        <button type="submit">Log in</button>
      </form>
    )
  }

  const { container } = render(() => <LoginForm />)
  expect(await axe(container)).toHaveNoViolations()
})

test('catches missing labels', async () => {
  function BadForm() {
    return (
      <form>
        <input type="text" />  {/* Missing label */}
        <button>Submit</button>
      </form>
    )
  }

  const { container } = render(() => <BadForm />)
  const results = await axe(container)
  expect(results.violations.length).toBeGreaterThan(0)
})
```

## Integration Testing

### Testing Component Interactions

```tsx
import { render, screen, fireEvent } from 'solid-testing-library'

function TodoApp() {
  const [todos, setTodos] = createStore<{ id: number; text: string; done: boolean }[]>([])
  const [input, setInput] = createSignal('')
  let nextId = 1

  const addTodo = () => {
    if (!input().trim()) return
    setTodos([...todos, { id: nextId++, text: input(), done: false }])
    setInput('')
  }

  const toggleTodo = (id: number) => {
    const idx = todos.findIndex(t => t.id === id)
    setTodos(idx, 'done', !todos[idx].done)
  }

  return (
    <div>
      <input
        data-testid="todo-input"
        value={input()}
        onInput={(e) => setInput(e.currentTarget.value)}
      />
      <button onClick={addTodo} data-testid="add-btn">Add</button>
      <ul>
        <For each={todos}>{(todo) => (
          <li
            data-testid={`todo-${todo.id}`}
            style={{ 'text-decoration': todo.done ? 'line-through' : 'none' }}
            onClick={() => toggleTodo(todo.id)}
          >
            {todo.text}
          </li>
        )}</For>
      </ul>
    </div>
  )
}

test('full todo workflow', () => {
  render(() => <TodoApp />)

  const input = screen.getByTestId('todo-input') as HTMLInputElement
  const addBtn = screen.getByTestId('add-btn')

  fireEvent.input(input, { target: { value: 'Buy milk' } })
  fireEvent.click(addBtn)

  expect(screen.getByText('Buy milk')).toBeTruthy()
  expect(input.value).toBe('')  // Input cleared

  fireEvent.input(input, { target: { value: 'Write tests' } })
  fireEvent.click(addBtn)

  expect(screen.getAllByRole('listitem')).toHaveLength(2)

  // Toggle todo
  fireEvent.click(screen.getByText('Buy milk'))
  expect(screen.getByText('Buy milk').style.textDecoration).toBe('line-through')
})
```

### Route Testing

```tsx
import { Router, Route, useParams, useSearchParams } from '@solidjs/router'
import { render, screen } from 'solid-testing-library'

function UserProfile() {
  const params = useParams()
  return <p data-testid="user-id">{params.id}</p>
}

test('route params work', () => {
  render(() => (
    <Router>
      <Route path="/users/:id" component={UserProfile} />
    </Router>
  ), {
    location: '/users/42',
  })

  expect(screen.getByTestId('user-id').textContent).toBe('42')
})

test('search params', () => {
  function SearchPage() {
    const [searchParams] = useSearchParams()
    return <p data-testid="query">{searchParams.q}</p>
  }

  render(() => (
    <Router>
      <Route path="/search" component={SearchPage} />
    </Router>
  ), {
    location: '/search?q=solidjs',
  })

  expect(screen.getByTestId('query').textContent).toBe('solidjs')
})
```

### Context Testing

```tsx
import { createContext, useContext } from 'solid-js'
import { render, screen } from 'solid-testing-library'

interface ThemeContextType {
  color: string
  bgColor: string
}

const ThemeContext = createContext<ThemeContextType>({
  color: 'black',
  bgColor: 'white',
})

function ThemedButton() {
  const theme = useContext(ThemeContext)
  return (
    <button style={{ color: theme.color, backgroundColor: theme.bgColor }}>
      Click me
    </button>
  )
}

function createTheme(value: ThemeContextType) {
  return value
}

test('uses context value', () => {
  const theme = { color: 'white', bgColor: 'blue' }

  render(() => (
    <ThemeContext.Provider value={theme}>
      <ThemedButton />
    </ThemeContext.Provider>
  ))

  const button = screen.getByText('Click me')
  expect(button.style.color).toBe('white')
  expect(button.style.backgroundColor).toBe('blue')
})

test('uses default context when no provider', () => {
  render(() => <ThemedButton />)
  const button = screen.getByText('Click me')
  expect(button.style.color).toBe('black')
  expect(button.style.backgroundColor).toBe('white')
})
```

## End-to-End Testing

### Playwright

```tsx
// tests/e2e/counter.spec.ts
import { test, expect } from '@playwright/test'

test('counter increments on click', async ({ page }) => {
  await page.goto('http://localhost:3000')

  const button = page.getByText('Increment')
  await button.click()
  await button.click()
  await button.click()

  await expect(page.getByTestId('count')).toHaveText('3')
})

test('navigation works', async ({ page }) => {
  await page.goto('http://localhost:3000')

  await page.getByText('About').click()
  await expect(page).toHaveURL(/\/about/)
  await expect(page.getByRole('heading')).toContainText('About')
})

test('form submission flow', async ({ page }) => {
  await page.goto('http://localhost:3000/login')

  await page.fill('[data-testid="email"]', 'user@example.com')
  await page.fill('[data-testid="password"]', 'secret123')
  await page.click('button[type="submit"]')

  await expect(page.getByTestId('welcome')).toContainText('Welcome back!')
})
```

### Cypress

```tsx
// cypress/e2e/dashboard.cy.ts
describe('Dashboard', () => {
  beforeEach(() => {
    cy.visit('/dashboard')
  })

  it('loads chart data', () => {
    cy.intercept('GET', '/api/chart-data', { fixture: 'chart-data.json' })
    cy.get('[data-testid="chart"]').should('be.visible')
  })

  it('filters data by date', () => {
    cy.get('[data-testid="date-picker"]').click()
    cy.get('[data-testid="date-option-today"]').click()
    cy.get('[data-testid="chart"]').should('contain', 'Today')
  })
})
```

## Testing Suspense and Lazy Loading

```tsx
import { lazy, Suspense } from 'solid-js'
import { render, screen } from 'solid-testing-library'

test('lazy component shows fallback then content', async () => {
  const LazyComponent = lazy(() =>
    new Promise(resolve =>
      setTimeout(() =>
        resolve({ default: () => <p>Lazy loaded</p> }),
        100
      )
    )
  )

  render(() => (
    <Suspense fallback={<p>Loading...</p>}>
      <LazyComponent />
    </Suspense>
  ))

  expect(screen.getByText('Loading...')).toBeTruthy()
  expect(await screen.findByText('Lazy loaded')).toBeTruthy()
})

test('multiple Suspense boundaries load independently', async () => {
  const Slow = lazy(() =>
    new Promise(resolve =>
      setTimeout(() => resolve({ default: () => <p>Slow</p> }), 200)
    )
  )
  const Fast = lazy(() =>
    Promise.resolve({ default: () => <p>Fast</p> })
  )

  render(() => (
    <div>
      <Suspense fallback={<p>Loading slow...</p>}>
        <Slow />
      </Suspense>
      <Suspense fallback={<p>Loading fast...</p>}>
        <Fast />
      </Suspense>
    </div>
  ))

  expect(screen.getByText('Loading slow...')).toBeTruthy()
  expect(screen.getByText('Loading fast...')).toBeTruthy()

  expect(await screen.findByText('Fast')).toBeTruthy()
  expect(screen.getByText('Loading slow...')).toBeTruthy()  // Slow still loading
})
```

## Testing Error Boundaries

```tsx
import { ErrorBoundary } from 'solid-js'
import { render, screen, fireEvent } from 'solid-testing-library'

function BuggyComponent({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Boom!')
  return <p>All good</p>
}

test('catches errors and shows fallback', () => {
  render(() => (
    <ErrorBoundary fallback={(err) => <p data-testid="error">{err.message}</p>}>
      <BuggyComponent shouldThrow />
    </ErrorBoundary>
  ))

  expect(screen.getByTestId('error')).toHaveTextContent('Boom!')
})

test('error boundary with retry', () => {
  const [retry, setRetry] = createSignal(false)

  render(() => (
    <ErrorBoundary fallback={(err, reset) => (
      <div>
        <p data-testid="error">{err.message}</p>
        <button onClick={reset} data-testid="retry">Retry</button>
      </div>
    )}>
      <BuggyComponent shouldThrow={!retry()} />
    </ErrorBoundary>
  ))

  expect(screen.getByTestId('error')).toHaveTextContent('Boom!')
  fireEvent.click(screen.getByTestId('retry'))
  setRetry(true)
  expect(screen.getByText('All good')).toBeTruthy()
})
```

## Testing Custom Hooks (Primitives)

```tsx
import { createSignal, createRoot } from 'solid-js'

// Custom hook
function createCounter(initial = 0) {
  const [count, setCount] = createSignal(initial)
  const increment = () => setCount(c => c + 1)
  const decrement = () => setCount(c => c - 1)
  const reset = () => setCount(initial)
  return { count, increment, decrement, reset }
}

test('counter hook works', () => {
  const { count, increment, decrement, reset } = createRoot(() => createCounter(10))

  expect(count()).toBe(10)
  increment()
  expect(count()).toBe(11)
  decrement()
  expect(count()).toBe(10)
  increment()
  increment()
  expect(count()).toBe(12)
  reset()
  expect(count()).toBe(10)
})

// Custom hook with async
function createDataFetcher<T>(url: string) {
  const [data, setData] = createSignal<T | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<Error | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, fetchData }
}

test('data fetcher hook handles success', async () => {
  const { data, loading, error, fetchData } = createRoot(() =>
    createDataFetcher('/api/test')
  )

  // Mock fetch
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })

  const promise = fetchData()
  expect(loading()).toBe(true)
  await promise
  expect(data()).toEqual({ success: true })
  expect(loading()).toBe(false)
  expect(error()).toBeNull()
})
```

## Mocking Strategies

### Mocking HTTP Requests (MSW)

```tsx
// src/tests/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```tsx
// src/tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Test User',
      email: 'test@example.com',
    })
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: 123, ...body as object },
      { status: 201 }
    )
  }),

  http.get('/api/error', () => {
    return new HttpResponse(null, { status: 500 })
  }),
]
```

```tsx
// test-setup.ts
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

```tsx
// Test using MSW
test('loads user data via MSW', async () => {
  function UserProfile(props: { id: string }) {
    const [user] = createResource(() => props.id, (id) =>
      fetch(`/api/users/${id}`).then(r => r.json())
    )

    return (
      <Suspense fallback={<p>Loading...</p>}>
        <p data-testid="name">{user()?.name}</p>
        <p data-testid="email">{user()?.email}</p>
      </Suspense>
    )
  }

  render(() => <UserProfile id="42" />)
  expect(await screen.findByTestId('name')).toHaveTextContent('Test User')
  expect(await screen.findByTestId('email')).toHaveTextContent('test@example.com')
})
```

### Mocking Modules

```tsx
// api.ts
export async function fetchDashboardData() {
  const res = await fetch('/api/dashboard')
  return res.json()
}

// Component
import { fetchDashboardData } from './api'

function Dashboard() {
  const [data] = createResource(fetchDashboardData)
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <p data-testid="revenue">{data()?.revenue}</p>
    </Suspense>
  )
}

// Test
vi.mock('./api', () => ({
  fetchDashboardData: vi.fn().mockResolvedValue({
    revenue: 10000,
    users: 500,
  }),
}))

test('mocks module-level fetch', async () => {
  render(() => <Dashboard />)
  expect(await screen.findByTestId('revenue')).toHaveTextContent('10000')
})
```

### Mocking Timers

```tsx
function TimerComponent() {
  const [seconds, setSeconds] = createSignal(0)

  onMount(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
    onCleanup(() => clearInterval(interval))
  })

  return <p data-testid="timer">{seconds()}s</p>
}

test('timer increments', () => {
  vi.useFakeTimers()

  render(() => <TimerComponent />)
  expect(screen.getByTestId('timer').textContent).toBe('0s')

  vi.advanceTimersByTime(3000)
  expect(screen.getByTestId('timer').textContent).toBe('3s')

  vi.advanceTimersByTime(5000)
  expect(screen.getByTestId('timer').textContent).toBe('8s')

  vi.useRealTimers()
})
```

## Snapshot Testing

```tsx
import { render } from 'solid-testing-library'

function WelcomeMessage({ name }: { name: string }) {
  return (
    <div class="welcome">
      <h1>Welcome, {name}!</h1>
      <p>We're glad to have you here.</p>
    </div>
  )
}

test('matches snapshot', () => {
  const { container } = render(() => <WelcomeMessage name="Alice" />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('matches inline snapshot', () => {
  const { container } = render(() => <WelcomeMessage name="Bob" />)
  expect(container.innerHTML).toMatchInlineSnapshot(
    '"<div class=\\"welcome\\"><h1>Welcome, Bob!</h1><p>We\'re glad to have you here.</p></div>"'
  )
})

// Conditional snapshot
test('matches snapshot with conditional content', () => {
  const { container: container1 } = render(() => (
    <ErrorBoundary fallback={<p>Error</p>}>
      <WorkingComponent />
    </ErrorBoundary>
  ))
  expect(container1.innerHTML).toMatchSnapshot('working state')

  const { container: container2 } = render(() => (
    <ErrorBoundary fallback={<p>Error</p>}>
      <BrokenComponent />
    </ErrorBoundary>
  ))
  expect(container2.innerHTML).toMatchSnapshot('error state')
})
```

## Code Coverage

```tsx
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/mocks/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
```

```json
// .nycrc
{
  "all": true,
  "check-coverage": true,
  "statements": 80,
  "branches": 75,
  "functions": 80,
  "lines": 80,
  "include": ["src/**/*.{ts,tsx}"],
  "exclude": ["src/**/*.test.*", "src/**/*.spec.*"]
}
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test -- --coverage
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
```

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

unit-test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

e2e-test:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0
  script:
    - npm ci
    - npm run build
    - npm run test:e2e
```

### Test Parallelization

```json
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: true,
    maxConcurrency: 10,
  },
})
```

## Custom Render Functions

```tsx
// test-utils.tsx
import { render as solidRender, type RenderOptions } from 'solid-testing-library'
import { Router, type RouterProps } from '@solidjs/router'
import { ThemeContext } from './theme'

interface WrapperOptions {
  route?: string
  theme?: { color: string; bgColor: string }
}

function createWrapper(options: WrapperOptions = {}) {
  return function Wrapper(props: { children: any }) {
    return (
      <Router location={options.route || '/'}>
        <ThemeContext.Provider value={options.theme || { color: 'black', bgColor: 'white' }}>
          {props.children}
        </ThemeContext.Provider>
      </Router>
    )
  }
}

function render(component: () => any, options: WrapperOptions = {}) {
  return solidRender(() => component(), {
    wrapper: createWrapper(options),
  })
}

export { render }
export * from 'solid-testing-library'
```

```tsx
// Using custom render
import { render, screen } from './test-utils'

test('uses custom render with router and theme', () => {
  render(() => <Dashboard />, {
    route: '/dashboard',
    theme: { color: 'white', bgColor: 'dark' },
  })

  expect(screen.getByText('Dashboard')).toBeTruthy()
})
```

## Test Fixtures and Factories

```tsx
// tests/factories/user.ts
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createUserList(count: number): User[] {
  return Array.from({ length: count }, (_, i) =>
    createUser({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
    })
  )
}
```

```tsx
// tests/factories/response.ts
export function createApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }
}
```

```tsx
// Using fixtures in tests
import { createUser, createUserList } from '../factories/user'
import { createApiResponse } from '../factories/response'

test('renders user list', async () => {
  const users = createUserList(3)
  globalThis.fetch = vi.fn().mockResolvedValue(createApiResponse(users))

  function UserList() {
    const [data] = createResource(() => fetch('/api/users').then(r => r.json()))
    return (
      <Suspense fallback={<p>Loading...</p>}>
        <ul>
          <For each={data()}>{(user: User) => (
            <li data-testid={`user-${user.id}`}>{user.name}</li>
          )}</For>
        </ul>
      </Suspense>
    )
  }

  render(() => <UserList />)
  expect(await screen.findByTestId('user-1')).toHaveTextContent('User 1')
  expect(await screen.findByTestId('user-2')).toHaveTextContent('User 2')
  expect(await screen.findByTestId('user-3')).toHaveTextContent('User 3')
})
```

## Best Practices

```tsx
// 1. Test behavior, not implementation
// Bad: testing internal state
test('bad', () => {
  const { count, increment } = createRoot(() => createCounter())
  expect(count()).toBe(0)
  increment()
  expect(count()).toBe(1)
})

// Good: testing observable behavior
test('good', () => {
  render(() => <Counter />)
  fireEvent.click(screen.getByText('Increment'))
  expect(screen.getByTestId('count').textContent).toBe('1')
})

// 2. Use createRoot for testing hooks outside components
test('hook without component', () => {
  const result = createRoot(() => {
    const [count, setCount] = createSignal(0)
    const doubled = createMemo(() => count() * 2)
    return { count, doubled, setCount }
  })

  expect(result.doubled()).toBe(0)
  result.setCount(5)
  expect(result.doubled()).toBe(10)
})

// 3. Prefer findBy over waitFor + getBy
test('async pattern', async () => {
  // Good
  expect(await screen.findByText('Loaded')).toBeTruthy()

  // Works but unnecessarily verbose
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeTruthy()
  })
})

// 4. Test error states explicitly
test('error state', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('API error'))

  render(() => (
    <ErrorBoundary fallback={(err) => <p data-testid="err">{err.message}</p>}>
      <Suspense fallback={<p>Loading...</p>}>
        <AsyncComponent fetcher={fetcher} />
      </Suspense>
    </ErrorBoundary>
  ))

  expect(await screen.findByTestId('err')).toHaveTextContent('API error')
})

// 5. Clean up between tests
afterEach(() => {
  // solid-testing-library's render auto-cleans up
  // But manual cleanup may be needed for root-level tests
  vi.restoreAllMocks()
  vi.clearAllTimers()
})

// 6. Test accessible names, not CSS selectors
test('accessible queries', () => {
  // Good
  screen.getByRole('button', { name: /submit/i })

  // Fragile
  document.querySelector('.submit-btn')
})

// 7. Avoid testing SolidJS internals
test('DO NOT test', () => {
  // Don't test that signals work — SolidJS tests that
  // Don't test that createStore is immutable — SolidJS tests that
  // Don't test that Suspense shows fallbacks — SolidJS tests that
  // Test your specific component logic
})
```

## What to Test vs What Not to Test

```
TEST                              DON'T TEST
────────────────────────────────────────────────────
Component behavior                SolidJS internals
User interactions                 Library implementation
Business logic                   Pure signal mechanics
Accessibility                    Framework reactivity (trust it)
Error states                     DOM structure (snapshot sparingly)
Loading states                   Internal variable values
Form validation logic            Private component state
Route parameter handling         Third-party library internals
Context value propagation        CSS styling details
Async data flow                  Minor text/content changes
```

## Testing Granularity

```tsx
// Unit test: test a single primitive in isolation
test('unit: formatCurrency', () => {
  const result = formatCurrency(1000)
  expect(result).toBe('$1,000.00')
})

// Component test: test a single component
test('component: button click', () => {
  const handler = vi.fn()
  render(() => <Button onClick={handler}>Click</Button>)
  fireEvent.click(screen.getByText('Click'))
  expect(handler).toHaveBeenCalledTimes(1)
})

// Integration test: test multiple components together
test('integration: todo form + list', () => {
  render(() => <TodoApp />)
  fireEvent.input(screen.getByTestId('todo-input'), { target: { value: 'Task' } })
  fireEvent.click(screen.getByTestId('add-btn'))
  expect(screen.getByText('Task')).toBeTruthy()
})

// E2E test: full user flow in browser
test('e2e: user can register and login', async ({ page }) => {
  await page.goto('/register')
  await page.fill('#email', 'new@user.com')
  await page.fill('#password', 'secure123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Performance Testing

```tsx
// Test reactive performance — track dependency counts
function testReactivityPerformance() {
  const [a, setA] = createSignal(0)
  const [b, setB] = createSignal(0)
  const effectSpy = vi.fn()

  createRoot(() => {
    createEffect(() => {
      effectSpy(a(), b())
    })
  })

  // Only one effect run per update
  expect(effectSpy).toHaveBeenCalledTimes(1)

  setA(1)
  expect(effectSpy).toHaveBeenCalledTimes(2)

  setB(1)
  expect(effectSpy).toHaveBeenCalledTimes(3)

  // Setting same value doesn't trigger re-run
  setA(1)
  expect(effectSpy).toHaveBeenCalledTimes(3)  // Not called — value unchanged
})

// Test render count for a component
function testRenderCount() {
  const renderCounter = vi.fn()

  function TrackedComponent(props: { value: number }) {
    renderCounter()
    return <p>{props.value}</p>
  }

  const { setProps } = render(() => <TrackedComponent value={0} />)
  expect(renderCounter).toHaveBeenCalledTimes(1)

  // When value changes, component re-renders
  setProps({ value: 1 })
  expect(renderCounter).toHaveBeenCalledTimes(2)
}
```

## Migration Testing (React to SolidJS)

```tsx
// Before: React component
// function UserList() {
//   const [users, setUsers] = useState([])
//   useEffect(() => {
//     fetch('/api/users').then(r => r.json()).then(setUsers)
//   }, [])
//   return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
// }

// After: SolidJS component
function UserList() {
  const [users] = createResource(() => fetch('/api/users').then(r => r.json()))

  return (
    <ul>
      <Suspense fallback={<p>Loading...</p>}>
        <For each={users()}>{(user) => <li>{user.name}</li>}</For>
      </Suspense>
    </ul>
  )
}

test('migrated component renders users', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]),
  })

  render(() => <UserList />)
  expect(await screen.findByText('Alice')).toBeTruthy()
  expect(await screen.findByText('Bob')).toBeTruthy()
  // SolidJS uses keyed iteration via For — no key prop needed
  // Accessible queries work the same
  // Async testing is simpler with Suspense
})
```
