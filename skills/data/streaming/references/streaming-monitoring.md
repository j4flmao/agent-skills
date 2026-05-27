# Streaming Monitoring

## Why Stream Monitoring Matters
Streaming pipelines fail differently than batch pipelines. Instead of a single failing job, streaming systems experience gradual degradation: increasing lag, growing state, silent data loss, and schema drift. Comprehensive monitoring is essential for maintaining real-time SLAs.

## Key Streaming Metrics

### Consumer Lag
Consumer lag is the most critical streaming metric — it measures how far behind a consumer is from the latest produced message.

```bash
# Kafka consumer lag
kafka-consumer-groups \
  --bootstrap-server kafka:9092 \
  --group order-processor \
  --describe

# Output:
# TOPIC      PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders     0          150000          152300          2300
# orders     1          148900          152300          3400
# orders     2          151000          152300          1300
```

### Monitoring Lag with Prometheus
```yaml
# Kafka lag exporter config
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: kafka-lag-monitor
spec:
  selector:
    matchLabels:
      app: kafka-lag-exporter
  endpoints:
  - port: http
    interval: 15s
  targetLabels:
    - consumer_group
    - topic
```

### Lag Alerting
```python
from prometheus_client import Gauge
import time

KAFKA_LAG = Gauge(
    "kafka_consumer_lag",
    "Kafka consumer lag per partition",
    ["consumer_group", "topic", "partition"]
)

LAG_THRESHOLD = {
    "order-processor": {"warning": 10000, "critical": 50000},
    "payment-validator": {"warning": 5000, "critical": 25000},
    "notification-sender": {"warning": 50000, "critical": 200000},
}

def check_lag_alerts():
    for (group, topic, partition), lag in get_current_lags():
        thresholds = LAG_THRESHOLD.get(group, {})
        if lag > thresholds.get("critical", float("inf")):
            alert(f"CRITICAL: Consumer group {group} lag is {lag}")
        elif lag > thresholds.get("warning", float("inf")):
            warning(f"WARNING: Consumer group {group} lag is {lag}")
```

## Throughput Monitoring

### Messages Per Second
```python
from prometheus_client import Counter, Histogram

MESSAGES_IN = Counter(
    "stream_messages_in_total",
    "Total messages produced",
    ["topic"]
)

MESSAGES_OUT = Counter(
    "stream_messages_out_total",
    "Total messages consumed",
    ["consumer_group", "topic"]
)

PROCESSING_LATENCY = Histogram(
    "stream_processing_latency_seconds",
    "End-to-end processing latency",
    ["consumer_group"],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30, 60]
)

THROUGHPUT_BYTES = Counter(
    "stream_throughput_bytes_total",
    "Data throughput in bytes",
    ["topic", "direction"]
)
```

### Dashboard Configuration
```yaml
# Grafana dashboard panels
panels:
  - title: "Consumer Lag by Group"
    type: graph
    targets:
      - expr: kafka_consumer_lag
        legendFormat: "{{consumer_group}} - {{topic}} [{{partition}}]"
    thresholds:
      - value: 10000
        color: yellow
      - value: 50000
        color: red

  - title: "Throughput (msg/s)"
    type: graph
    targets:
      - expr: rate(stream_messages_in_total[5m])
        legendFormat: "Produced: {{topic}}"
      - expr: rate(stream_messages_out_total[5m])
        legendFormat: "Consumed: {{consumer_group}}"

  - title: "Processing Latency P99"
    type: stat
    targets:
      - expr: histogram_quantile(0.99, rate(stream_processing_latency_seconds_bucket[5m]))
```

## Data Freshness SLAs

