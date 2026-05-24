# Batch vs Streaming Decision Framework

## Decision Criteria

Choose between batch and streaming processing based on latency, cost, complexity, and use case requirements.

### Latency Requirements

| Latency Need | Processing Mode | Examples |
|-------------|----------------|----------|
| < 1 second | Streaming only | Fraud detection, real-time alerts |
| 1-60 seconds | Streaming | Real-time dashboards, monitoring |
| 1-15 minutes | Micro-batch | Recommendations, personalization |
| 15-60 minutes | Micro-batch or batch | Operational reports |
| 1-24 hours | Batch | Daily financial reports |
| > 24 hours | Batch | Monthly analytics, ML training |

```python
def recommend_mode(latency_seconds: int, volume_tps: int) -> str:
    """Recommend processing mode based on latency and volume."""
    if latency_seconds < 60:
        return "streaming"
    elif latency_seconds < 900:  # 15 min
        if volume_tps > 10000:
            return "streaming"  # High volume needs streaming
        return "micro_batch"
    else:
        return "batch"
```

### Cost Analysis

| Factor | Batch | Streaming |
|--------|-------|-----------|
| Compute cost | Lower (right-sized, scheduled) | Higher (always-on, distributed) |
| Storage cost | Higher (staging data) | Lower (process in transit) |
| Operational cost | Lower (simpler ops) | Higher (state management, offset tracking) |
| Development cost | Lower (simpler logic) | Higher (exactly-once, watermarks) |

```python
# Cost comparison
def estimate_monthly_cost(
    data_gb_per_day: float,
    mode: str,
    processing_time_minutes: float,
    cluster_cost_per_hour: float
) -> dict:
    if mode == "batch":
        daily_hours = processing_time_minutes / 60
        daily_cost = daily_hours * cluster_cost_per_hour
    else:  # streaming
        daily_hours = 24
        daily_cost = daily_hours * cluster_cost_per_hour * 1.5  # overhead

    monthly = daily_cost * 30
    storage = data_gb_per_day * 30 * 0.023  # $0.023/GB/month
    return {"compute": monthly, "storage": storage, "total": monthly + storage}
```

## Use Case Patterns

### Batch-Fitting Use Cases

**Periodic Reporting:**
```sql
-- Batch: monthly sales aggregation
SELECT
    DATE_TRUNC('month', order_date) AS month,
    customer_id,
    SUM(amount) AS total_spent,
    COUNT(order_id) AS order_count
FROM orders
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
GROUP BY month, customer_id;
```

**Historical Analysis:**
- 3+ years of data required
- Complex joins across multiple sources
- Full dataset scans

**ML Training:**
- Full dataset for model training
- Feature engineering over large windows
- Periodic retraining cycles

**Compliance Reporting:**
- Point-in-time snapshots
- Regulated reporting windows
- Audit trails

### Streaming-Fitting Use Cases

**Fraud Detection:**
```python
# Streaming fraud detection
def detect_fraud(event: TransactionEvent) -> Alert:
    """Real-time fraud detection on transaction stream."""
    recent_txns = state_store.get(f"user:{event.user_id}:txns_5min")
    velocity = len(recent_txns)

    if velocity > 10:  # >10 transactions in 5 minutes
        return Alert(event.user_id, "high_velocity", velocity)

    return None
```

**Real-Time Dashboards:**
- Sub-second latency required
- Continuous metric updates
- Live operational visibility

**Alerting and Monitoring:**
- Threshold-based alerts
- Anomaly detection
- System health monitoring

## Hybrid Architectures

### Lambda Architecture

Lambda combines batch and streaming paths for comprehensive data processing.

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    Input Data                       │
                    └──────────┬──────────────────────────┬───────────────┘
                               │                          │
                    ┌──────────▼──────────┐    ┌──────────▼──────────┐
                    │   Speed Layer        │    │   Batch Layer        │
                    │   (Streaming)        │    │   (Batch)            │
                    │   Real-time views    │    │   Master dataset     │
                    │   Low latency        │    │   Complete/historical│
                    │   Approximate        │    │   Accurate           │
                    └──────────┬──────────┘    └──────────┬──────────┘
                               │                          │
                               └──────────┬───────────────┘
                                          ▼
                               ┌─────────────────────┐
                               │   Serving Layer      │
                               │   Merge views        │
                               │   Query results      │
                               └─────────────────────┘
