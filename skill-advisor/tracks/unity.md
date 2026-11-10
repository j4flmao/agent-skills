# Unity Developer

**Who this is for:** You build games in Unity with C#.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`anti-cheat-server`](../../skills/game/game-server/anti-cheat-server/SKILL.md) | `game/game-server/anti-cheat-server` | The server is the only place that can prove cheating. |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`unity`](../../skills/game/unity/SKILL.md) | `game/unity` | Unity is a component-based game engine built around GameObjects, MonoBehaviours, and a C# scripting layer. |
| [`unity-csharp`](../../skills/game/game-development/unity-csharp/SKILL.md) | `game/game-development/unity-csharp` | This skill covers Unity's data-oriented stack (ECS, Job System, Burst) and the C# practices that make Unity code fast and correct. |
| [`lang-csharp`](../../skills/languages/csharp/SKILL.md) | `languages/csharp` | C# combines a managed runtime with value types, spans and a mature async model. |
| [`game-engine-patterns`](../../skills/game/game-engine/patterns/SKILL.md) | `game/game-engine/patterns` | Game engines are the most demanding real-time software systems in common use. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ecs-architecture`](../../skills/game/ecs-architecture/SKILL.md) | `game/ecs-architecture` | ECS is a data-driven design pattern for game engines that separates entities (IDs), components (pure data), and systems (logic operating on… |
| [`ecs-pattern`](../../skills/game/game-engine/ecs-pattern/SKILL.md) | `game/game-engine/ecs-pattern` | ECS is the dominant data-oriented architecture for modern game engines (Unity Entities/DOTS, Bevy, Unreal Mass, Overwatch's engine, flecs, EnTT —… |
| [`physics-engine`](../../skills/game/game-development/physics-engine/SKILL.md) | `game/game-development/physics-engine` | A physics engine simulates rigid bodies through three pipelines every tick: collision detection (find contacts), collision resolution (apply… |
| [`input-systems`](../../skills/game/client-engine/input-systems/SKILL.md) | `game/client-engine/input-systems` | Input is the player's handshake: it must be lag-free, remappable, device-agnostic and deterministic. |
| [`animation-systems`](../../skills/game/client-engine/animation-systems/SKILL.md) | `game/client-engine/animation-systems` | Animation makes characters feel alive. |
| [`audio-engine`](../../skills/game/client-engine/audio-engine/SKILL.md) | `game/client-engine/audio-engine` | Audio is half the game feel and a third the frame budget people forget. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`multiplayer-netcode`](../../skills/game/multiplayer-netcode/SKILL.md) | `game/multiplayer-netcode` | Building robust multiplayer requires understanding latency, jitter, bandwidth, and how to hide them. |
| [`level-streaming`](../../skills/game/client-engine/level-streaming/SKILL.md) | `game/client-engine/level-streaming` | Open worlds don't fit in RAM or load in one frame. |
| [`asset-pipeline`](../../skills/game/game-engine/asset-pipeline/SKILL.md) | `game/game-engine/asset-pipeline` | Assets are the foundation of every game: the pipeline takes 100k DCC source files and turns them into compressed, streamable, cache-friendly… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill unity --skill unity-csharp --skill lang-csharp --skill game-engine-patterns --skill anti-cheat-server
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill unity --skill unity-csharp --skill lang-csharp --skill game-engine-patterns --skill ecs-architecture --skill ecs-pattern --skill physics-engine --skill input-systems --skill animation-systems --skill audio-engine --skill anti-cheat-server
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

Unity DOTS (Entities) is a separate programming model; use the ECS skills only if the project adopted it.
