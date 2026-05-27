# Component Test Patterns

## Overview

Component testing verifies that individual UI components render correctly, respond to user interactions, display appropriate states, and meet accessibility standards. This reference covers patterns organized by atomic design levels and common component types.

## Component Test Organization by Atomic Design Level

### Atoms

Atoms are the smallest building blocks: buttons, inputs, labels, icons.

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('should render with label', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button', { name: /click me/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeDisabled()
  })

  it('should show loading state', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeDisabled()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
```

### Molecules

Molecules combine atoms: form fields with labels and errors, search bars, cards.

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormField } from './FormField'

describe('FormField', () => {
  const defaultProps = {
    label: 'Email',
    name: 'email',
    type: 'email' as const,
  }

  it('should render label and input', () => {
    render(<FormField {...defaultProps} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('should show error message when error prop is provided', () => {
    render(<FormField {...defaultProps} error="Invalid email" />)
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInvalid()
  })

  it('should call onChange when typing', async () => {
    const onChange = vi.fn()
    render(<FormField {...defaultProps} onChange={onChange} />)
    const input = screen.getByLabelText(/email/i)
    await userEvent.type(input, 'test@example.com')
    expect(onChange).toHaveBeenCalled()
  })
})
```

### Organisms

Organisms compose molecules and atoms: forms, headers, product lists.

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('should submit form with email and password', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })
})
```

### Templates/Pages

Templates compose organisms into page layouts.

```typescript
import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'

