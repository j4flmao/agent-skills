---
title: Game Loop & Timestep
description: The heart of every game engine — fixed/variable timesteps, the accumulator pattern, interpolation, frame pacing, and the spiral of death.
---

# Game Loop & Timestep — Deep Reference

## 1. The Essential Loop

Every game engine centers on a loop that processes input, updates simulation, and renders:

```cpp
while (!quit) {
    input();
    update();
    render();
}
```

The complexity lives in *what happens* between frames: how time is measured, how much simulation runs per frame, and how rendering stays smooth.

## 2. The Two Timestep Poles

### Variable Timestep

```cpp
float dt = frameTime();          // actual elapsed since last frame
update(dt);                      // physics & logic scale with dt
render();
```

- Simple; no interpolation needed.
- **Problem**: `update(dt)` with `dt` varying 8–16ms → physics unstable, network non-deterministic, replays break.

### Fixed Timestep

```cpp
const float fixedDt = 1.0f / 60.0f;
while (!quit) {
    update(fixedDt);             // always the same step
    render();
}
```

- Deterministic and stable.
- **Problem**: On a 144 Hz monitor the simulation only advances 60×/sec → visible stutter unless interpolated.

### Hybrid (Accumulator)

```cpp
float accumulator = 0.f;
const float fixedDt = 1.f / 60.f;
float last = clock();

while (!quit) {
    float now = clock();
    float frame = now - last; last = now;
    frame = clamp(frame, 0.f, 0.25f);   // anti spiral-of-death

    accumulator += frame;
    while (accumulator >= fixedDt) {
        simulate(fixedDt);
        accumulator -= fixedDt;
    }
    float alpha = accumulator / fixedDt;
    render(alpha);                       // interpolate
}
```

- Simulation advances in fixed steps; renderer interpolates leftover alpha.
- **The standard of production engines** (Unity, Godot, Unreal Mass, many AAA).

## 3. Interpolation

### Why interpolate?

The fixed overlay runs at 60 Hz but the display runs at 144 Hz (or 60 Hz). The leftover `alpha` represents **how far between two sim states we are**. Interpolation blends render transform between previous and current sim state.

```cpp
struct SimState {
    Vec2 pos;
    SimState prev;      // previous step for interpolation
};

Vec2 renderPos(const SimState& s, float alpha) {
    return lerp(s.prev.pos, s.pos, alpha);
}
```

Store `prev` when a fixded step completes; render always reads `prev → current` lerp.

### Interpolation priority

1. **Position** — must be smooth or the player will see judder.
2. **Rotation** — use shortest arc slerp.
3. **Animation** — blend time-scaled animation clips.
4. **Health/ammo** — these don't need interpolation; hard snap acceptable.

## 4. The Spiral of Death

If `simulate()` + `render()` exceeds the frame time for several frames, the accumulator backlogs and the loop runs longer each iteration → slower → more backlog.

Mitigations:
- `frame = min(frame, 0.25f)` clamp (at most one fixed step per frame realistically).
- Cap fixed steps per frame (`int steps = 0; while (acc >= dt && steps++ < MAX_STEPS)`).
- Drop to "slow-motion" rendering while server catches up (netcode).

## 5. Frame Pacing & Rate Limiting

### Sleep vs Busy-Wait

```cpp
// Sleep to frame boundary to save power/heat on console
auto frameStart = clock();
updateAndRender();
auto elapsed = clock() - frameStart;
if (elapsed < frameBudget) sleepFor(frameBudget - elapsed);
```

Concern: `sleepFor` resolution (1–15 ms on Windows without timeBeginPeriod). Use `std::this_thread::sleep_for` + high-res timer for pacing, or use VSync + presentation intervals.

### Presentation Intervals (Vulkan/D3D)

- `vkQueuePresentKHR` with FIFO (vsync) — standard, syncs to refresh.
- `vkSwapchainCreateInfoKHR.minImageCount = 2 or 3` (double/triple buffering) reduces tearing and stutter.
- Triple buffering adds latency but smooths variable frame rate.

## 6. Fixed Update in Unity

Unity exposes both timesteps:

```csharp
void FixedUpdate() {
    // Runs every Fixed Timestep (default 0.02s = 50 Hz)
    // Deterministic; use for physics & movement that feeds physics
}

void Update() {
    // Runs every rendered frame
    // Use for UI, input, camera, non-physics logic
}
```

`Time.fixedDeltaTime` (project settings) controls the fixed step. Physics engine runs on fixed step; `Update` reading physics state should read the latest interpolated value.

## 7. Fixed Update in Godot

```gdscript
func _process(delta):
    pass  # every rendered frame

func _physics_process(delta):
    pass  # every physics tick (fixed 60Hz by default in Godot 4)
```

Godot 4 separates `_process` (render-synced) from `_physics_process` (fixed, physics engine). Same dual-timestep mental model.

## 8. Fixed Update in Unreal

UE uses FPS-capable timestep: `FApp::GetDeltaTime()`. Blueprint's `Event Tick` runs every frame; `Event Physics Step` (physical tick) runs per physics substep. For gameplay determinism, implement substeps yourself.

## 9. Determinism Checklist

- Same fixed dt on all replays/clients.
- Iteration order fixed (no unordered containers in simulation).
- Same float behavior (no FMA vs non-FMA asymmetries) — test SSE vs AVX.
- No wall-clock time in simulation code.
- Seeded RNG, consumed deterministically.
- No multi-thread non-determinism in determinism-critical systems.

## 10. Benchmark Numbers

| Class | Frame budget 60 FPS | Frame budget 30 FPS |
|-------|--------------------|--------------------|
| Simulation | 4 ms | 8 ms |
| Rendering | 8 ms | 15 ms |
| Headroom | 4 ms | 10 ms |

## 11. Common Mistakes

1. Using `Update()` for everything (physics drift).
2. Using `deltaTime` for fixed-step physics (accumulator errors).
3. No master clock; mixing system clocks.
4. Sleeping instead of fixed pacing on console.
5. Not storing `prev` state for render interpolation.