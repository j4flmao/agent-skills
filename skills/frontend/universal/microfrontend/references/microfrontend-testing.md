# Microfrontend Testing Reference

## Testing Strategies

Microfrontend testing spans unit, integration, and E2E levels across independently deployed apps.

```typescript
// Unit test within a single MFE
import { render, screen } from '@testing-library/react';
import { OrderCard } from './OrderCard';

test('displays order total', () => {
  render(<OrderCard order={{ id: '1', total: 99.99, status: 'pending' }} />);
  expect(screen.getByText('$99.99')).toBeInTheDocument();
});
```

## Integration Testing with Shell

```typescript
// Test MFE integration in shell container
import { render, waitFor } from '@testing-library/react';
import { Shell } from './Shell';
import { registerMFE } from './mfe-registry';

test('loads orders MFE', async () => {
  registerMFE('orders', {
    render: () => import('orders/App'),
    url: 'http://localhost:3001',
  });
  
  render(<Shell />);
  await waitFor(() => {
    expect(screen.getByTestId('orders-mfe')).toBeInTheDocument();
  });
});
```

## Cross-MFE Communication Testing

```typescript
import { fireEvent } from '@testing-library/react';
import { EventBus } from './shared/event-bus';

test('order placed triggers cart update', () => {
  const cartSpy = jest.fn();
  EventBus.on('order:placed', cartSpy);
  
  fireEvent.click(screen.getByText('Place Order'));
  
  expect(cartSpy).toHaveBeenCalledWith(
    expect.objectContaining({ orderId: expect.any(String) })
  );
});
```

## E2E Testing Across MFEs

```typescript
// Cypress test across microfrontends
describe('Order Flow', () => {
  it('completes full order across MFEs', () => {
    cy.visit('http://app.example.com');
    
    // Cart MFE
    cy.get('[data-mfe="cart"]').within(() => {
      cy.contains('Add to Cart').click();
    });
    
    // Checkout MFE
    cy.get('[data-mfe="checkout"]').within(() => {
      cy.get('input[name="email"]').type('test@test.com');
      cy.get('button[type="submit"]').click();
    });
    
    // Confirmation MFE
    cy.get('[data-mfe="confirmation"]').should('contain', 'Order Confirmed');
  });
});
```

## Mocking Remote Modules

```typescript
// Jest mock for federated module
jest.mock('orders/OrderList', () => ({
  OrderList: ({ onSelect }) => (
    <div data-testid="mock-order-list">
      <button onClick={() => onSelect('order-1')}>Mock Order</button>
    </div>
  ),
}));
```

## Key Points

- Each MFE has independent unit and integration tests
- Shell integration tests verify MFE loading and lifecycle
- Event bus testing validates cross-MFE communication
- E2E tests span all MFEs in the application shell
- Federated modules are mocked for isolated testing
- Contract tests verify MFE interface compatibility
- Shared test utilities are versioned in the shell package
- Visual regression tests catch styling inconsistencies
- Performance budgets enforced per MFE bundle
- Smoke tests run in production after each MFE deployment
