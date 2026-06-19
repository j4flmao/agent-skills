# k6 Load Testing Reference

## Installation
```bash
# Windows (PowerShell)
winget install k6
# macOS
brew install k6
# Linux
sudo gpg -k && sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Core APIs
### Options
```javascript
export const options = {
  vus: 10,           // Virtual users
  duration: '30s',   // Test duration
  stages: [          // Ramp stages
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'max<2000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:Checkout}': ['p(95)<1000'],
  },
};
```

### HTTP Methods
```javascript
import http from 'k6/http';

http.get(url, params);
http.post(url, body, params);
http.put(url, body, params);
http.del(url, params);
http.patch(url, body, params);
http.batch([ /* array of requests */ ]);
```

### Checks and Thresholds
```javascript
import { check } from 'k6';
check(resp, {
  'status is 200': (r) => r.status === 200,
  'response time < 500ms': (r) => r.timings.duration < 500,
});
```

### Custom Metrics
```javascript
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
const myTrend = new Trend('my_trend');
const myRate = new Rate('my_rate');
const myCounter = new Counter('my_counter');
const myGauge = new Gauge('my_gauge');
```

## Lifecycle Functions
```javascript
// init — runs once per VU, prepares code
export function setup() { /* runs once before test */ }
export default function () { /* runs for each VU iteration */ }
export function teardown(data) { /* runs once after test */ }
export function handleSummary(data) { /* custom summary output */ }
```

## k6 Cloud Output
```bash
k6 run --out cloud script.js  # Stream to k6 Cloud
k6 run --out influxdb=http://localhost:8086/k6 script.js  # Stream to InfluxDB
k6 run --out json=results.json script.js  # Local JSON output
```
