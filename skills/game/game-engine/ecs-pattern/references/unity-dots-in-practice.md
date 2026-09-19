---
title: Unity DOTS in Practice
description: Hands-on guide for Unity DOTS — Entities, Jobs, Burst, WriteGroup, SubScenes, and structural change commands in production games.
---

# Unity DOTS in Practice

## Core Concepts

### Entities, Components, Systems (ECS)

Unity DOTS is Unity's data-oriented ECS. Unlike MonoBehaviour (OOP, per-object heap allocation), DOTS uses:

- **Entities**: Lightweight 32-bit ID pairs (index + version). Created via `EntityManager.CreateEntity()`.
- **Components**: `ISharedComponent` or `IComponentData` structs. Stored in archetype chunks.
- **Systems**: `ISystem` (unmanaged) or `SystemBase` (managed) classes with `OnUpdate()`.

### Archetype Chunk Layout

Entities with the same component set share an **archetype**. Each archetype owns 16 KB memory chunks:

```
Chunk layout for archetype (Position, Velocity, Health):
┌─────────────────────────────────────────────────────┐
│ Position[0..N] │ Velocity[0..N] │ Health[0..N]     │ Entity[0..N] │
│ (12 B)         │ (12 B)         │ (4 B)            │ (4 B)        │
└─────────────────────────────────────────────────────┘
N = 512 (for 32-byte component set in 16 KB chunk)
```

`EntityManager.GetComponentData<T>(entity)` finds: archetype → chunk → row → array offset.

## Systems

### ISystem (Unmanaged, Burst-compatible)

```csharp
[BurstCompile]
public partial struct MovementSystem : ISystem {
    [BurstCompile]
    public void OnUpdate(ref SystemState state) {
        float dt = SystemAPI.Time.DeltaTime;
        foreach (var (transform, velocity) in SystemAPI.Query<RefRW<LocalTransform>, RefRO<Velocity>>()) {
            transform.ValueRW.Position += velocity.ValueRO.Value * dt;
        }
    }
}
```

### SystemBase (Managed, easier for beginners)

```csharp
public partial class MovementSystem : SystemBase {
    protected override void OnUpdate() {
        float dt = Time.DeltaTime;
        Entities.ForEach((ref LocalTransform transform, in Velocity velocity) => {
            transform.Position += velocity.Value * dt;
        }).ScheduleParallel();
    }
}
```

### SystemGroup Ordering

```csharp
// In SystemGroup or PlayerLoop
[UpdateBefore(typeof(PhysicsSystem))]
[UpdateAfter(typeof(InputSystem))]
public partial struct MovementSystem : ISystem { ... }
```

## Jobs

### IJobChunk

```csharp
[BurstCompile]
struct ClearHealthJob : IJobChunk {
    public ComponentTypeHandle<Health> healthType;
    public void Execute(in ArchetypeChunk chunk, int chunkIndex, bool b0) {
        var health = chunk.GetNativeArray(healthType);
        for (int i = 0; i < chunk.Count; i++) {
            health[i] = new Health { Value = 100f };
        }
    }
}
```

### IJobEntity (Easiest)

```csharp
[BurstCompile]
partial struct DamageJob : IJobEntity {
    public float damage;
    public void Execute(ref Health health) {
        health.Value -= damage;
    }
}
```

Schedule with:
```csharp
new DamageJob { damage = 10f }.ScheduleParallel(query);
```

## WriteGroup — Controlling Write Conflicts

When two systems write the same component, you need to suppress the default conflict:

```csharp
[WriteGroup(typeof(LocalTransform))]
public partial struct CustomTransformSystem : ISystem {
    public void OnUpdate(ref SystemState state) {
        // This system claims exclusive write to LocalTransform
    }
}
```

Without `[WriteGroup]`, Unity's safety system flags the concurrent write. With it, you tell DOTS: "I know what I'm doing, this system owns this component's writes."

## SubScenes and PrefabAuthoring

Data-oriented scenes use **SubScenes** containing `Baker<T>`-processed entities:

