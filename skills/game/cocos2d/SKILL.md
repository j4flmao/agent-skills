---
name: cocos2d
description: >
  Use this skill when the user says 'cocos2d', 'cocos2d-x', 'cocos creator', 'cocos game', 'cocos build'. Guides Cocos Creator 3.x / Cocos2d-x projects: node tree and components, rendering and batching, physics, UI, multi-platform builds and mobile performance. Do NOT use for: Cocos2d-x engine internals (use cocos2d-patterns), Unity/Godot/Unreal projects.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, cocos, cocos-creator, mobile-games]
---

# Cocos2d-x / Cocos Creator Deep Engineering Guide

## Purpose
Cocos2d is a family of open-source game frameworks for 2D (and now 3D in Creator) with strong mobile focus. Cocos2d-x is the C++ core; Cocos Creator is the full editor + scene system built on top. This guide focuses on Cocos Creator 3.x (which uses Cocos2d-x under the hood).

## Agent Protocol

### Trigger
"cocos2d", "cocos2d-x", "cocos creator", "cocos game", "cocos build".

### Input Context
- Cocos Creator or Cocos2d-x version
- Target platforms (web, iOS, Android, mini-games)
- Game type and performance targets

### Output Artifact
TypeScript/C++ code, project settings or a performance plan. No file unless requested.

### Response Format
```
Engine: {Cocos Creator 3.x | Cocos2d-x}
Change: {what and why}
Code: {snippet}
Perf check: {draw calls, memory, FPS on target device}
```

## 1. Engine Architecture

```
Cocos Creator 3.x
  Application
    Scene -> Node tree
      Component (Script, Render, Audio, UI, Physics...)
    Scheduler (main loop): tick() -> update() -> lateUpdate()
    Director: scene management, frame pacing
```

- **Director** is the central controller; `director.mainLoop()` runs the frame.
- **Nodes** are the tree; **Components** (scripts) attach behavior.
- **Scheduler**: manages `update()`, `lateUpdate()`, `physicsUpdate()` with priorities.

### 1.1 Update Order

```
update(dt)        // component gameplay logic per frame
physics step      // PhysicsSystem.instance.fixedTimeStep (default 1/60), may run 0..maxSubSteps times
lateUpdate(dt)    // camera follow, UI
render            // pipeline submit
```

Rules:
- Drive dynamic bodies through the physics API (`RigidBody.setLinearVelocity()`, `applyForce()`), not by writing node positions every frame.
- Components have no `fixedUpdate`; for fixed-step logic listen to the physics system's step events or run your own accumulator in `update`.

## 2. The Node-Component Model

```typescript
import { Component, Collider, ICollisionEvent, _decorator } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property speed: number = 10;

    update(deltaTime: number) {
        // movement, animation, input
    }

    start() {
        // 3D: collider events are registered, not overridden
        this.getComponent(Collider)!.on('onCollisionEnter', this.onHit, this);
        // 2D equivalent: collider2d.on(Contact2DType.BEGIN_CONTACT, cb, this)
    }

    private onHit(event: ICollisionEvent) {
        // event.otherCollider, event.contacts
    }
}
```

### 2.1 Pattern: Event-Driven

```typescript
// Emit
this.node.emit('damage', amount);
// Listen
this.node.on('damage', this.onDamage, this);
```

- `node.on()`: listen on the same node or bubble up.
- `targetOff()`: remove all listeners on cleanup.
- Use typed events where possible (Cocos Creator 3.x supports `EventTarget`).

### 2.2 Prefab Instantiation

```typescript
import { director, instantiate, Prefab } from 'cc';
const bullet = instantiate(this.bulletPrefab);
director.getScene()!.addChild(bullet);
bullet.setWorldPosition(this.node.worldPosition);
```

Rule: cache `prefab` references via `@property(Prefab)`, never load per frame.

## 3. Rendering

### 3.1 Pipeline Backends

| Platform | Renderer |
|----------|----------|
| Android / desktop GL | OpenGL ES 3 |
| iOS / Metal devices | Metal |
| Android Vulkan | Vulkan (via Cocos 3.x) |
| Web | WebGL 2 (WebGL 1 fallback); WebGPU experimental in 3.8 |

### 3.2 Draw Calls & Batching

- 2D renderables sharing material + texture are batched automatically; dynamic atlas merging can pack small textures at runtime. Interleaving different textures/materials in sibling order breaks batches.
- Use texture atlases (`TexturePacker`) aggressively.
- UI: `Mask` and `Graphics` components break batches; keep them few. Check the draw-call count in the Profiler overlay (`profiler.showStats()`).

### 3.3 Custom Rendering (Cocos Creator 3.x)

```typescript
// Per-object uniform change without affecting the shared material
const renderer = this.getComponent(MeshRenderer)!;
renderer.getMaterialInstance(0)!.setProperty('mainColor', new Color(255, 0, 0, 255));
```
Material instances break batching/instancing for that object; prefer instanced attributes for many objects.