describe('Dashboard', () => {
  it('should render all sections', () => {
    render(<Dashboard />)
    expect(screen.getByRole('heading', { name: /revenue/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument()
    expect(screen.getByRole('table' )).toBeInTheDocument()
  })

  it('should display current date in header', () => {
    render(<Dashboard />)
    const today = new Date().toLocaleDateString()
    expect(screen.getByText(today)).toBeInTheDocument()
  })
})
```

## Testing User Interactions

### Click Interactions

```typescript
it('should toggle dropdown on click', async () => {
  render(<Dropdown items={['Option 1', 'Option 2']} />)
  const trigger = screen.getByRole('button', { name: /select/i })

  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await userEvent.click(trigger)
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  await userEvent.click(trigger)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
```

### Type Interactions

```typescript
it('should update input value on typing', async () => {
  render(<SearchInput />)
  const input = screen.getByRole('searchbox')

  await userEvent.type(input, 'search term')
  expect(input).toHaveValue('search term')

  await userEvent.clear(input)
  expect(input).toHaveValue('')
})
```

### Keyboard Interactions

```typescript
it('should submit on Enter key', async () => {
  const onSubmit = vi.fn()
  render(<SearchBar onSubmit={onSubmit} />)
  const input = screen.getByRole('searchbox')

  await userEvent.type(input, 'query{Enter}')
  expect(onSubmit).toHaveBeenCalledWith('query')
})

it('should close modal on Escape', async () => {
  render(<Modal isOpen onClose={vi.fn()} />)
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
```

### Tab Navigation

```typescript
it('should navigate between form fields with Tab', async () => {
  render(<LoginForm />)
  const emailInput = screen.getByLabelText(/email/i)
  const passwordInput = screen.getByLabelText(/password/i)
  const submitButton = screen.getByRole('button', { name: /sign in/i })

  expect(document.body).toHaveFocus()
  await userEvent.tab()
  expect(emailInput).toHaveFocus()
  await userEvent.tab()
  expect(passwordInput).toHaveFocus()
  await userEvent.tab()
  expect(submitButton).toHaveFocus()
})
```

## Form Testing

### Validation

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignUpForm } from './SignUpForm'

describe('SignUpForm', () => {
  it('should validate email format', async () => {
    render(<SignUpForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'invalid')
    await userEvent.type(screen.getByLabelText(/password/i), 'Pass123!')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('should validate password requirements', async () => {
    render(<SignUpForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('should validate confirm password matches', async () => {
    render(<SignUpForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'Pass123!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'DifferentPass1!')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/passwords must match/i)).toBeInTheDocument()
  })
})
```

### Submission

```typescript
it('should submit form data', async () => {
  const onSubmit = vi.fn()
  render(<SignUpForm onSubmit={onSubmit} />)

  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'Pass123!')
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'Pass123!')
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'Pass123!',
    confirmPassword: 'Pass123!',
  })
})
```

## List Testing

### Empty State

```typescript
it('should show empty state when no items', async () => {
  render(<UserList users={[]} />)
  expect(screen.getByText(/no users found/i)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /empty/i })).toBeInTheDocument()
})
```

### Loading State

```typescript
it('should show loading spinner', () => {
  render(<UserList loading />)
  expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})
```

### Error State

```typescript
it('should show error message with retry', async () => {
  const onRetry = vi.fn()
  render(<UserList error="Failed to load" onRetry={onRetry} />)

  expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /retry/i }))
  expect(onRetry).toHaveBeenCalled()
})
```

### Populated State

```typescript
it('should render list of users', () => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]

  render(<UserList users={users} />)
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('Bob')).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})
```

### Filtered List

```typescript
it('should filter items based on search', async () => {
  render(<FilterableList />)
  const searchInput = screen.getByRole('searchbox')

  await userEvent.type(searchInput, 'alice')
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.queryByText('Bob')).not.toBeInTheDocument()
})
```

## Modal/Dialog Testing

### Open and Close

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('should not render when closed', () => {
    render(<ConfirmDialog isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(<ConfirmDialog isOpen={true} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should call onClose when backdrop clicked', async () => {
    const onClose = vi.fn()
    render(<ConfirmDialog isOpen={true} onClose={onClose} />)
    await userEvent.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should call onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog isOpen={true} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
```

### Focus Management

```typescript
it('should trap focus within dialog', async () => {
  render(
    <>
      <button>Outside</button>
      <ConfirmDialog isOpen={true} />
    </>
  )

  const confirmButton = screen.getByRole('button', { name: /confirm/i })
  const cancelButton = screen.getByRole('button', { name: /cancel/i })

  expect(confirmButton).toHaveFocus()

  await userEvent.tab()
  expect(cancelButton).toHaveFocus()

  await userEvent.tab()
  expect(confirmButton).toHaveFocus()
})

it('should restore focus on close', async () => {
  const triggerButton = document.createElement('button')
  triggerButton.textContent = 'Open'
  document.body.appendChild(triggerButton)
  triggerButton.focus()

  const { unmount } = render(<ConfirmDialog isOpen={true} />)
  unmount()

  expect(document.activeElement).toBe(triggerButton)
  document.body.removeChild(triggerButton)
})
```

## Testing with Providers

### Custom Render Function

```typescript
// test-utils.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'styled-components'
import { theme } from './theme'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  routerProps?: MemoryRouterProps
  queryClient?: QueryClient
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function AllTheProviders({ children, routerProps }: {
  children: React.ReactNode
  routerProps?: MemoryRouterProps
}) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter {...routerProps}>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { routerProps, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders routerProps={routerProps}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }
```

### Using Custom Render

```typescript
import { render, screen } from './test-utils'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  it('should render with router and query client', async () => {
    render(<DashboardPage />, {
      routerProps: { initialEntries: ['/dashboard'] },
    })

    expect(await screen.findByText(/welcome/i)).toBeInTheDocument()
  })
})
```

### Testing with QueryClient

```typescript
it('should display data from API', async () => {
  render(<UserProfile userId={1} />)
  expect(await screen.findByText('Alice')).toBeInTheDocument()
})

it('should show loading state while fetching', () => {
  render(<UserProfile userId={1} />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
})

it('should show error state on fetch failure', async () => {
  render(<UserProfile userId={999} />)
  expect(await screen.findByText(/user not found/i)).toBeInTheDocument()
})
```

### Testing with Router

```typescript
it('should navigate to user page on click', async () => {
  render(
    <UserList />,
    { routerProps: { initialEntries: ['/users'] } }
  )

  await userEvent.click(screen.getByText('Alice'))
  expect(screen.getByText(/alice's profile/i)).toBeInTheDocument()
})

it('should read query parameters', () => {
  render(
    <SearchResults />,
    { routerProps: { initialEntries: ['/search?q=test'] } }
  )

  expect(screen.getByDisplayValue('test')).toBeInTheDocument()
})
```

## Testing Accessibility

### vitest-axe Setup

```typescript
// vitest.setup.ts
import 'vitest-axe/extend-expect'
```

```typescript
import { render } from './test-utils'
import { axe } from 'vitest-axe'

describe('Accessibility', () => {
  it('Button should have no violations', async () => {
    const { container } = render(<Button>Submit</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no violations in all states', async () => {
    const { container: errorContainer } = render(
      <FormField label="Email" error="Required" />
    )
    const errorResults = await axe(errorContainer)
    expect(errorResults).toHaveNoViolations()

    const { container: validContainer } = render(
      <FormField label="Email" value="test@test.com" />
    )
    const validResults = await axe(validContainer)
    expect(validResults).toHaveNoViolations()
  })
})
```

### Common Accessibility Checks

```typescript
it('should have proper heading hierarchy', () => {
  render(<Dashboard />)
  const headings = screen.getAllByRole('heading')
  expect(headings[0]).toHaveTextContent(/dashboard/i)
})

it('should have accessible form controls', () => {
  render(<SearchForm />)
  expect(screen.getByRole('searchbox')).toHaveAccessibleName(/search/i)
  expect(screen.getByRole('button')).toHaveAccessibleName(/submit search/i)
})

it('should announce dynamic content to screen readers', () => {
  render(<LiveRegion />)
  const region = screen.getByRole('status')
  expect(region).toHaveAttribute('aria-live', 'polite')
})

it('should have appropriate ARIA attributes', () => {
  render(
    <nav aria-label="Main navigation">
      <a href="/">Home</a>
    </nav>
  )
  expect(screen.getByRole('navigation')).toHaveAccessibleName('Main navigation')
})
```

## Testing Responsive Variants

```typescript
it('should render mobile variant', () => {
  window.innerWidth = 375
  window.dispatchEvent(new Event('resize'))

  render(<Header />)
  expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeVisible()
})

it('should render desktop variant', () => {
  window.innerWidth = 1440
  window.dispatchEvent(new Event('resize'))

  render(<Header />)
  expect(screen.getByRole('navigation')).toBeVisible()
  expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument()
})
```

### Using Media Query Utility

```typescript
function setViewport(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
}

describe('ResponsiveHeader', () => {
  beforeEach(() => {
    setViewport(1440)
  })

  it('should show mobile menu button on small screens', () => {
    setViewport(375)
    render(<Header />)
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('should show desktop navigation on large screens', () => {
    render(<Header />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
```

## Testing Animation States

### Using Fake Timers

```typescript
it('should fade in on mount', async () => {
  vi.useFakeTimers()
  render(<FadeIn>Content</FadeIn>)

  expect(screen.getByText('Content')).toHaveStyle({ opacity: 0 })
  vi.advanceTimersByTime(300)
  expect(screen.getByText('Content')).toHaveStyle({ opacity: 1 })

  vi.useRealTimers()
})
```

### Testing Transition End

```typescript
it('should call onTransitionEnd after animation', async () => {
  const onComplete = vi.fn()
  render(<SlideIn onComplete={onComplete}>Content</SlideIn>)

  fireEvent.transitionEnd(screen.getByText('Content'))
  expect(onComplete).toHaveBeenCalled()
})
```

## Performance Testing Components

### Render Timing

```typescript
it('should render within performance budget', () => {
  const start = performance.now()
  const { rerender } = render(<LargeList items={generateItems(100)} />)
  const renderTime = performance.now() - start

  expect(renderTime).toBeLessThan(100)
})
```

### Re-render Detection

```typescript
it('should not re-render when props have not changed', () => {
  const renderSpy = vi.spyOn(console, 'log')
  const { rerender } = render(<ExpensiveComponent data={data} />)
  rerender(<ExpensiveComponent data={data} />)

  const renderCalls = renderSpy.mock.calls.filter(
    ([msg]: string[]) => msg.includes('render')
  )
  expect(renderCalls).toHaveLength(1)
  renderSpy.mockRestore()
})
```

## Testing Error Boundaries

```typescript
it('should catch render error and show fallback', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowError />
    </ErrorBoundary>
  )

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
})

it('should call onError when error is caught', () => {
  const onError = vi.fn()
  const ThrowError = () => {
    throw new Error('Test error')
  }

  render(
    <ErrorBoundary onError={onError} fallback={<div>Error</div>}>
      <ThrowError />
    </ErrorBoundary>
  )

  expect(onError).toHaveBeenCalled()
})
```

## Testing Compound Components

```typescript
it('should compose select components correctly', async () => {
  render(
    <Select>
      <SelectTrigger>Choose option</SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  )

  await userEvent.click(screen.getByRole('button', { name: /choose/i }))
  await userEvent.click(screen.getByRole('option', { name: /option 1/i }))
  expect(screen.getByRole('button')).toHaveTextContent('Option 1')
})
```

## Test Structure Best Practices

```typescript
describe('UserProfile', () => {
  // Setup shared across tests
  const defaultUser = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
  }

  // Describe specific states
  describe('when user is loaded', () => {
    it('should display user name and email', () => {
      render(<UserProfile user={defaultUser} />)
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })
  })

  describe('when user is loading', () => {
    it('should show loading indicator', () => {
      render(<UserProfile loading />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('when error occurs', () => {
    it('should display error message', () => {
      render(<UserProfile error="Failed to load" />)
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })
})
```

## Key Points

- Organize tests by atomic design level: atoms, molecules, organisms, templates
- Test all component states: loading, empty, error, populated
- Use `userEvent` over `fireEvent` for realistic interactions (click, type, tab, keyboard)
- Create a custom `render` function with all providers (Router, QueryClient, Theme)
- Test accessibility with `vitest-axe` — every component should have no violations
- Test responsive variants by mocking viewport size
- Test animation states with fake timers
- Forms need validation, submission, and error display tests
- Modals/dialogs need open, close, confirm, and focus management tests
- Lists need empty, loading, error, populated, and filtered state tests
