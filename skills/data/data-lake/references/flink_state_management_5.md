# Flink State Primitives: Keyed, Operator and Broadcast State Patterns

The state types Flink offers, when to use each, and patterns commonly needed before writing to a lake table: dedup, latest-value per key, enrichment with broadcast rules, and buffering. Part 5 of the Flink series (index in `flink_state_management_1.md`).

## State Types

| Type | Scope | Primitives | Typical use |
|---|---|---|---|
| Keyed state | Per key, after `keyBy` | `ValueState`, `ListState`, `MapState`, `ReducingState`, `AggregatingState` | Dedup, per-entity latest value, session tracking |
| Operator (non-keyed) state | Per parallel operator instance | `ListState` (even-split or union redistribution) | Source offsets, sink buffers |
| Broadcast state | Same copy on every instance | `MapState` via `BroadcastProcessFunction` | Rules, config, small dimension tables |

## Choosing Keyed Primitives

| Need | Primitive | Note |
|---|---|---|
| One value per key | `ValueState<T>` | Cheapest |
| Many sub-keys per key | `MapState<K,V>` | RocksDB reads single entries; `ValueState<Map>` deserializes the whole map |
| Append items | `ListState<T>` | RocksDB `add` is a merge (cheap); `get` reads all |
| Running aggregate | `AggregatingState` | Avoids storing raw events |

## Latest Value per Key (CDC Compaction Before the Lake)

Emit only when the incoming record is newer, so out-of-order updates are dropped:

```java
public class LatestByVersion extends KeyedProcessFunction<Long, Account, Account> {
    private transient ValueState<Long> lastVersion;

    @Override
    public void open(OpenContext ctx) {
        lastVersion = getRuntimeContext().getState(
            new ValueStateDescriptor<>("last-version", Long.class));
    }

    @Override
    public void processElement(Account a, Context ctx, Collector<Account> out) throws Exception {
        Long prev = lastVersion.value();
        if (prev == null || a.sourceLsn() > prev) {
            lastVersion.update(a.sourceLsn());
            out.collect(a);
        }
    }
}
```

## Buffer and Flush with Timers

Collect events per key and emit one combined record after inactivity (sessionization before writing a sessions table):

```java
public class SessionBuffer extends KeyedProcessFunction<String, Event, Session> {
    private static final long GAP_MS = 30 * 60 * 1000L;
    private transient ListState<Event> events;
    private transient ValueState<Long> timer;

    @Override
    public void open(OpenContext ctx) {
        events = getRuntimeContext().getListState(new ListStateDescriptor<>("events", Event.class));
        timer = getRuntimeContext().getState(new ValueStateDescriptor<>("timer", Long.class));
    }

    @Override
    public void processElement(Event e, Context ctx, Collector<Session> out) throws Exception {
        events.add(e);
        Long current = timer.value();
        if (current != null) ctx.timerService().deleteEventTimeTimer(current);
        long next = e.timestamp() + GAP_MS;
        ctx.timerService().registerEventTimeTimer(next);
        timer.update(next);
    }

    @Override
    public void onTimer(long ts, OnTimerContext ctx, Collector<Session> out) throws Exception {
        out.collect(Session.from(ctx.getCurrentKey(), events.get()));
        events.clear();
        timer.clear();
    }
}
```

For standard sessions, the built-in `EventTimeSessionWindows.withGap(...)` is simpler; custom functions are for logic windows cannot express.

## Broadcast State for Rules or Small Dimensions

```java
MapStateDescriptor<String, Rule> rulesDesc =
    new MapStateDescriptor<>("rules", String.class, Rule.class);
BroadcastStream<Rule> rules = ruleStream.broadcast(rulesDesc);

events.connect(rules).process(new BroadcastProcessFunction<Event, Rule, Tagged>() {
    @Override
    public void processElement(Event e, ReadOnlyContext ctx, Collector<Tagged> out) throws Exception {
        Rule r = ctx.getBroadcastState(rulesDesc).get(e.type());
        out.collect(Tagged.of(e, r));
    }
    @Override
    public void processBroadcastElement(Rule r, Context ctx, Collector<Tagged> out) throws Exception {
        ctx.getBroadcastState(rulesDesc).put(r.type(), r);
    }
});
```

Broadcast state is replicated in every task and checkpointed by each; keep it small (MBs, not GBs). Large dimensions belong in keyed state (keyed co-process join) or a lookup join.

## Operator State

Used mainly by connectors. Custom sinks that buffer must implement `CheckpointedFunction` (legacy) or the Sink V2 writer state; prefer existing lake connectors over custom sinks, since exactly-once commit logic is subtle.

## Serialization

- Use POJOs or Avro types for state; enable `pipeline.generic-types: false` to forbid Kryo fallback.
- Keep state values compact: store IDs and versions, not whole payloads, when only dedup is needed.

## Pitfalls
- `ValueState<List<...>>` or `ValueState<Map<...>>` on RocksDB: full (de)serialization on every access.
- Forgetting to clear timers and state in `onTimer`: unbounded growth.
- Broadcast state used for large reference tables: memory blow-up on every task.
- Non-deterministic keys (e.g. random or time-based) defeating key-group redistribution.

## Checklist
- [ ] Each stateful function uses the narrowest primitive (`MapState` over map-in-value)
- [ ] Timers and state cleared after emit
- [ ] Broadcast state bounded in size
- [ ] State types serializable without Kryo
- [ ] Out-of-order protection uses a monotonic source version
