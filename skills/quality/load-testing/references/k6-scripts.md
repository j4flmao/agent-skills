# k6 Scripts

## Installation

```bash
# Windows (Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
sudo apt install k6
# or download from https://k6.io/docs/getting-started/installation/

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
import { SharedArray } from "k6/data";
import papaparse from "https://jslib.k6.io/papaparse/5.1.1/index.js";

const users = new SharedArray("users", function () {
  const data = open("./users.csv");
  return papaparse.parse(data, { header: true }).data;
});

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
      - name: Run load test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/basic.js
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

# Run with Grafana Cloud output
k6 run --out cloud tests/load/basic.js
```

## Threshold Templates

| Scenario | Threshold |
|----------|-----------|
| API latency SLA | `p(95)<500, p(99)<1000` |
| Error budget | `http_req_failed<0.01` |
| Login flow | `p(95)<2000` (includes crypto) |
| File upload | `p(95)<5000` |
| Database query | `p(95)<200` |
| Payment processing | `p(99)<3000, http_req_failed<0.001` |
