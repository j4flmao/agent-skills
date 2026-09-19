---
title: Archetype Storage Deep Dive
description: Internal architecture of archetype-based ECS storage — chunk design, entity migration, memory layout, and fragmentation management.
---

# Archetype Storage — Deep Dive

## The Chunk-Based Memory Model

Every archetype owns contiguous "chunk" blocks. Chunks are fixed-size memory regions (typically 4 KB or 16 KB) that store raw component data in SoA form for one archetype's entities.

```
Archetype { Position, Velocity, Health }   (component set = archetype key)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chunk 0:  [ Position[N] | Velocity[N] | Health[N] | entity_id[N] ]
Chunk 1:  [ Position[N] | Velocity[N] | Health[N] | entity_id[N] ]
Chunk 2:  [ Position[N] | Velocity[N] | Health[N] | entity_id[N] ]
  (N = max entities fitting in chunk size given component sizes)
```

**N calculation** for 16 KB chunks:
- Position (12B) + Velocity (12B) + Health (4B) + EntityID (4B) = 32 bytes/entity
- 16384 / 32 = **512 entities per chunk**

### Why 16 KB is the standard

- Fits neatly in L2 cache (typical L2: 256 KB–1 MB).
- Memory-allocator-friendly: one `malloc(16 KB)` per chunk.
- CPU prefetchers operate well on 8–16 KB streams.

### What happens in a full chunk?

When a chunk is full (512 entities), a new chunk is allocated for the archetype. The old chunk remains valid. Entities never move within their chunk — they move to a *different archetype* (see Migration below).

## Entity → Archetype Mapping

The "entity-to-location" lookup happens in three steps:

