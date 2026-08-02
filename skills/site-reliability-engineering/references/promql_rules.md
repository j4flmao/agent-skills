# PromQL Queries

## RED Method (Services)
Focuses on Request Rate, Error Rate, and Duration (Latency).

- **Rate (Requests per second):**
  ```promql
  sum(rate(http_requests_total{job="my-service"}[5m]))
  ```

- **Errors (Error rate percentage):**
  ```promql
  sum(rate(http_requests_total{job="my-service", status=~"5.."}[5m])) 
  / 
  sum(rate(http_requests_total{job="my-service"}[5m])) * 100
  ```

- **Duration (99th percentile latency):**
  ```promql
  histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="my-service"}[5m])) by (le))
  ```

## USE Method (Resources)
Focuses on Utilization, Saturation, and Errors for hardware/infrastructure.

- **Utilization (CPU %):**
  ```promql
  100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
  ```

- **Utilization (Memory %):**
  ```promql
  100 * (1 - ((node_memory_MemFree_bytes + node_memory_Cached_bytes + node_memory_Buffers_bytes) / node_memory_MemTotal_bytes))
  ```

- **Saturation (Load Average vs CPUs):**
  ```promql
  node_load1 > count(node_cpu_seconds_total{mode="system"}) by (instance)
  ```
