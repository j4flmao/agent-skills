# Flink State TTL and State Growth Control

Unbounded state is the most common cause of failing lake ingestion jobs: dedup sets, join buffers and per-key aggregates grow forever unless expired. Part 4 of the Flink series (index in `flink_state_management_1.md`).

## Where State Grows

| Operator | State held | Bound with |
|---|---|---|
| Dedup on key | Seen keys | TTL equal to max duplicate distance |
| Regular (unbounded) SQL join | Both input sides | `table.exec.state.ttl`, or use interval/temporal joins |
| GROUP BY without window | One row per group | TTL; or windowed aggregation |
| Windows | Window contents until fire + allowed lateness | Watermarks, allowed lateness |
| CDC normalization (`ChangelogNormalize`) | Latest row per primary key | TTL if keys can be forgotten |
| Timers | One per key/time | Clean up in `onTimer` |

## DataStream State TTL

```java
StateTtlConfig ttl = StateTtlConfig
    .newBuilder(Duration.ofDays(2))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupInRocksdbCompactFilter(1000)        // RocksDB: drop expired entries during compaction
    .build();

ValueStateDescriptor<Boolean> seen = new ValueStateDescriptor<>("seen", Boolean.class);
seen.enableTimeToLive(ttl);
```

`Duration`-based builders are the current API; older code used `org.apache.flink.api.common.time.Time`, removed in Flink 2.0.

Cleanup strategies:

| Strategy | Backend | Effect |
|---|---|---|
| Lazy (on read) | all | Expired entry removed when accessed |
| `cleanupFullSnapshot()` | all | Expired entries excluded from full snapshots (not incremental RocksDB) |
| `cleanupIncrementally(n, runOnEveryRecord)` | heap | Checks `n` entries per access |
| `cleanupInRocksdbCompactFilter(queryTimeAfterNumEntries)` | RocksDB | Removed during RocksDB compaction |

TTL uses processing time only. For event-time expiry, register event-time timers and clear state in `onTimer`.

## Dedup with TTL Example

```java
public class DedupFunction extends KeyedProcessFunction<Long, Order, Order> {
    private transient ValueState<Boolean> seen;

    @Override
    public void open(OpenContext ctx) {
        ValueStateDescriptor<Boolean> d = new ValueStateDescriptor<>("seen", Boolean.class);
        d.enableTimeToLive(StateTtlConfig.newBuilder(Duration.ofHours(24))
                .cleanupInRocksdbCompactFilter(1000).build());
        seen = getRuntimeContext().getState(d);
    }

    @Override
    public void processElement(Order o, Context ctx, Collector<Order> out) throws Exception {
        if (seen.value() == null) {
            seen.update(true);
            out.collect(o);
        }
    }
}
```

(`open(OpenContext)` is the Flink 1.19+/2.x signature; older versions use `open(Configuration)`.)

Duplicates arriving after 24 h pass through; the lake MERGE with a key guard is the second line of defense.

## Flink SQL State TTL

```sql
SET 'table.exec.state.ttl' = '36 h';          -- job-wide default for stateful SQL operators
```

Per-operator TTL via hints (Flink 1.18+):

```sql
SELECT /*+ STATE_TTL('o' = '1d', 'c' = '30d') */ o.*, c.segment
FROM orders o JOIN customers c ON o.customer_id = c.id;
```

Prefer bounded join types when semantics allow:
- Interval join: `ON o.id = p.order_id AND p.ts BETWEEN o.ts AND o.ts + INTERVAL '1' HOUR`.
- Temporal (versioned) join: `FOR SYSTEM_TIME AS OF o.order_ts` against a versioned table.
- Lookup join against an external store for slowly changing dimensions.

## Measuring Growth

- Track checkpoint full size per operator in the Web UI (Checkpoints → details by subtask).
- RocksDB native metrics (`state.backend.rocksdb.metrics.estimate-num-keys`, `...total-sst-files-size`) — enable selectively; they have overhead.
- Alert on week-over-week growth with stable input volume.

## Pitfalls
- TTL shorter than the real duplicate/late window: silent duplicates or wrong join results.
- Changing TTL settings: allowed on restore in recent versions, but turning TTL on/off for an existing state changes its serializer — test restore.
- `cleanupFullSnapshot` with incremental RocksDB checkpoints: has no effect; use the compaction filter.
- Unbounded regular joins in SQL with no TTL: state grows until the job dies.

## Checklist
- [ ] Every keyed state has a TTL or explicit timer-based cleanup
- [ ] SQL jobs set `table.exec.state.ttl` or per-operator hints
- [ ] Join types bounded where semantics allow
- [ ] State size growth monitored and alerted
- [ ] Lake-side dedup guard covers duplicates beyond TTL
