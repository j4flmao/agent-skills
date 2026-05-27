# Streaming Architecture

## Lambda vs Kappa Architecture
Streaming architecture decisions shape how data pipelines handle real-time and batch workloads.

### Lambda Architecture
```yaml
layers:
  batch:
    path: "Batch processing for complete, accurate results"
    latency: "Hours to days"
    storage: "HDFS, S3, Delta Lake"
    compute: "Spark Batch, Hive, Presto"
    use_case: "Daily reporting, ML training data"

  speed:
    path: "Real-time processing for low-latency results"
    latency: "Seconds to minutes"
    storage: "Kafka, Redis, Cassandra"
    compute: "Flink, Spark Streaming, Kafka Streams"
    use_case: "Real-time dashboards, alerts"

  serving:
    path: "Merged batch and speed layer results"
    storage: "Cassandra, HBase, Elasticsearch"
    use_case: "Unified query interface"
```

### Kappa Architecture
```yaml
layers:
  streaming:
    path: "Single pipeline for all data processing"
    latency: "Seconds to hours"
    storage: "Kafka (event log), Object storage (for replay)"
    compute: "Flink, Kafka Streams, ksqlDB"
    use_case: "Everything is a stream, batch is a special case"

  serving:
    path: "Queryable views of stream output"
    storage: "Materialized views, KV stores"
    use_case: "Real-time serving with historical accuracy"
```

### Decision Framework
| Factor | Lambda | Kappa |
|--------|--------|-------|
| Team maturity | Higher (two codebases) | Lower (one codebase) |
| Reprocessing | Complex (two paths) | Simple (replay stream) |
| Cost | Higher (two infra stacks) | Lower (single stack) |
| Use case maturity | Well-understood patterns | Emerging patterns |
| Time to market | Faster (batch) | Faster (streaming) |
| Accuracy | Exact (reconciliation) | Approximate then exact |

## Event Sourcing

### Event Log Design
```java
// Event record structure
public class EventRecord {
    private String eventId;
    private String eventType;
    private String aggregateId;
    private long version;
    private Map<String, Object> payload;
    private Map<String, String> metadata;
    private Instant timestamp;
}

// Event store interface
public interface EventStore {
    void append(String streamId, List<EventRecord> events);
    List<EventRecord> readStream(String streamId, long fromVersion);
    List<EventRecord> readAll(String streamId);
    void subscribe(String streamId, EventHandler handler);
}
```

### Event Sourcing Example
```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any
import json

@dataclass
class Event:
    aggregate_id: str
    event_type: str
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    version: int = 1

class OrderEventSourcing:
    def __init__(self, kafka_producer, topic):
        self.producer = kafka_producer
        self.topic = topic

    def emit_event(self, aggregate_id, event_type, data):
        event = Event(
            aggregate_id=aggregate_id,
            event_type=event_type,
            data=data
        )
        self.producer.produce(
            topic=self.topic,
            key=aggregate_id,
            value=json.dumps(event.__dict__),
            headers={"event_type": event_type}
        )

    def order_placed(self, order_id, customer_id, items):
        self.emit_event(order_id, "ORDER_PLACED", {
            "customer_id": customer_id,
            "items": items,
            "total": sum(item["price"] * item["qty"] for item in items)
        })

    def order_shipped(self, order_id, tracking_number):
        self.emit_event(order_id, "ORDER_SHIPPED", {
            "tracking_number": tracking_number,
            "shipped_at": datetime.utcnow().isoformat()
        })
```

## CQRS (Command Query Responsibility Segregation)

### Separating Commands and Queries
```python
# Command side (write)
class OrderCommandHandler:
    def handle_create_order(self, command):
        event = OrderCreatedEvent(
            order_id=command.order_id,
            customer_id=command.customer_id,
            items=command.items,
            total=command.total
        )
        self.event_store.append(f"order-{command.order_id}", [event])
        self.event_publisher.publish(event)

# Query side (read)
class OrderQueryHandler:
    def get_order_summary(self, order_id):
        # Read from materialized view, not event store
        return self.db.query(
            "SELECT * FROM order_summaries WHERE order_id = :id",
            {"id": order_id}
        )

    def get_customer_orders(self, customer_id, limit=20):
        return self.db.query(
            "SELECT * FROM order_summaries "
            "WHERE customer_id = :cid "
            "ORDER BY created_at DESC LIMIT :lim",
            {"cid": customer_id, "lim": limit}
        )
```

