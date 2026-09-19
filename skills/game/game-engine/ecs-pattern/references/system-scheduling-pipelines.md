---
title: System Scheduling & Pipelines
description: Building deterministic, parallel, pipelined system schedulers for ECS — dependency graphs, phase-based ordering, multi-core execution, and determinism guarantees.
---

# System Scheduling & Pipelines

## Dependency Graph Construction

Each ECS system declares its component reads and writes. The scheduler compiles a directed acyclic graph (DAG):

```
System           Reads              Writes
─────────────────────────────────────────────
InputSystem      KeyboardState     PlayerCommand
MovementSystem   Position, Velocity   Position
PhysicsSystem    Position, AABB    CollisionPair
RenderSystem     Position, Sprite     (none — read only)
```

**Dependency rules:**
- Write → Write: the two systems must be ordered (typically the later one overwrites).
- Write → Read: the reader must see the previous system's write; ordered.
- Read → Read: safe to parallelize.
- Read → Write (inverted): also ordered.

**Graph building code (Bevy-style):**

```rust
app.add_systems(Update, (
    input_system,
    movement_system.after(input_system),     // needs PlayerCommand from input
    physics_system.after(movement_system),   // needs updated Position
    render_system.after(physics_system).after(movement_system), // reads final Position
));
```

### Automatic Dependency Inference

Bevy's scheduler infers dependencies from system signatures automatically — `Query<(&mut Transform, &Velocity)>` tells the scheduler that `movement_system` writes `Transform` and reads `Velocity`. Two systems with no overlapping writes can run in parallel automatically.

## Determinism Requirements

For netcode lockstep or replay playback, simulation must be **deterministic across platforms and runs**:

1. **Fixed timestep**: Always 20–120 Hz. Accumulate real time; consume in fixed steps.
2. **Deterministic iteration order**: Sort systems into a fixed graph; never use randomized ordering.
3. **Deterministic data layout**: Stable chunk order; no hash-map iteration.
4. **Deterministic math**: Use SIMD-compatible fixed-point math or platform-locked float operations.
5. **No concurrent mutations in deterministic path**: Lock any shared mutable state during simulation.

## Fixed Timestep Pattern

```cpp
float accumulator = 0.f;
const float dt = 1.f / 60.f;

void frame(float realDt) {
    accumulator += realDt;
    while (accumulator >= dt) {
        runSimulation(dt);          // deterministic, never varies
        accumulator -= dt;
    }
    interpolateRendering(accumulator / dt); // smooth visual interpolation
}
```

## Phase-Based Scheduling

Systems are grouped into phases that execute in sequence. Within each phase, independent systems run in parallel.

```
Frame Pipeline:
  ┌──────────────────────────────────────────────────────────┐
  │  Phase 1: INPUT        (parallel: KeyboardSystem, Pad)  │
  │  Phase 2: SIMULATION   (parallel: Move, Physics, AI)    │
  │  Phase 3: POST-SIM     (sequential: SyncRenderBuffers)  │
  │  Phase 4: RENDER        (parallel: SpriteBatch, Text)    │
  │  Phase 5: PRESENTATION  (sequential: SwapBuffers)       │
  └──────────────────────────────────────────────────────────┘
```

### Bevy App States

```rust
#[derive(States, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
enum GameState { #[default] Loading, Playing, Paused }

app.add_systems(Update, simulation_systems.in_set(OnUpdate(GameState::Playing)));
```

## Multi-Core Execution

### Unity Dots Job System

```csharp
// IJobEntity — automatically scheduled across job threads
[BurstCompile]
partial struct MoveJob : IJobEntity {
    public float dt;
    public void Execute(ref LocalTransform t, in Velocity v, in Mass mass) {
        t.Position += v.Value * dt;
    }
}

// Schedule across cores
var moveJob = new MoveJob { dt = fixedDt };
JobHandle handle = moveJob.ScheduleParallel(query, dependency);
handle.Complete();
```

Job threads run on the global Unity Job System worker thread pool (N cores - 1 for main thread).

### Flecs Multi-Threading

```c
// Flecs: add systems to a pipeline with threading hints
world.progress(0.f, 1.f); // single-thread
// or set threads for parallel execution:
ecs_set_threads(world, N);
```

Flecs's parallel execution uses a task-based model where the scheduler assigns independent systems to different threads at runtime.

## Pipelining: Overlapping Frame N and Frame N+1

Pipelining lets the CPU work on simulation for frame N+1 while the GPU is rendering frame N:

```
Frame N:   Simulation (16.6ms) │ Render Upload (16.6ms) │ GPU Render (16.6ms)
Frame N+1:                     │ Simulation (16.6ms)    │ Render Upload ...
```

Requires **double-buffering** all written data:
- Simulation writes to `backBuffer[]`.
- Render reads from `frontBuffer[]`.
- At frame boundary: swap pointers.

```cpp
struct DoubleBuffer {
    Position* front;    // read by renderer
    Position* back;     // written by simulation
    void swap() { std::swap(front, back); }
};
```

## Race Condition Debugging

**Symptoms of data races:**
- Non-deterministic simulation results across runs.
- Crashes when running with N threads but not 1.
- Subtle position drift only after many iterations.

**Tools:**
- Thread Sanitizer (TSan): `-fsanitize=thread`
- Race Condition Sanitizer (ASAN): `-fsanitize=undefined`
- Unity: Jobs debugger + Safety System (catches schedule conflicts at runtime)

**Fix:**
1. Identify overlapping write sets.
2. Add explicit `.after()` ordering.
3. If truly independent, add `WriteGroup` (Unity DOTS) or mark safe for parallel (Bevy `ParamSet`).

## Error Handling in Systems

Systems should never panic/crash the frame. Error recovery strategies:

```csharp
// Unity DOTS: Job handle safety
try {
    var job = new PhysicsJob { dt = fixedDt };
    job.ScheduleParallel();
} catch (System.Exception e) {
    Debug.LogError($"Physics job failed: {e.Message}");
    // skip this frame's physics; entities remain at previous positions
}
```

## System Startup vs Update

- **Startup systems**: run once at app launch (load assets, initialize singletons).
- **Update systems**: run every frame.
- **FixedUpdate systems**: run at fixed timestep (simulation).
- **PostUpdate systems**: run after Update, before render (interpolation, sync).

Bevy example:

```rust
app.add_systems(Startup, load_assets_system);
app.add_systems(FixedUpdate, physics_system);
app.add_systems(Update, (input_system, movement_system).chain());
app.add_systems(Render, sync_render_system);
```

## Further Reading

- Flecs: https://www.flecs.dev/flecs/docs.html#system-Phases
- Bevy scheduler internals: https://docs.rs/bevy_ecs/0.12.0/bevy_ecs/schedule/index.html
- Unity DOTS job system: https://docs.unity3d.com/Packages/com.unity.entities@1.0/manual/jobs.html