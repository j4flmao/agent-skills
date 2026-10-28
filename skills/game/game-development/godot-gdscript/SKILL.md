---
name: godot-gdscript
description: >
  Use this skill when the user says 'gdscript', 'godot servers', 'RenderingServer', 'PhysicsServer', 'godot signals', 'godot threading', 'godot performance'. Covers Godot 4 internals and advanced GDScript: servers vs SceneTree, signals, threading, resources and performance techniques. Do NOT use for: general Godot project setup (use godot), Unity or Unreal.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, godot, gdscript, performance]
---

# Godot Engine Internal Architecture & GDScript Deep Patterns

## Purpose
Godot's performance and architecture come from its split between a high-level SceneTree (Nodes) and low-level Server singletons (RenderingServer, PhysicsServer3D, AudioServer). GDScript rides on top of a core that is C++-driven, with a message-passing signal system.

## Agent Protocol

### Trigger
"gdscript", "godot servers", "RenderingServer", "PhysicsServer", "godot signals", "godot threading", "godot performance".

### Input Context
- Godot 4.x minor version
- GDScript, C# or GDExtension
- Performance symptom or architecture question

### Output Artifact
GDScript code and architecture guidance. No file unless requested.

### Response Format
```
Godot: {4.x}
Layer: {SceneTree | Server}
Code: {snippet}
Verify: {profiler / monitor numbers}
```

## 1. Server Architecture (The Core Split)

```
SceneTree (high-level)
  Node2D/Node3D/Control...  -> translate gameplay to server commands
      |  node.add_child(),  set_transform(),  play()
      v
Servers (C++ singletons; most calls are safe from worker threads — see the "Thread-safe APIs" doc page)
  RenderingServer  -> BVH culling, batching, Vulkan/OpenGL backend
  PhysicsServer3D  -> solver, step
  AudioServer      -> mixer, spatialization
  NavigationServer3D
```

Nodes do NOT render. A `MeshInstance3D` only holds an RID (resource ID) pointing into the server's storage; rendering calls become server commands queued and flushed in a controlled order. Decoupling keeps gameplay threads isolated from GPU work.

### 1.1 RIDs (Resource IDs)

Every server object is referenced by an opaque `RID`:

```gdscript
var rdr = RenderingServer
var mesh_id = rdr.mesh_create()
# rdr.camera_create(), rdr.instance_create()
```

Advanced systems bypass the Node layer by talking directly to servers — essential for massive 2D particles, custom culling, or pre-render batching.

### 1.2 Multi-Viewport & Rendering Priority

- Multiple viewports: main `root` + sub-viewport + RemoteTexture.
- `RenderingServer` owns a broad "scene partition" (BVH) for culling; nodes register/unregister into it.

## 2. The Signal / MessageQueue System

Signals implement the Observer pattern at the engine core.

```gdscript
# emit
node.emit_signal("damage_taken", amount)
# connect
node.damage_taken.connect(func(dmg): _hp -= dmg)
```

### 2.1 Deferred (Queued) Signals — Safety

When two frames' iteration can't be interleaved (physics callbacks modifying the tree), `CONNECT_DEFERRED` pushes the payload into a `MessageQueue`:

```gdscript
body_entered.connect(_on_entered, CONNECT_DEFERRED)
```

The queue flushes at the end of the frame in `SceneTree::process`, so the modification happens AFTER iteration completes — preventing mid-iteration tree corruption. Use deferred for: freeing nodes during signal callbacks, structural changes inside physics step.

### 2.2 Signal vs Poll

- Signal: zero-cost when nothing listens; good for infrequent events (collisions, buttons).
- Poll: `_process` checking a flag on 60 nodes is cheap; re-designing everything to signals can add complexity. Balance: for high-frequency (per-frame movement) prefer polling local state; for rare cross-module changes use signals.

## 3. SceneTree Lifecycle & Queries

- `_ready()`, `_enter_tree`, `_exit_tree`, `_process(delta)`, `_physics_process(delta)`, `_input`.
- `get_tree().get_root()`, `get_tree().change_scene_to_file()`.
- Node queries: `get_node(path)`, `get_nodes_in_group()`, `get_children()`.
- Rule: `_process` is called on every active node every frame — disable with `set_process(false)` for static branches.

## 4. GDScript Language Deep Dive

### 4.1 Typing & Performance

GDScript is dynamically typed but performance-sensitive:

```gdscript
@export var speed: float = 10.0        # typed
var dict := {"a": 1}                    # inferred
func move(dir: Vector2, dt: float) -> void: ...
```

- Typed locals are much faster than untyped.
- Hot loops: prefer typed loops, avoid dynamic `Dictionary` lookups repeatedly.
- `const` when a value never changes.
- Detection: the editor reports "untyped global" warnings; fix them.

### 4.2 Built-in Data Types