## Stream Processing Patterns

### Map-Filter-Reduce Pattern
```python
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.functions import MapFunction, FilterFunction

env = StreamExecutionEnvironment.get_execution_environment()

source = env.add_source(kafka_source)

# Map: Enrich events
class EnrichOrder(MapFunction):
    def map(self, order):
        customer = customer_lookup(order["customer_id"])
        order["customer_segment"] = customer["segment"]
        order["customer_region"] = customer["region"]
        return order

# Filter: Valid orders only
class ValidOrderFilter(FilterFunction):
    def filter(self, order):
        return (order["total_amount"] > 0
                and order["status"] in ["confirmed", "shipped"])

# Reduce: Windowed aggregation
from pyflink.datastream.functions import ReduceFunction

class OrderAggregator(ReduceFunction):
    def reduce(self, v1, v2):
        return {
            "window_start": min(v1["window_start"], v2["window_start"]),
            "total_orders": v1["total_orders"] + v2["total_orders"],
            "total_revenue": v1["total_revenue"] + v2["total_revenue"],
            "unique_customers": len(set(v1["customers"] + v2["customers"])),
            "customers": list(set(v1["customers"] + v2["customers"]))
        }

stream = source \
    .map(EnrichOrder()) \
    .filter(ValidOrderFilter()) \
    .key_by(lambda o: o["region"]) \
    .window(TumblingProcessingTimeWindows.of(Time.minutes(5))) \
    .reduce(OrderAggregator())
```

### Join Pattern (Stream-Stream)
```python
# Joining order and payment streams
orders_stream = env.from_source(orders_source, ...)
payments_stream = env.from_source(payments_source, ...)

joined = orders_stream \
    .key_by(lambda o: o["order_id"]) \
    .interval_join(payments_stream.key_by(lambda p: p["order_id"])) \
    .between(Time.minutes(-5), Time.minutes(5)) \
    .process(OrderPaymentJoinFunction())
```

### Outbox Pattern
```python
# Transactional outbox for reliable event publishing
def create_order_with_outbox(db_session, kafka_producer, order_data):
    with db_session.begin():
        # 1. Insert order
        order = Order(**order_data)
        db_session.add(order)

        # 2. Insert outbox message (same transaction)
        outbox = OutboxMessage(
            aggregate_type="order",
            aggregate_id=str(order.id),
            event_type="OrderCreated",
            payload=json.dumps(order_data),
            status="pending"
        )
        db_session.add(outbox)

    # 3. Publish after transaction succeeds
    kafka_producer.produce(
        topic="orders",
        key=str(order.id),
        value=outbox.payload
    )
    outbox.status = "published"
    db_session.commit()
```

## Exactly-Once Semantics

### Idempotent Writes
```python
def process_payment_event(event, db):
    """Idempotent payment processing."""
    payment_id = event["payment_id"]

    # Check if already processed
    existing = db.query("SELECT status FROM payments WHERE id = :id",
                        {"id": payment_id})

    if existing and existing["status"] == "completed":
        logger.info(f"Payment {payment_id} already processed, skipping")
        return {"status": "duplicate", "payment_id": payment_id}

    # Process payment (safe to retry)
    result = payment_gateway.charge(event["amount"])
    db.execute("INSERT INTO payments (id, amount, status) VALUES (:id, :amt, :st)",
               {"id": payment_id, "amt": event["amount"], "st": result.status})

    return {"status": result.status, "payment_id": payment_id}
```

## Key Points
- Lambda architecture combines batch and stream paths; Kappa uses a unified stream
- Kappa is simpler but requires robust stream replay capability
- Event sourcing captures state changes as an immutable event log
- CQRS separates read and write models for optimized performance
- Stream-stream joins require time-bounded intervals for correctness
- The outbox pattern ensures reliable event publishing with database transactions
- Exactly-once semantics require idempotent downstream consumers
- Choose architecture based on team skill, latency needs, and reprocessing requirements
- Monitor stream lag as the primary health metric
- Plan for schema evolution in long-running streaming applications
