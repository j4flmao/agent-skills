# k6 Scripts

Copy-ready k6 scripts for the common test types, open-model scenarios, data-driven runs and CI. Scripts are JavaScript (k6 v1 also runs TypeScript files directly).

## Installation

```bash
# Windows (Chocolatey)
choco install k6

# macOS
brew install k6

# Linux (Debian/Ubuntu): add Grafana's k6 apt repository first, then
sudo apt-get install k6
# see https://grafana.com/docs/k6/latest/set-up/install-k6/

# Docker
docker pull grafana/k6
```

## Basic Script Structure

```javascript
// tests/load/basic.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");

export const options = {
  stages: [
    { duration: "2m", target: 50 },  // Ramp up
    { duration: "5m", target: 50 },  // Stay at 50 users
    { duration: "2m", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    errors: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const payload = JSON.stringify({
    email: `user${__VU}@example.com`,
    password: "test123",
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post(`${BASE_URL}/api/login`, payload, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status !== 200);
  responseTime.add(res.timings.duration);

  sleep(1);
}
```

## Load Test Types

### Smoke Test
```javascript
export const options = {
  vus: 1,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<300"],
  },
};
```

### Average Load Test
```javascript
export const options = {
  stages: [
    { duration: "5m", target: 100 },
    { duration: "30m", target: 100 },
    { duration: "5m", target: 0 },
  ],
};
```

### Stress Test
```javascript
export const options = {
  stages: [
    { duration: "5m", target: 200 },
    { duration: "10m", target: 500 },
    { duration: "5m", target: 1000 },
    { duration: "10m", target: 1000 },
    { duration: "5m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.1"],
  },
};
```

### Spike Test
```javascript
export const options = {
  stages: [
    { duration: "2m", target: 0 },
    { duration: "30s", target: 1000 },
    { duration: "2m", target: 1000 },
    { duration: "30s", target: 0 },
  ],
};
```

### Soak Test
```javascript
export const options = {
  stages: [
    { duration: "10m", target: 200 },
    { duration: "3h", target: 200 },
    { duration: "10m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};
```

## Advanced Scripts

### Authenticated Session Flow
```javascript
// tests/load/authenticated-flow.js
import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("Login and browse dashboard", () => {
    // Login
    const loginRes = http.post(`${BASE_URL}/api/login`, {
      email: `user${__VU}@example.com`,
      password: "test123",
    });
    check(loginRes, { "logged in": (r) => r.status === 200 });

    const token = loginRes.json("token");
    const params = {
      headers: { Authorization: `Bearer ${token}` },
    };

    // Browse dashboard
    const dashboardRes = http.get(`${BASE_URL}/api/dashboard`, params);
    check(dashboardRes, { "dashboard loaded": (r) => r.status === 200 });

    // Fetch users
    const usersRes = http.get(`${BASE_URL}/api/users?page=1&limit=20`, params);
    check(usersRes, { "users fetched": (r) => r.status === 200 });

    sleep(3);
  });
}
```

### Open Model: Arrival-Rate Scenarios

`stages` with VUs is a closed model: when the system slows down, request rate drops too. To hold a target throughput regardless of latency, use an arrival-rate executor.

```javascript
export const options = {
  scenarios: {
    checkout: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",          // iterations per second
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { target: 100, duration: "5m" },
        { target: 100, duration: "20m" },
        { target: 0, duration: "2m" },
      ],
      exec: "checkout",
    },
    browse: {
      executor: "constant-vus",
      vus: 20,
      duration: "27m",
      exec: "browse",
    },
  },
  thresholds: {
    "http_req_duration{scenario:checkout}": ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
    dropped_iterations: ["count<10"], // VU pool too small if this grows
  },
};

export function checkout() { /* checkout requests */ }
export function browse() { /* catalogue requests */ }
```

Use `abortOnFail` on a threshold (`{ threshold: "rate<0.05", abortOnFail: true }`) to stop a run early once it is clearly failing.

### Custom Metrics
```javascript
import { Counter, Gauge, Trend, Rate } from "k6/metrics";

const successfulLogins = new Counter("successful_logins");
const activeUsers = new Gauge("active_users");
const loginDuration = new Trend("login_duration");
const loginErrorRate = new Rate("login_errors");

export const options = {
  thresholds: {
    successful_logins: ["count>100"],
    login_duration: ["p(95)<1000"],
    login_errors: ["rate<0.05"],
  },
};
```

### Data-Driven Test
```javascript
// tests/load/data-driven.js
import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";
import papaparse from "https://jslib.k6.io/papaparse/5.1.1/index.js";

const users = new SharedArray("users", function () {
  const data = open("./users.csv");
  return papaparse.parse(data, { header: true }).data;
});

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const user = users[__VU % users.length];
  const res = http.post(`${BASE_URL}/api/login`, {
    email: user.email,
    password: user.password,
  });
  check(res, { "logged in": (r) => r.status === 200 });
}
```

## CI Integration

```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  schedule:
    - cron: "0 6 * * 1"  # Every Monday at 6 AM
  workflow_dispatch:

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - name: Run load test
        uses: grafana/run-k6-action@v1
        with:
          path: tests/load/basic.js
          flags: --out json=results.json
        env:
          BASE_URL: ${{ vars.STAGING_URL }}
      - uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json
```

## Running Scripts

```bash
# Run locally
k6 run tests/load/basic.js

# Run with environment variable
k6 run -e BASE_URL=http://staging.example.com tests/load/basic.js

# Run with output
k6 run --out json=results.json --out csv=results.csv tests/load/basic.js

# Stream results to Grafana Cloud k6 (after `k6 cloud login`)
k6 run --out cloud tests/load/basic.js

# Write an end-of-test summary for CI artifacts
k6 run --summary-export=summary.json tests/load/basic.js
```

## Threshold Templates

| Scenario | Threshold |
|----------|-----------|
| API latency SLA | `http_req_duration: ["p(95)<500", "p(99)<1000"]` |
| Error budget | `http_req_failed: ["rate<0.01"]` |
| Login flow (password hashing is slow by design) | `"http_req_duration{name:login}": ["p(95)<2000"]` |
| File upload | `"http_req_duration{type:upload}": ["p(95)<5000"]` |
| Checks | `checks: ["rate>0.99"]` |

Derive the numbers from your SLOs; the values above are examples, not recommendations. Tag requests (`http.get(url, { tags: { name: "login" } })`) so per-endpoint thresholds work and URLs with IDs do not explode metric cardinality.

## Pitfalls

- `sleep()` models think time; omitting it in closed-model tests turns each VU into a tight loop.
- Generate load from a machine with headroom; watch k6's own CPU, or results measure the load generator.
- Use dynamic URLs with a `name` tag (or `http.url` template) to group metrics.
- Never point load tests at production without an agreed window and a kill switch.
