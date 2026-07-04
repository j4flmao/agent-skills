---
name: ECS Architecture Expert
description: >
  Comprehensive skill defining the core principles, usage, and optimization
  patterns for Entity Component System architectures in game development.
  Focuses on data-oriented design, memory contiguity, and cache optimization.
version: 2.0.0
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - game-development
  - ecs
  - c++
  - performance
  - data-oriented-design
---

# ECS Architecture Expert

## Purpose

The Entity Component System (ECS) architecture is a software architectural pattern mostly used in video game development for the representation of game world objects. An ECS comprises entities, components, and systems. The fundamental purpose of this skill is to provide a robust, data-oriented foundation for scaling complex game simulations without falling into the pitfalls of deeply nested object-oriented inheritance hierarchies. By decoupling data (Components) from logic (Systems) and identity (Entities), ECS achieves unparalleled cache locality, enabling developers to process tens of thousands of entities per frame. This skill empowers the agent to architect, refactor, and optimize game engines using ECS principles, maximizing CPU throughput and ensuring maintainable codebases across large-scale projects.

## Core Principles

1. **Separation of Data and Logic**: Components contain only Plain Old Data (POD). Systems contain all logic and behavior. Entities are merely unique identifiers (usually an integer). This clean separation ensures that code remains decoupled and easy to test.
2. **Memory Contiguity is King**: Components of the same type must be stored in contiguous memory blocks (Arrays). This leverages modern CPU cache architectures (L1/L2/L3) by avoiding cache misses. Struct of Arrays (SoA) is preferred over Array of Structs (AoS) for iterative processing.
3. **Composition Over Inheritance**: Behaviors are built by composing entities with multiple components rather than inheriting from deep class hierarchies. This allows dynamic addition and removal of behavior at runtime without polymorphic overhead.
4. **Deterministic Execution Order**: Systems must execute in a strictly defined, predictable order to prevent race conditions and ensure frame-to-frame determinism, especially crucial for networked multiplayer simulations.
5. **Data Transformations Over State Mutations**: Viewing game logic as a pipeline of data transformations (Input -> System -> Output) minimizes side effects and opens the door for trivial parallelization via multithreading (e.g., job systems).

## Agent Protocol

### Triggers
- When the user requests an engine architecture review.
- When the user complains about CPU performance or cache misses in game loops.
- When requested to refactor deep inheritance hierarchies in game objects.
- When creating a new game engine or gameplay framework from scratch.