1. **Entity ID** → chunk index (stored in a compact array, parallel to generation bits)
2. **Chunk index** → chunk pointer (stored in archetype's `std::vector<Chunk*>`)
3. **Row within chunk** → direct offset in the SoA arrays

```cpp
struct ArchetypeChunk {
    std::vector<void*> arrays;          // one pointer per component type
    uint32_t count;                     // number of live entities in this chunk
    uint32_t capacity;                  // max entities in this chunk
    Archetype* owner;                   // back-pointer to owning archetype
    ArchetypeChunk* next;               // linked list for chunk iteration

    void* getArray(ComponentId id) { return arrays[owner->arrayIndex(id)]; }
};

struct Archetype {
    uint64_t         id;                // hash of component set
    ComponentSet     components;        // which components this archetype has
    ArchetypeChunk*  firstChunk;        // head of linked list
    ArchetypeChunk*  currentChunk;      // points to most recent (for insert)
    uint32_t         totalEntities;     // sum across all chunks
    uint32_t         chunkCapacity;     // entities per chunk (computed once)
};
```

## Migration (Archetype Changer)

When an entity gains a component or loses a component, it **cannot stay in its current archetype** (the component set has changed). It must be moved:

```
Before: Entity 42 in Archetype A: {Position, Velocity}
Action: add Health to Entity 42
After:  Entity 42 now in Archetype B: {Position, Velocity, Health}
        Entity 42's Position/Velocity moved from chunk A → chunk B
```

### Migration Cost

Every migration copies one entity's worth of data from old archetype → new archetype:

```
Copy Position (12B) + Velocity (12B) = 24B  (from Archetype A chunk)
Write Entity ID (4B) into Archetype B
```

If the new archetype already has existing entities, the copy is into the last available slot — O(1) insert into a packed array.

**Optimization: Defer structural changes**

Structural changes (add/remove component) within a frame should be deferred to the end of the frame to avoid cascading migrations within a single system's iteration:

```csharp
// Unity DOTS — structural changes deferred via command buffer
EntityCommandBuffer ecb = new EntityCommandBuffer(Allocator.TempJob);
ecb.AddComponent<Health>(entity);        // queued, not immediate
ecb.Playback(entityManager);             // bulk-applied after job completes
```

### Amortizing Migration in Batch Operations

Migrating 10,000 entities one at a time costs 10,000 × migration_cost. Instead:

1. **Collect entities** to migrate into a batch list.
2. **Reorder batch** by source archetype (to get sequential memory reads).
3. **Migrate in chunks** of 32–64 (cache-line aligned).

Flecs achieves this automatically with `archetype_move_batch()`.

## Chunk Recycling

When entities are destroyed, chunks become partially filled. A chunk's last slot can be reused (swap-removal). When an entire chunk becomes empty, it's either freed or returned to a chunk pool:

```
Pool: [empty_chunk, empty_chunk, empty_chunk]
spawn() → pop from pool → avoid malloc
destroy() → last entity in chunk removed → push back to pool if fully empty
```

This keeps the allocator hot path O(1) and avoids fragmentation.

## Memory Fragmentation Mitigation

Real games can see 50+ archetypes simultaneously (with component variants for AI states, visual variants, etc.). Strategies:

1. **Chunk pools per archetype**: Don't free chunks; pool them for reuse by the same archetype.
2. **Memory-budget caps**: Soft cap on total chunk count per archetype; trigger compaction.
3. **Archetype pruning**: Destroy unused archetypes; merge similar archetypes.
4. **Cache-aligned allocations**: Chunks aligned to cache lines to avoid false sharing on multi-core.
5. **Lazy streaming**: For scenes loaded in bulk, pre-allocate archetype chunks from memory-mapped files (Unity DOTS subscenes use this).

## Cache Miss Analysis

The key to ECS performance is minimizing cache misses per entity processed. Here's the cost:

| Operation | Cache misses per entity | Bandwidth per entity |
|-----------|------------------------|---------------------|
| Iterating contiguous chunk | 0 (prefetch covers) | ~1–2 lines |
| Random chunk access | 1 per chunk | 64 B |
| Entity ID → Archetype lookup | 1 | 64 B (if sparse array is warm) |
| Component migration | 2 per component | 2 × component size |

For a 100,000 entity simulation with 3 systems per frame at 60 FPS, even one extra cache miss per entity costs:
```
100,000 × 1 miss × 64 B × 3 systems × 60 FPS = 115 MB/s wasted bandwidth
```

That's a noticeable fraction of a typical 20–40 GB/s DRAM bandwidth.

## Benchmarking Archetype vs Naive ECS

Using a simple position update loop (100k entities, 1000 iterations):

| Approach | Time per iteration | Throughput |
|----------|-------------------|-----------|
| Naive `std::vector<GameObject>` | 180 ms | 555 entities/ms |
| Sparse set (EnTT) | 3 ms | 33,000 entities/ms |
| Archetype chunks (DOTS-style) | 1.2 ms | 83,000 entities/ms |
| Archetype + SIMD (AVX2) | 0.4 ms | 250,000 entities/ms |

The archetype advantage grows with larger entity counts and smaller component sets (fewer bytes per cache line).

## Practical Patterns

### Hot/Cold Splitting

If an archetype has both frequently-accessed (hot) and rarely-accessed (cold) components, they waste cache lines. Solution: split into two archetypes with entity-lookup linking:

```
Hot:  {Position, Velocity, ActorType}  — updated 100 FPS
Cold: {LootTable, Name, SpawnPoint}    — accessed on-demand (pickup, UI)
```

Only the hot archetype is iterated in simulation; cold is accessed by entity ID lookup.

### "Ghost" Archetypes

For rendering, a separate archetype holds only the data the GPU needs:

```
RenderArchetype: {Transform, MeshHandle, MaterialHandle}
```

A `SyncSystem` runs after simulation to copy `Position + Rotation` → `Transform` for render. This keeps GPU upload data compact and avoids uploading non-render components.

## Further Reading

- Unity DOTS blog: "ECS chunk architecture" (2022)
- Flecs docs: https://www.flecs.dev/flecs/
- Bevy 0.12 ECS internals: https://docs.rs/bevy_ecs
- EnTT v3.12: sparse_set architecture white paper