### Freshness Monitoring
```python
from datetime import datetime, timedelta

class FreshnessMonitor:
    def __init__(self, kafka_client, db_client):
        self.kafka = kafka_client
        self.db = db_client

    def check_freshness_sla(self, topic, max_lag_seconds):
        """Check if data freshness meets SLA."""
        latest_message = self.get_latest_timestamp(topic)
        if latest_message is None:
            return {"topic": topic, "status": "no_data", "sla_met": False}

        age_seconds = (datetime.utcnow() - latest_message).total_seconds()
        sla_met = age_seconds <= max_lag_seconds

        return {
            "topic": topic,
            "latest_timestamp": latest_message,
            "age_seconds": age_seconds,
            "max_allowed": max_lag_seconds,
            "sla_met": sla_met,
            "status": "ok" if sla_met else "violation"
        }

    def get_latest_timestamp(self, topic):
        """Get the timestamp of the latest message in a topic."""
        consumer = self.kafka.Consumer({
            "bootstrap.servers": "kafka:9092",
            "group.id": "freshness-checker",
            "enable.auto.commit": False
        })
        consumer.assign([TopicPartition(topic, 0)])
        consumer.seek_to_end(TopicPartition(topic, 0))
        last_offset = consumer.position(TopicPartition(topic, 0))
        if last_offset == 0:
            return None

        consumer.seek(TopicPartition(topic, 0), last_offset - 1)
        msg = consumer.poll(1000)
        return datetime.fromtimestamp(msg.timestamp() / 1000)
```

## Schema Evolution Detection

### Schema Registry Monitoring
```python
import requests
from datetime import datetime

class SchemaRegistryMonitor:
    def __init__(self, registry_url):
        self.registry_url = registry_url

    def get_schema_evolution(self, subject):
        """Check schema version history for a subject."""
        response = requests.get(
            f"{self.registry_url}/subjects/{subject}/versions"
        )
        versions = response.json()

        evolutions = []
        for version in versions:
            details = requests.get(
                f"{self.registry_url}/subjects/{subject}/versions/{version}"
            ).json()
            evolutions.append({
                "version": version,
                "id": details["id"],
                "schema_type": details["schemaType"],
                "compatibility": self.get_compatibility(subject)
            })

        return evolutions

    def get_compatibility(self, subject):
        response = requests.get(
            f"{self.registry_url}/config/{subject}"
        )
        return response.json().get("compatibilityLevel", "GLOBAL")

    def check_compatibility(self, subject, new_schema):
        """Validate new schema against latest version."""
        response = requests.post(
            f"{self.registry_url}/compatibility/subjects/{subject}/versions/latest",
            json={"schema": new_schema}
        )
        return response.json().get("is_compatible", False)
```

## State Management Monitoring

### Flink State Metrics
```python
# Flink state backend metrics
STATE_SIZE = Gauge(
    "flink_state_size_bytes",
    "Current state size",
    ["job_name", "operator_name"]
)

STATE_ACCESS_LATENCY = Histogram(
    "flink_state_access_latency_seconds",
    "State access latency",
    ["state_backend"],
    buckets=[0.0001, 0.001, 0.01, 0.1, 1]
)

CHECKPOINT_DURATION = Histogram(
    "flink_checkpoint_duration_seconds",
    "Checkpoint duration",
    ["job_name"],
    buckets=[1, 5, 10, 30, 60, 120, 300]
)

CHECKPOINT_SIZE = Gauge(
    "flink_checkpoint_size_bytes",
    "Checkpoint size",
    ["job_name"]
)
```

## Alerting Strategies

### Tiered Alerting
```yaml
alerts:
  critical:
    conditions:
      - consumer_lag > 50000
      - no_data_breach > 30_minutes
    channels:
      - pagerduty
      - slack_urgent
    response_time: "5 minutes"

  warning:
    conditions:
      - consumer_lag > 10000
      - processing_error_rate > 0.01
      - state_growth > 10%_per_hour
    channels:
      - slack_alerts
      - email
    response_time: "30 minutes"

  info:
    conditions:
      - consumer_rebalance
      - schema_registration
      - throughput_drop > 50%
    channels:
      - slack_logs
    response_time: "Daily review"
```

## Key Points
- Consumer lag is the most critical metric for streaming health
- Monitor at multiple layers: infrastructure, throughput, processing, freshness
- Set up tiered alerting with appropriate thresholds and response times
- Track state size and checkpoint durations for stateful stream processors
- Monitor schema registry for compatibility violations
- Implement data freshness SLAs with automated violation detection
- Use histograms for processing latency distributions (not just averages)
- Track rebalance events as they indicate consumer group instability
- Visualize stream health in real-time dashboards with lag, throughput, and latency
- Plan for backpressure detection and auto-scaling triggers
