# Frontend Testing Reference

## Testing Pyramid

```typescript
// Unit tests — test individual functions and hooks
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

test('increments counter', () => {
  const { result } = renderHook(() => useCounter());
  
  act(() => result.current.increment());
  
  expect(result.current.count).toBe(1);
});

// Integration tests — test component interactions
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderForm } from './OrderForm';

test('submits order with items', async () => {
  const onSubmit = jest.fn();
  render(<OrderForm onSubmit={onSubmit} />);
  
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'test@test.com' },
  });
  fireEvent.click(screen.getByText('Submit'));
  
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@test.com' })
    );
  });
});
```

## API Mocking

```typescript
// MSW (Mock Service Worker)
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/orders', () => {
    return HttpResponse.json([
      { id: '1', status: 'pending', total: 99.99 },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('displays orders from API', async () => {
  render(<OrderList />);
  await waitFor(() => {
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
```

## Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no a11y violations', async () => {
  const { container } = render(<OrderForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Visual Regression Testing

```typescript
import { StorybookTest } from '@storybook/test-runner';

describe('OrderCard visual tests', () => {
  it('matches snapshot', async () => {
    await StorybookTest.run({
      storyId: 'components-ordercard--default',
    });
  });
});
```

## Key Points

- Unit tests validate individual functions and hooks
- Integration tests verify component interactions
- MSW mocks API responses at the network level
- Accessibility tests catch WCAG violations
- Visual regression tests catch unintended style changes
- Test user flows rather than implementation details
- Mock external dependencies, not internal logic
- Use data-testid for resilient element queries
- Run tests in CI with --ci flag for deterministic results
- Coverage reports identify untested code paths
