# Stream Processing

## Flink

### Job Structure
```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
env.setRuntimeMode(RuntimeExecutionMode.STREAMING);
env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime);
env.enableCheckpointing(60000, CheckpointingMode.EXACTLY_ONCE);
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);

DataStream<Order> orders = env
    .addSource(new FlinkKafkaConsumer<>("orders.created.v1", 
        new AvroDeserializationSchema<>(OrderCreated.class), kafkaProps));

orders
    .keyBy(order -> order.getCustomerId())
    .timeWindow(Time.hours(1))
    .aggregate(new OrderAggregator())
    .addSink(new FlinkKafkaProducer<>("orders.aggregated.v1",
        new AvroSerializationSchema<>(OrderAggregate.class), kafkaProps));

env.execute("order-aggregation-job");
```

### State Management
- ValueState: single value per key (last seen timestamp).
- ListState: list of values per key (recent events).
- MapState: key-value map per key (session data).
- RocksDB state backend: for large state (>1GB), disk-backed.
- Heap state backend: for low-latency state (<1GB), in-memory.

### Checkpointing
```java
env.enableCheckpointing(60000);
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);
env.getCheckpointConfig().setCheckpointTimeout(600000);
env.getCheckpointConfig().setTolerableCheckpointFailureNumber(3);
env.getCheckpointConfig().enableExternalizedCheckpoints(
    ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);
```

### Savepoints
```bash
# Manual savepoint
flink savepoint <job-id> s3://flink-checkpoints/savepoints

# Cancel with savepoint
flink cancel -s s3://flink-checkpoints/savepoints <job-id>

# Restore from savepoint
flink run -s s3://flink-checkpoints/savepoints app.jar
```

## ksqlDB

### Stream and Table Creation
```sql
CREATE STREAM order_created (
    order_id VARCHAR KEY,
    customer_id VARCHAR,
    items ARRAY<STRUCT<product_id VARCHAR, quantity INT, unit_price DOUBLE>>,
    total_amount DOUBLE,
    created_at BIGINT
) WITH (
    KAFKA_TOPIC = 'orders.created.v1',
    VALUE_FORMAT = 'AVRO'
);

CREATE TABLE customer_orders AS
SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_spent,
    LATEST_BY_OFFSET(total_amount) AS last_order_amount
FROM order_created
GROUP BY customer_id
EMIT CHANGES;
```

### Joins
```sql
-- Stream-Table join (enrichment)
CREATE STREAM enriched_orders AS
SELECT
    o.order_id,
    o.customer_id,
    c.name AS customer_name,
    o.total_amount
FROM order_created o
LEFT JOIN customers c ON o.customer_id = c.customer_id
EMIT CHANGES;
```

### Pull vs Push Queries
Pull: `SELECT * FROM customer_orders WHERE customer_id = 'abc';` — single result, like traditional SQL. Push: `SELECT * FROM customer_orders EMIT CHANGES;` — continuous stream of results.

## Exactly-Once Semantics

### Flink Configuration
```java
env.enableCheckpointing(60000);  // checkpoint every 60s
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
```

### Kafka Producer Config
```java
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true");
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "orders-processor-1");
```

### End-to-End Exactly-Once
- Source: Kafka transactional reads with `read_committed` isolation
- Processing: idempotent transformations, checkpoint state
- Sink: idempotent writes or transactional writers (Kafka sink, JDBC sink)

## Windowing

### Tumbling Windows
```java
orders
    .keyBy(order -> order.getCustomerId())
    .window(TumblingEventTimeWindows.of(Time.hours(1)))
    .aggregate(new OrderCountAggregator())
```
Fixed size, non-overlapping. Every event belongs to exactly one window. Used for: hourly aggregates, daily reports.

### Hopping (Sliding) Windows
```java
orders
    .keyBy(order -> order.getCustomerId())
    .window(SlidingEventTimeWindows.of(Time.minutes(10), Time.minutes(5)))
    .aggregate(new OrderCountAggregator())
```
Fixed size, overlapping. Every event can belong to multiple windows. Used for: rolling averages, trend detection.

### Session Windows
```java
orders
    .keyBy(order -> order.getCustomerId())
    .window(EventTimeSessionWindows.withGap(Time.minutes(30)))
    .aggregate(new SessionAggregator())
```
Group events by activity gap. Windows defined by event activity. Used for: user sessions, IoT device sessions.

### Watermarks
```java
orders.assignTimestampsAndWatermarks(
    WatermarkStrategy.<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
        .withTimestampAssigner((order, timestamp) -> order.getCreatedAt())
);
```
Controls how long to wait for late events. Set based on event latency SLA. Late events handled via allowed lateness and side outputs.

## State Management

### State Backends
- HashMapStateBackend: in-memory, JVM heap. Fast, limited by heap size.
- RocksDBStateBackend: disk-backed, serialized. Scalable to TB, slower access.
- Incremental checkpointing: RocksDB incremental snapshots for faster checkpoints.

### State TTL
```java
StateTtlConfig ttlConfig = StateTtlConfig
    .newBuilder(Time.days(7))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .build();
ValueStateDescriptor<Tuple2<String, Long>> descriptor = 
    new ValueStateDescriptor<>("user-session", TypeInformation.of(new TypeHint<>() {}));
descriptor.enableTimeToLive(ttlConfig);
```

### State Rescaling
Rescale parallelism: Flink redistributes state to new number of task slots. Key groups: unit of state distribution (default 1024 key groups per operator). Max parallelism: sets upper bound for key groups, must be >= parallelism.
