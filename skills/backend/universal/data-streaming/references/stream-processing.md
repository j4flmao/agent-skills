# Stream Processing

## Kafka Streams DSL
```java
KStream<String, Order> orders = builder.stream("order.created.v1");
KStream<String, Payment> payments = builder.stream("payment.processed.v1");

// Windowed join
orders.join(payments,
    (order, payment) -> new OrderPayment(order, payment),
    JoinWindows.of(Duration.ofMinutes(5)),
    StreamJoined.with(Serdes.String(), orderSerde, paymentSerde))
  .to("order.payment.joined.v1");

// Stateful aggregation
KGroupedStream<String, Order> grouped = orders.groupByKey();
KTable<Windowed<String>, Long> windowedCounts = grouped
  .windowedBy(TimeWindows.of(Duration.ofHours(1)))
  .count(Materialized.as("order-counts-store"));
```

## State Stores
- RocksDB: local disk-backed, large state, slower reads
- In-memory: heap-backed, small state (<1GB), faster reads
- Persistent: RocksDB for production, withstands restarts
- Changelog topics: fault tolerance via replicated state

## Apache Flink Integration
```sql
-- ksqlDB continuous query
CREATE STREAM joined_orders AS
  SELECT o.order_id, o.user_id, p.amount, p.status
  FROM orders o
  JOIN payments p WITHIN 5 MINUTES
  ON o.order_id = p.order_id;

-- Flink SQL
INSERT INTO enriched_orders
SELECT o.*, p.amount, p.status
FROM orders AS o
JOIN payments AS p
ON o.order_id = p.order_id
AND p.proctime BETWEEN o.proctime AND o.proctime + INTERVAL '5' MINUTE;
```

## Window Types
- Tumbling: fixed non-overlapping windows, `TimeWindows.of(size)`
- Hopping: overlapping windows, `TimeWindows.of(size).advanceBy(step)`
- Sliding: per-record sync windows, `JoinWindows.of(beforeMs).after(afterMs)`
- Session: inactivity-gap windows, `SessionWindows.with(gap)`
