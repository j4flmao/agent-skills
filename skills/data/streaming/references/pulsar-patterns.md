# Apache Pulsar Patterns

## Architecture

### Separation of Serving and Storage
Unlike Kafka (broker handles both), Pulsar separates:
- **Broker**: stateless serving layer — handles produce/consume requests, no data storage
- **BookKeeper (Bookie)**: stateful storage layer — persists messages in ledgers (append-only segments)

This separation enables:
- **Elastic scaling**: add brokers for throughput, add bookies for storage — independently
- **No data rebalancing**: new brokers automatically serve existing topics
- **Unlimited retention**: messages stay in BookKeeper/offloaded storage until deleted

### Key Components
```
Producer → Pulsar Broker (stateless)
            ├── Managed Ledger (per topic partition)
            │   ├── BookKeeper Ledger (segment 0)
            │   ├── BookKeeper Ledger (segment 1)
            │   └── Tiered Storage (S3/GCS) ← offloaded older segments
            └── Dispatch Rate Limiter → Consumer
```

- **Ledger**: append-only log, the unit of storage in BookKeeper
- **Managed Ledger**: Pulsar's abstraction over BookKeeper, handles segment rolling
- **Cursor**: consumer's position in the log (managed by broker, not consumer)

## Subscription Types

| Type | Behavior | Use Case |
|------|----------|----------|
| **Exclusive** | One consumer per subscription | Order processing (strict ordering) |
| **Shared** | Multiple consumers, round-robin | High-throughput, ordering not required |
| **Failover** | One primary consumer, others standby | HA with ordering |
| **Key_Shared** | Same-key messages → same consumer | Ordering per key with parallelism |

```java
// Key_Shared subscription
Consumer<byte[]> consumer = client.newConsumer()
    .topic("persistent://public/default/orders")
    .subscriptionName("order-processors")
    .subscriptionType(SubscriptionType.Key_Shared)
    .subscribe();
```

## Geo-Replication

### Configuration
```yaml
# broker.conf (us-east cluster)
configurationStoreServers: zk-us-east:2181,zk-eu-west:2181
replicationClusters: us-east,eu-west

# Enable geo-replication per topic
bin/pulsar-admin topics create persistent://publish/us-east/orders
bin/pulsar-admin topics set-replication-clusters \
  --clusters us-east,eu-west \
  persistent://publish/us-east/orders
```

### Behavior
- **Async replication**: producers write to local cluster, data replicates async
- **Replicator queues**: per-target-cluster queue for each topic
- **If no local producer**: no replication traffic for that cluster
- **Consistent** within cluster, eventually consistent across clusters

## Functions and IO Connectors

### Pulsar Functions (Lightweight Processing)
```java
public class FilterFunction implements Function<String, String> {
    @Override
    public String process(String input, Context ctx) {
        if (input.contains("ERROR")) {
            ctx.getLogger().warn("Error event received");
            return input;
        }
        return null;  // filtered out
    }
}
// Deploy: bin/pulsar-admin functions create --className FilterFunction ...
```

### IO Connectors
Built-in connectors for sources and sinks:
- **Sources**: Debezium CDC (MySQL, Postgres, MongoDB), Kafka, Kinesis, Netty
- **Sinks**: Elasticsearch, JDBC, S3, Cassandra, Redis, HBase

```bash
# Debezium MySQL source connector
bin/pulsar-admin sources create \
  --archive connectors/pulsar-io-debezium-mysql-2.11.0.nar \
  --tenant public --namespace default \
  --name "debezium-mysql-orders" \
  --destination-topic-name "debezium-orders" \
  --source-config '{
    "database.hostname": "mysql-primary",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "***",
    "database.server.name": "orders-db",
    "database.whitelist": "orders"
  }'
```

## Tiered Storage

Offload older data from BookKeeper to S3/GCS while maintaining queryability:
```json
// broker.conf
managedLedgerOffloadDriver=aws-s3
s3ManagedLedgerOffloadBucket=pulsar-offload-us-east
s3ManagedLedgerOffloadRegion=us-east-1

// Offload after threshold (default: after 10MB of data per ledger)
managedLedgerOffloadAutoTriggerSizeThresholdBytes=10737418240  # 10GB
```

Benefits: BookKeeper handles hot data (last N hours/days), S3 stores cold data. Consumers transparently read from S3 when data is offloaded.

## Topic Policy Hierarchy

```
Namespace (applies to all topics)
  └── Topic (overrides namespace)
       └── Subscription (overrides topic)
```

```bash
# Set retention at namespace level
bin/pulsar-admin namespaces set-retention public/default \
  --size 100G --time 7d

# Override for specific topic (keep forever)
bin/pulsar-admin topics set-retention persistent://public/default/audit-logs \
  --size -1 --time -1
```