| type | use | notes |
|------|-----|-------|
| `Array` | dynamic list | `resize()`, typed variants via `Array[int]` |
| `PackedStringArray` etc. | contiguous, fast | for hot data prefer these |
| `Dictionary` | keyed | avoid per-frame churn |
| `Vector2/3`, `Transform2D/3D`, `Quaternion` | math | built-in, fast |

### 4.3 Memory & Pooling

- GDScript has no tracing GC. `RefCounted` objects (incl. `Resource`) are freed when the last reference drops — reference cycles leak (break them or use `WeakRef`). Plain `Object`/`Node` instances must be freed explicitly (`queue_free()` / `free()`).
- For 100s-1000s of short-lived entities write a small pool (an `Array[Node]` of pre-instantiated, hidden nodes) and recycle instead of instantiate/free.
- Prefer `preload("res://...")` (compile-time) over `load()` per-frame.

### 4.4 `await` & Coroutines

```gdscript
await get_tree().create_timer(1.0).timeout   # wait
await tween.finished
await http.request_completed
```

Rules: an `await` inside `_process`/`_physics_process` turns that callback into a coroutine, so the next frame starts a second overlapping run — keep awaits in event handlers or dedicated async functions.

## 5. Threads in Godot

- `Thread` class for manual threads; must marshal back to main for `SceneTree` calls.
- `Callable.call_deferred` to schedule on main thread.
- Servers are thread-safe; safe particle/audio updates can go direct-to-server.
- Avoid calling `queue_free` from non-main threads.

### 5.1 WorkerThreadPool (4.x)

```gdscript
func _update_chunk(i: int) -> void:
    _results[i] = _compute(i)          # no SceneTree access here

func run_batch(n: int) -> void:
    var gid := WorkerThreadPool.add_group_task(_update_chunk, n)
    WorkerThreadPool.wait_for_group_task_completion(gid)
```
Use `add_task()` / `wait_for_task_completion()` for single jobs. Always wait on every task you add.

## 6. RenderingServer Custom Draw (Pseudowindow)

```gdscript
# draw a thousand quads without nodes
# inside a Node2D: attach a raw canvas item under this node's canvas item
var item := RenderingServer.canvas_item_create()
RenderingServer.canvas_item_set_parent(item, get_canvas_item())
for r in rects:
    RenderingServer.canvas_item_add_rect(item, r, Color.WHITE)
# free with RenderingServer.free_rid(item) in _exit_tree()
```

This bypasses hundreds of nodes → huge win for HUD overlays or particles.

## 7. PhysicsServer3D Direct Call

Create bodies/areas via RID, control stepping, add shapes — full control without Nodes:

```gdscript
var shape := PhysicsServer3D.box_shape_create()
PhysicsServer3D.shape_set_data(shape, Vector3(0.5, 0.5, 0.5))   # half extents
var body := PhysicsServer3D.body_create()
PhysicsServer3D.body_set_mode(body, PhysicsServer3D.BODY_MODE_RIGID)
PhysicsServer3D.body_add_shape(body, shape, Transform3D())
PhysicsServer3D.body_set_space(body, get_world_3d().space)
# free both RIDs with PhysicsServer3D.free_rid() when done
```

Use when you need many bodies with low overhead (spatial hash of collision-heavy areas).

## 8. Common Performance Traps & Fixes (GDScript)

| Trap | Fix |
|------|-----|
| Untyped loop over big Array | typed `Array[T]` or `Packed*Array` |
| `get_node()` per frame | `@onready var x = $path` |
| instantiate/free per frame | recycle from a pool |
| signals for per-frame changes | poll local state |
| `load()` in a loop | preload/cache |
| heavy `.grep()` style regex in `_process` | move to events |
| many CanvasItems redraw | call `queue_redraw()` only on change |
| shader uniforms per frame | `Material.set_shader_parameter` sparingly |

## 9. GDScript Style Conventions

- snake_case functions/vars; PascalCase classes; `#` comments.
- `@export` for inspectable; group with `@export_group`.
- 4-space indent; `func _ready():` no params.
- Avoid metaclasses; keep it readable.

## 10. Decision: GDScript vs C# vs GDExtension

| | GDScript | C# | GDExtension |
|--|----------|-----|-------------|
| Iteration speed | fast to write | fast, IDE=VS/Rider | native C++ fast |
| Engine API | full | full (via .NET) | all + internals |
| Performance | good-ish | good | best |
| Use | gameplay logic | tools, teams with C# | engine features |

Rule: default GDScript; C# for heavy tooling/editor plugins; GDExtension only when profiling proves C++ needed.

## 11. References

- `skills/game/godot/SKILL.md` — full Godot guide (nodes, scenes, physics, multiplayer)
- `skills/game/game-engine/patterns/SKILL.md` — engine design patterns
- `skills/game/game-development/vulkan/SKILL.md` — RenderingServer's Vulkan backend
- Official: "Server" class docs, GDScript reference