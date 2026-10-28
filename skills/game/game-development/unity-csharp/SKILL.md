---
name: unity-csharp
description: >
  Use this skill when the user says 'unity dots', 'unity ecs', 'unity entities', 'ISystem', 'IJobEntity', 'burst compiler', 'unity job system', 'unity c# performance'. Covers Unity Entities (ECS), the C# Job System and Burst plus GC-free C# patterns for Unity gameplay code. Do NOT use for: general Unity project architecture (use unity), non-Unity ECS (use ecs-pattern).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, unity, dots, ecs, burst, csharp]
---

# Unity Data-Oriented Technology Stack (DOTS) & C# Mechanics

## Purpose
This skill covers Unity's data-oriented stack (ECS, Job System, Burst) and the C# practices that make Unity code fast and correct.

## Agent Protocol

### Trigger
"unity dots", "unity ecs", "unity entities", "ISystem", "IJobEntity", "burst compiler", "unity job system", "unity c# performance".

### Input Context
- Unity version and Entities package version
- MonoBehaviour, hybrid or pure ECS
- Performance symptom (profiler capture if available)

### Output Artifact
C# systems/jobs and authoring code. No file unless requested.

### Response Format
```
Unity: {version}  Entities: {version}
System: {name, query, read/write}
Code: {snippet}
Verify: {Profiler / Burst inspector / Entities hierarchy}
```

## 1. Why DOTS: The OOP-Based Entry Points

Unity's classic `MonoBehaviour` model is object-oriented: each `Behaviour` instance owns its fields, script lifecycle callbacks run per frame, and objects reference each other. For 10k+ entities, per-object `Update()` incurs:

- A virtual-call-like dispatch per object per frame.
- Arbitrary memory layout → cache misses.
- Heap fragmentation from per-frame allocation.

DOTS replaces this with contiguous data and systems-in-a-loop.

## 2. ECS Model in Unity

Packages: Entities 1.x on Unity 6.0-6.3 (`com.unity.entities` from the Package Manager); from Unity 6.4 Entities, Collections and Mathematics ship as core packages whose version matches the Editor. Code below uses the current `ISystem` + `SystemAPI` style (not the removed `SystemBase.Entities.ForEach` lambdas in new code).

### 2.1 Entities, Components, Systems

```csharp
// Component: struct, blittable, data-only
public struct Velocity : IComponentData {
    public float3 Linear;
    public float Angular;
}

// System: logic over queries
[BurstCompile]
public partial struct MoveSystem : ISystem {
    [BurstCompile]
    public void OnUpdate(ref SystemState state) {
        var dt = SystemAPI.Time.DeltaTime;
        foreach (var (tf, v) in SystemAPI.Query<RefRW<LocalTransform>, RefRO<Velocity>>()) {
            tf.ValueRW.Position += v.ValueRO.Linear * dt;
        }
    }
}
```

### 2.2 Archetypes & Chunks (Storage)

- **Archetype**: unique set of component types. An entity's archetype determines its storage.
- **Chunk**: a 16 KB block of memory holding entities *of one archetype* in SoA form.

```
Chunk 0 [Archetype: LocalTransform+Velocity ]
  Transform array: | t0 | t1 | t2 | ... | (contiguous)
  Velocity  array: | v0 | v1 | v2 | ... | (contiguous)
```

- Iteration of a query walks matching chunks, so the CPU streams compact arrays into L1/L2.
- `ChangeVersion` per-chunk tracks modification for change-detect systems.

### 2.3 Structural Changes (Command Buffers)

Adding/removing components moves the entity to another archetype (memcpy of affected fields). Doing this mid-iteration invalidates chunk iteration → use `EntityCommandBuffer`:

```csharp
EntityCommandBuffer ecb = new EntityCommandBuffer(Allocator.Temp);
// queue AddComponent / SetComponent / DestroyEntity
ecb.Playback(state.EntityManager);
```

Rules: never call `EntityManager.AddComponent` inside `ScheduleParallel` jobs; always buffer.

## 3. The C# Job System

### 3.1 IJobEntity / IJobChunk

```csharp
[BurstCompile]
public partial struct DamageJob : IJobEntity {
    public float Damage;
    void Execute(ref Health health) { health.Value -= Damage; }
}

var handle = new DamageJob { Damage = 5f }.Schedule(state.Dependency);
state.Dependency = handle;   // chain dependencies
```

- Jobs run on worker threads; **dependencies** serialize through `JobHandle`.
- Declare access precisely: `in`/`RefRO<T>` and `[ReadOnly]` for reads, `ref`/`RefRW<T>` for writes. This lets the job scheduler run readers in parallel and the safety system catch races. `[DisableContainerSafetyRestriction]` turns those checks off — use only with a written proof of disjoint access.

### 3.2 ParallelFor

```csharp
// IJobEntity: chunks are distributed across worker threads
state.Dependency = new DamageJob { Damage = 5f }.ScheduleParallel(state.Dependency);
```

- Each entity is processed by exactly one thread, so writing to the entity's own components is safe.
- Cross-entity writes need `EntityCommandBuffer.ParallelWriter` (pass `[ChunkIndexInQuery] int sortKey`), `NativeQueue<T>.ParallelWriter`, or `NativeParallelHashMap<K,V>.ParallelWriter`; or write per-thread partial results and reduce afterwards.

## 4. Burst Compiler

- Converts IL → native via LLVM. Uses SIMD automatically from SoA iteration.
- Requires `[BurstCompile]` + job code to be Burst-compatible:
  - No managed references, no allocations, no strings in hot jobs.
  - Use `float3`, `FixedString`, `NativeArray` (not `List<T>`).
