---
name: godot
description: Expert game development with Godot Engine - nodes and scenes, GDScript/C#/GDExtension, the renderer (Forward+/Mobile/Compatibility), physics (GodotPhysics/Jolt), animation, UI (Control), and performance.
---

# Godot Deep Engineering Guide

Godot is a free, open-source game engine built around a scene-tree of Nodes, a first-class editor, and a friendly scripting language (GDScript) plus optional C#, C++, and Rust via GDExtension. Its modular renderer supports Forward+, Mobile, and Compatibility backends.

## 1. Engine Architecture

```
Godot SceneTree
  Scene (Node tree)
    Node (base: name, owner, groups, tree refs)
      Control    -> UI (UI Toolkit equivalent)
      Node2D     -> 2D gameplay
      Node3D     -> 3D gameplay
      ... custom scripts attach via GDScript/C#/GDExtension
  MainLoop -> SceneTree tick: process(delta) -> physics_process(delta)
```

### 1.1 Nodes vs `_process`

```gdscript
extends Node

func _ready(): pass            # once when entering tree
func _process(delta): pass     # every rendered frame
func _physics_process(delta): pass  # fixed 60Hz by default
func _input(event): pass       # input events BEFORE process
func _unhandled_input(event): pass # input not consumed by UI
```

Rules:
- Node movement in `_physics_process` if using physics bodies; interpolate the visual `Spatial`/`Node2D` in `_process`.
- Set `process_mode = PROCESS_MODE_DISABLED` for nodes that don't act per-frame.

### 1.2 Autoload (Singletons)

`Project Settings -> Autoload`: one scene/script loaded globally. Use `autoload` game manager, audio bus, settings. Alternative to `Object.get_node('/root/GameManager')`.

## 2. The Scene System

- A **scene** is a reusable node subtree, instantiated via `preload`/`load`/`instance()`.
- Composition over inheritance: parent/child node relationships + exported signals.
- `@export var speed: float = 10.0` exposes editable properties to the inspector.

### 2.1 Pattern: Factories via PackedScene

```gdscript
const Bullet = preload("res://scenes/bullet.tscn")
func fire():
    var b = Bullet.instantiate()
    b.position = muzzle.global_position
    get_tree().get_root().add_child(b)
    b.velocity = Vector2(speed, 0)
```

### 2.2 Scene Organization

- Splitting UI, gameplay, HUD in separate scenes.
- `get_node`/`$` access lazily; prefer `@onready` var to cache paths.
- Grouping: `add_to_group("enemies")`, iterate with `get_tree().get_nodes_in_group("enemies")`.

## 3. Scripting: GDScript vs C# vs GDExtension

| Option | Use case |
|--------|----------|
| GDScript | Default: rapid iteration, tight editor integration, Python-like |
| C# | Teams familiar with .NET; heavier runtime; good for tool-heavy projects |
| GDExtension (C++/Rust) | Engine-critical hot loops; custom servers; portability |

### 3.1 GDScript Rules

- Typed where possible: `@export var speed: float`. Untyped variables run slower.
- Hot loops: avoid string parsing, dynamic typing; use `const`.
- `for i in count`: prefer typed loop counters.
- Signal-based communication instead of polling.
- `await` for async (timers, HTTP, animations).

## 4. Rendering

### 4.1 Backends

| Backend | Use |
|---------|-----|
| **Forward+** | Desktop/console default; clustered lights, SSAO, SSR, volumetrics only in 4.3+ |
| **Mobile** | Mobile; limited lights/volumetrics |
| **Compatibility** | OpenGL 3.3; broadest device support (web, old hardware) |

### 4.2 2D Rendering

- CanvasItems with textures; use `Texture2D`, `AtlasTexture`, `AnimatedSprite2D`.
- `y_sorted = true` for top-down sorting.
- Use `Parallax2D` and `TileMapLayer` for levels.
- 2D lights are optional per-renderer; provable cheap with `unshaded` materials.

### 4.3 3D Rendering

- Nodes: `MeshInstance3D`, `Camera3D`, `DirectionalLight3D`.
- Standard materials: `StandardMaterial3D`, or `ShaderMaterial` with `gdshader`.
- GPU particles via `GPUParticles3D` / 2D.
- Use LightmapGI for static GI; keep dynamic lights under a handful on mobile.

### 4.4 Shaders (Godot Shader Language)

```glsl
shader_type spatial;
uniform vec4 tint : source_color = vec4(1.0);
void fragment() {
    ALBEDO = texture(SCREEN_TEXTURE, SCREEN_UV).rgb * tint.rgb;
}
```

