# Testing Library Guide

## Query Priority

| Priority | Query | When to Use |
|----------|-------|-------------|
| 1 | `getByRole` | Accessible elements (buttons, links, headings) |
| 2 | `getByLabelText` | Form inputs with labels |
| 3 | `getByPlaceholderText` | Inputs with placeholder only |
| 4 | `getByText` | Non-interactive elements (paragraphs, divs) |
| 5 | `getByTestId` | Last resort (data-testid attribute) |

```typescript
// ✅ Preferred
expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
expect(screen.getByLabelText(/email/i)).toHaveValue('user@example.com')

// ❌ Avoid
expect(screen.getByTestId('submit-button')).toBeEnabled()
```

## Query Rules
- `getBy*` — throws if not found (assert existence)
- `queryBy*` — returns null if not found (assert absence)
- `findBy*` — returns Promise, waits up to timeout (async elements)
- `getAllBy*` / `queryAllBy*` / `findAllBy*` — return arrays

## Testing Patterns

### User Events
```typescript
import userEvent from '@testing-library/user-event'

test('submit form', async () => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email/i), 'user@test.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  expect(onSubmit).toHaveBeenCalledWith({ email: 'user@test.com' })
})
```

### Async
```typescript
test('loads data', async () => {
  render(<UserProfile userId="123" />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  expect(await screen.findByText(/john/i)).toBeInTheDocument()
})
```

## What NOT to Test
- Implementation details (state values, internal methods)
- Private functions (test through public API)
- Framework internals (React/Vue/Angular behavior)
- Styling (CSS classes)
