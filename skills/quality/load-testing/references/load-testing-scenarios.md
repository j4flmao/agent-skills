# Load Test Scenarios

## Overview
Design realistic load test scenarios: user journey modeling, data diversity, think time simulation, ramp patterns, and multi-stage scenarios.

## User Journey Modeling

```typescript
// k6 — realistic user journey scenario
import { group } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('test-users', () => {
  return JSON.parse(open('./test-users.json'));
});

export const options = {
  scenarios: {
    browsing_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 200 },   // Ramp up
        { duration: '20m', target: 200 },  // Steady state
        { duration: '5m', target: 0 },     // Ramp down
      ],
      exec: 'browsingScenario',
      gracefulStop: '30s',
    },
    checkout_users: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '30m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'checkoutScenario',
    },
  },
  thresholds: {
    'browsing_duration': ['p(95)<500'],
    'checkout_duration': ['p(99)<2000'],
    'http_req_failed': ['rate<0.01'],
  },
};

export function browsingScenario() {
  const user = users[__VU % users.length];

  group('Browse products', () => {
    // Homepage
    let res = http.get(`${BASE_URL}/api/products?page=1&limit=20`);
    check(res, { 'products loaded': (r) => r.status === 200 });

    // View product detail
    const products = res.json().data || [];
    if (products.length > 0) {
      const product = products[__ITER % products.length];
      res = http.get(`${BASE_URL}/api/products/${product.id}`);
      check(res, { 'product detail': (r) => r.status === 200 });
    }

    // Search
    res = http.get(`${BASE_URL}/api/products/search?q=${user.searchTerm}`);
    check(res, { 'search results': (r) => r.status === 200 });
  });

  sleep(Math.random() * 30 + 10); // 10-40s think time
}

export function checkoutScenario() {
  const user = users[__VU % users.length];

  group('Checkout flow', () => {
    // Add to cart
    let res = http.post(`${BASE_URL}/api/cart/items`, JSON.stringify({
      userId: user.id,
      productId: user.productId,
      quantity: 1,
    }), { headers: { 'Content-Type': 'application/json' } });
    check(res, { 'add to cart': (r) => r.status === 200 });

    // Get cart
    res = http.get(`${BASE_URL}/api/cart/${user.id}`);
    check(res, { 'cart retrieved': (r) => r.status === 200 });

    // Place order
    res = http.post(`${BASE_URL}/api/orders`, JSON.stringify({
      userId: user.id,
      cartId: res.json().cartId,
      paymentMethod: 'card',
    }), { headers: { 'Content-Type': 'application/json' } });
    check(res, { 'order placed': (r) => r.status === 201 });
  });

  sleep(Math.random() * 5 + 2); // 2-7s think time
}
```

## Think Time Simulation

```typescript
class ThinkTimeSimulator {
  // Realistic think time distributions
  static quick(): number {
    // Log-normal distribution: most users quick, some slow
    return Math.max(1, Math.round(randomLogNormal(1.5, 0.5) * 1000));
  }

  static browsing(): number {
    // Users spend 10-60 seconds browsing
    return Math.random() * 50000 + 10000;
  }

  static formFilling(): number {
    // Users spend 30-120 seconds filling forms
    return Math.random() * 90000 + 30000;
  }

  // Resource-intensive page
  static heavyPage(): number {
    return Math.random() * 10000 + 5000;
  }
}

// Usage in k6
export default function () {
  // API call
  const res = http.get(`${BASE_URL}/api/products`);
  check(res, { 'status 200': (r) => r.status === 200 });

  // Simulate user reading/thinking
  sleep(ThinkTimeSimulator.browsing() / 1000);
}
```

## Ramp Patterns

```typescript
export const options = {
  scenarios: {
    // Gradual ramp (discover breaking point)
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '5m', target: 50 },    // 50 RPS after 5 min
        { duration: '5m', target: 100 },   // 100 RPS after 10 min
        { duration: '5m', target: 200 },   // 200 RPS after 15 min
        { duration: '5m', target: 400 },   // 400 RPS after 20 min
        { duration: '5m', target: 800 },   // 800 RPS after 25 min
      ],
    },

    // Spike (instant surge)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },     // Normal load
        { duration: '10s', target: 1000 },   // Spike!
        { duration: '3m', target: 1000 },    // Hold spike
        { duration: '10s', target: 10 },     // Back to normal
        { duration: '1m', target: 0 },       // Ramp down
      ],
    },

    // Step pattern (find exact capacity)
    step_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },  // Hold at 100
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },  // Hold at 200
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },  // Hold at 300
      ],
    },
  },
};
```

## Data Diversity

```typescript
// Generate diverse test data
class TestDataGenerator {
  static generateUsers(count: number): TestUser[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `load-test-user-${i}`,
      email: `loadtest${i}@example.com`,
      // Vary user attributes for realistic distribution
      tier: ['free', 'pro', 'enterprise'][i % 3],
      region: ['us-east', 'eu-west', 'ap-southeast'][i % 3],
      yearsActive: i % 10,
      productId: `product-${i % 100}`,
      searchTerm: ['phone', 'laptop', 'shoes', 'book', 'headphones'][i % 5],
    }));
  }

  // Mix of request types
  static requestMix(): Array<{ path: string; weight: number }> {
    return [
      { path: '/api/products', weight: 40 },         // Browse (40%)
      { path: '/api/products/:id', weight: 25 },     // Detail (25%)
      { path: '/api/search', weight: 15 },            // Search (15%)
      { path: '/api/cart', weight: 10 },              // Cart (10%)
      { path: '/api/orders', weight: 10 },            // Checkout (10%)
    ];
  }
}
```

## Key Points
- Model scenarios based on real user journeys (browsing, checkout, search)
- Use multiple scenario types: ramping VUs for browsing, constant arrival for checkout
- Simulate realistic think times (log-normal distribution for human behavior)
- Use ramp patterns: gradual (find breaking point), spike (burst), step (exact capacity)
- Diversity test data: vary user tiers, regions, search terms, products
- Mix request types proportionally to real traffic (browse 40%, detail 25%, etc.)
- Use SharedArray for test data to avoid memory duplication across VUs
- Separate browsing and checkout into different executor types