```csharp
public class PlayerBaker : Baker<PlayerAuthoring> {
    public override void Bake(PlayerAuthoring authoring) {
        var entity = GetEntity(TransformUsageFlags.Dynamic);
        AddComponent(entity, new Velocity { Value = authoring.startVelocity });
        AddComponent(entity, new Health { Value = authoring.startHealth });
    }
}
```

SubScenes are loaded in parallel, stored in chunk memory, and streamed to workers efficiently.

## Burst Compiler

`[BurstCompile]` generates SIMD-optimized machine code from C#:

```csharp
[BurstCompile(FloatPrecision.Standard, FloatMode.Fast)]
public partial struct BurstMovement : IJobEntity {
    public float dt;
    public void Execute(ref LocalTransform t, in Velocity v) {
        t.Position += v.Value * dt;  // compiled to AVX2/NEON auto-vectorized loop
    }
}
```

### Burst gotchas:
- No managed types (no `string`, no `object`, no `List<T>`).
- Use `NativeArray<T>`, `NativeList<T>`, `FixedString`.
- Use `[BurstDiscard]` to opt specific code paths out of Burst.

## Structural Changes

Adding/removing components is expensive (triggers archetype migration). Use a **command buffer**:

```csharp
var ecb = new EntityCommandBuffer(Allocator.TempJob);

foreach (var (health, entity) in SystemAPI.Query<RefRO<Health>>().WithEntityAccess()) {
    if (health.ValueRO.Value <= 0) {
        ecb.DestroyEntity(entity);     // deferred: safe during parallel iteration
    }
}

ecb.Playback(state.EntityManager);
ecb.Dispose();
```

### Deferred structural changes pattern:
1. `EntityCommandBuffer ecb = new EntityCommandBuffer(Allocator.TempJob);`
2. In parallel jobs: `ecb.AddComponent`, `ecb.RemoveComponent`, `ecb.DestroyEntity`
3. After jobs complete: `ecb.Playback(state.EntityManager);` — bulk-applied single-threaded

## Common DOTS Performance Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using managed `List<T>` in Burst jobs | Use `NativeArray<T>` or `NativeList<T>` |
| Forgetting to `.Complete()` job handles before reading results | Always chain with `.Complete()` or `dependency` |
| Creating entities inside `IJobEntity` | Use `EntityCommandBuffer` |
| Structuring archetype changes in tight loops | Batch changes; apply at end of frame |
| Using `SharedComponentData` for per-entity state | Use `IComponentData` instead; shared is for chunk grouping |
| Accessing `EntityManager` from parallel job | Use ECB |

## Profiling DOTS

- **Unity Profiler**: Entities module tracks archetype count, chunk count, structural change events.
- **Memory Profiler**: inspect chunk layout and wasted space.
- **Frame Debugger (Entities)**: step through system execution.
- **Burst Inspector**: view generated assembly; check SIMD vectorization.
- **`Entities.ForEach` without `[WithNone]`/`[WithAll]` filters**: adds unnecessary iteration — use query filters.

## Real-World DOTS Game Structure

```
SubScene/
  ├── Terrain         (TerrainEntity, heightmap chunk authoring)
  ├── Actors          (PlayerAuthoring, EnemyAuthoring)
  ├── Effects         (ParticleAuthoring)
  └── UI              (UIAuthoring — mostly managed)

Systems:
  InputSystem         → PlayerInputCommand
  MovementSystem      → LocalTransform = f(Velocity)
  PhysicsSystem       → Collision detection, contact resolution
  AnimationSystem     → LocalTransform = f(AnimatorState)
  SpawnSystem         → entity creation from WaveData
  HealthSystem        → destroy when HP <= 0
  RenderSubmitSystem  → sync LocalTransform → RenderMesh for draw
```

## References

- Unity DOTS manual: https://docs.unity3d.com/Packages/com.unity.entities@1.0/
- Unity DOTS samples: https://github.com/Unity-Technologies/EntityComponentSystemSamples
- DOTS Motion: https://github.com/Unity-Technologies/dots-motion
- Burst documentation: https://docs.unity3d.com/Packages/com.unity.burst@1.8/