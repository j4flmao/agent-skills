# Game Engine Programmer

**Who this is for:** You build engine systems: rendering, memory, jobs, assets, platforms.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-sbom`](../../skills/security/sbom/SKILL.md) | `security/sbom` | Design an SBOM generation pipeline with format selection, vulnerability correlation, license compliance, and policy enforcement for software… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`memory-management`](../../skills/game/game-engine/memory-management/SKILL.md) | `game/game-engine/memory-management` | Memory is the #1 source of frame-time jank in shipped games. |
| [`job-system`](../../skills/game/game-engine/job-system/SKILL.md) | `game/game-engine/job-system` | Modern CPUs give you 8–32 cores; a single-threaded Update() leaves them idle. |
| [`math-foundation`](../../skills/game/game-engine/math-foundation/SKILL.md) | `game/game-engine/math-foundation` | Every frame pushes millions of floats through vectors, matrices, quaternions, and collision tests. |
| [`render-graph`](../../skills/game/game-engine/render-graph/SKILL.md) | `game/game-engine/render-graph` | A modern renderer records a graph of dependencies between passes each frame, allocates transient resources, orders passes topologically, and emits… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`vulkan`](../../skills/game/game-development/vulkan/SKILL.md) | `game/game-development/vulkan` | Vulkan is a low-overhead, explicit GPU API. |
| [`asset-pipeline`](../../skills/game/game-engine/asset-pipeline/SKILL.md) | `game/game-engine/asset-pipeline` | Assets are the foundation of every game: the pipeline takes 100k DCC source files and turns them into compressed, streamable, cache-friendly… |
| [`platform-abstraction`](../../skills/game/game-engine/platform-abstraction/SKILL.md) | `game/game-engine/platform-abstraction` | The PAL (Platform Abstraction Layer) is the layer that lets one engine codebase run on Windows, Linux, macOS, and every console generation. |
| [`ecs-pattern`](../../skills/game/game-engine/ecs-pattern/SKILL.md) | `game/game-engine/ecs-pattern` | ECS is the dominant data-oriented architecture for modern game engines (Unity Entities/DOTS, Bevy, Unreal Mass, Overwatch's engine, flecs, EnTT —… |
| [`cpu-architecture`](../../skills/low-level/cpu-architecture/SKILL.md) | `low-level/cpu-architecture` | Code that looks sequential runs on superscalar, out-of-order, speculative cores behind a deep cache hierarchy. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`raytracing-mathematics`](../../skills/niche/graphics-math/raytracing-mathematics/SKILL.md) | `niche/graphics-math/raytracing-mathematics` | Explain the core mathematics of ray tracing: parametric ray equations, ray-primitive intersection (sphere, triangle), and acceleration structures… |
| [`webgpu-compute-shaders`](../../skills/niche/graphics-math/webgpu-compute-shaders/SKILL.md) | `niche/graphics-math/webgpu-compute-shaders` | Explain general-purpose GPU compute in the browser via WebGPU: authoring WGSL compute shaders, dispatching workgroups, and using shared/workgroup… |
| [`webgpu-webgl-rendering`](../../skills/frontend/architecture/webgpu-webgl/SKILL.md) | `frontend/architecture/webgpu-webgl` | WebGPU is the modern browser GPU API (modelled on Vulkan/Metal/D3D12) with explicit pipelines, bind groups, command encoders and compute shaders… |
| [`lead-tech-game-engine`](../../skills/personas/lead-tech-game-engine/SKILL.md) | `personas/lead-tech-game-engine` | Adopt the mindset of a Lead Technical Engine Architect: budget every system in ms and MB, data-oriented design over OOP, explicit… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill memory-management --skill job-system --skill math-foundation --skill render-graph --skill security-sbom
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill memory-management --skill job-system --skill math-foundation --skill render-graph --skill vulkan --skill asset-pipeline --skill platform-abstraction --skill ecs-pattern --skill cpu-architecture --skill security-sbom
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`game-development`](../bundles.md#game-development) | 32 | Game development: engines, ECS, rendering, physics, animation, audio, input, streaming, netcode, game servers |
| [`systems-programming`](../bundles.md#systems-programming) | 17 | Systems programming: C/C++/Rust/assembly, compilers, kernels, eBPF, networking, lock-free and kernel-bypass |

## Combine with

- [Game Developer](game.md)
- [Systems & Embedded Engineer](systems.md)
- [GPU Kernel & Inference Engineer](gpu-kernels.md)

## Watch out

Engine skills assume C++ and data-oriented design; pair with `languages/cpp` if it is not installed yet.
