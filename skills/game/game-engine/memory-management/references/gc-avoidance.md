---
title: Zero-GC-Pause Strategies
description: Avoiding garbage-collection stalls in managed (C#/Lua/JS) and native code paths, pooling, string avoidance, and GC metrics for game engines.
---

# Zero-GC-Pause Strategies — Deep Reference

## 1. Why GC Kills Framerate

Generational collectors pause the mutator to trace the **reachable set**. In a game with millions of pooled objects, the reachable set is huge → a full pause of 5–50 ms. Even a 2 ms stop-the-world destroys a 60 FPS budget.

The only durable strategies:
1. Shrink the live set (pool everything, hold few references).
2. Never allocate in hot paths (synchronizers etc. add garbage).
3. Where unavoidable, isolate GC to specific threads or a near-empty nursery frame.

## 2. Managed Runtimes Inside Engines

| Runtime | Used by | GC behavior |
|---------|---------|-------------|
| Mono / IL2CPP | Unity C# | Stop-the-world (IL2CPP adds AOT; GC pauses) |
| .NET (Godot 4 C#) | Godot | ServerGC configurable; STW by default |
| Lua (all engines) | Scripting | Incremental (LuaJIT) but traces big tables |
| JS (WebGL/WebGPU) | Web games | STW + incremental modes; V8/SpiderMonkey tunable |
| Ruby/Python (AAA tooling) | Tools | Mostly out of the frame loop |

## 3. Core Zero-GC Patterns

### 3.1 Total Allocation Budget

Declare a **script-allocation budget** per frame:

```
per frame:  < 1 MB script allocations / frame (for small games more),
            target 0 in Update/processInput/render
```

Track with `GC.GetTotalMemory(false)` deltas; alarm on any spike.

### 3.2 Pool Everything Hot

Bullets, particles, floating damage text, unit commands, notifications:

```csharp
// Unity-flavored
public sealed class BulletPool {
    readonly Stack<Bullet> free = new();
    public Bullet Acquire() => free.Count > 0 ? free.Pop() : new Bullet();
    public void Release(Bullet b) => free.Push(b);
}
```

Pool clears per level so a boss wave's 2k bullets don't accumulate forever.

### 3.3 String Pollution

Strings are the silent GC killer (C# `string` concat; Lua `..` in a loop becomes junk table/string garbage):

```csharp
// This in Update() allocates:
log += $"{name} : {hp}";           // +2 string allocs/frame
// Use StringBuilder, preformatted buffers, or cached format strings.
```

Never build HUD strings per frame. Build once per value change.

### 3.4 LINQ & Iterators

LINQ allocates enumerators; lambdas capture (boxes). For hot loops use `for` + arrays, or cached `List` + manual sort.

```csharp
// bad
entities.Where(e => e.Hp < 20).Select(e => e.Damage()).Sum();
// good
float sum = 0; foreach (var e in entities) { if (e.Hp < 20) sum += e.Damage(); }
```

### 3.5 Boxing

`object o = 3;` boxes; `(object)i` in a list boxes; `List<object>` boxes everything. Use value-typed collections (`List<int>`, struct pools, `Span<T>`).

## 4. Native-Side "GC" Avoidance

Even C++ pays on a path if you `new` per frame; but the real native "GC" is the allocator churn:
- Reuse `std::vector` capacity (keep capacity, `clear()`).
- Use fixed arrays + counters in hot paths (zero resize realloc).
- Avoid `std::function/std::bind` allocations in update; store a function pointer or id.
- In Rust: reuse `Vec` capacity or use arena crates; avoid `Box`/`String` in hot frames.

### Vector Cap Reuse Pattern

```cpp
// Reset without realloc:
g_collisionPairs.clear();            // capacity preserved
g_collisionPairs.reserve(kMaxPairs); // explicit, no realloc later
```

The `clear()` keeps capacity — the common `std::vector::clear()` doesn't shrink (good), and `shrink_to_fit` is the enemy in hot paths.

## 5. GC Tuning (When You Can't Avoid GC)

### Unity / IL2CPP
- Use **incremental GC** (`Application.SetIncrementalGC(true)` on mobile; Mono `concurrent_stop_world` config).
- `System.GC.TryStartNoGCRegion(N, true)` for a critical path block (Danger) — or just keep allocations zero.
- Call `System.GC.Collect()` only at level unload / screens (batch the pause at a transition).

### Godot (.NET)
- Godot 4 GC collects in `ProcessFrame`; avoid allocations in `_Process`/`_PhysicsProcess`.

### V8 / JS
- `--stress-gc` dev; prefer typed arrays, avoid per-frame object creation; `v8::GcEphemeron`? Keep allocations in the nursery (tiny young gen).

## 6. GC Metrics to Watch

| Metric | Unit | Alarm |
|--------|------|-------|
| GC collection count / second | calls | > 50 |
| GC pause (max, 99th) | ms | > 1 ms in a frame |
| Gen 2 collections | count | > 10 / min (big promotion → pause) |
| Allocated / frame im budget deltas | KB | any spike |
| Script Reachable Set | MB | growth = pooled-everything failed |

Instrument the GC profiler hooks (`GCEventHook` `/p:sgen` in Mono), then a nightly job loads a stress level and asserts the alarms never trip.

## 7. The "Pooled Everything" Level Test

Build a stress level:
1. Spawn 10k entities, run physics heads-up, battle logic for 5 min.
2. Record per-frame GC time + RSS.
3. Pass = GC time < 0.5 ms/frame average, RSS flat after warm-up, zero Gen 2 collections during gameplay.

## 8. Anti-Patterns Checklist

| Anti-pattern | Result | Fix |
|--------------|--------|-----|
| `new Vector2()` in Update x10k | GC spike | value-types, pooling, zero-alloc struct arithmetic |
| String concat in HUD updates | strings accumulate | StringBuilder / cached format |
| LINQ in per-entity loop | enumerators | manual `for` |
| Boxing collections | box allocation | typed collections |
| Growth on hot `List` | realloc hard-to-track | reserve up front |
| GC.Collect() mid-frame | STW | batch at transitions |
| Per-frame `new` of complex tooling-only allocations | growth | reuse / pool |

## 9. Summary

Zero-GC is not "remove the GC", it's "make the live set tiny and never allocate on the frame path". Once alive-set is small, even an aggressive GC degrades to a few ms at level boundaries — which you then batch at a safe transition instead of hiding mid-frame.