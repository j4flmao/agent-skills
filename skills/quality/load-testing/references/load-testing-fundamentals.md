# Load Testing Fundamentals

## Overview
Load testing evaluates system behavior under expected and peak load conditions. It measures response times, throughput, resource utilization, and error rates to validate that the system meets performance requirements. Load testing prevents production incidents caused by traffic spikes, memory leaks, and capacity limits.

## Core Concepts

### Concept 1: Load Test Types
- **Load test**: Expected traffic levels for sustained period (e.g., 1000 concurrent users for 30 min)
- **Stress test**: Above expected traffic to find breaking point (e.g., ramp from 0 to 5000 users)
- **Spike test**: Sudden traffic surge (e.g., 100 to 5000 users in 10 seconds)
- **Soak test**: Sustained moderate load over hours to detect memory leaks (e.g., 500 users for 4 hours)
- **Scalability test**: Increase load incrementally to find scaling threshold

### Concept 2: Key Metrics
- **Latency**: Response time at percentiles — p50 (median), p95, p99, p99.9
- **Throughput**: Requests per second (RPS) or transactions per second (TPS)
- **Error rate**: Percentage of failed requests (target < 1%)
- **Concurrent users**: Active users at any moment (not total over test duration)
- **Resource utilization**: CPU, memory, disk I/O, network I/O on server side

### Concept 3: Scenario Design
Each test scenario represents a realistic user flow. Design scenarios based on production traffic patterns: browse products (60% of traffic), search (20%), add to cart (15%), checkout (5%). Use API-level scenarios for backend services; use browser-level for frontend.

### Concept 4: Baselines and Targets
Establish performance baselines from production monitoring. Set targets relative to baselines: p50 < 200ms, p95 < 500ms, p99 < 1s, error rate < 0.1%. Baseline on production at normal load; compare test results against baselines to detect regressions.

## Framework Comparison

| Feature | k6 | Locust | Artillery | JMeter | Gatling |
|---------|-----|--------|-----------|--------|---------|
| Language | JavaScript | Python | JavaScript | XML/Java | Scala/Java |
| Protocol | HTTP, gRPC, WebSocket, browser | HTTP, gRPC | HTTP, WebSocket | HTTP, JDBC, JMS, many | HTTP, JMS, WebSocket |
| Browser testing | k6 browser (Playwright) | No | Playwright | Selenium | No |
| Distributed | Native (k6-operator) | Built-in | Paid (Artillery Pro) | Native | Native |
| Metrics | Built-in + custom | Built-in + custom | Built-in | Listeners + plugins | Built-in |
| CI integration | Excellent | Good | Good | Plugin | Plugin |
| Reporting | JSON, CSV, InfluxDB/Grafana | CSV, InfluxDB | JSON, HTML | HTML, Dashboard | HTML, Graphite |
| Realistic load | Yes (Go-based JS runtime) | Yes (Python threads) | Yes (Node.js) | Yes (Java threads) | Yes (Akka actors) |
| Best for | Modern JS/Cloud-native | Python teams | Node.js teams | Enterprise, complex protocols | High-scale, JVM teams |

## Implementation Guide

### Step 1: Define Test Scenarios
```yaml
# test-scenarios.yml
scenarios:
  browse_and_search:
    weight: 60
    flow:
      - GET /api/products
      - think_time: 2-5s
      - GET /api/products?category=electronics
      - think_time: 3-7s
      - GET /api/products/123
  add_to_cart:
    weight: 25
    flow:
      - GET /api/products/456?include=details
      - POST /api/cart { product_id: 456, quantity: 1 }
      - think_time: 1-3s
  checkout:
    weight: 15
    flow:
      - POST /api/cart/checkout { payment_method: "card" }
      - GET /api/orders/789
```

