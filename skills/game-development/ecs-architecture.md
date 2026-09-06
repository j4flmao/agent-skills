# Entity Component System (ECS)

## 1. Skill Context
**Focus**: Data-Oriented Design (DOD) for game engines. Bypassing traditional Object-Oriented Programming (OOP) to maximize CPU Cache hits and parallel processing.
**Triggers**: ecs, entity-component-system, data-oriented-design, bevy, unity-dots.

## 2. The OOP Bottleneck (Array of Structs)
In traditional OOP, a `GameObject` contains data (position, health) and logic (`update()`).
If you loop through 10,000 monsters to update their physics, the CPU pulls the entire object into the L1 Cache. However, the physics math only needs the `Position` and `Velocity`. The rest of the data (Health, Name, Texture) pollutes the cache. This is called **Array of Structs (AoS)** and causes massive Cache Misses.

## 3. The ECS Solution (Struct of Arrays)
ECS decouples Data from Logic perfectly.
- **Entity**: Just a meaningless integer ID (e.g., `Entity 42`).
- **Component**: Pure data with NO logic (e.g., `Position {x, y, z}`).
- **System**: Pure logic with NO data (e.g., `PhysicsSystem`).

All `Position` components are stored tightly packed in a contiguous array in RAM. 
When the `PhysicsSystem` runs, the CPU reads the contiguous array, maximizing L1 Cache usage (Spatial Locality) and allowing the CPU's vector units (SIMD) to process multiple positions per clock cycle.
