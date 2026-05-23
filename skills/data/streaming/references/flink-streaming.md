# Flink Streaming

## Flink Job Structure

### Basic Job Template
```java
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.streaming.api.windowing.time.Time;

public class OrderAggregationJob {
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setRuntimeMode(RuntimeExecutionMode.STREAMING);
        env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime);
        env.enableCheckpointing(60000, CheckpointingMode.EXACTLY_ONCE);
        env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);
        env.getCheckpointConfig().setCheckpointTimeout(600000);
        env.getCheckpointConfig().setTolerableCheckpointFailureNumber(3);
        env.getCheckpointConfig().enableExternalizedCheckpoints(
            ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

        DataStream<Order> orders = env
            .addSource(new FlinkKafkaConsumer<>("orders.created.v1",
                new AvroDeserializationSchema<>(OrderCreated.class), kafkaProps))
            .assignTimestampsAndWatermarks(
                WatermarkStrategy.<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
                    .withTimestampAssigner((order, timestamp) -> order.getCreatedAt())
            );

        orders
            .keyBy(order -> order.getCustomerId())
            .window(TumblingEventTimeWindows.of(Time.hours(1)))
            .aggregate(new OrderAggregator())
            .addSink(new FlinkKafkaProducer<>("orders.aggregated.v1",
                new AvroSerializationSchema<>(OrderAggregate.class), kafkaProps));

        env.execute("order-aggregation-job");
    }
}
```

### Source and Sink Configuration
```java
// Kafka source properties
Properties kafkaProps = new Properties();
kafkaProps.setProperty("bootstrap.servers", "localhost:9092");
kafkaProps.setProperty("group.id", "order-aggregation-job");
kafkaProps.setProperty("isolation.level", "read_committed");
kafkaProps.setProperty("auto.offset.reset", "earliest");
```

## Event Time and Watermarks

### Event Time Processing
Flink supports three time semantics: event time (when the event occurred), ingestion time (when the event entered Flink), and processing time (when the event is processed). Event time is the recommended default for production jobs. It produces consistent results regardless of processing speed and handles late-arriving data correctly.

### Watermark Strategies
```java
// Fixed delay watermark (recommended for most cases)
DataStream<Order> withWatermarks = orders.assignTimestampsAndWatermarks(
    WatermarkStrategy.<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
        .withTimestampAssigner((order, timestamp) -> order.getCreatedAt())
);

// Custom watermark generator
DataStream<Order> customWatermarks = orders.assignTimestampsAndWatermarks(
    new WatermarkStrategy<Order>() {
        @Override
        public WatermarkGenerator<Order> createWatermarkGenerator(
                WatermarkGeneratorSupplier.Context context) {
            return new WatermarkGenerator<Order>() {
                private long maxTimestamp = Long.MIN_VALUE;

                @Override
                public void onEvent(Order event, long eventTimestamp, WatermarkOutput output) {
                    maxTimestamp = Math.max(maxTimestamp, eventTimestamp);
                }

                @Override
                public void onPeriodicEmit(WatermarkOutput output) {
                    output.emitWatermark(new Watermark(maxTimestamp - 5000));
                }
            };
        }
    }.withTimestampAssigner((order, timestamp) -> order.getCreatedAt())
);
```

### Handling Late Events
```java
orders
    .keyBy(order -> order.getCustomerId())
    .window(TumblingEventTimeWindows.of(Time.hours(1)))
    .allowedLateness(Time.minutes(5))  // Wait 5 extra minutes for late events
    .sideOutputLateData(lateOutputTag) // Send very late events to side output
    .aggregate(new OrderAggregator());

// Process late events separately
DataStream<Order> lateOrders = result.getSideOutput(lateOutputTag);
lateOrders.addSink(new LateOrderSink());
```

## Windowing

### Tumbling Windows
```java
orders
    .keyBy(order -> order.getCustomerId())
    .window(TumblingEventTimeWindows.of(Time.hours(1)))
    .aggregate(new OrderCountAggregator());
```
Fixed size, non-overlapping. Every event belongs to exactly one window. Used for: hourly aggregates, daily reports, per-minute metrics.

### Hopping (Sliding) Windows
```java
orders
    .keyBy(order -> order.getCustomerId())
    .window(SlidingEventTimeWindows.of(Time.minutes(10), Time.minutes(5)))
    .aggregate(new OrderCountAggregator());
```
Fixed size, overlapping. Every event can belong to multiple windows. Used for: rolling averages, trend detection, moving counts.

