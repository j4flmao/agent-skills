---
name: level-streaming
description: Expert level streaming — stream strategies, spatial cell management, async loading, dependency closure, hitch prevention and progressive transitions for open worlds.
---

# Level Streaming — Deep Engineering Guide

Open worlds don't fit in RAM or load in one frame. Level streaming keeps gigabytes on disk and only the needed few hundred MB resident, without the player ever seeing a pop-in or a hitch. This skill covers stream strategies, cell management, async load, dependency closure, transition LOD and the anti-hitch toolkit.

## 1. The Core Idea

```
world = partitioned into cells/chunks (geometry+textures+meshes+audio+nav)
player's camera + prediction → determine "in-scope" set
stream: load only in-scope, drop out-of-scope
budget: bytes aligned to disk speed; never stall the frame
```

Scope is defined by **player relevance** (distance bands + occlusion), not "whole level".

## 2. Stream Strategies

| Strategy | Cells | Load model | Use |
|----------|-------|-----------|------|
| Spatial cell (grid) | fixed-size cell | in-view + predict-ahead | open fields, driving |
| Zone/region | authored chunks | entrance-based | dungeons, hubs |
| Enabling trigger | scripted beams | event-driven | linear-ish |
| Persistent + streaming | base + rare | base always | hub + quest areas |

Hybrid is the norm: base persistent + spatial cells around it + scripted chunks for set-pieces.

## 3. Cell Management (The Heart)

- Cell = a **pak unit** (see `asset-pipeline/packing`): one load = one bounded read + one manifest entry.
- Cell metadata: AABB, dependencies, resident state, refcount (a cell near a boundary refcounted by 2 cameras/players).
- **Residency states**: Unloaded → Loading → Resident → (UnloadPending) → Unloaded.

```cpp
struct Cell { AABB bounds; vector<AssetId> deps; Residency state; int refs; };
```

## 4. The Predict-Ahead Rule (Anti-Pop Guarantee)

Load not just the current cell but the **predictive set**:
```
inScope = cells that (camera speed projection enters within ~2 s)
        ∪ (radius: camera predicts ahead)
        ∪ (trigger event claims)
```
Never "load on the frame you're inside" — that's a minimap-swallowed pop. The streaming budget from `asset-pipeline` throttles you if you request too much («streaming-throttle»).

## 5. Async Loading (Never On the Frame Thread)

- File reads on **IO threads** (see `platform-abstraction` filesystem refs), decompress on workers.
- Main→worker handoff is *deferred*: the level gets a "Loading" proxy (an occluder shell / low-poly stand-in) until the resident data arrives.
- Never `fread` on the main thread — the streaming profiler flags any > 8 ms main-thread load.

## 6. Dependency Closure (The Silent Loader-Breaker)

A cell "needs" materials, meshes, audio, nav (and those need *their* deps). The streaming system resolves the **full transitive closure**:

```
cell → [mesh_a, mat_a, tex_b] → tex_b → [sampler,cdf]
```
Failure mode: two cells share a dependency, both load it twice (waste + refcount chaos). Solution: a global **asset cache** with refcounts; cells *request* assets, the cache dedupes. The closure must be *author-authored+safe* (the cook generated it, see `asset-pipeline`).

## 7. The Anti-Hitch Toolkit

| Tool | What it does |
|------|--------------|
| Deferred activation | entity activates only when fully resident |
| Proxy / low-poly shell | visible stand-in while loading |
| Progressive LOD | coarse-loaded → refine when idle (re-lod) |
| Pop-mask | a fog/cull fade near active boundaries |
| Never-load-more-than-budget | throttling (see streaming-throttle) |
| Watchdog | a cell "resident" false-flag → retry/repair |

## 8. Progression & Transitions

- **Fade transitions**: a region gate fades the world around it (spawn masked) — far less visible than pop.
- **LOD-stepping**: streamed-in high-res swaps the shell when ready (rare hitch = micro-shell pops, acceptable).
- Hot-reload (asseteditor) works through the same streaming path (see `asset-pipeline/hot-reload`).

## 9. Memory & Budget Control

| Budget | Danger level |
|--------|--------------|
| resident bytes | ~half the level RAM budget |
| load-in-flight bytes | throttled (§ streaming-throttle) |
| per-frame activation cost | < 1 ms |
| unload debt (refcount 0 linger) | collected opportunistically |

Watch: a resident set that *grows* under slow movement = an unload bug (the player leaves a region, cell stays).

## 10. Determinism & Replay

- Streaming must *not* affect sim determinism: an asset arriving a frame earlier/later must not change outcomes (entity activation is time-invariant; the sim doesn't depend on load timing).
- Level state seeds are baked (the "asset availability" is a config; the sim only reads resident-safe data).

## 11. References

- `references/stream-strategies.md` — strategies table, hybrid, authoring, plan
- `references/cells-and-residency.md` — cell anatomy, residency states, refcounts, radius rules
- `references/async-loading.md` — IO threads, deferred activation, shell proxies, profiler gates
- `references/asset-dependencies.md` — closure resolution, global cache, dedupe, cook-generated graphs
- `references/hitch-prevention.md` — the full toolkit, thresholds, tests, watchdogs
- `references/progressive-transitions.md` — LOD-stepping, fades, shell→resident swap, editor hot-reload