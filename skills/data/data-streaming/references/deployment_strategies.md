# Deploying Streaming Platforms: Kafka and Flink

Deployment options and operational procedures for Kafka clusters and stream processing jobs: managed vs self-hosted, Kubernetes operators, multi-AZ and multi-region layouts, rolling upgrades, and job redeployment with state.

## Kafka: Managed vs Self-Hosted

| Option | Pros | Cons |
|--------|------|------|
| Confluent Cloud, Amazon MSK (provisioned/serverless), Aiven, Redpanda Cloud | No broker ops, upgrades handled | Cost at scale, feature/version constraints, network egress |
| Self-hosted on VMs | Full control, predictable cost | Ops burden: upgrades, rebalancing, monitoring |
| Self-hosted on Kubernetes (Strimzi) | GitOps, CRD-based management | Needs storage expertise; brokers are stateful |

Decide on data residency, required features (tiered storage, transactions, Connect), and team capacity before choosing.

## Kafka on Kubernetes with Strimzi

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: controllers
  labels: { strimzi.io/cluster: events }
spec:
  replicas: 3
  roles: [controller]
  storage: { type: persistent-claim, size: 50Gi, class: fast-ssd }
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: brokers
  labels: { strimzi.io/cluster: events }
spec:
  replicas: 3
  roles: [broker]
  storage:
    type: jbod
    volumes: [{ id: 0, type: persistent-claim, size: 1Ti, class: fast-ssd }]
---
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: events
  annotations: { strimzi.io/kraft: enabled, strimzi.io/node-pools: enabled }
spec:
  kafka:
    version: 4.0.0          # must be a version supported by your Strimzi release
    listeners:
      - { name: tls, port: 9093, type: internal, tls: true, authentication: { type: tls } }
    config:
      default.replication.factor: 3
      min.insync.replicas: 2
    rack: { topologyKey: topology.kubernetes.io/zone }
  entityOperator:
    topicOperator: {}
    userOperator: {}
  cruiseControl: {}
```

- Topics and users as `KafkaTopic` / `KafkaUser` CRDs in Git.
- Cruise Control handles partition rebalancing after scaling (`KafkaRebalance` CRD).
- Strimzi performs rolling restarts that respect in-sync replicas.
- Check the Strimzi docs for which annotations remain necessary in your operator version (KRaft and node pools became the default path in recent releases).

## Multi-AZ Layout

- 3 AZs, brokers spread evenly, `broker.rack` = AZ, RF=3, `min.insync.replicas=2`: survives a full AZ outage for reads and writes.
- Controllers spread across the same 3 AZs.
- Consider follower fetching (`client.rack` + `replica.selector.class=org.apache.kafka.common.replica.RackAwareReplicaSelector`) to reduce cross-AZ consumer traffic costs.

## Multi-Region

| Pattern | Tool | Notes |
|---------|------|-------|
| Active-passive DR | MirrorMaker 2, Confluent Cluster Linking, MSK Replicator | Offsets translated (MM2 checkpoints) for consumer failover |
| Active-active per region | MM2 with prefixed remote topics | Consumers read local + remote topics; avoid cycles |
| Stretched cluster | Single cluster across regions | Only with low inter-region latency; synchronous replication cost |

Document RPO (replication lag) and RTO (client reconfiguration) and rehearse failover.

## Rolling Kafka Upgrades

1. Read the upgrade notes for the target version (removed configs, protocol changes, minimum Java).
2. Upgrade controllers one at a time, then brokers one at a time, waiting for under-replicated partitions to return to zero between nodes.
3. After all nodes run the new binary, bump the metadata version: `bin/kafka-features.sh --bootstrap-server kafka:9092 upgrade --metadata <version>`.
4. Upgrade clients separately; newer clients generally work with older brokers within supported ranges.

Moving from ZooKeeper to KRaft must be done on a 3.x bridge release (migration is not available in 4.x); plan this before upgrading to 4.0.

## Flink Deployment

| Mode | Notes |
|------|-------|
| Application mode on Kubernetes (Flink Kubernetes Operator) | One cluster per job; isolation; recommended default |
| Session cluster | Shared JobManager for many small jobs; weaker isolation |
| Managed (Amazon Managed Service for Apache Flink, Confluent Cloud for Flink, Ververica) | Less ops, platform limits |

```yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata: { name: order-enricher }
spec:
  image: registry.example.com/order-enricher:1.4.2
  flinkVersion: v2_0
  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "2"
    state.backend.type: rocksdb
    execution.checkpointing.interval: 60s
    state.checkpoints.dir: s3://flink-state/order-enricher/checkpoints
    state.savepoints.dir: s3://flink-state/order-enricher/savepoints
    high-availability.type: kubernetes
    high-availability.storageDir: s3://flink-state/order-enricher/ha
  jobManager: { resource: { memory: 2048m, cpu: 1 } }
  taskManager: { resource: { memory: 4096m, cpu: 2 } }
  job:
    jarURI: local:///opt/flink/usrlib/order-enricher.jar
    parallelism: 8
    upgradeMode: savepoint
```

Set `flinkVersion` to an enum value supported by your operator release.

## Redeploying Stateful Jobs

- `upgradeMode: savepoint` (operator) stops with a savepoint and restores the new version from it.
- Assign stable operator UIDs (`.uid("enrich-join")`) so state maps to operators across code changes.
- State schema evolution: Avro/POJO serializers support compatible changes; changing key types or operator topology may require state migration (State Processor API) or a fresh start with replay.
- For Kafka Streams, deploying a new topology that changes internal topic names resets state; version `application.id` deliberately when a full rebuild is intended.

## Blue-Green for Stream Jobs

1. Start the new job version with a new consumer group / output topic suffix, reading from an earlier offset or savepoint.
2. Validate outputs against the old version.
3. Switch downstream consumers to the new output; stop the old job.

This avoids risky in-place upgrades for major logic changes.

## Capacity and Autoscaling

- Kafka broker scaling requires partition reassignment (Cruise Control); it is not instant.
- Flink autoscaler (operator, `job.autoscaler.enabled: true`) adjusts parallelism from backpressure and lag; cap max parallelism by Kafka partition count.
- Kafka Streams scales by adding instances up to the partition count of input topics.

## Checklist

- [ ] Deployment model chosen with documented trade-offs
- [ ] Brokers and controllers spread across 3 AZs with rack awareness
- [ ] Topics/users managed as code
- [ ] DR replication with tested consumer failover
- [ ] Upgrade runbook: controllers → brokers → metadata version → clients
- [ ] Flink jobs with stable UIDs, savepoint-based upgrades, HA enabled