### Session Windows
```java
orders
    .keyBy(order -> order.getCustomerId())
    .window(EventTimeSessionWindows.withGap(Time.minutes(30)))
    .aggregate(new SessionAggregator());
```
Group events by activity gap. Windows defined by event activity. Used for: user sessions, IoT device sessions, customer journey analysis.

### Window Functions
```java
// ReduceFunction — incremental aggregation, low state
.window(TumblingEventTimeWindows.of(Time.hours(1)))
.reduce((order1, order2) -> order1.add(order2));

// AggregateFunction — incremental with accumulator
.window(TumblingEventTimeWindows.of(Time.hours(1)))
.aggregate(new OrderAggregator());

// ProcessWindowFunction — full window, access to all elements
.window(TumblingEventTimeWindows.of(Time.hours(1)))
.process(new MyProcessWindowFunction());
```

## Checkpointing

### Checkpoint Configuration
```java
env.enableCheckpointing(60000); // Checkpoint every 60 seconds
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000); // Min 30s between checkpoints
env.getCheckpointConfig().setCheckpointTimeout(600000); // 10 min timeout
env.getCheckpointConfig().setTolerableCheckpointFailureNumber(3);
env.getCheckpointConfig().enableExternalizedCheckpoints(
    ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

// Incremental checkpointing (RocksDB only)
env.getCheckpointConfig().enableUnalignedCheckpoints();
```

### Savepoints
```bash
# Manual savepoint
flink savepoint <job-id> s3://flink-checkpoints/savepoints

# Cancel with savepoint
flink cancel -s s3://flink-checkpoints/savepoints <job-id>

# Restore from savepoint
flink run -s s3://flink-checkpoints/savepoints app.jar

# Restore from savepoint with different parallelism
flink run -s s3://flink-checkpoints/savepoints -p 16 app.jar
```

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
- **Source**: Kafka transactional reads with `read_committed` isolation level
- **Processing**: idempotent transformations, checkpoint state via Flink's state backend
- **Sink**: idempotent writes (Kafka sink with `exactly_once` semantic mode, JDBC sink with upsert)

## State Management

### State Backends
- **HashMapStateBackend**: in-memory on JVM heap. Fast, limited by heap size. Best for small state (<1GB) requiring low latency.
- **RocksDBStateBackend**: disk-backed, serialized to byte arrays. Scalable to TB, slower access (serialization/deserialization overhead). Best for large state requiring fault tolerance.
- **Incremental checkpointing**: RocksDB incremental snapshots for faster checkpoints by only writing changed SST files.

### State Types
```java
// ValueState — single value per key
ValueState<Double> totalState = getRuntimeContext().getState(
    new ValueStateDescriptor<>("total", Double.class));

// ListState — list of values per key
ListState<Order> batchState = getRuntimeContext().getListState(
    new ListStateDescriptor<>("batch", Order.class));

// MapState — key-value map per key
MapState<String, Double> categoryTotals = getRuntimeContext().getMapState(
    new MapStateDescriptor<>("categoryTotals", String.class, Double.class));
```

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
Rescale parallelism changes the number of task slots. Flink redistributes state via key groups (default 1024 per operator). Max parallelism sets the upper bound for key groups. Must be >= parallelism. Rescaling is done via savepoint: cancel with savepoint, restart with new parallelism.

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
**Pull queries**: `SELECT * FROM customer_orders WHERE customer_id = 'abc';` — single result, like traditional SQL. Returns immediately and terminates. Best for: lookups, dashboard queries. **Push queries**: `SELECT * FROM customer_orders EMIT CHANGES;` — continuous stream of results. Never terminates. Best for: real-time monitoring, event-driven applications.

## CDC Integration

### Debezium Configuration
```json
{
  "name": "orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres.example.com",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "debezium",
    "database.dbname": "orders",
    "database.server.name": "orders-db",
    "table.include.list": "public.orders,public.order_items",
    "plugin.name": "pgoutput",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

### CDC Architecture
```
Source DB → Debezium Connector → Kafka Topic → Flink/ksqlDB → Target
```
Debezium captures row-level changes (INSERT, UPDATE, DELETE) from PostgreSQL, MySQL, MongoDB, SQL Server, and others. Changes are written to Kafka topics as event streams. The initial snapshot loads existing data before streaming starts. Each table change event includes: `before` (old state), `after` (new state), `op` (operation type: c=create, u=update, d=delete), `ts_ms` (timestamp), and source metadata.