### Input Context Required
- Target programming language (e.g., C++, Rust, C#).
- Existing game object architecture or codebase layout.
- Performance metrics (if any) such as frame time, cache miss rates, or entity counts.
- Target hardware constraints (e.g., mobile, current-gen consoles, low-end PC).

### Output Artifact
- A comprehensive architecture plan in an `architecture_review.md` artifact.
- Code snippets demonstrating optimal component layouts and system iterations.
- A proposed system execution graph.

### Response Formats
The agent must provide structural changes in clear JSON formats representing entity composition:
```json
{
  "entity": 1042,
  "archetype": "PlayerCharacter",
  "components": [
    {
      "type": "Transform",
      "size_bytes": 64,
      "layout": "contiguous_array"
    },
    {
      "type": "Velocity",
      "size_bytes": 12,
      "layout": "contiguous_array"
    },
    {
      "type": "InputController",
      "size_bytes": 4,
      "layout": "sparse_set"
    }
  ]
}
```

## Decision Matrix

```text
                        [Is performance a bottleneck?]
                                /             \
                            Yes                 No
                            /                     \
            [Are entities numerous?]       [Is behavior complex?]
                /             \               /               \
              Yes              No           Yes                No
              /                  \           /                  \
    [Apply strict DOD]  [Standard ECS]  [Use hybrid approach] [Keep it simple]
           |                   |               |                   |
    Use SoA layouts      Use sparse sets  Mix OOP and ECS    Use standard OOP
    align to 64 bytes    for components   for specific logic or simple structs
```

## Detailed Architectural Overview

### Architecture Diagram
```text
+-------------------------------------------------------------+
|                        Game World                           |
+-------------------------------------------------------------+
|                                                             |
|  +---------------+    +---------------+    +-------------+  |
|  |   System A    |    |   System B    |    |  System C   |  |
|  | (Movement)    |    | (Collision)   |    | (Rendering) |  |
|  +-------+-------+    +-------+-------+    +------+------+  |
|          |                    |                   |         |
|          v                    v                   v         |
|  +-------------------------------------------------------+  |
|  |                    ECS Registry                       |  |
|  |  +----------------+ +----------------+ +-----------+  |  |
|  |  | Transform Pool | | Velocity Pool  | | Mesh Pool |  |  |
|  |  +----------------+ +----------------+ +-----------+  |  |
|  |  [T][T][T][T][T]    [V][V][V][V][V]    [M][M][M]      |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### Lifecycle Diagram
```text
[Start Frame]
      |
      v
[Input Gathering System] ---> Write to Input Components
      |
      v
[Simulation Systems] -------> Read/Write Transforms, Velocities, Physics
      | (Parallel Jobs)
      v
[Event Resolution System] --> Handle collisions, triggers, entity death
      |
      v
[Rendering Systems] --------> Read Transforms, Meshes, Submit to GPU
      |
      v
[End Frame]
```

## Workflow Steps

### Phase 1: Assessment and Profiling
1. Identify bottleneck systems and poorly performing object hierarchies.
2. Analyze memory access patterns using profiling tools (e.g., VTune, Tracy).
3. Determine target cache line sizes and memory alignment requirements.
4. Establish baseline metrics for frames per second and CPU utilization.

### Phase 2: Component Design
1. Strip all logic from existing game classes to identify pure data fields.
2. Group related data fields into minimal, tightly packed POD structs.
3. Pad structs to align cleanly with 64-byte cache lines if heavily iterated.
4. Separate hot data (frequently accessed) from cold data (rarely accessed).

### Phase 3: System Implementation
1. Write systems that query the exact set of components required.
2. Iterate through component arrays sequentially to trigger hardware prefetching.
3. Avoid branching (if/else) inside inner loops to maintain CPU instruction pipelines.
4. Vectorize inner loop operations using SIMD instructions where applicable.

### Phase 4: Archetype and Pool Allocation
1. Group entities by their active component signatures (Archetypes).
2. Allocate contiguous memory blocks (Chunks/Pages) for each Archetype.
3. Implement structural change queues to avoid memory fragmentation mid-frame.
4. Use sparse sets for components that are rarely attached to entities.

### Phase 5: Parallelization
1. Map out system dependencies based on read/write access to components.
2. Dispatch independent systems to a lock-free job scheduler.
3. Use thread-local command buffers for entity creation/destruction.
4. Sync points should only occur when resolving structural changes.

### Phase 6: Validation and Tuning
1. Re-profile the simulation against the baseline metrics.
2. Check for false sharing if systems run on multiple threads.
3. Optimize struct layouts based on new cache miss reports.
4. Lock in deterministic behavior by verifying replay systems.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| High CPU Cache Misses | Array of Structs (AoS) layout or random memory access | Convert to Struct of Arrays (SoA). Ensure sequential iteration. |
| Frame Spikes during Spawn/Despawn | Memory fragmentation and immediate reallocation | Defer entity destruction to end of frame. Use object pools. |
| Race Conditions in Job System | Systems concurrently writing to the same component | Restrict writes. Enforce strict Read/Write dependency graphs. |
| Pointer Chasing Overhead | Components containing pointers to other components | Use Entity IDs instead of pointers. Resolve IDs via the Registry. |
| Bloated Components | Merging unrelated data causing poor cache utilization | Split components into 'Hot' (frequently used) and 'Cold' sets. |
| Inconsistent Execution Order | Systems relying on unordered maps for iteration | Use strictly ordered arrays or explicit execution graphs. |
| SIMD Inefficiencies | Branching inside inner loops | Use branchless programming techniques and data masking. |

## Complete Execution Scenario

```text
[User requests 10,000 active asteroids]
           |
           v
[Agent analyzes requirement]
           |
           v
[Agent generates Component layout]
struct Position { float x,y,z; };
struct Velocity { float dx,dy,dz; };
           |
           v
[Agent constructs System iteration]
for (size_t i = 0; i < count; ++i) {
    pos[i].x += vel[i].dx * dt;
    // Sequential memory access
}
           |
           v
[Validation Phase]
Are cache misses < 1%?
     /        \
   Yes         No -> [Realign structs / Pad memory]
   |
[Output Artifact Generated]
```

## Rules and Guidelines

1. **Zero Logic in Components**: Components must be strictly limited to data declarations. No methods, no constructors with side effects, no virtual functions.
2. **Sequential Memory Access**: Systems must iterate over data sequentially. Random access is strictly prohibited in the hot path.
3. **Defer Structural Changes**: Adding or removing components must be deferred to a sync point at the end of the frame to prevent invalidating iterators and memory layouts.
4. **Use Entity IDs, Not Pointers**: Never store pointers to entities or components. Memory can shift. Always store the 32-bit or 64-bit Entity ID and query the registry.
5. **Optimize for the Common Case**: Design layouts and systems for the 99% of entities that behave normally, handling edge cases in separate, smaller systems.

## Reference Guides

- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff

- For rendering integrations with ECS, refer to the `graphics-pipeline` skill.
- For networking the deterministic ECS state, refer to the `network-rollback` skill.
- For physics simulation within systems, refer to the `physics-engine` skill.

<!-- COMPRESSION_FOOTER: {"v":2,"type":"skill","hash":"ecs-arch-12345"} -->