- `RenderPipeline` (Forward, Deferred) set in Project Settings.
- 2D games use Forward renderer; 3D can opt Deferred.

## 4. Physics

- Cocos Creator 3.x lets you pick the backend in Project Settings > Feature Cropping: 3D = Bullet (wasm, default), PhysX, cannon.js or builtin (collision only); 2D = Box2D or builtin.
- Nodes: `Collider2D`/`Collider3D` + `RigidBody2D`/`RigidBody3D`.
- Contact callbacks: `onBeginContact`, `onEndContact`.
- Layers: `physicsGroup` in Project Settings.

### 4.1 Character Controller

```typescript
const controller = this.node.getComponent(CharacterController);
controller.move(dir, deltaTime);
```

- For platformers: `RigidBody2D` + `BoxCollider2D`, manual velocity control.
- For 3D (Cocos Creator 3.8+): add a `CapsuleCharacterController` or `BoxCharacterController` component and call `move()`; it needs the Bullet or PhysX backend.

## 5. Audio

- `AudioSource` component: `play()`, `stop()`, `volume`, `loop`.
- Audio files: MP3 (loop), OGG (streaming), WAV (small SFX).
- Preload audio on scene load; never load audio per event.

## 6. UI (UI Toolkit equivalent: Cocos UI)

- Nodes: `Sprite`, `Label`, `Button`, `Slider`, `ScrollView`, `RichText`.
- Layout: `Layout` component (horizontal/vertical/grid).
- Anchor points: `[0-1, 0-1]` (unlike Unity's pivot).
- `Canvas` node as root of UI tree; camera renders to UI layer.
- `Widget` component for responsive layout (attach to parent edges).

## 7. Scripting Languages

| Option | Use |
|--------|-----|
| **TypeScript** | Primary, first-class support in Cocos Creator |
| **C++** | Engine customisation and native plugins exposed to TS through JSB bindings |
| **Lua** | Cocos2d-x only (legacy); not supported in Cocos Creator 3.x |

### 7.1 TypeScript Rules

- Use `@property` decorators to expose fields.
- Typed node references: `@property(Node) target: Node;`.
- `this.node`: current node; `this.node.parent`: tree up.
- `director.loadScene('sceneName')` to switch scenes.

## 8. Multiplayer

- Cocos Creator has no built-in high-level netcode; use:
  - WebSocket/HTTP for REST APIs.
  - Native TCP/UDP via C++ bindings for real-time.
  - Socket.IO plugin for event-based messaging.
- Rollback/interpolation implemented in user code; see `skills/game/multiplayer-netcode/SKILL.md`.

## 9. Asset Pipeline & Build

- **Assets/**: `.ts` scripts, `.prefab`, `.scene`, `.texture`, `.anim`.
- Resource Manager (`resources.load()`): load by path within `resources/` folder.
- `AssetManager` for runtime loading, scene loading.
- Build: Editor -> Build -> platform (iOS/Android/Web/Desktop) -> compile (Xcode/Gradle/Webpack).
- Remote asset bundle: `AssetManager.loadBundle` from CDN for hot updates.

## 10. Performance Rules

1. Profile: Cocos DevTools, Performance Monitor, `console.time()`.
2. Node count: keep <5000 active; use culling (`NodePool` or visibility checks).
3. Object pool: `NodePool` for bullets/enemies; never `instantiate`/`destroy` per event.
4. `destroy()` is deferred; `removeFromParent()` + pool recycling is faster.
5. Light count: keep 3D dynamic lights < 4 on mobile.
6. Audio: limit simultaneous audio sources (3-5 on mobile).
7. Memory: release unused `AssetManager` bundles explicitly.

### 10.1 Frame Budget (Mobile @ 30fps = 33ms)

| System | Budget |
|--------|--------|
| Gameplay | 8ms |
| Physics | 5ms |
| Render (CPU) | 8ms |
| Audio | 2ms |
| GC / misc | 5ms |
| GPU | 16.6ms (GPU-bound, overlap CPU) |

## 11. Anti-Patterns

| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| Instantiate/destroy per event | Allocation + GC | NodePool |
| All nodes ticking | CPU waste | disable update |
| No texture atlas | Draw calls explode | pack sprites |
| load() per frame | I/O stall | cache preloaded |
| Global variables | GC hits | scoped to class |
| `this.schedule()` in update | multiple timers | use one timer |

## 12. When to NOT Use Cocos2d

- AAA 3D → Unreal/Unity.
- Web-only lightweight → Phaser, vanilla Canvas.
- Scripting-heavy desktop → Godot or Unity.
- Console-first → Unreal or Unity.

## 13. References

- `skills/game/game-development/cocos2d-patterns/SKILL.md` — Cocos2d-x architecture deep dive
- `skills/game/game-engine/patterns/SKILL.md` — engine design pattern catalog
- `skills/game/multiplayer-netcode/SKILL.md` — networking approach reference
- `skills/game/game-development/vulkan/SKILL.md` — low-level GPU rendering (mobile/desktop)