# BFF Testing

## Overview
Test BFF services for correct data aggregation, error handling, caching behavior, and security boundaries across different client types.

## Unit Testing BFF Aggregation

```typescript
describe('CheckoutBFF Aggregation', () => {
  let bff: CheckoutBFF;
  let orderService: jest.Mocked<OrderServiceClient>;
  let paymentService: jest.Mocked<PaymentServiceClient>;
  let shippingService: jest.Mocked<ShippingServiceClient>;

  beforeEach(() => {
    orderService = { getCart: jest.fn(), createOrder: jest.fn() };
    paymentService = { getMethods: jest.fn() };
    shippingService = { getRates: jest.fn() };
    bff = new CheckoutBFF(orderService, paymentService, shippingService);
  });

  it('aggregates data from multiple services', async () => {
    orderService.getCart.mockResolvedValue({
      items: [{ id: '1', name: 'Product', price: 29.99, quantity: 2 }],
      total: 59.98,
    });
    paymentService.getMethods.mockResolvedValue(['card', 'paypal']);
    shippingService.getRates.mockResolvedValue([
      { method: 'standard', price: 5.99, eta: '5-7 days' },
      { method: 'express', price: 14.99, eta: '1-2 days' },
    ]);

    const result = await bff.getCheckoutData('cart_123');

    expect(result).toEqual({
      items: [{ id: '1', name: 'Product', price: 29.99, quantity: 2 }],
      total: 59.98,
      paymentMethods: ['card', 'paypal'],
      shippingOptions: [
        { method: 'standard', price: 5.99, eta: '5-7 days' },
        { method: 'express', price: 14.99, eta: '1-2 days' },
      ],
    });
  });

  it('returns partial data when one service fails', async () => {
    orderService.getCart.mockResolvedValue({
      items: [{ id: '1', name: 'Product', price: 29.99, quantity: 1 }],
      total: 29.99,
    });
    paymentService.getMethods.mockRejectedValue(new Error('Payment service down'));
    shippingService.getRates.mockResolvedValue([]);

    const result = await bff.getCheckoutData('cart_123');

    expect(result.items).toBeDefined();
    expect(result.paymentMethods).toBeUndefined(); // Partial — service failed
    expect(result.shippingOptions).toEqual([]);
    expect(result._errors).toContain('Payment service down');
  });
});
```

## Client-Specific Response Tests

```typescript
describe('Client-Specific BFF Responses', () => {
  it('mobile BFF returns lightweight response', async () => {
    const mobileBff = new MobileBFF(orderService, userService);
    const result = await mobileBff.getOrderList('user_123');

    expect(result).toEqual({
      orders: [
        {
          id: 'order_1',
          status: 'shipped',
          total: 49.99,
          // No detailed fields for mobile
        },
      ],
    });
    expect(result.orders[0]).not.toHaveProperty('itemDetails');
    expect(result.orders[0]).not.toHaveProperty('timeline');
  });

  it('web BFF returns detailed response with all data', async () => {
    const webBff = new WebBFF(orderService, userService);
    const result = await webBff.getOrderList('user_123');

    expect(result.orders[0]).toHaveProperty('itemDetails');
    expect(result.orders[0]).toHaveProperty('timeline');
    expect(result.orders[0]).toHaveProperty('shippingInfo');
    expect(result.orders[0]).toHaveProperty('paymentInfo');
    expect(result.orders[0]).toHaveProperty('canCancel');
    expect(result.orders[0]).toHaveProperty('canReturn');
  });
});
```

## Caching Behavior Tests

```typescript
describe('BFF Caching', () => {
  it('caches aggregated responses', async () => {
    const bff = new CheckoutBFF(orderService, paymentService, shippingService, cacheService);

    orderService.getCart.mockResolvedValue(cartData);
    paymentService.getMethods.mockResolvedValue(['card']);

    // First call — should fetch from services
    const result1 = await bff.getCheckoutData('cart_123');
    expect(orderService.getCart).toHaveBeenCalledTimes(1);

    // Second call — should return cached
    const result2 = await bff.getCheckoutData('cart_123');
    expect(result2).toEqual(result1);
    expect(orderService.getCart).toHaveBeenCalledTimes(1); // Still 1
    expect(cacheService.get).toHaveBeenCalledWith('bff:checkout:cart_123');
  });

  it('invalidates cache when underlying data changes', async () => {
    orderService.getCart
      .mockResolvedValueOnce(cartDataV1)
      .mockResolvedValueOnce(cartDataV2);

    const resultV1 = await bff.getCheckoutData('cart_123');
    expect(resultV1.total).toBe(59.98);

    // Simulate data change
    await bff.invalidateCache('cart_123');

    const resultV2 = await bff.getCheckoutData('cart_123');
    expect(resultV2.total).toBe(89.97);
    expect(orderService.getCart).toHaveBeenCalledTimes(2);
  });
});
```

## Security Boundary Tests

```typescript
describe('BFF Security', () => {
  it('does not expose internal service endpoints', async () => {
    const bff = new MobileBFF(orderService);
    const result = await bff.getOrder('order_123');

    // BFF should not leak internal service URLs
    expect(result).not.toHaveProperty('serviceUrl');
    expect(result).not.toHaveProperty('internalId');
    expect(JSON.stringify(result)).not.toMatch(/internal|backend|service\.internal/);
  });

  it('respects user authorization boundaries', async () => {
    const bff = new MobileBFF(orderService, userService);
    orderService.getOrders.mockResolvedValue([
      { id: 'order_1', userId: 'user_123' },
      { id: 'order_2', userId: 'user_456' }, // Different user
    ]);

    // Even if backend returns data for different users, BFF should filter
    const result = await bff.getOrderList('user_123');
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].id).toBe('order_1');
  });
});
```

## Integration Test

```typescript
describe('BFF Integration', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createBffApp();
    await setupWireMock();
  });

  afterAll(async () => {
    await teardownWireMock();
  });

  it('composes and returns data for mobile checkout', async () => {
    const res = await request(app)
      .get('/mobile/v1/checkout/cart_123')
      .set('Authorization', 'Bearer mobile-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
      shipping: expect.any(Object),
    });
    // Mobile BFF should not include admin-only fields
    expect(res.body.data).not.toHaveProperty('internalNotes');
    expect(res.body.data).not.toHaveProperty('costBreakdown');
  });
});
```

## Key Points
- Unit test BFF data aggregation with mocked downstream services
- Test partial response behavior when backing services fail
- Verify client-specific responses (mobile vs web) return correct data shapes
- Test caching behavior: cache hits, cache invalidation
- Validate security boundaries: no internal endpoint exposure, user data isolation
