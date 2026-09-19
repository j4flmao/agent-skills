---
name: unity-csharp
description: Unity C# scripting and DOTS/ECS mechanics - component systems, Jobs, Burst, archetypes/chunks, async patterns, and C# performance in game code.
---

# Unity Data-Oriented Technology Stack (DOTS) & C# Mechanics

This skill covers Unity's data-oriented stack (ECS, Job System, Burst) and the C# practices that make Unity code fast and correct.

## 1. Why DOTS: The OOP-Based Entry Points

Unity's classic `MonoBehaviour` model is object-oriented: each `Behaviour` instance owns its fields, script lifecycle callbacks run per frame, and objects reference each other. For 10k+ entities, per-object `Update()` incurs:

- A virtual-call-like dispatch per object per frame.
- Arbitrary memory layout → cache misses.
- Heap fragmentation from per-frame allocation.

DOTS replaces this with contiguous data and systems-in-a-loop.

## 2. ECS Model in Unity

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
- `[ReadOnly]` / `[WriteOnly]` / `[DisableContainerSafetyRestriction]` on component access let Burst AND the safety system reason about aliasing.

### 3.2 ParallelFor

```csharp
[DisableParallelForRestriction]
job.ScheduleParallel()   // splits entities across threads
```

- Race hazards: only write disjoint slices (`NativeArray<T>` per-chunk).
- Use `NativeParallelHashMap`/`NativeAtomic` for cross-thread aggregation.

## 4. Burst Compiler

- Converts IL → native via LLVM. Uses SIMD automatically from SoA iteration.
- Requires `[BurstCompile]` + job code to be Burst-compatible:
  - No managed references, no allocations, no strings in hot jobs.
  - Use `float3`, `FixedString`, `NativeArray` (not `List<T>`).
- `Burst.CompileSynchronously` for predictable startup; assert no managed exceptions.

### 4.1 Burst-Compatible Data Types

| Use | Avoid |
|-----|-------|
| `float3/float4x4/quaternion` (Unity.Mathematics) | `Vector3`/`Matrix4x4` (managed overhead) |
| `NativeArray<T>`, `NativeList<T>`, `NativeHashMap` | `List<T>`, `Dictionary<K,V>` |
| `int4`/`uint4` | `System.Numerics` types |
| `Burst.CompileSynchronously()` | exceptions/casting in hot path |

## 5. C# Patterns for Game Code (Non-DOTS)

### 5.1 Avoiding Allocation Churn (GC Spikes)

Unity's managed GC pauses frames. Hot-path rules:

- No string concatenation per frame (use `StringBuilder` pooled, or `FixedString128Bytes`).
- No boxing: avoid `object` params, `IEnumerable` foreach on `List`/`Dictionary` where possible (or cache enumerator).
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
// UnityWebRequest + async
async void LoadLevelAsync() {
    var req = UnityWebRequest.Get(url);
    var op = await req.SendWebRequest();
    // post-process on main thread
}
```

- `async void` only for event handlers; prefer `async Task`.
- Never touch the scene graph from a background thread; marshal via `MainThread` dispatcher.
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
- For save data: JSON (`JsonUtility` / Newtonsoft) on managed side, or custom bin with `Buffer.BinaryWriter` for versioned saves.
- Never serialize large live ECS state; snapshot to stable DTOs on save.

## 7. Compilation & asmdef

- `.asmdef` per system group → parallel module compile, controlled references.
- `unsafe` blocks (rarely needed) need `Allow 'unsafe' Code` project setting.
- `PlayerPrefs` deprecated in favor of `Application.persistentDataPath` + files, or Unity Cloud Save for live ops.

## 8. Profiling C#

- Unity Profiler "C#" module: allocations, GC mark/sweep, script cost.
- `[BurstCompile]` + Burst Inspector to verify SIMD usage (`Show dot-product`).
- `try/catch` in Update: avoid exceptions per frame; let one crash surface early.
- `Debug.Log` in hot loops: disable in production (`#if UNITY_EDITOR || DEVELOPMENT_BUILD`).

## 9. C# Best-Practice Cheat Sheet

| Rule | Why |
|------|-----|
| Prefer `TryGetComponent` over `GetComponent` | avoids exception/lookup cost |
| Cache `Camera.main` | camera lookup is static-per-frame expensive |
| Begin/End sample with profiler markers | measure before optimizing |
| Use `Mathf.Approximately` sparingly | branchy; use tolerance math |
| Pre-allocate everything once | cache and pool |
| Avoid `FindObjectOfType` | scans scene; expensive |
| Prefer fixed-point for sync systems | determinism across devices |

## 10. Decision: DOTS vs MonoBehaviour

| Criterion | DOTS/ECS+Jobs | MonoBehaviour |
|-----------|---------------|---------------|
| 100k entities / massive crowds | Strong | Poor |
| Rapid UI/prototype | Poor | Excellent |
| Deep gameplay narrative logic | More setup | Natural |
| Physics via Individual Bodies | Has DOTS Physics | PhysX direct |
| Shader/instancing synergy | GPU-instancing friendly | Manual |

Rule: mix intelligently — DOTS for the simulation hot-path, MonoBehaviours for the editors/design-facing layers.

## 11. References

- `skills/game/game-engine/ecs-pattern/SKILL.md` — ECS deep internals (archetype storage, scheduling)
- `skills/game/game-engine/ecs-pattern/references/unity-dots-in-practice.md` — real project DOTS usage
- `skills/game/unity/SKILL.md` — full Unity engine guide
- Unity Learn: "ECS for game craft" and Burst docs