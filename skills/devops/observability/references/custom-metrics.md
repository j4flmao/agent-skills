# Custom Metrics

Custom metrics provide visibility into application-specific behavior beyond infrastructure basics.

## RED Metrics (Rate, Errors, Duration)

The RED method focuses on user-facing service health:

```typescript
// Express middleware
import { Counter, Histogram } from 'prom-client'

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
})

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
})

app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9
    httpRequestsTotal.inc({
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode,
    })
    httpRequestDuration.observe({
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode,
    }, duration)
  })
  next()
})
```

### Prometheus Recording Rules

```yaml
groups:
  - name: red-metrics
    rules:
      - record: service:http_requests_total:rate5m
        expr: sum(rate(http_requests_total[5m])) by (service)

      - record: service:http_errors_total:rate5m
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)

      - record: service:error_rate:ratio5m
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service)

      - record: service:http_request_duration_seconds:p99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          )
```

## USE Method (Utilization, Saturation, Errors)

The USE method focuses on resource health:

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| CPU | `node_cpu_seconds_total` | `node_load1` / `node_cpu_count` | System log errors |
| Memory | `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes` | OOM events | OOM kills |
| Disk | `node_filesystem_size_bytes` | `node_disk_io_time_seconds_total` | `node_disk_errors_total` |
| Network | `node_network_receive_bytes_total` | `node_netstat_Tcp_RetransSegments` | `node_network_receive_errors_total` |

### USE Recording Rules

```yaml
groups:
  - name: use-metrics
    rules:
      - record: node:cpu_utilization:ratio5m
        expr: 1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))

      - record: node:memory_utilization:ratio
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes

      - record: node:disk_utilization:ratio
        expr: |
          node_filesystem_size_bytes{mountpoint="/"} -
          node_filesystem_free_bytes{mountpoint="/"}
          / node_filesystem_size_bytes{mountpoint="/"}
```

## Service-Level Metrics

Define SLIs for each service's critical behaviors:

```yaml
# Availability SLI
groups:
  - name: sli
    rules:
      - record: sli:availability:ratio1h
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[1h]))
          /
          sum(rate(http_requests_total[1h]))

      - record: sli:latency_p95:seconds1h
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[1h])) by (le, service)
          )
```

```yaml
# SLO compliance
- record: slo:compliance:ratio30d
  expr: |
    sum(rate(http_requests_total{status!~"5.."}[30d]))
    /
    sum(rate(http_requests_total[30d]))
```

## Business Metrics

Track metrics that reflect business outcomes:

```python
# Python example
from prometheus_client import Counter, Gauge

# Business metrics
orders_created = Counter(
    'orders_created_total',
    'Total orders created',
    ['product_category', 'region']
)

revenue_total = Counter(
    'revenue_total_usd',
    'Total revenue in USD',
    ['product_category', 'payment_method']
)

active_users = Gauge(
    'active_users',
    'Currently active users',
    ['tier']
)

conversion_rate = Gauge(
    'conversion_rate',
    'Visitor to customer conversion rate',
    ['source']
)

# In application code
orders_created.labels(product_category='electronics', region='us-east').inc()
revenue_total.labels(product_category='electronics', payment_method='card').inc(129.99)
active_users.labels(tier='premium').set(1234)
```

## Custom Metric Implementation

### Java (Micrometer)

```java
@RestController
public class OrderController {
    private final Counter orderCounter;
    private final Timer orderTimer;

    public OrderController(MeterRegistry registry) {
        this.orderCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("region", System.getenv("REGION"))
            .register(registry);
        
        this.orderTimer = Timer.builder("orders.processing.time")
            .description("Time to process order")
            .publishPercentileHistogram()
            .sla(Duration.ofMillis(100), Duration.ofMillis(500))
            .register(registry);
    }

    @PostMapping("/orders")
    public Order createOrder(@RequestBody OrderRequest request) {
        return orderTimer.record(() -> {
            Order order = orderService.create(request);
            orderCounter.increment();
            return order;
        });
    }
}
```

### Go

```go
var (
    httpRequests = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "path", "status"},
    )
    httpDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )
)

func init() {
    prometheus.MustRegister(httpRequests, httpDuration)
}

func metricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        duration := time.Since(start).Seconds()
        httpRequests.With(prometheus.Labels{
            "method": r.Method,
            "path":   r.URL.Path,
            "status": "200",
        }).Inc()
        httpDuration.With(prometheus.Labels{
            "method": r.Method,
            "path":   r.URL.Path,
        }).Observe(duration)
    })
}
```

## Grafana Dashboard Panels

```json
{
  "panels": [
    {
      "title": "RED Metrics",
      "type": "stat",
      "targets": [
        {"expr": "sum(rate(http_requests_total[5m]))", "legendFormat": "Rate"},
        {"expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m]))", "legendFormat": "Errors"},
        {"expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "p99 Latency"}
      ]
    },
    {
      "title": "Business Metrics",
      "type": "graph",
      "targets": [
        {"expr": "sum(rate(orders_created_total[1h]))", "legendFormat": "Order rate"},
        {"expr": "sum(rate(revenue_total_usd[1h]))", "legendFormat": "Revenue rate"}
      ]
    }
  ]
}
```

Custom metrics bridge the gap between technical operations and business outcomes, enabling data-driven decisions.
