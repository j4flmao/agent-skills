# k6 Guide

## Installation

### macOS
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Windows
```bash
winget install k6
```

### Docker
```bash
docker run --rm -i grafana/k6 run - <script.js
```

## Basic Script Structure

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const failures = new Rate('failed_requests');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // ramp-up
    { duration: '5m', target: 100 },  // steady
    { duration: '1m', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.05'],
  },
};

export default function () {
  group('user login', () => {
    const payload = JSON.stringify({ email: 'test@test.com', password: 'password' });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${__ENV.BASE_URL}/api/v1/auth/login`, payload, params);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'has token': (r) => r.json('token') !== undefined,
    });

    failures.add(res.status !== 200);
    loginDuration.add(res.timings.duration);
  });

  sleep(1);
}
```

## Lifecycle Functions

```javascript
// Setup — runs once before the test
export function setup() {
  const res = http.post(`${__ENV.BASE_URL}/api/v1/test-data`, { count: 100 });
  return { testUsers: res.json().users };
}

// Default — runs for each VU iteration
export default function (data) {
  // data comes from setup()
  const user = data.testUsers[__VU % data.testUsers.length];
  http.get(`${__ENV.BASE_URL}/api/v1/users/${user.id}`);
  sleep(1);
}

// Teardown — runs once after the test
export function teardown(data) {
  http.del(`${__ENV.BASE_URL}/api/v1/test-data`);
}
```

## Options Reference

```javascript
export const options = {
  // Execution
  vus: 10,                          // number of virtual users
  iterations: 1000,                 // total iterations
  duration: '10m',                  // test duration
  stages: [                         // phased execution
    { duration: '2m', target: 100 },
  ],

  // Scenarios (advanced execution models)
  scenarios: {
    contacts: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
      ],
      gracefulRampDown: '30s',
    },
  },

  // Networking
  maxRedirects: 10,
  batch: 20,                        // max parallel HTTP requests
  batchPerHost: 6,                  // max per-host parallel requests

  // Thresholds
  thresholds: {
    http_req_duration: ['p(95)<500', 'avg<200'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>100'],        // must sustain 100+ RPS
  },

  // Timeouts
  setupTimeout: '30s',
  teardownTimeout: '30s',

  // Tags (group metrics)
  tags: {
    env: 'staging',
    service: 'user-service',
  },
};
```

## Executors

| Executor | Description | Use Case |
|----------|-------------|----------|
| shared-iterations | Fixed total iterations across VUs | Smoke tests |
| per-vu-iterations | Each VU runs N iterations | Simple load |
| constant-vus | Fixed VUs for duration | Load test |
| ramping-vus | VUs ramp up/down over time | Stress test |
| constant-arrival-rate | Fixed iteration rate | Spike test |
| ramping-arrival-rate | Arrival rate changes | Soak test |
| externally-controlled | VUs controlled via k6 API | Manual testing |

## Cheat Sheet

### HTTP Methods
```javascript
http.get(url, params)
http.post(url, body, params)
http.put(url, body, params)
http.patch(url, body, params)
http.del(url, params)
http.head(url, params)
http.options(url, params)
http.batch(requests)  // parallel requests
```

### Check
```javascript
check(res, {
  'status is 200': (r) => r.status === 200,
  'body size < 1KB': (r) => r.body.length < 1024,
});
```

### Metrics
```javascript
// Custom
const myRate = new Rate('metric_name');
const myTrend = new Trend('metric_name');
const myCounter = new Counter('metric_name');
const myGauge = new Gauge('metric_name');

// Add
myRate.add(true);          // boolean → rate
myTrend.add(42);           // number → trend (p50, p95, p99)
myCounter.add(1);          // increment
myGauge.add(currentValue); // set current value
```

### Built-in Metrics
```javascript
http_req_duration     // total request duration
http_req_waiting      // TTFB (time to first byte)
http_req_sending      // request sending time
http_req_receiving    // response receiving time
http_req_failed       // request failed (non-2xx or error)
http_reqs             // request rate (RPS)
iterations            // iteration rate
vus                   // current active VUs
```

### Environment Variables
```bash
k6 run script.js -e BASE_URL=http://staging.example.com
```
```javascript
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
```

### Output Formats
```bash
k6 run script.js                  # stdout summary
k6 run --out json=result.json     # JSON output
k6 run --out csv=result.csv       # CSV output
k6 run --out influxdb=http://...  # InfluxDB
k6 run --out prometheus=...       # Prometheus remote write
```