- Run on GPU; for per-object control use uniforms + `MaterialOverride`.
- Keep fragment cost low; use `hint_range` uniforms to let artists clamp.
- `shader_type canvas_item` for 2D.

## 5. Physics

- **GodotPhysics3D/2D**: built-in, stable default.
- **Jolt Physics** (Godot 4.4+): optional external, more realistic + fast.
- Nodes: `CharacterBody3D`, `RigidBody3D`, `StaticBody3D`, `Area3D`, plus sensors.
- Character movement via `move_and_slide()` / `move_and_collide()`.
- Area3D triggers: `body_entered`/`body_exited` for pickup/trigger zones.
- Layers & masks (`collision_layer`/`collision_mask`) control which bodies collide with what.

### 5.1 Fixed Timestep

`Engine.physics_ticks_per_second` default 60. Determinism: avoid unordered maps in physics callbacks; deterministic float ops across platforms require careful design (Jolt note).

## 6. Animation

- `AnimationPlayer` + `Animation` resources: animate any `Property` (position, color, shader).
- `AnimationTree`: blend trees, state machines.
- Tween API for simple tweens: `tween_property(node, "position", Vector2(...), 0.5)`.
- Match with `create_tween().tween_interval(duration)`.

## 7. UI (Control Nodes)

- `Control` nodes form anchored layout; `MarginContainer`, `VBoxContainer`, `GridContainer`.
- Build UI in editor or code: `preload("res://ui/hud.tscn").instantiate()`.
- Signals: `button.pressed.connect(_on_pressed)`.
- Use `CanvasLayer` for screen-space (HUD) that ignores camera.

## 8. Multiplayer

- High-level API (`SceneMultiplayer`) with `spawn(_path)` and `rpc()` calls for data sync.
- `MultiplayerSynchronizer` / `MultiplayerSpawner` to sync properties per peer.
- `Server` authoritative pattern; `Authority` via `set_multiplayer_authority`.
- `rpc_id(id, "func", args)` for targeted messages; `rpc` broadcasts.

### 8.1 Prediction/Reconciliation

Godot high-level API is simple but not prediction-ready; implement manual `RigidBody3D` + `MultiplayerSynchronizer` interpolation on clients for smooth netcode.

## 9. Asset Pipeline & Tooling

- `.tscn` text scenes (versionable), `.tres` resources.
- Import pipeline at `res://` (Godot imports on editor build).
- `ResourceLoader` / `preload` (compile-time) vs `load` (async `ResourceLoader.load_threaded_request`).
- Remote debugger, GDScript debugger, Visual Profiler, Frame Profiler baked into editor.

## 10. Performance Rules

- Profile with built-in profiler + `Engine.get_frames_per_second()`.
- Avoid `_process` for nodes that don't change.
- Pool bullets/enemies (no instantiate/free per shot).
- Pre-load large scenes once; `duplicate()` cached resources.
- Trap: `get_node("./long/path")` every frame → cache in `@onready`.
- Light count: keep 3D dynamic lights < 8 (mobile) / < 32 (desktop).
- Use `limiting draw` culling: `camera cull_mask`, `visibility_notifier` (VisibilityNotifier3D).

### 10.1 Node Count Toggle

For thousands of simple nodes prefer a single `_draw()`-heavy `Control`/`CanvasItem` drawing primitives, or render via `MeshInstance3D` instancing (`MultiMesh`).

## 11. Anti-Patterns

| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| GetNode per frame | String path lookups | @onready cache |
| Untyped variables in loops | Slow | typed loops |
| Instantiate/free each shot | GC/alloc spikes | object pool |
| All nodes `_process` ticking | CPU | disable unused |
| Many dynamic lights | mobile GPU melt | baked lightmap + clip |
| Async without `await` | deadlock/race | `await` signal |

## 12. When to NOT Use Godot

- Extremely large open worlds with heavy asset streaming → Unreal/Unity.
- Console-specific (Xbox-only) native integrations → engine with first-class console SDK support (Unreal/Unity).
- Browser tiny canvas games → Phaser / vanilla canvas (lighter).
- Deep custom rendering/engine platform → Vulkan/custom.

## 13. References

- `skills/game/game-development/godot-gdscript/SKILL.md` — Godot server architecture + GDScript deep dive
- `skills/game/game-engine/ecs-pattern/SKILL.md` — ECS patterns for scale
- `skills/game/game-engine/patterns/SKILL.md` — engine design patterns
- `skills/game/multiplayer-netcode/SKILL.md` — netcode for the high-level API
- `skills/game/game-development/physics-engine/SKILL.md` — physics internals (Jolt/GodotPhysics)