# Smoke Testing Advanced Topics

## Introduction
Advanced smoke testing covers canary deployment smoke tests, multi-region smoke test orchestration, synthetic monitoring for production smoke, smoke testing in Kubernetes with readiness/liveness probes, and automating smoke test generation from API specs.

## Canary Deployment Smoke Tests
```yaml
# Kubernetes post-deployment smoke test job
apiVersion: batch/v1
kind: Job
metadata:
  name: canary-smoke-test
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      containers:
        - name: smoke-tester
          image: alpine/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              set -e
              # Health check with retry
              for i in 1 2 3 4 5; do
                if curl -sf http://app-service:3000/health; then
                  echo "Health check passed"
                  break
                fi
                echo "Retry $i/5..."
                sleep 2
              done
              # Core API check
              curl -sf http://app-service:3000/api/products?limit=1 > /dev/null
              echo "API smoke test passed"
              # Database connectivity
              curl -sf http://app-service:3000/health/db > /dev/null
              echo "Database check passed"
          restartPolicy: Never
  backoffLimit: 2
```

## Multi-Region Smoke Test Orchestration
```python
# scripts/multi_region_smoke.py
"""Run smoke tests across multiple regions concurrently."""
import asyncio
import httpx

REGIONS = {
    "us-east-1": "https://app-us-east.example.com",
    "eu-west-1": "https://app-eu-west.example.com",
    "ap-southeast-1": "https://app-ap-southeast.example.com",
}

SMOKE_ENDPOINTS = [
    ("GET", "/health"),
    ("GET", "/api/products?limit=1"),
    ("GET", "/health/db"),
]

async def smoke_region(region: str, base_url: str) -> dict:
    results = {"region": region, "checks": {}}
    async with httpx.AsyncClient(timeout=10) as client:
        for method, path in SMOKE_ENDPOINTS:
            try:
                response = await client.request(method, f"{base_url}{path}")
                results["checks"][path] = {
                    "status": "pass" if response.status_code < 500 else "fail",
                    "http_status": response.status_code,
                }
            except Exception as e:
                results["checks"][path] = {"status": "fail", "error": str(e)}
    return results

async def run_all_regions():
    tasks = [smoke_region(region, url) for region, url in REGIONS.items()]
    return await asyncio.gather(*tasks)

if __name__ == "__main__":
    results = asyncio.run(run_all_regions())
    for region_result in results:
        print(f"{region_result['region']}: {region_result['checks']}")
```

## Synthetic Monitoring (Production Smoke)
```yaml
# Grafana synthetic monitoring check
probes:
  - job: "api-smoke-prod"
    targets:
      - "https://app.example.com/health"
      - "https://app.example.com/api/products?limit=1"
    checks:
      - type: "http"
        settings:
          method: "GET"
          ip_version: "ANY"
          fail_if_ssl: false
        alerting:
          threshold: 3  # Failures before alert
          period: "5m"
          contact_point: "on-call-engineering"
```

## Smoke Test Anti-Patterns in Production

### Anti-Pattern: Testing Through the Wrong Interface
Don't run browser-based smoke tests in production — they're too heavy and impact real users. Use HTTP-level checks for production smoke. Reserve browser tests for staging.

### Anti-Pattern: No Secrets in Smoke Tests
Smoke tests that only test unauthenticated endpoints miss the most common deployment failure: broken authentication. Include at least one authenticated endpoint in smoke tests.

### Anti-Pattern: Testing Off-Peak Only
Smoke tests that always pass at 3 AM but fail at 3 PM during peak traffic. Run smoke tests at different times to catch capacity-related failures.

## Key Points
- Automate smoke tests in Kubernetes as post-deployment hooks
- Run smoke tests across all regions concurrently for multi-region deploys
- Use synthetic monitoring for continuous production smoke checks
- HTTP-level checks are sufficient for most production smoke tests
- Include at least one authenticated endpoint in smoke tests
- Run smoke tests at different times to catch peak-hour failures
- Monitor smoke test duration trends — increasing time indicates degradation
