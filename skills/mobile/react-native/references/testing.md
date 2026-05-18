# React Native Testing

## Jest Unit Test

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';

describe('useOrders', () => {
  it('fetches orders', async () => {
    const { result } = renderHook(() => useOrders(), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });
});
```

## Component Test (RNTL)

```typescript
describe('OrderCard', () => {
  it('renders customer name', () => {
    render(<OrderCard order={mockOrder} />);
    expect(screen.getByText('Alice')).toBeOnTheScreen();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<OrderCard order={mockOrder} onPress={onPress} />);
    fireEvent.press(screen.getByText('Alice'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

## MSW (API mocking)

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/orders', () =>
    HttpResponse.json([{ id: '1', customerName: 'Alice' }])
  ),
];
```

## Detox E2E

```typescript
describe('Order Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should create order', async () => {
    await element(by.id('create-order')).tap();
    await element(by.id('customer-input')).typeText('Alice');
    await element(by.id('submit')).tap();
    await expect(element(by.text('Order saved'))).toBeVisible();
  });
});
```
