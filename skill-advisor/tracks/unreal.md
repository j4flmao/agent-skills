# Unreal Engine Developer

**Who this is for:** You build games or real-time 3D in Unreal Engine with C++.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`anti-cheat-server`](../../skills/game/game-server/anti-cheat-server/SKILL.md) | `game/game-server/anti-cheat-server` | The server is the only place that can prove cheating. |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`unreal`](../../skills/game/unreal/SKILL.md) | `game/unreal` | Unreal Engine is a C++ game engine with a powerful actor-component framework (UObject/AActor), Blueprint visual scripting, the Chaos physics… |
| [`lang-cpp`](../../skills/languages/cpp/SKILL.md) | `languages/cpp` | C++ offers zero-overhead abstractions and full control, at the price of undefined behaviour and lifetime bugs when used carelessly. |
| [`game-engine-patterns`](../../skills/game/game-engine/patterns/SKILL.md) | `game/game-engine/patterns` | Game engines are the most demanding real-time software systems in common use. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`render-graph`](../../skills/game/game-engine/render-graph/SKILL.md) | `game/game-engine/render-graph` | A modern renderer records a graph of dependencies between passes each frame, allocates transient resources, orders passes topologically, and emits… |
| [`physics-engine`](../../skills/game/game-development/physics-engine/SKILL.md) | `game/game-development/physics-engine` | A physics engine simulates rigid bodies through three pipelines every tick: collision detection (find contacts), collision resolution (apply… |
| [`animation-systems`](../../skills/game/client-engine/animation-systems/SKILL.md) | `game/client-engine/animation-systems` | Animation makes characters feel alive. |
| [`level-streaming`](../../skills/game/client-engine/level-streaming/SKILL.md) | `game/client-engine/level-streaming` | Open worlds don't fit in RAM or load in one frame. |
| [`memory-management`](../../skills/game/game-engine/memory-management/SKILL.md) | `game/game-engine/memory-management` | Memory is the #1 source of frame-time jank in shipped games. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`multiplayer-netcode`](../../skills/game/multiplayer-netcode/SKILL.md) | `game/multiplayer-netcode` | Building robust multiplayer requires understanding latency, jitter, bandwidth, and how to hide them. |
| [`asset-pipeline`](../../skills/game/game-engine/asset-pipeline/SKILL.md) | `game/game-engine/asset-pipeline` | Assets are the foundation of every game: the pipeline takes 100k DCC source files and turns them into compressed, streamable, cache-friendly… |
| [`job-system`](../../skills/game/game-engine/job-system/SKILL.md) | `game/game-engine/job-system` | Modern CPUs give you 8–32 cores; a single-threaded Update() leaves them idle. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill unreal --skill lang-cpp --skill game-engine-patterns --skill anti-cheat-server
```

**Level 1 + 2 + security baseline (9 skills):**

```bash
npx skills add j4flmao/agent-skills --skill unreal --skill lang-cpp --skill game-engine-patterns --skill render-graph --skill physics-engine --skill animation-systems --skill level-streaming --skill memory-management --skill anti-cheat-server
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`game-development`](../bundles.md#game-development) | 32 | Game development: engines, ECS, rendering, physics, animation, audio, input, streaming, netcode, game servers |

## Combine with

- [Game Developer](game.md)
- [Online Game Backend Engineer](game-backend.md)

## Watch out

Read `.claude/rules/game-engine-guidelines.md`; its allocation and determinism rules apply to Unreal C++ too.
