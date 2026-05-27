# Load Test Infrastructure

## Overview
Set up infrastructure for load testing: distributed execution, cloud provisioning, monitoring integration, CI/CD pipelines, and result storage.

## Distributed k6 Execution

```yaml
# docker-compose for distributed k6
version: '3.8'
services:
  k6-coordinator:
    image: grafana/k6:latest
    command: run --out influxdb=http://influxdb:8086/k6 /scripts/test.js
    volumes:
      - ./scripts:/scripts
    environment:
      - K6_OUT=influxdb=http://influxdb:8086/k6
    depends_on:
      - influxdb

  k6-worker:
    image: grafana/k6:latest
    command: run --out influxdb=http://influxdb:8086/k6 /scripts/test.js
    deploy:
      replicas: 5  # 5 worker instances
    volumes:
      - ./scripts:/scripts
    environment:
      - K6_OUT=influxdb=http://influxdb:8086/k6
    depends_on:
      - influxdb

  influxdb:
    image: influxdb:1.8
    environment:
      - INFLUXDB_DB=k6
    ports:
      - "8086:8086"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
```

## Cloud Load Generator Setup

```typescript
// AWS — run k6 on ECS Fargate
class K6FargateRunner {
  async runLoadTest(testName: string, scriptPath: string): Promise<void> {
    const taskDefinition = {
      family: `k6-${testName}`,
      taskRoleArn: 'arn:aws:iam::...:role/k6-task-role',
      executionRoleArn: 'arn:aws:iam::...:role/k6-execution-role',
      networkMode: 'awsvpc',
      containerDefinitions: [{
        name: 'k6',
        image: 'grafana/k6:latest',
        command: [
          'run',
          '--out', 'cloud',
          `/scripts/${scriptPath}`,
        ],
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': '/ecs/k6',
            'awslogs-region': 'us-east-1',
          },
        },
      }],
    };

    await ecs.registerTaskDefinition(taskDefinition);
    await ecs.runTask({
      taskDefinition: taskDefinition.family,
      launchType: 'FARGATE',
      cluster: 'k6-cluster',
      count: 5, // 5 parallel workers
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: ['subnet-...'],
          securityGroups: ['sg-...'],
          assignPublicIp: 'ENABLED',
        },
      },
    });
  }
}
```

## CI/CD Integration

```yaml
# GitHub Actions — performance regression test
name: Performance Tests
on:
  push:
    branches: [main]
  pull_request:
    types: [labeled]

jobs:
  load-test:
    if: ${{ github.event.label.name == 'run-load-test' }}
    runs-on: ubuntu-latest
    services:
      app:
        image: ${{ secrets.REGISTRY }}/my-app:${{ github.sha }}
        ports:
          - 3000:3000
        env:
          DATABASE_URL: postgres://test:test@postgres:5432/testdb
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Seed test data
        run: npm run seed:load-test

      - name: Run k6 smoke test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: scripts/smoke-test.js
          flags: --out json=/tmp/results.json

      - name: Check performance thresholds
        run: |
          jq '.metrics.http_req_duration.p(95) < 500' /tmp/results.json
          jq '.metrics.http_req_failed.rate < 0.01' /tmp/results.json

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: /tmp/results.json

      - name: Compare with baseline
        run: |
          BASELINE=$(curl -s $BASELINE_URL/results.json)
          CURRENT=$(cat /tmp/results.json)
          npm run compare-results -- --baseline "$BASELINE" --current "$CURRENT"
```

## Monitoring Integration

```typescript
// k6 output configuration for monitoring integration
export const options = {
  // Built-in metrics endpoint
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
};

// Custom metrics for application-specific monitoring
const checkoutDuration = new Trend('checkout_duration');
const searchLatency = new Trend('search_latency');
const errorRate = new Rate('application_error');

export function handleSummary(data: any) {
  // Send results to monitoring system
  const summary = {
    timestamp: new Date().toISOString(),
    testName: __ENV.TEST_NAME || 'unnamed',
    thresholds: {
      passed: Object.values(data.metrics)
        .filter((m: any) => m.thresholds)
        .every((m: any) => Object.values(m.thresholds).every((t: any) => t.ok)),
    },
    metrics: {
      p95Latency: data.metrics.http_req_duration.values['p(95)'],
      p99Latency: data.metrics.http_req_duration.values['p(99)'],
      errorRate: data.metrics.http_req_failed.values.rate,
      rps: data.metrics.http_reqs.values.rate,
    },
  };

  // Post to webhook
  http.post('https://hooks.example.com/load-test-results', JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  });

  return { 'stdout': JSON.stringify(summary) };
}
```

## Result Storage and Analysis

```typescript
class LoadTestResultStore {
  async storeResult(testRun: TestRun): Promise<void> {
    await db.query(
      `INSERT INTO load_test_results (test_name, branch, commit_sha, timestamp, metrics, thresholds_passed)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        testRun.testName,
        testRun.branch,
        testRun.commitSha,
        testRun.timestamp,
        JSON.stringify(testRun.metrics),
        testRun.thresholdsPassed,
      ]
    );
  }

  async getBaseline(testName: string): Promise<BaselineMetrics> {
    const result = await db.query(
      `SELECT metrics FROM load_test_results
       WHERE test_name = $1 AND thresholds_passed = true
       ORDER BY timestamp DESC
       LIMIT 5`,
      [testName]
    );

    const metrics = result.rows.map(r => r.metrics);
    return {
      p95Latency: average(metrics.map(m => m.p95Latency)),
      p99Latency: average(metrics.map(m => m.p99Latency)),
      errorRate: average(metrics.map(m => m.errorRate)),
      rps: average(metrics.map(m => m.rps)),
    };
  }

  async detectRegression(testName: string, current: Metrics): Promise<RegressionResult> {
    const baseline = await this.getBaseline(testName);
    const regressions: string[] = [];

    if (current.p95Latency > baseline.p95Latency * 1.2) {
      regressions.push(`p95 latency increased ${((current.p95Latency / baseline.p95Latency - 1) * 100).toFixed(0)}%`);
    }
    if (current.errorRate > baseline.errorRate * 1.5) {
      regressions.push(`error rate increased ${((current.errorRate / baseline.errorRate - 1) * 100).toFixed(0)}%`);
    }

    return { hasRegression: regressions.length > 0, regressions };
  }
}
```

## Key Points
- Use distributed k6 (coordinator + workers) for high-throughput testing
- Run load generators close to target (same region, low latency)
- Integrate with CI/CD: trigger on label, run smoke test, check thresholds
- Store results in database for baseline comparison and trend analysis
- Compare against baseline (last 5 runs), alert on >20% regression
- Seed test database with realistic data before running tests
- Use InfluxDB + Grafana for real-time test visualization
- Output results to monitoring system via webhook for centralized view
