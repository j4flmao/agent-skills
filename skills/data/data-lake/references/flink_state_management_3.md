# Flink Savepoints, Job Upgrades and State Evolution

How to upgrade, rescale or migrate a stateful Flink lake job without losing state or duplicating lake commits. Part 3 of the Flink series (index in `flink_state_management_1.md`).

## Checkpoints vs Savepoints

| | Checkpoint | Savepoint |
|---|---|---|
| Triggered by | Flink, periodically | Operator, manually or by deployer |
| Purpose | Failure recovery | Upgrades, rescaling, migration, backups |
| Ownership | Flink (may delete) | User |
| Format | Native (may be incremental) | Canonical (portable) or native (faster) |
| Change state backend on restore | No | Yes, from canonical |

## Commands

```bash
# Savepoint while running
flink savepoint <jobId> s3://acme-flink/savepoints/orders-ingest --type canonical

# Stop with savepoint (graceful: sources stop, final checkpoint/commit happens)
flink stop --savepointPath s3://acme-flink/savepoints/orders-ingest <jobId>

# Resume new version from savepoint
flink run -s s3://acme-flink/savepoints/orders-ingest/savepoint-abc123 \
  -d target/orders-ingest-2.4.0.jar

# Allow removal of an operator whose state is not in the new job
flink run -s <savepointPath> --allowNonRestoredState app.jar
```

Kubernetes Operator: set `spec.job.upgradeMode: savepoint` (or `last-state`) on the `FlinkDeployment`; the operator takes the savepoint on spec changes.

## Stable Operator IDs

State is mapped to operators by UID. Without explicit UIDs, Flink generates them from the topology, and any change breaks restore.

```java
stream
  .keyBy(Order::orderId)
  .process(new DedupFunction()).uid("dedup-orders").name("Dedup orders")
  .sinkTo(icebergSink).uid("iceberg-sink-orders");
```

Rules:
- Set `.uid()` on every stateful operator and on sources/sinks.
- Never reuse a UID for a different operator type.
- Flink SQL jobs derive operator IDs from the plan; changing the query can make state incompatible. Use compiled plans (`COMPILE PLAN ... ; EXECUTE PLAN ...`) for controlled upgrades of SQL jobs.

## Rescaling

- Keyed state is redistributed by key groups; parallelism can change freely up to `maxParallelism`.
- `maxParallelism` (number of key groups) cannot change without losing keyed state; set it explicitly at first deploy (e.g. 128–4096 depending on expected max scale).

```java
env.setMaxParallelism(720);
```

- Adaptive scheduler / reactive mode and the Kubernetes Operator autoscaler rescale via the same key-group mechanism.

## State Schema Evolution

| Serializer | Evolution support |
|---|---|
| POJO serializer | Add/remove fields; field types cannot change |
| Avro (`AvroSerializer`, SpecificRecord) | Follows Avro schema-compatibility rules |
| Kryo fallback | No evolution — avoid for state |
| Custom `TypeSerializer` | Implement `TypeSerializerSnapshot` compatibility |

Disable silent Kryo fallback to catch non-POJO state types early: `pipeline.generic-types: false`.

## State Processor API

Read, modify or bootstrap savepoints offline (e.g. seeding dedup state from an existing lake table, or fixing corrupted keys):

```java
SavepointReader savepoint = SavepointReader.read(env, "s3://.../savepoint-abc123",
        new EmbeddedRocksDBStateBackend());
DataStream<KeyedSeen> seen = savepoint.readKeyedState(
        OperatorIdentifier.forUid("dedup-orders"), new SeenReaderFunction());
```

## Upgrade Procedure for Lake Sink Jobs

1. Verify the new jar restores from a copy of a recent savepoint in staging.
2. `flink stop --savepointPath ...` (final commit to the lake happens during stop).
3. Deploy the new version with `-s <savepoint>`.
4. Confirm: restored state size, first checkpoint success, lake commits resume with no duplicate snapshot for the last checkpoint ID.
5. Keep the savepoint until the new version has run through at least one full business cycle.

## Pitfalls
- Missing UIDs: savepoint unusable after a topology change.
- Changing `maxParallelism` or key type: keyed state lost.
- Using `cancel` instead of `stop --savepointPath`: last uncommitted data files are discarded and re-processed (fine for exactly-once, but delays data).
- Restoring two jobs from the same savepoint that both write to one table.

## Checklist
- [ ] UIDs on all stateful operators, sources and sinks
- [ ] `maxParallelism` set explicitly
- [ ] State types use POJO/Avro serializers; Kryo disabled for state
- [ ] Upgrade tested by restoring a real savepoint in staging
- [ ] Stop-with-savepoint used for planned upgrades
