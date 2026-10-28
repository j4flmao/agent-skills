# Kafka Broker and Topic Configuration Guide

Configuration for Kafka clusters in KRaft mode (ZooKeeper was removed in Kafka 4.0): node roles, durability settings, topic-level overrides, retention, and tiered storage. Client properties are in `api_reference.md`.

## KRaft Roles

| Role | `process.roles` | Notes |
|------|-----------------|-------|
| Controller | `controller` | Runs the metadata quorum (Raft). 3 for most clusters, 5 for large/critical |
| Broker | `broker` | Stores partitions, serves clients |
| Combined | `broker,controller` | Dev/small clusters only; isolate controllers in production |

### Controller node

```properties
process.roles=controller
node.id=1
controller.quorum.bootstrap.servers=ctrl-1:9093,ctrl-2:9093,ctrl-3:9093
listeners=CONTROLLER://:9093
controller.listener.names=CONTROLLER
log.dirs=/var/lib/kafka/meta
```

### Broker node

```properties
process.roles=broker
node.id=101
controller.quorum.bootstrap.servers=ctrl-1:9093,ctrl-2:9093,ctrl-3:9093
controller.listener.names=CONTROLLER
listeners=INTERNAL://:9092,EXTERNAL://:9094
advertised.listeners=INTERNAL://kafka-101.internal:9092,EXTERNAL://kafka-101.example.com:9094
listener.security.protocol.map=CONTROLLER:SSL,INTERNAL:SASL_SSL,EXTERNAL:SASL_SSL
inter.broker.listener.name=INTERNAL
log.dirs=/data/kafka-1,/data/kafka-2
broker.rack=eu-west-1a
```

Format storage before first start:

```bash
KAFKA_CLUSTER_ID=$(bin/kafka-storage.sh random-uuid)
bin/kafka-storage.sh format -t "$KAFKA_CLUSTER_ID" -c config/server.properties
```

Dynamic quorums (`controller.quorum.bootstrap.servers`, KIP-853) allow adding/removing controllers; older static setups use `controller.quorum.voters`.

## Durability Settings

| Setting | Recommended | Why |
|---------|-------------|-----|
| `default.replication.factor` | 3 | Survive one broker loss with headroom |
| `min.insync.replicas` | 2 | With `acks=all`, a write needs 2 replicas |
| `unclean.leader.election.enable` | `false` (default) | Never elect an out-of-sync replica (data loss) |
| `broker.rack` | AZ name | Rack-aware replica placement across zones |
| `auto.create.topics.enable` | `false` | Topics created deliberately with correct settings |
| `offsets.topic.replication.factor` | 3 | Consumer offsets durability |
| `transaction.state.log.replication.factor` / `.min.isr` | 3 / 2 | Transaction coordinator durability |

RF=3 with `min.insync.replicas=2` tolerates one replica down for writes; with two down, `acks=all` producers get `NotEnoughReplicas` (by design).

## Topic-Level Configuration

| Config | Default | Notes |
|--------|---------|-------|
| `cleanup.policy` | `delete` | `compact` for keyed state; `compact,delete` for both |
| `retention.ms` | 604800000 (7 days) | `-1` = unlimited |
| `retention.bytes` | -1 | Per partition |
| `segment.bytes` | 1 GiB | Smaller segments → faster retention/compaction, more files |
| `max.message.bytes` | ~1 MiB | Align with producer `max.request.size` and consumer fetch sizes |
| `min.compaction.lag.ms` | 0 | Guarantee consumers see each update for at least this long |
| `delete.retention.ms` | 1 day | How long tombstones stay visible on compacted topics |
| `message.timestamp.type` | `CreateTime` | `LogAppendTime` when producer clocks are untrusted |
| `compression.type` | `producer` | Keep producer compression to avoid recompression |

```bash
bin/kafka-topics.sh --bootstrap-server kafka:9092 --create --topic billing.invoice.issued.v1 \
  --partitions 12 --replication-factor 3 \
  --config min.insync.replicas=2 --config retention.ms=1209600000

bin/kafka-configs.sh --bootstrap-server kafka:9092 --alter --entity-type topics \
  --entity-name customers.state --add-config cleanup.policy=compact,min.compaction.lag.ms=3600000
```

Manage topics as code (Terraform provider, Strimzi `KafkaTopic` CRDs, or JulieOps-style GitOps) rather than ad hoc CLI in production.

## Partition Count

- Upper bound for consumer parallelism within a group equals partition count.
- Size for peak throughput per partition your consumers can sustain, with headroom for growth.
- Increasing partitions changes key → partition mapping for keyed topics (ordering breaks across the change); decreasing is impossible. For keyed topics, create a new topic and migrate.
- KRaft supports far more partitions per cluster than ZooKeeper-era clusters, but each partition still costs file handles, memory, and recovery time.

## Tiered Storage

Kafka tiered storage (KIP-405, production-ready since 3.9) moves closed segments to object storage, keeping recent data on local disks.

```properties
# broker
remote.log.storage.system.enable=true
remote.log.storage.manager.class.name=<RemoteStorageManager implementation>
remote.log.metadata.manager.class.name=org.apache.kafka.server.log.remote.metadata.storage.TopicBasedRemoteLogMetadataManager
```

```bash
# topic
--config remote.storage.enable=true --config local.retention.ms=86400000 --config retention.ms=31536000000
```

A plugin implementing `RemoteStorageManager` for S3/GCS/Azure is required (open-source plugins exist; managed services provide their own). Compacted topics are not supported for tiering.

## Quotas

```bash
bin/kafka-configs.sh --bootstrap-server kafka:9092 --alter \
  --add-config 'producer_byte_rate=10485760,consumer_byte_rate=20971520,request_percentage=50' \
  --entity-type users --entity-name analytics-app
```

Quotas protect the cluster from noisy clients; combine with per-application credentials.

## JVM and OS

- Heap: a few GB is typical for brokers (e.g. 6 GB); the OS page cache does the heavy lifting, so leave most RAM free.
- Use G1 or ZGC with GC logging; current Kafka versions require Java 17+ for brokers (Java 11 still supported for clients).
- File descriptors: raise `nofile` (100k+); `vm.max_map_count` for many segments; XFS or ext4 with `noatime`.
- Use multiple `log.dirs` (JBOD) or RAID10 depending on your failure model; JBOD in KRaft mode arrived in the 3.7/3.8 releases, so check your version before relying on it.

## Pitfalls

- `advertised.listeners` pointing to unreachable names → clients connect to bootstrap then fail.
- `min.insync.replicas=1` with `acks=all`, giving a false sense of durability.
- Auto-created topics with default partitions and RF=1.
- Compacted topic with producers sending null keys (rejected) or forgetting tombstones for deletes.

## Checklist

- [ ] KRaft with dedicated controller quorum (3 or 5)
- [ ] RF=3, `min.insync.replicas=2`, rack awareness, unclean election off
- [ ] Topics created via code with explicit retention/cleanup
- [ ] Partition counts planned for keyed topics
- [ ] Tiered storage evaluated for long retention
- [ ] Quotas per client identity
