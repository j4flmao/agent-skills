# Load Testing Advanced Topics

## Introduction
Advanced load testing covers distributed load generation, browser-based load testing, chaos-engineering-integrated load tests, capacity planning models, performance regression detection in CI, and analyzing results for bottleneck identification.

## Distributed Load Generation with k6-Operator
For tests requiring > 50K concurrent users or > 100K RPS, distribute across multiple load generators:

```yaml
# k6-operator deployment
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: checkout-load-test
spec:
  parallelism: 4  # 4 distributed runners
  script:
    configMap:
      name: checkout-load-test
      file: checkout-load-test.js
  arguments: |
    --out influxdb=http://influxdb:8086/k6
    --env BASE_URL=https://staging.example.com
  runner:
    image: grafana/k6:latest
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
```

## Browser-Based Load Testing with k6 Browser
For frontend performance, use k6 browser module (Playwright-based):

```javascript
import { browser } from 'k6/experimental/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui_checkout: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 100,
      maxDuration: '10m',
    },
  },
};

export default async function () {
  const page = browser.newPage();
  try {
    await page.goto('https://example.com/products');
    await page.waitForSelector('[data-testid="product-card"]');

    // Add to cart
    await page.click('[data-testid="add-to-cart"]');
    await page.waitForSelector('[data-testid="cart-count"]');

    // Navigate to checkout
    await page.click('[data-testid="checkout-btn"]');
    await page.waitForSelector('[data-testid="checkout-form"]');
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.click('[data-testid="submit-order"]');
    await page.waitForSelector('[data-testid="order-confirmation"]');

    check(page, {
      'order confirmed': (p) => p.locator('[data-testid="order-confirmation"]').isVisible(),
    });
  } finally {
    page.close();
  }
}
```

## Bottleneck Analysis
### Performance Regression Detection
```javascript
// Compare test results against baseline
export function handleSummary(data) {
  const baseline = JSON.parse(open('./baseline.json'));
  const regressions = [];

  for (const [metric, value] of Object.entries(data.metrics)) {
    if (metric.includes('http_req_duration')) {
      const baselineP95 = baseline.metrics[metric]?.values['p(95)'];
      if (baselineP95 && value.values['p(95)'] > baselineP95 * 1.2) {
        regressions.push({
          metric,
          before: baselineP95,
          after: value.values['p(95)'],
          change: '+20%',
        });
      }
    }
  }

  // JSON output for CI comparison
  return {
    'stdout': JSON.stringify({ regressions }),
    'regressions.json': JSON.stringify({ regressions, timestamp: Date.now() }),
  };
}
```

## Capacity Planning Models

### Little's Law for Capacity
```
Concurrent Users = Throughput × Response Time
Example: 1000 RPS × 0.5s average response time = 500 concurrent users
```

### Resource Scaling Model
```yaml
capacity_model:
  current:
    instances: 5
    max_rps: 2500
    p95_latency: 300ms
  target:
    expected_rps: 5000
    instances_needed: 10  # Linear scaling
    estimated_p95: 350ms  # Slight increase from load distribution overhead
```

## Load Testing Anti-Patterns
### The Coordinated Omission Problem
Standard latency measurement misses queuing time. Solution: measure from the user's perspective, not the server's. Use k6's built-in measurement that includes scheduling delay.

### The Death Star Test
Testing the entire system at once without isolating components makes it impossible to find bottlenecks. Test each component individually first, then the end-to-end path.

### The Toy Dataset
Testing with 100 products and 10 customers when production has 1M products and 100K customers. Database queries, caches, and indexes behave differently at scale.

## Key Points
- Distribute load generation for tests exceeding single-machine capacity
- k6 browser enables frontend performance testing under load
- Analyze bottlenecks systematically through component isolation
- Compare results against baselines to detect regressions in CI
- Use Little's Law for rough capacity planning
- Avoid coordinated omission — measure from the user's perspective
- Test with production-scale data volumes
- Integrate load tests into CI for performance regression detection
