---
title: Profiling Job Systems
description: Utilization, bubbles, steal counts, per-job timers and Tracy/Perfetto integration for diagnosing parallel bottlenecks in game engines.
---

# Profiling Job Systems — Deep Reference

## 1. The Metrics That Matter

| Metric | Formula | Health |
|--------|---------|--------|
| Worker utilization | busy / (busy+idle+park) per worker | > 85% |
| Bubble time | time waiting on deps | < 10% of frame |
| Steal count | steals / pops per worker | few, < 5% |
| Join latency | frame's one join hold | < 1 ms |
| Critical path | longest chain main→render submit | < frame budget |

## 2. Instrumentation Design

### 2.1 Per-Job Timers

Every job records:
- `start` / `end` (ns)
- `worker_id`
- `queue_wait` (time from dispatch to start)
- `group_name`

Batched into a per-frame `JobTrace[4096]` ring; dumped per frame.

```cpp
struct JobSample { uint64_t start, end; uint32_t worker, group, job; };
```

### 2.2 The Two Ring Buffers

- Ordered global trace: what ran when (linear story).
- Per-worker local sample ring: what each worker did (per-core utilization line).

Both feed a Perfetto/Tracy/TracyPro UI or the engine's own profiler view.

## 3. Interpreting the Flame Graph / Timeline

```
Frame budget ────────────────────────────────────────────────
w0 ████ Physics ████ Anim ███ RenderCmd
w1 ████ Physics ████ AI ███ RenderCmd        ← 3 workers cramming
w2 ███ Physics ███ AI ███ RenderCmd
w3 ███ Anim ███ AI                                ← idle anim → bubble
main ███ Input ███ Dispatch              └──── join ──┘
```

Watch:
- **Jagged ending** (workers finish at different times) → load imbalance → redistribute chunks.
- **Holes** (idle + waiting) → dependencies bottleneck a phase.
- **Long `queue_wait`** on render-command jobs → they starve behind earlier work.

## 4. Using Utilization as a Gate

Nightly CI runs a stress level; asserts:
- average worker utilization > 85%,
- bubble < 10%,
- no single join > 1.5 ms,
for a 100-frame window. This catches both "we added a lock" (utilization tanks via contention) and "we serialized a system" (one worker runs everything).

## 5. Lock-Contention Detection

- Monitor lock wait times in the scheduler's queue/steal paths.
- A lock's acquire-wait histogram: any > 20 µs waits = contention worth fixing (bigger chunks, per-class deques, circular-quota).
- On Linux, `perf lock`, `LTTng`, `valgrind --tool=helgrind` in CI for the job paths.

## 6. Detecting Oversubscription

Symptom: adding workers beyond `hwt−1` *decreases* frame FPS (context-switch thrash). Detect: measure `contextSwitches/s` (Process Explorer / `/proc/<pid>/status`); if it jumps 10x when you add a worker, you oversubscribed.

## 7. Correlating with GPU

The job profiler should overlay the GPU timeline (fences, async compute slots) from RenderDoc/Tracy — answer "CPU waited on GPU?" or "GPU idle while CPU built cmd lists?"

## 8. Making It a Habit

- F2 overlay: frame breakdown with per-phase bars + worker utilization.
- F10: full Perfetto/tracy export for the frame.
- Every big feature → "frame profile" gated in PR CI.
- The one join at frame end is your pacing knob: if it's 3 ms, the critical path is wrong, not the join.

## 9. Failure-Mode Reference

| Observation | Interpretation | Action |
|-------------|----------------|--------|
| All workers idle in a straight band | a phase waits on a single serialized dependency | split it, or make the dep parallel |
| One worker 100%, others 20% | serial bottleneck | parallelize the slow system |
| High lock wait on queue | contention | work stealing / class deques |
| Worker park/notify churn | busy-evaluate | longer spin-then-park |
| Latency spikes despite idle workers | scheduler latency (notify wake) | inline tiny jobs / shorter spin |
| Frame toggles between util 95 ↔ 40% | tick vs render skew | separate sim render phases |