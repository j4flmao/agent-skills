# CI Integration

## Why Run Load Tests in CI
- Detect performance regressions before they reach production.
- Enforce latency and throughput SLOs as gating criteria.
- Catch memory leaks, N+1 queries, and connection pool issues early.
- Compare performance against baseline (previous commit, previous release).

## CI Architecture

### Option 1: Inline (Simple)
```
CI Runner → Run k6 → Check thresholds → Pass/Fail

Pros: simple, no extra infrastructure
Cons: limited throughput (CI runners are small), inconsistent performance
```

### Option 2: Separate Test Environment
```
CI Runner → Trigger cloud k6 test → Poll results → Pass/Fail
Or:
CI Runner → SSH to load generator → Run test → Check results

Pros: consistent performance, can run large tests
Cons: more infrastructure
```

### Option 3: k6 Cloud (Grafana Cloud k6)
```
CI Runner → POST to k6 Cloud API → Wait for test completion → Check results

Pros: managed, scalable, historical comparisons
Cons: paid service
```

## GitHub Actions Example (Inline)

```yaml
name: Load Test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      app:
        image: ghcr.io/myorg/myapp:${{ github.sha }}
        ports:
          - 3000:3000
        env:
          DB_URL: postgres://postgres:postgres@postgres:5432/test
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        uses: grafana/setup-k6-action@v1

      - name: Seed test data
        run: |
          curl -X POST http://localhost:3000/api/v1/test-data/setup

      - name: Run load test
        run: |
          k6 run \
            --out json=k6-results.json \
            -e BASE_URL=http://localhost:3000 \
            tests/load/load-test.js

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: k6-results.json

      - name: Check thresholds
        run: |
          # Parse k6 output for threshold failures
          if grep -q "✗" k6-results.json; then
            echo "Thresholds failed!"
            exit 1
          fi
```

## GitLab CI Example

```yaml
load-test:
  stage: performance
  image: grafana/k6:latest
  services:
    - postgres:16
    - name: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
      alias: app
  variables:
    BASE_URL: http://app:3000
  script:
    - apk add --no-cache curl
    - curl -X POST $BASE_URL/api/v1/test-data/setup
    - k6 run --out json=k6-results.json tests/load/load-test.js
  artifacts:
    paths:
      - k6-results.json
    when: always
```

## Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Build & Deploy Test Environment') {
            steps {
                sh 'docker-compose -f docker-compose.ci.yml up -d'
            }
        }
        stage('Run Load Test') {
            steps {
                sh '''
                    docker run --rm --network=ci \
                        -e BASE_URL=http://app:3000 \
                        -v $PWD/tests:/tests \
                        grafana/k6 run /tests/load/load-test.js
                '''
            }
        }
        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'k6-results.json'
            }
        }
    }
    post {
        always {
            sh 'docker-compose -f docker-compose.ci.yml down'
        }
    }
}
```

## Baseline Comparison

### Compare Against Thresholds (Simple)
```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};
```
- Hardcoded in the script.
- Good for: absolute SLOs (e.g., "p95 must be under 500ms").

### Compare Against Baseline (Advanced)
```bash
# Run baseline test on main branch
k6 run --out json=baseline.json load-test.js

# Run current test
k6 run --out json=current.json load-test.js

# Compare
jq '.metrics.http_req_duration.values."p(95)"' baseline.json
jq '.metrics.http_req_duration.values."p(95)"' current.json
```

Store baseline results as artifacts in CI and compare percentage change.

### Statistical Comparison with k6 Cloud
```
Grafana Cloud k6 stores test run history.
  - Automatically compares against previous runs.
  - Flags regressions: p95 increased by > 10%, error rate increased > 1%.
  - API to query baseline for custom analysis.
```

## k6 in CI: Best Practices

### Keep Smoke Tests Fast
```
Run smoke tests on every PR:
  - 1-2 VUs, 1 minute.
  - Verify script works, data is seeded, endpoints respond.
  - Total time: < 2 minutes.
```

### Run Full Tests on Schedule
```
Run full load/stress/soak tests:
  - Nightly or weekly.
  - Against a dedicated performance testing environment.
  - Results archived for trend analysis.
```

### Don't Gate PRs on Full Load Tests
```
Full load tests:
  - Take 10+ minutes.
  - Results vary based on CI runner noise.
  - Risk of flaky gates.

Alternative: run full tests async, post results to PR as comment.
```

### Environment Consistency
```
CI load tests are noisy (shared runner, variable CPU).
Solutions:
  1. Run small smoke tests in CI, full tests in dedicated environment.
  2. Use Grafana Cloud k6 (cloud load generators).
  3. Normalize results against baseline from same CI runner type.
```

## Environment Variables for CI

```bash
# CI-specific overrides
k6 run script.js \
  -e BASE_URL=https://staging.example.com \
  -e TEST_USERS=100 \
  -e TEST_DURATION=5m \
  -e CI=true \
  -e COMMIT_SHA=$GITHUB_SHA
```

```javascript
export default function () {
  const baseUrl = __ENV.BASE_URL;
  const isCI = __ENV.CI === 'true';

  if (isCI) {
    // Use lower thresholds in CI (noisy environment)
  }
}
```
