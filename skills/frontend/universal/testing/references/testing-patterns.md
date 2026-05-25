# Testing Patterns

## Component Test Patterns

### State Patterns

```typescript
describe('UserList', () => {
  it('shows loading state', () => {
    render(<UserList />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    render(<UserList />)
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i))
    expect(screen.getByText(/no users/i)).toBeInTheDocument()
  })

  it('shows error state', async () => {
    server.use(http.get('/api/users', () => HttpResponse.error()))
    render(<UserList />)
    expect(await screen.findByText(/error/i)).toBeInTheDocument()
  })

  it('shows users list', async () => {
    render(<UserList />)
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })
})
```

### Interaction Patterns

```typescript
it('calls onSubmit with form data', async () => {
  const onSubmit = vi.fn()
  render(<LoginForm onSubmit={onSubmit} />)

  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email/i), 'user@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'password123',
  })
})
```

### Accessibility Patterns

```typescript
it('has no accessibility violations', async () => {
  const { container } = render(<LoginForm />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

it('announces validation errors', async () => {
  render(<LoginForm />)
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))
  const alerts = screen.getAllByRole('alert')
  expect(alerts.length).toBeGreaterThan(0)
})
```

## Custom Render Functions

```typescript
// test-utils.tsx
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

interface CustomRenderOptions extends RenderOptions {
  initialEntries?: string[]
}

function customRender(ui: React.ReactElement, options?: CustomRenderOptions) {
  const queryClient = createTestQueryClient()
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options?.initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
```

## Testing Patterns by Type

| Test Type | Pattern | Example |
|-----------|---------|---------|
| Component | Render + query + assert | `expect(screen.getByText('Submit'))` |
| Hook | `renderHook` | `renderHook(() => useCounter())` |
| Async | `findBy*` / `waitFor` | `await screen.findByText('Done')` |
| Route | `MemoryRouter` | Wrap in router with initial entries |
| Store | `getState().action()` | Test store directly |
| API | MSW handler | Mock at network level |