- `[BurstCompile(CompileSynchronously = true)]` makes the Editor wait for Burst instead of running managed code first (useful for benchmarks); players are always AOT-compiled.

### 4.1 Burst-Compatible Data Types

| Use | Avoid |
|-----|-------|
| `float3/float4x4/quaternion` (Unity.Mathematics) — map to SIMD-friendly code | `Vector3`/`Matrix4x4` in hot jobs (supported, but less vectorisation-friendly) |
| `NativeArray<T>`, `NativeList<T>`, `NativeHashMap` | `List<T>`, `Dictionary<K,V>` |
| `int4`/`uint4` | `System.Numerics` types |
| `FixedString64Bytes` etc. | `string`, managed exceptions as control flow |

## 5. C# Patterns for Game Code (Non-DOTS)

### 5.1 Avoiding Allocation Churn (GC Spikes)

Unity's managed GC pauses frames. Hot-path rules:

- No string concatenation per frame (use `StringBuilder` pooled, or `FixedString128Bytes`).
- No boxing: avoid `object` params and iterating collections through interfaces (`IEnumerable<T>`), which allocates an enumerator; `foreach` directly over `List<T>`/`Dictionary<K,V>` uses a struct enumerator and does not allocate.
- Reuse arrays: cache `T[]` buffers as static/class fields; `ArrayPool<T>` for bigger needs.
- Avoid `LINQ` in Update (allocates enumerators): `Where/Select/OrderBy` — replace with loops.

### 5.2 Value Types for Gameplay State

```csharp
public struct PlayerState { public int Id; public float Hp; public float2 Pos; public int TeamId; }
```

- Structs avoid heap alloc per instance; but watch copying large structs.
- Store state in `NativeArray<PlayerState>` when used with jobs; in plain arrays for serialization.

### 5.3 Async / Await Patterns

```csharp
// Unity 6: Awaitable is Unity's allocation-light Task replacement
async Awaitable<string> FetchAsync(string url, CancellationToken ct) {
    using var req = UnityWebRequest.Get(url);
    await req.SendWebRequest();                 // AsyncOperation is awaitable (2023.1+)
    ct.ThrowIfCancellationRequested();
    if (req.result != UnityWebRequest.Result.Success)
        throw new IOException($"GET {url} failed: {req.error}");
    return req.downloadHandler.text;            // continuation runs on the main thread
}
```

- `async void` only for event handlers; return `Awaitable`/`Task` elsewhere and pass `destroyCancellationToken` (MonoBehaviour) for cancellation.
- Never touch the scene graph from a background thread; hop with `await Awaitable.BackgroundThreadAsync()` / `await Awaitable.MainThreadAsync()`.
- Use `Addressables.LoadAssetAsync` + `.Completed` to keep loads off the frame.

### 5.4 Singletons & Service Locators

```csharp
public sealed class GameManager : MonoBehaviour {
    public static GameManager I { get; private set; }
    void Awake() { I = this; }          // Set only if null at scene start
    void OnDestroy() { if (I == this) I = null; }
}
```

## 6. Serialization & Persistence

- `[SerializeField]` fields for inspector persistence.
- `ISerializationCallbackReceiver` for custom (de)serialization hooks.
- For save data: JSON (`JsonUtility` / Newtonsoft) on managed side, or custom binary with `System.IO.BinaryWriter` plus an explicit version header for migrations.
- Never serialize large live ECS state; snapshot to stable DTOs on save.

## 7. Compilation & asmdef

- `.asmdef` per system group → parallel module compile, controlled references.
- `unsafe` blocks (rarely needed) need `Allow 'unsafe' Code` project setting.
- `PlayerPrefs` is for small settings only (stored in the registry/plist, unencrypted); save games go to files under `Application.persistentDataPath` or a cloud-save service.

## 8. Profiling C#

- Unity Profiler "C#" module: allocations, GC mark/sweep, script cost.
- Burst Inspector (Jobs > Burst > Open Inspector) shows generated assembly — check hot loops are vectorised and free of managed calls.
- `try/catch` in Update: avoid exceptions per frame; let one crash surface early.
- `Debug.Log` in hot loops: disable in production (`#if UNITY_EDITOR || DEVELOPMENT_BUILD`).

## 9. C# Best-Practice Cheat Sheet

| Rule | Why |
|------|-----|
| Prefer `TryGetComponent` over `GetComponent` + null check | no Editor-only allocation when the component is missing |
| Cache component references in `Awake` | repeated `GetComponent` calls are lookups every time |
| Begin/End sample with profiler markers | measure before optimizing |
| Pre-allocate everything once | cache and pool |
| Avoid `FindObjectOfType` | scans scene; expensive |
| Prefer fixed-point for sync systems | determinism across devices |

## 10. Decision: DOTS vs MonoBehaviour

| Criterion | DOTS/ECS+Jobs | MonoBehaviour |
|-----------|---------------|---------------|
| 100k entities / massive crowds | Strong | Poor |
| Rapid UI/prototype | Poor | Excellent |
| Deep gameplay narrative logic | More setup | Natural |
| Physics | Unity Physics / Havok Physics for Unity packages | Built-in PhysX |
| Shader/instancing synergy | GPU-instancing friendly | Manual |

Rule: mix intelligently — DOTS for the simulation hot-path, MonoBehaviours for the editors/design-facing layers.

## 11. References

- `skills/game/game-engine/ecs-pattern/SKILL.md` — ECS deep internals (archetype storage, scheduling)
- `skills/game/game-engine/ecs-pattern/references/unity-dots-in-practice.md` — real project DOTS usage
- `skills/game/unity/SKILL.md` — full Unity engine guide
- Unity Learn: "ECS for game craft" and Burst docs