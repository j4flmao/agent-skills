---
description: "j4flmao/rules — Standards for building game engine code, rendering pipelines, and gameplay systems"
glob: "**/*.{glsl,hlsl,target,cpp,cc,h,hpp,cxx,cs,gd,ts,rs}"
---

# Game Engine Guidelines

AI/Cursor MUST follow these rules when writing game engine, renderer, or gameplay systems code. These rules harden correctness, performance, and determinism.

## 1. Performance & Frame Budget

- **Rule**: Profile before optimizing; never guess. Every hot path must include measurable metrics (`TimeMeasure`, GPU timers, counters).
- **Rule**: Allocators in the render/hot loop are forbidden. Use `pool`, `stack`, or `arena` allocators per frame; reserve at startup.
- **Rule**: Draw calls are precious. Batch by material/pipeline; cap state changes (`SetPipeline`/`SetShader`); prefer instancing and indirect draw.
- **Rule**: No `new`/`malloc` during simulation or render ticks. If code allocates in a tick, it is a review-blocker.
- **Rule**: Vectors of `unique_ptr` to polymorphic entities are rejected. Keep component data in contiguous arrays (`SoA`) and entity IDs index them.

## 2. Data-Oriented & Cache Design

- **Rule**: Model CPU cache: elements in hot systems are contiguous, 32-64 byte stride structs; split hot/cold component data into separate arrays.
- **Rule**: Prefer `std::vector<T>` + index handles over object pointers in entity systems.
- **Rule**: Object-oriented hierarchies (`Actor` base class with virtual `Tick()`) are allowed only for gameplay-throttled, low-frequency logic; never per-entity per-frame.
- **Rule**: SIMD is required where a uniform operation runs over many elements (transforms, particle sim). Write scalar reference first, then vectorize.

## 3. Threading & Determinism

- **Rule**: The simulation step MUST be deterministic given the same inputs (same seed, same binary, same settings). Never allow wall-clock time, map iteration order, or `std::rand()` into the simulation.
- **Rule**: Render jobs, physics, and sim run on a job graph; no thread may block on another for more than a bounded slice.
- **Rule**: All shared mutable state is owned by exactly one system (ownership), or accessed via `atomic`/lock-free structures that are benchmarked. Unlocked cross-thread writes = review-blocker.
- **Rule**: `Tick` data is never mutated while being read by another thread; use per-frame double buffering or generation counters.
- **Rule**: Never block the render thread on asset I/O, shader compile, network, or GC.

## 4. Game Loop & Time

- **Rule**: Use a fixed-timestep accumulator (e.g., 1/60s or 1/120s) for simulation with accumulated real `dt`, plus interpolation for rendering. Never drive physics from render `dt`.
- **Rule**: `deltaTime` must be clamped (e.g., 0.25s max) on pause/alt-tab to avoid physics explosion.
- **Rule**: Provide headless/server mode that runs simulation ticks without rendering, with identical determinism to client sim.

## 5. Rendering

- **Rule**: Use a frame graph or explicit pass dependency list; every resource transition/layout change is declared, never hidden.
- **Rule**: All shaders ship with a cook/compile step (SPIR-V/HLSL) in the build; never compile shaders at runtime in shipping builds.
- **Rule**: Enable validation layers + GPU markers in dev; a validation error blocks the commit.
- **Rule**: Textures are compressed (ASTC/BC7) and mipmapped; never load raw PNG/BMP at runtime except for tooling.
- **Rule**: Swapchain recreation handles resize/minimize and `OUT_OF_DATE`; never let the frame loop crash on a resize event.
- **Rule**: Clear/DONT_CARE semantics are explicit per pass; transient attachments use transient layout.

## 6. Physics

- **Rule**: Use a fixed timestep for physics with a small acceleration (`substeps`) when needed for high-speed objects (tunneling).
- **Rule**: Broad-phase first (BVH/grid), narrow-phase second; never brute-force all pairs outside debug.
- **Rule**: Sleeping bodies are promoted/demoted deterministically in the same order.
- **Rule**: High-speed bullets use continuous collision detection against static geometry only; never CCD on everything.
- **Rule**: Kinematic bodies never push dynamic bodies with infinite impulses; clamp solver iterations (e.g., 4-10).

## 7. Netcode

- **Rule**: Logical connection on its own thread; input is sampled at a fixed rate and transmitted with sequence numbers.
- **Rule**: Prediction + reconciliation: client simulates locally, server-authoritative correction ≤ 100ms horizon, snapshot interpolation for rendering.
- **Rule**: All transmissions are delta-compressed against the last ack'd snapshot; never resend the full game state every packet.
- **Rule**: Replays are recorded from deterministic inputs (input stream), not screen captures.

## 8. Error Handling

- **Rule**: Fail fast with actionable messages: `LOG_ERROR("...; budget: " )`, asserts that include the offending state.
- **Rule**: Crash reporting captures GPU state, callstack, and a replay input stream when deterministic.
- **Rule**: Vendor/API calls (`vkCreate*`, `D3D12Create*`) must check results in debug and fail with context in release.

## 9. Content & Assets

- **Rule**: Assets are referenced by persistent ID/guid, never by absolute path; loading never depends on working directory.
- **Rule**: Binary assets are versioned and hash-checked; cook pipeline is scripted/CI-run, not manual.
- **Rule**: Textures/audio stream from disk; never hold the render thread hostage to a synchronous `LoadFromFile`.

## 10. Review Gate

- [ ] Frame budget rows estimated for every change.
- [ ] No allocations in hot loops (grep for `new`, `malloc`, `std::vector::resize` in per-frame code).
- [ ] Determinism preserved in the sim.
- [ ] Thread ownership documented; no unlocked cross-thread mutation.
- [ ] Rendering: all layout transitions declared; validation clean.
- [ ] Physics: fixed timestep respected.
- [ ] Builds clean under warnings-as-errors.

## Reference

- `skills/game/` tree: `game-engine/ecs-pattern`, `game-engine/patterns`, `game-development/*` for deep reference material.
- Persona `skills/personas/lead-tech-game-engine/SKILL.md` provides the engineering voice and mental model for these rules.