### Step 2: Write k6 Load Test
```javascript
// k6-scripts/checkout-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 200 },  // Ramp up to 200
    { duration: '5m', target: 200 },  // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Browse products
  const browseResp = http.get(`${BASE_URL}/api/products?page=1&limit=20`, {
    tags: { name: 'BrowseProducts' },
  });
  check(browseResp, { 'browse status 200': (r) => r.status === 200 });

  sleep(Math.random() * 3 + 2);  // Think time 2-5 seconds

  // Add to cart
  const productId = Math.floor(Math.random() * 1000) + 1;
  const addToCartResp = http.post(
    `${BASE_URL}/api/cart`,
    JSON.stringify({ product_id: productId, quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'AddToCart' } }
  );
  check(addToCartResp, { 'add to cart status 201': (r) => r.status === 201 });

  sleep(Math.random() * 3 + 2);  // Think time 2-5 seconds

  // Checkout
  const checkoutStart = Date.now();
  const checkoutResp = http.post(`${BASE_URL}/api/checkout`, null, {
    tags: { name: 'Checkout' },
  });
  const duration = Date.now() - checkoutStart;
  checkoutDuration.add(duration);

  const checkoutOk = check(checkoutResp, {
    'checkout status 200': (r) => r.status === 200,
    'checkout has order id': (r) => r.json('order_id') !== undefined,
  });
  errorRate.add(!checkoutOk);

  sleep(Math.random() * 5 + 3);  // Think time 3-8 seconds
}
```

### Step 3: Write Locust Load Test
```python
# locustfile.py
from locust import HttpUser, task, between
from locust.user import wait_time
import random

class CheckoutUser(HttpUser):
    wait_time = between(3, 8)

    @task(3)
    def browse_products(self):
        self.client.get("/api/products?page=1&limit=20", name="BrowseProducts")

    @task(2)
    def search_products(self):
        self.client.get("/api/search?q=laptop", name="SearchProducts")

    @task(2)
    def add_to_cart(self):
        product_id = random.randint(1, 1000)
        self.client.post(
            "/api/cart",
            json={"product_id": product_id, "quantity": 1},
            name="AddToCart",
        )

    @task(1)
    def checkout(self):
        with self.client.post(
            "/api/checkout", name="Checkout", catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Checkout failed: {response.status_code}")
```

### Step 4: CI Integration
```yaml
# GitHub Actions — k6 Load Test
name: Load Test
on:
  schedule:
    - cron: "0 6 * * 1-5"  # Weekday mornings
  workflow_dispatch:
    inputs:
      target_url:
        description: "Target URL"
        required: true
        default: "https://staging.example.com"

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: k6-scripts/checkout-load-test.js
          flags: |
            --out json=results.json
            --env BASE_URL=${{ github.event.inputs.target_url }}
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results.json
      - name: Check thresholds
        run: |
          if grep -q '"thresholds":{"ok":false}' results.json; then
            echo "Load test FAILED — thresholds exceeded"
            exit 1
          fi
```

## Best Practices
- Start with load test (expected traffic), then stress test (breakpoint), then soak test (memory leaks)
- Use realistic think times and user flows based on production analytics
- Run tests against a dedicated staging environment, not production (unless canary testing)
- Establish performance baselines from production monitoring
- Define clear SLOs for each endpoint and user flow
- Monitor server-side metrics (CPU, memory, DB connections) during tests, not just client-side
- Test with production-scale data volumes — small datasets mask performance issues
- Ramp load gradually to observe scaling behavior and find tipping points
- Use multiple load generators for high-throughput tests
- Version-control load test scripts alongside application code

## Common Pitfalls
- Testing against undersized environments (results don't predict production behavior)
- Ignoring think times (users don't hammer APIs continuously)
- Testing only happy paths (excludes error handling, retries, circuit breakers)
- Single metric focus (p50 can look great while p99 is terrible)
- Not monitoring resource utilization on the server side
- Tests too short to detect memory leaks (run soak tests for hours)
- Using unrealistic data patterns (all users search the same term)
- No baseline comparison (can't tell if performance improved or regressed)
- Running load tests on shared environments (noisy neighbors skew results)

## Key Points
- Load testing validates system behavior under expected and peak traffic
- k6 is the recommended framework for new projects (JS, cloud-native, great CI)
- Design scenarios around realistic user flows weighted by production traffic
- Measure p50, p95, p99 latency, throughput, error rate, and resource utilization
- Run load → stress → spike → soak tests in sequence to characterize behavior
- Establish baselines and set thresholds for CI gating
- Monitor server-side metrics during tests for bottleneck identification
- Use realistic data volumes and think times
