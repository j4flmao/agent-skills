# Kafka Patterns

## Topic Configuration
```
cleanup.policy=delete        → default, time/size-based retention
cleanup.policy=compact       → keep latest per key, used for state/logs
retention.ms=604800000       → 7 days for delete topics
retention.bytes=107374182400 → 100GB per partition
min.insync.replicas=2        → minimum ISR count for durability
max.message.bytes=1048576    → 1MB max message size
```

## Producer Configuration
```
enable.idempotence=true      → exactly-once per partition
acks=all                     → wait for all ISR replicas
max.in.flight=5              → max requests without response
retries=2147483647           → infinite retries within timeout
delivery.timeout.ms=120000   → 2 minutes max delivery time
compression.type=snappy      → compress messages
```

## Consumer Configuration
```
group.id={service-name}         → one group per logical consumer
enable.auto.commit=false        → manual offset management
auto.offset.reset=earliest      → start from beginning on new group
max.poll.records=500            → max records per poll
session.timeout.ms=45000        → heartbeat timeout
heartbeat.interval.ms=15000     → heartbeat frequency
```

## Exactly-Once Semantics
```
# Producer
transactional.id={unique-per-producer-instance}

# Consumer
isolation.level=read_committed

# Kafka Streams
processing.guarantee=exactly_once_v2
commit.interval.ms=100
```
