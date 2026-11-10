# Godot Developer

**Who this is for:** You build games in Godot 4 with GDScript or C#.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`godot`](../../skills/game/godot/SKILL.md) | `game/godot` | Godot is a free, open-source game engine built around a scene-tree of Nodes, a first-class editor, and a friendly scripting language (GDScript)… |
| [`godot-gdscript`](../../skills/game/game-development/godot-gdscript/SKILL.md) | `game/game-development/godot-gdscript` | Godot's performance and architecture come from its split between a high-level SceneTree (Nodes) and low-level Server singletons (RenderingServer,… |
| [`game-engine-patterns`](../../skills/game/game-engine/patterns/SKILL.md) | `game/game-engine/patterns` | Game engines are the most demanding real-time software systems in common use. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`physics-engine`](../../skills/game/game-development/physics-engine/SKILL.md) | `game/game-development/physics-engine` | A physics engine simulates rigid bodies through three pipelines every tick: collision detection (find contacts), collision resolution (apply… |
| [`input-systems`](../../skills/game/client-engine/input-systems/SKILL.md) | `game/client-engine/input-systems` | Input is the player's handshake: it must be lag-free, remappable, device-agnostic and deterministic. |
| [`animation-systems`](../../skills/game/client-engine/animation-systems/SKILL.md) | `game/client-engine/animation-systems` | Animation makes characters feel alive. |
| [`audio-engine`](../../skills/game/client-engine/audio-engine/SKILL.md) | `game/client-engine/audio-engine` | Audio is half the game feel and a third the frame budget people forget. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`multiplayer-netcode`](../../skills/game/multiplayer-netcode/SKILL.md) | `game/multiplayer-netcode` | Building robust multiplayer requires understanding latency, jitter, bandwidth, and how to hide them. |
| [`cocos2d`](../../skills/game/cocos2d/SKILL.md) | `game/cocos2d` | Cocos2d is a family of open-source game frameworks for 2D (and now 3D in Creator) with strong mobile focus. |
| [`cocos2d-patterns`](../../skills/game/game-development/cocos2d-patterns/SKILL.md) | `game/game-development/cocos2d-patterns` | Cocos2d-x has a mature scene-graph architecture centered on the Director and Node tree. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill godot --skill godot-gdscript --skill game-engine-patterns
```

**Level 1 + 2 (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill godot --skill godot-gdscript --skill game-engine-patterns --skill physics-engine --skill input-systems --skill animation-systems --skill audio-engine
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`game-development`](../bundles.md#game-development) | 32 | Game development: engines, ECS, rendering, physics, animation, audio, input, streaming, netcode, game servers |

## Combine with

- [Game Developer](game.md)

## Watch out

Godot 4 removed several Godot 3 APIs; the Godot skills flag the renamed ones (for example `SCREEN_TEXTURE`).
