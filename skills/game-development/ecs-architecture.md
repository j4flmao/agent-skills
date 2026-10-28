# Entity Component System (ECS)

## 1. Skill Context
**Focus**: Data-Oriented Design (DOD) for game engines. Separating data from behavior so hot loops touch only the data they need, in cache-friendly order, and can run in parallel.
**Triggers**: ecs, entity-component-system, data-oriented-design, bevy, unity-dots, entt, flecs.
**Deep dive**: `skills/game/ecs-architecture/SKILL.md`, `skills/game/game-engine/ecs-pattern/SKILL.md`.

## 2. The OOP Bottleneck
In classic OOP, a `GameObject` bundles data (position, health, name, mesh handle) with logic (`update()`). Each object is usually allocated individually and reached through a pointer.
When a physics loop over 10,000 monsters only needs `Position` and `Velocity`, every fetched cache line also carries unrelated fields, and pointer chasing defeats the hardware prefetcher. Virtual `update()` calls add indirect branches. The result is low cache-line utilization, not a fixed "N× slowdown": measure it with a profiler.

## 3. The ECS Solution
- **Entity**: An ID, usually index + generation counter so stale handles can be detected.
- **Component**: Plain data, no behavior (`Position {x, y, z}`).
- **System**: Logic that runs over every entity matching a component query (`Position + Velocity`).

Storage strategies:
| Strategy | Used by | Iteration | Add/remove component |
|---|---|---|---|
| Archetype tables: chunks of entities that share one component set, one array per component | Unity DOTS, Bevy (tables), Flecs | Fastest, linear | Moves the entity to another table |
| Sparse sets: one packed array per component type | EnTT, Bevy (sparse-set storage option) | Fast for one component, needs joins for several | Cheap |

Each component type sits in contiguous arrays, so systems stream through memory linearly. That lets the compiler (or Burst) vectorize with SIMD, and lets schedulers run systems with disjoint read/write sets in parallel.

## 4. Rules
- Keep components small and split hot/cold data. Avoid containers or pointers in hot components.
- Prefer tag components or enable bits over frequent structural changes (adding/removing components moves data).
- Batch structural changes through command buffers and apply them at sync points.
- Declare read vs. write access per system so the scheduler can parallelize safely.
- Do not force ECS on few, logic-heavy objects (UI, game-mode state). OOP is fine there.
