# Execution

## Tool Comparison

| Feature | k6 | Locust | artillery | JMeter |
|---------|----|--------|-----------|--------|
| Language | JavaScript | Python | JavaScript | Java (GUI) |
| Protocol | HTTP, gRPC, WebSocket, browser | HTTP | HTTP, WebSocket, Socket.io | All (plugins) |
| Distributed | Native (k8s operator, CLI) | Master/worker | Plugins | Master/slave |
| CI integration | Native CLI | CLI + xunit | CLI + JSON | CLI + plugins |
| Reporting | Built-in summary + Grafana | Web UI + CSV | JSON + HTML | HTML + CSV |
| Learning curve | Low | Low | Low | Medium |
| Best for | Modern API services | Python teams, complex scenarios | Node.js teams, simple tests | Legacy systems, all protocols |

## k6 Execution

```bash
# Single test
k6 run script.js

# With environment variables
k6 run -e BASE_URL=https://staging.example.com script.js

# With output to Grafana
k6 run --out influxdb=http://localhost:8086/k6 script.js

# Distributed with k8s operator
kubectl apply -f k6-operator.yaml
```

## Locust Execution

```bash
# Web UI mode
locust -f locustfile.py --headless -u 100 -r 10 -H https://staging.example.com

# Distributed
locust -f locustfile.py --master
locust -f locustfile.py --worker
```

```python
# locustfile.py
from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(0.1, 0.5)

    @task
    def get_orders(self):
        self.client.get("/api/orders")
```

## Artillery Execution

```yaml
# artillery.yml
config:
  target: "https://staging.example.com"
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 50
      name: "Warm up"
  defaults:
    headers:
      Content-Type: "application/json"
scenarios:
  - flow:
      - get:
          url: "/api/orders"
```

```bash
artillery run artillery.yml
```

## CI Pipeline (GitHub Actions + k6)

```yaml
load-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/setup-k6-action@v1
    - name: Run load test
      run: k6 run scripts/load-test.js
      env:
        BASE_URL: ${{ secrets.LOAD_TEST_URL }}
    - name: Upload results
      uses: actions/upload-artifact@v4
      with:
        name: k6-report
        path: k6-report.json
```

## Reporting

| Metric Source | Destination |
|---------------|-------------|
| k6 summary | stdout, JSON, HTML |
| k6 metrics stream | InfluxDB + Grafana dashboard |
| Locust results | Web UI (real-time), CSV export |
| Threshold failures | CI pipeline (fail build) |
| Historical trends | Grafana with InfluxDB data source |
