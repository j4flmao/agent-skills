# k6 Scripting Guide

## Basic Test Structure

### Script Anatomy
```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  group('User Registration', () => {
    const payload = {
      name: `user_${__VU}_${__ITER}`,
      email: `user${__VU}_${__ITER}@test.com`,
    };

    const res = http.post(
      'http://test-api/users',
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, {
      'status is 201': (r) => r.status === 201,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });
  });

  sleep(1);
}
```

## Advanced Scenarios

### Ramp-Up Patterns
```javascript
export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '10m', target: 200 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
    },
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '30s', target: 0 },
      ],
      startTime: '30m',
    },
  },
};
```

### Shared Array for Data-Driven Testing
```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const testData = new SharedArray('users', function () {
  const data = papaparse.parse(open('./test-users.csv'), { header: true }).data;
  return data;
});

export default function () {
  const user = testData[__ITER % testData.length];

  const res = http.post(
    'http://test-api/login',
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'login successful': (r) => r.status === 200,
  });
}
```

## Custom Metrics

### Defining Custom Metrics
```javascript
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

const loginDuration = new Trend('login_duration');
const loginFailures = new Rate('login_failures');
const totalLogins = new Counter('total_logins');
const activeUsers = new Gauge('active_users');

export default function () {
  const start = Date.now();

  const res = http.post('http://test-api/login', {
    email: 'user@test.com',
    password: 'password',
  });

  loginDuration.add(Date.now() - start);
  totalLogins.add(1);

  if (res.status !== 200) {
    loginFailures.add(1);
  }
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify({
      login_duration_p95: data.metrics.login_duration.values.p(95),
      login_failure_rate: data.metrics.login_failures.values.rate,
      total_requests: data.metrics.total_logins.values.count,
    }),
  };
}
```

## Checks and Thresholds

### Nested Checks
```javascript
export default function () {
  const res = http.get('http://test-api/users');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has users array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.users);
    },
    'response is fast': (r) => r.timings.duration < 300,
  });

  const body = JSON.parse(res.body);

  body.users.forEach((user) => {
    check(user, {
      'user has id': (u) => !!u.id,
      'user has email': (u) => !!u.email,
    });
  });
}
```

### Threshold Expressions
```javascript
export const options = {
  thresholds: {
    http_req_duration: [
      'avg<200',
      'p(90)<300',
      'p(95)<500',
      'p(99)<1000',
      'max<2000',
    ],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>100'],
    login_duration: ['p(95)<1000'],
    login_failures: ['rate<0.05'],
    checks: ['rate>0.98'],
    iteration_duration: ['p(95)<2000'],
  },
};
```

## Browser Testing with k6

```javascript
import { browser } from 'k6/experimental/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

export default async function () {
  const page = browser.newPage();

  try {
    await page.goto('http://test-app/login');

    page.locator('input[name="email"]').type('user@test.com');
    page.locator('input[name="password"]').type('password');
    page.locator('button[type="submit"]').click();

    await page.waitForNavigation();

    check(page, {
      'login redirected to dashboard': (p) => p.url().includes('/dashboard'),
    });
  } finally {
    page.close();
  }
}
```

## Protocol Extensions

### gRPC Testing
```javascript
import grpc from 'k6/net/grpc';

const client = new grpc.Client();
client.load(['definitions'], 'user_service.proto');

export default function () {
  client.connect('localhost:50051', { timeout: '5s' });

  const response = client.invoke('users.UserService/GetUser', {
    id: '123',
  });

  check(response, {
    'status is OK': (r) => r.status === grpc.StatusOK,
    'user found': (r) => r.message.user.name !== '',
  });

  client.close();
}
```

### WebSocket Testing
```javascript
import { WebSocket } from 'k6/experimental/websockets';

export default function () {
  const ws = new WebSocket('ws://test-api/ws');

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'subscribe', channel: 'events' }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    check(data, {
      'received event data': (d) => d.type === 'event',
    });
    ws.close();
  };

  ws.onclose = () => console.log('connection closed');
}
```

## Lifecycle Hooks

```javascript
export function setup() {
  // Runs once per test run
  const res = http.post('http://test-api/setup', {
    testId: 'load-test-' + Date.now(),
  });
  return { testId: res.json().testId };
}

export function teardown(data) {
  // Runs once after test completes
  http.del(`http://test-api/cleanup/${data.testId}`);
}

export default function (data) {
  // data contains the return value from setup()
  const res = http.get(`http://test-api/data?testId=${data.testId}`);
}
```

## Key Points
- Use `__VU` and `__ITER` for unique dynamic test data per virtual user
- Implement ramp-up stages for realistic load patterns
- Use SharedArray for efficient data sharing across VUs
- Define custom metrics (Trend, Rate, Counter, Gauge) for business-specific measurements
- Set thresholds that enforce SLOs and prevent regressions
- Use scenarios to combine multiple test types in one run
- Leverage k6 browser module for UI performance testing
- Test gRPC and WebSocket endpoints with k6 protocol extensions
- Use setup/teardown hooks for test data lifecycle management
- Generate JSON summaries for CI/CD integration and reporting
