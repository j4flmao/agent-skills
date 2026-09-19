---
title: EnTT & Flecs in Practice
description: Using EnTT (single-header C++ ECS) and Flecs (C ECS with DOD storage) — sparse sets, group views, observers, events, and production patterns.
---

# EnTT & Flecs — Practical ECS Libraries

## EnTT (C++)

EnTT is the most popular open-source single-header C++ ECS. It powers games like... actually it's used broadly across AAA studios, simulators, and tools because it's header-only, fast, and battle-tested.

### Core APIs

```cpp
#include <entt/entt.hpp>

entt::registry registry;

// Create an entity
auto enemy = registry.create();

// Add components
registry.emplace<Position>(enemy, 0.0f, 0.0f);
registry.emplace<Velocity>(enny, 1.0f, 0.0f);
registry.emplace<Health>(enemy, 100.0f);

// Get component
auto& pos = registry.get<Position>(enemy);

// Check existence
if (registry.all_of<Health>(enemy)) { /* ... */ }

// Remove component (moves entity to a different storage)
registry.remove<Velocity>(enemy);

// Destroy entity
registry.destroy(enemy);
```

### Iteration With Views

```cpp
// View of entities that have Position + Velocity
auto view = registry.view<Position, Velocity>();
for (auto entity : view) {
    auto& pos = view.get<Position>(entity);   // fast access
    auto& vel = view.get<Velocity>(entity);
    pos.x += vel.vx * dt;
}
```

### Grouped Storage (What makes EnTT fast)

`group<Position, Velocity>()` sorts components by entity → contiguity. When iterating a group, all Position and Velocity arrays are pre-sorted identical → minimal cache misses:

```cpp
// Groups sort storage once; subsequent iteration is cache-coherent
auto group = registry.group<Position, Velocity>();
for (auto entity : group) {
    auto [pos, vel] = group.get<Position, Velocity>(entity);
}
```

Groups have maintenance cost (sorting) — use them for hot paths, not for components added/removed frequently.

### Events / Signals

```cpp
// Observer on component construction
registry.on_construct<Health>().connect([](entt::registry& r, entt::entity e) {
    // called whenever a Health component is added
});

// Observer on destruction
registry.on_destroy<Health>().connect([](entt::registry& r, entt::entity e) {
    // called when Health removed
});
```

### Runtime Component Type Discovery

EnTT supports reflective runtime access via `entt::meta`:

```cpp
entt::meta<Position>().type(entt::internal::type_hash<Position>::value())
    .data<&Position::x>("x"_hs)
    .data<&Position::y>("y"_hs);
```

## Flecs (C/C++)

Flecs is a data-oriented ECS written in C with an optional C++ API. Its claim to fame is low-level performance, a C API that works across all languages, and intuitive component/observers/events.

### Core Concepts (C API)

```c
#include <flecs.h>

// Define components
ECS_COMPONENT(world, Position);
ECS_COMPONENT(world, Velocity);

// Define systems
ECS_SYSTEM(world, Move, EcsOnUpdate, Position, Velocity);
```

```c
static void Move(ecs_iter_t *it) {
    Position *p = ecs_field(it, Position, 1);
    Velocity *v = ecs_field(it, Velocity, 2);

    for (int i = 0; i < it->count; i++) {
        p[i].x += v[i].x * it->delta_time;   // delta_time built-in
        p[i].y += v[i].y * it->delta_time;
    }
}
```

### Component Definitions (C API)

```c
typedef struct { float x, y; } Position;
typedef struct { float x, y; } Velocity;
```

### Observers

```c
ECS_OBSERVER(world, OnSpawn, EcsOnAdd, Position);

static void OnSpawn(ecs_iter_t *it) {
    for (int i = 0; i < it->count; i++) {
        ecs_entity_t e = it->entities[i];
        printf("Entity %u gained Position!\n", e);
    }
}
```

### Events

```c
ECS_EVENT(world, Collision, Position);

ecs_emit(world, &(Collision){ .x = 42, .y = 24 }, entity);
```

### Queries and Pipelines

```c
// Raw query API
ecs_query_t *q = ecs_query(world, {
    .filter.terms = {
        { ecs_id(Position) },
        { ecs_id(Velocity), .oper = EcsOptional },  // optional term
    }
});
```

### C++ API (Modern, Typed)

```cpp
world.component<Position>()
    .member<float>("x")
    .member<float>("y");

world.system<Position, Velocity>("Move")
    .kind(flecs::OnUpdate)
    .each([](flecs::entity e, Position& p, Velocity& v) {
        p.x += v.x * e.delta_time();
        p.y += v.y * e.delta_time();
    });
```

### Prefabs & Entity Relationships

Flecs has first-class support for relationships and prefabs:

```cpp
auto Enemy = world.prefab("Enemy")
    .set<Position>({})
    .set<Velocity>({0.f, 0.f});

auto e = world.entity("Enemy_1")
    .is_a(Enemy)              // inherit components from prefab
    .set<Position>({1.f, 2.f}); // override one value

// Relationships for hierarchy (Parent-Child)
auto child = world.entity("child")
    .add(flecs::ChildOf, parent);
```

### Performance Comparison (EnTT vs Flecs)

| Metric | EnTT | Flecs |
|--------|------|-------|
| License | MIT | MIT |
| Language | C++17 | C99 + C++11 |
| API style | Header-only, header | Single compiled .c/.h |
| Storage | Sparse sets + groups | Archetypes (chunks) |
| Query speed | Excellent, tuned ADT | Excellent (vectorized) |
| Memory usage | Low, hand-tuned | Low, chunk-pooled |
| Ecosystem | Huge (many examples) | Growing, C/C++ bindings |

Real-world overhead differences are usually under 2x at scale — choose based on integration needs (Flecs drops into C-based engines trivially; EnTT is a drop-in C++ header).

## Choosing Between EnTT/Flecs/Bevy/DOTS

```
┌──────────────────────────────────────────────────────────────┐
│  Use EnTT when:                                              │
│    - C++ codebase, need custom ECS integrated into existing   │
│    - Want header-only, drop-in library                        │
│    - Need maximum control over memory layout                  │
├──────────────────────────────────────────────────────────────┤
│  Use Flecs when:                                             │
│    - Need C API (bindings to many languages)                  │
│    - Need archetype storage + events + relationships out of box │
├──────────────────────────────────────────────────────────────┤
│  Use Bevy when:                                              │
│    - Building new Rust game, want safety + ergonomics         │
├──────────────────────────────────────────────────────────────┤
│  Use Unity DOTS when:                                        │
│    - Unity ecosystem, want Burst-optimized C#                 │
└──────────────────────────────────────────────────────────────┘
```

## Further Reading

- EnTT: https://github.com/skypjack/entt
- Flecs: https://www.flecs.dev/flecs/
- Flecs guide: https://www.flecs.dev/flecs/docs.html
- EnTT wiki: https://github.com/skypjack/entt/wiki