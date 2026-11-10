# Game Developer

**Who this is for:** You build games, engines or game servers.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`anti-cheat-server`](../../skills/game/game-server/anti-cheat-server/SKILL.md) | `game/game-server/anti-cheat-server` | The server is the only place that can prove cheating. |
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`game-engine-patterns`](../../skills/game/game-engine/patterns/SKILL.md) | `game/game-engine/patterns` | Game engines are the most demanding real-time software systems in common use. |
| [`ecs-architecture`](../../skills/game/ecs-architecture/SKILL.md) | `game/ecs-architecture` | ECS is a data-driven design pattern for game engines that separates entities (IDs), components (pure data), and systems (logic operating on… |
| [`physics-engine`](../../skills/game/game-development/physics-engine/SKILL.md) | `game/game-development/physics-engine` | A physics engine simulates rigid bodies through three pipelines every tick: collision detection (find contacts), collision resolution (apply… |
| [`input-systems`](../../skills/game/client-engine/input-systems/SKILL.md) | `game/client-engine/input-systems` | Input is the player's handshake: it must be lag-free, remappable, device-agnostic and deterministic. |

## Level 2 — Professional (9 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`memory-management`](../../skills/game/game-engine/memory-management/SKILL.md) | `game/game-engine/memory-management` | Memory is the #1 source of frame-time jank in shipped games. |
| [`job-system`](../../skills/game/game-engine/job-system/SKILL.md) | `game/game-engine/job-system` | Modern CPUs give you 8–32 cores; a single-threaded Update() leaves them idle. |
| [`render-graph`](../../skills/game/game-engine/render-graph/SKILL.md) | `game/game-engine/render-graph` | A modern renderer records a graph of dependencies between passes each frame, allocates transient resources, orders passes topologically, and emits… |
| [`asset-pipeline`](../../skills/game/game-engine/asset-pipeline/SKILL.md) | `game/game-engine/asset-pipeline` | Assets are the foundation of every game: the pipeline takes 100k DCC source files and turns them into compressed, streamable, cache-friendly… |
| [`math-foundation`](../../skills/game/game-engine/math-foundation/SKILL.md) | `game/game-engine/math-foundation` | Every frame pushes millions of floats through vectors, matrices, quaternions, and collision tests. |
| [`animation-systems`](../../skills/game/client-engine/animation-systems/SKILL.md) | `game/client-engine/animation-systems` | Animation makes characters feel alive. |
| [`audio-engine`](../../skills/game/client-engine/audio-engine/SKILL.md) | `game/client-engine/audio-engine` | Audio is half the game feel and a third the frame budget people forget. |
| [`level-streaming`](../../skills/game/client-engine/level-streaming/SKILL.md) | `game/client-engine/level-streaming` | Open worlds don't fit in RAM or load in one frame. |
| [`multiplayer-netcode`](../../skills/game/multiplayer-netcode/SKILL.md) | `game/multiplayer-netcode` | Building robust multiplayer requires understanding latency, jitter, bandwidth, and how to hide them. |

## Level 3 — Specialist (9 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`authoritative-server`](../../skills/game/game-server/authoritative-server/SKILL.md) | `game/game-server/authoritative-server` | The server is the single source of truth. |
| [`interest-management`](../../skills/game/game-server/interest-management/SKILL.md) | `game/game-server/interest-management` | Nobody needs everything. |
| [`matchmaking-lobby`](../../skills/game/game-server/matchmaking-lobby/SKILL.md) | `game/game-server/matchmaking-lobby` | Matchmaking turns "players waiting" into "a fair game started fast." The lobby keeps a group of players synced until the match host is assigned. |
| [`scaling-architecture`](../../skills/game/game-server/scaling-architecture/SKILL.md) | `game/game-server/scaling-architecture` | From "hundreds playing" to "a million in a weekend": how the server fleet grows without breaking determinism, latency or cost. |
| [`vulkan`](../../skills/game/game-development/vulkan/SKILL.md) | `game/game-development/vulkan` | Vulkan is a low-overhead, explicit GPU API. |
| [`platform-abstraction`](../../skills/game/game-engine/platform-abstraction/SKILL.md) | `game/game-engine/platform-abstraction` | The PAL (Platform Abstraction Layer) is the layer that lets one engine codebase run on Windows, Linux, macOS, and every console generation. |
| [`raytracing-mathematics`](../../skills/niche/graphics-math/raytracing-mathematics/SKILL.md) | `niche/graphics-math/raytracing-mathematics` | Explain the core mathematics of ray tracing: parametric ray equations, ray-primitive intersection (sphere, triangle), and acceleration structures… |
| [`webgpu-compute-shaders`](../../skills/niche/graphics-math/webgpu-compute-shaders/SKILL.md) | `niche/graphics-math/webgpu-compute-shaders` | Explain general-purpose GPU compute in the browser via WebGPU: authoring WGSL compute shaders, dispatching workgroups, and using shared/workgroup… |
| [`lead-tech-game-engine`](../../skills/personas/lead-tech-game-engine/SKILL.md) | `personas/lead-tech-game-engine` | Adopt the mindset of a Lead Technical Engine Architect: budget every system in ms and MB, data-oriented design over OOP, explicit… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill game-engine-patterns --skill ecs-architecture --skill physics-engine --skill input-systems --skill anti-cheat-server --skill security-api-security
```

**Level 1 + 2 + security baseline (15 skills):**

```bash
npx skills add j4flmao/agent-skills --skill game-engine-patterns --skill ecs-architecture --skill physics-engine --skill input-systems --skill memory-management --skill job-system --skill render-graph --skill asset-pipeline --skill math-foundation --skill animation-systems --skill audio-engine --skill level-streaming --skill multiplayer-netcode --skill anti-cheat-server --skill security-api-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`game-development`](../bundles.md#game-development) | 32 | Game development: engines, ECS, rendering, physics, animation, audio, input, streaming, netcode, game servers |
| [`game-server`](../bundles.md#game-server) | 9 | Online game backends: authoritative servers, netcode, interest management, matchmaking, anti-cheat, scaling |

## Combine with

- [Systems & Embedded Engineer](systems.md)
- [Backend Engineer](backend.md)

## Watch out

Add one engine skill: `game/unity` (+ `game/game-development/unity-csharp`), `game/unreal`, `game/godot` (+ `godot-gdscript`) or `game/cocos2d`. Read `.claude/rules/game-engine-guidelines.md`.
