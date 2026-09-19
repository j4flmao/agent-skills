---
name: godot-gdscript
description: Godot Engine architecture and GDScript deep patterns - Servers, SceneTree, signals, threading, resource management, and performance in GDScript.
---

# Godot Engine Internal Architecture & GDScript Deep Patterns

Godot's performance and architecture come from its split between a high-level SceneTree (Nodes) and low-level Server singletons (RenderingServer, PhysicsServer3D, AudioServer). GDScript rides on top of a core that is C++-driven, with a message-passing signal system.

## 1. Server Architecture (The Core Split)

```
SceneTree (high-level)
  Node2D/Node3D/Control...  -> translate gameplay to server commands
      |  node.add_child(),  set_transform(),  play()
      v
Servers (singletons, thread-safe C++)
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

- GDScript GC is reference-counted; cycles leak until refcount.
- For 100s-1000s of entities in loops, use `NodePool`: pre-instantiate, recycle.
- Prefer `preload("res://...")` (compile-time) over `load()` per-frame.

### 4.4 `await` & Coroutines

```gdscript
await get_tree().create_timer(1.0).timeout   # wait
await tween.finished
await http.request_completed
```

Rules: `await` inside `_process` is illegal; keep awaits in handlers/utils.

## 5. Threads in Godot

- `Thread` class for manual threads; must marshal back to main for `SceneTree` calls.
- `Callable.call_deferred` to schedule on main thread.
- Servers are thread-safe; safe particle/audio updates can go direct-to-server.
- Avoid calling `queue_free` from non-main threads.

### 5.1 ThreadPool (4.x)

`ThreadPool` for batch jobs (AI field updates, batched path finding). Add work, `wait_for_completion`.

## 6. RenderingServer Custom Draw (Pseudowindow)

```gdscript
# draw a thousand quads without nodes
var canvas = RenderingServer.canvas_create()
var item = RenderingServer.canvas_item_create()
RenderingServer.canvas_item_add_rect(item, rect, color)
# set transform, draw, flush
```

This bypasses hundreds of nodes → huge win for HUD overlays or particles.

## 7. PhysicsServer3D Direct Call

Create bodies/areas via RID, control stepping, add shapes — full control without Nodes:

```gdscript
var body = PhysicsServer3D.body_create()
PhysicsServer3D.body_add_shape(body, PhysicsServer3D.shape_create(PhysicsServer3D.SHAPE_BOX), Transform3D())
```

Use when you need many bodies with low overhead (spatial hash of collision-heavy areas).

## 8. Common Performance Traps & Fixes (GDScript)

| Trap | Fix |
|------|-----|
| Untyped loop over big Array | typed `Pack` arrays |
| `get_node()` per frame | `@onready var x = $path` |
| instantiate/free per frame | NodePool recycle |
| signals for per-frame changes | poll local state |
| `load()` in a loop | preload/cache |
| heavy `.grep()` style regex in `_process` | move to events |
| many CanvasItems redraw | mark `redraw` dirty only on change |
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