```

**Pros:** Complete historical + real-time, well-understood architecture.
**Cons:** Code duplication (two codebases), complex maintenance, reconciliation issues.

### Kappa Architecture

Kappa simplifies Lambda by using streaming for everything, with replay capability for batch jobs.

```
                    ┌──────────────────────┐
                    │     Input Data        │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Stream Processor    │
                    │   (Kafka + Flink)     │
                    │   Continuous process  │
                    │   Replay for batch    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Serving Layer       │
                    │   (All views in DB)   │
                    └──────────────────────┘
```

**Pros:** Single codebase, simpler architecture, reprocessing via topic replay.
**Cons:** Fixed latency floor, all consumers must handle streaming, rebalancing complexity.

```python
# Kappa: same code for real-time and batch
def compute_user_features(events_stream):
    """Single processing pipeline — works for streaming and replay."""
    return (
        events_stream
        .filter(lambda e: e.type == 'order')
        .key_by(lambda e: e.user_id)
        .window(TumblingEventTimeWindows.of(Time.hours(1)))
        .aggregate(
            initial_value=lambda: UserFeatures(0, 0.0),
            update_fn=lambda acc, e: UserFeatures(
                acc.order_count + 1,
                acc.total_spent + e.amount
            ),
            window_fn=lambda acc: acc
        )
    )
```

## Technology Selection Guide

| Requirement | Batch | Streaming | Hybrid |
|------------|-------|-----------|--------|
| Processing engine | Spark SQL, Hive, Trino | Flink, Kafka Streams, Spark Streaming | Flink (batch + stream) |
| Storage | HDFS, S3, data lake | Kafka, Pulsar | Kafka + object store |
| Orchestration | Airflow, Dagster | Flink job manager | Combined |
| State management | N/A | RocksDB, state store | State + external storage |
| Exactly-once | Natural (idempotent) | Checkpoints, transactions | Checkpointed |

### Batch Engine Comparison

```yaml
batch_engines:
  spark_sql:
    strengths: [large-scale ETL, complex joins, ML integration]
    weaknesses: [high memory overhead, cold start latency]
    best_for: "TB-scale batch with complex transformations"

  trino:
    strengths: [fast SQL, federated queries, no ETL]
    weaknesses: [no ACID writes, limited UDF support]
    best_for: "Interactive batch queries on existing data"

  dbt:
    strengths: [SQL-first, testing, documentation, lineage]
    weaknesses: [requires warehouse, no custom processing]
    best_for: "Warehouse transformations with data governance"
```

### Streaming Engine Comparison

```yaml
streaming_engines:
  flink:
    strengths: [exactly-once, event time, state management, large ecosystem]
    weaknesses: [complex operations, high memory, learning curve]
    best_for: "Mission-critical streaming with stateful processing"

  kafka_streams:
    strengths: [lightweight, embeddable, Kafka-native, no cluster needed]
    weaknesses: [JVM only, limited windowing, no event time in early versions]
    best_for: "Kafka-native stream processing, simple transformations"

  spark_streaming:
    strengths: [unified batch/streaming API, large community]
    weaknesses: [micro-batch only (high latency), no native event time]
    best_for: "Teams already using Spark who want streaming capabilities"
```

## Decision Flowchart

```
Do you need sub-second latency?
├── YES → Streaming (Flink, Kafka Streams)
└── NO → Can you tolerate > 5 minutes delay?
    ├── YES → Can the pipeline be SQL-only?
    │   ├── YES → Batch (dbt, Trino, Spark SQL)
    │   └── NO → Batch (Spark, custom ETL)
    └── NO → Is exactly-once semantics required?
        ├── YES → Streaming with checkpoints (Flink)
        └── NO → Micro-batch (Spark Streaming, Kafka Streams)
```

## Rules
- Choose streaming only when latency < 60 seconds — batch is simpler and cheaper
- Lambda architecture is a legacy pattern; prefer Kappa for new systems
- Micro-batch (5-60 second windows) is a good compromise for most use cases
- Cost analysis must include operational overhead, not just compute
- Exactly-once semantics are significantly harder in streaming — only use when required
- Kafka's log compaction enables both streaming and batch from the same topic
- Test streaming pipelines with historical data replay before production
- Monitor streaming lag; alert if it exceeds the latency SLA
- Batch is strongly preferred for regulatory reporting and financial close
- Start with batch, add streaming only when latency requirements demand it
