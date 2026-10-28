---
name: godot
description: >
  Use this skill when the user says 'godot', 'godot 4', 'gdscript project', 'godot scenes', 'godot export', 'godot c#', 'gdextension'. Guides Godot 4 projects: scenes and nodes, GDScript/C#/GDExtension, renderers, physics (GodotPhysics/Jolt), animation, UI, exports and performance. Do NOT use for: deep server-level GDScript optimisation (use godot-gdscript), Unity/Unreal.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, godot, gdscript, engine]
---

# Godot Deep Engineering Guide

## Purpose
Godot is a free, open-source game engine built around a scene-tree of Nodes, a first-class editor, and a friendly scripting language (GDScript) plus optional C#, C++, and Rust via GDExtension. Its modular renderer supports Forward+, Mobile, and Compatibility backends.

## Agent Protocol

### Trigger
"godot", "godot 4", "gdscript project", "godot scenes", "godot export", "godot c#", "gdextension".

### Input Context
- Godot version (4.x minor)
- Language (GDScript, C#, GDExtension)
- Target platforms and renderer

### Output Artifact
GDScript/C# code, scene structure or project settings. No file unless requested.

### Response Format
```
Godot: {4.x}  Renderer: {Forward+ | Mobile | Compatibility}
Change: {what and why}
Code: {snippet}
Verify: {profiler / monitors}
```

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
- Move physics bodies in `_physics_process`. For smooth visuals at high refresh rates enable physics interpolation (`physics/common/physics_interpolation`, 2D since 4.3, 3D since 4.4) instead of hand-interpolating in `_process`.
- Set `process_mode = PROCESS_MODE_DISABLED` for nodes that don't act per-frame.

### 1.2 Autoload (Singletons)

`Project Settings -> Autoload`: one scene/script loaded globally. Use `autoload` game manager, audio bus, settings. Alternative to `Object.get_node('/root/GameManager')`.

## 2. The Scene System

- A **scene** is a reusable node subtree, loaded with `preload`/`load` as a `PackedScene` and created with `instantiate()` (Godot 3's `instance()` no longer exists).
- Composition over inheritance: parent/child node relationships + exported signals.
- `@export var speed: float = 10.0` exposes editable properties to the inspector.

### 2.1 Pattern: Factories via PackedScene

```gdscript
const Bullet = preload("res://scenes/bullet.tscn")
func fire():
    var b = Bullet.instantiate()
    b.position = muzzle.global_position
    b.velocity = Vector2(speed, 0)  # bullet.gd declares `var velocity: Vector2`
    get_tree().current_scene.add_child(b)
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
| **Forward+** | Desktop default (Vulkan, D3D12 on Windows, Metal on Apple); clustered lighting, SSAO, SSR, SDFGI, volumetric fog |
| **Mobile** | Mobile and low-end desktop (Vulkan/Metal/D3D12); per-mesh light limits, no SDFGI/volumetric fog |
| **Compatibility** | OpenGL 3.3 / OpenGL ES 3.0 / WebGL 2; required for web exports and old hardware |

### 4.2 2D Rendering

- CanvasItems with textures; use `Texture2D`, `AtlasTexture`, `AnimatedSprite2D`.
- `y_sort_enabled = true` (CanvasItem) for top-down sorting.
- Use `Parallax2D` and `TileMapLayer` for levels.
- 2D lights cost per lit item; use `CanvasItemMaterial` with `light_mode = LIGHT_MODE_UNSHADED` on items that should ignore them.

### 4.3 3D Rendering

- Nodes: `MeshInstance3D`, `Camera3D`, `DirectionalLight3D`.
- Standard materials: `StandardMaterial3D`, or `ShaderMaterial` with `gdshader`.
- GPU particles via `GPUParticles3D` / 2D.
- Use LightmapGI for static GI; keep dynamic lights under a handful on mobile.

### 4.4 Shaders (Godot Shader Language)

```glsl
shader_type spatial;
uniform vec4 tint : source_color = vec4(1.0);
// Godot 4: SCREEN_TEXTURE was removed; declare a sampler with a hint instead.
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
void fragment() {
    ALBEDO = texture(screen_tex, SCREEN_UV).rgb * tint.rgb;
}
```

- Per-object variation without new materials: `instance uniform` + `GeometryInstance3D.set_instance_shader_parameter()`; otherwise `material_override`.
- Keep fragment cost low; use `hint_range` uniforms to let artists clamp.
- `shader_type canvas_item` for 2D.

## 5. Physics

- **GodotPhysics2D**: the 2D engine.
- **Jolt Physics (3D)**: built into the engine since 4.4 (experimental there); the default 3D engine for new projects since 4.6. Existing projects keep their setting (`physics/3d/physics_engine`); behaviour differs slightly from GodotPhysics3D, so retest when switching.
- Nodes: `CharacterBody3D`, `RigidBody3D`, `StaticBody3D`, `Area3D`, plus sensors.
- Character movement via `move_and_slide()` / `move_and_collide()`.
- Area3D triggers: `body_entered`/`body_exited` for pickup/trigger zones.
- Layers & masks (`collision_layer`/`collision_mask`) control which bodies collide with what.

### 5.1 Fixed Timestep

`Engine.physics_ticks_per_second` default 60. Determinism: avoid unordered maps in physics callbacks; deterministic float ops across platforms require careful design (Jolt note).

## 6. Animation

- `AnimationPlayer` + `Animation` resources: animate any `Property` (position, color, shader).
- `AnimationTree`: blend trees, state machines.
- Tweens for simple one-shot motion: `create_tween().tween_property(node, "position", Vector2(100, 0), 0.5)`; chain `.tween_interval(t)` / `.tween_callback(f)` for sequences.

## 7. UI (Control Nodes)

- `Control` nodes form anchored layout; `MarginContainer`, `VBoxContainer`, `GridContainer`.
- Build UI in editor or code: `preload("res://ui/hud.tscn").instantiate()`.
- Signals: `button.pressed.connect(_on_pressed)`.
- Use `CanvasLayer` for screen-space (HUD) that ignores camera.

## 8. Multiplayer

- High-level API (`SceneMultiplayer` over `ENetMultiplayerPeer` / `WebSocketMultiplayerPeer` / `WebRTCMultiplayerPeer`).
- `MultiplayerSpawner` replicates node creation; `MultiplayerSynchronizer` replicates properties.
- Server-authoritative by default (peer 1); hand ownership to a client with `set_multiplayer_authority(peer_id)`.
- RPCs: annotate `@rpc("any_peer", "call_local", "reliable")`, call `my_func.rpc(args)` (broadcast) or `my_func.rpc_id(peer_id, args)`; validate `multiplayer.get_remote_sender_id()` on the server.

### 8.1 Prediction/Reconciliation

The high-level API has no built-in client prediction or lag compensation. For action games implement input buffering + prediction/reconciliation yourself (usually on `CharacterBody3D`, not `RigidBody3D`) or use a community addon such as netfox.

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
- Lights: the Mobile renderer shades at most 8 OmniLight3D + 8 SpotLight3D per mesh; bake static lights (LightmapGI) and keep dynamic shadows few.
- Culling: `Camera3D.cull_mask`, visibility ranges (HLOD) on `GeometryInstance3D`, `VisibleOnScreenEnabler3D/2D` to pause off-screen nodes, occlusion culling (`OccluderInstance3D`).

### 10.1 Node Count Toggle

For thousands of simple nodes prefer a single `_draw()`-heavy `Control`/`CanvasItem` drawing primitives, or render via `MeshInstance3D` instancing (`MultiMesh`).

## 11. Anti-Patterns

| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| GetNode per frame | String path lookups | @onready cache |
| Untyped variables in loops | Slow | typed loops |
| Instantiate/free each shot | Scene-instancing and tree-insertion cost | object pool |
| All nodes `_process` ticking | CPU | disable unused |
| Many dynamic lights | mobile GPU melt | baked lightmap + clip |
| Coroutine fired without `await` | Caller continues before the work finishes | `await` the function or the signal |

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