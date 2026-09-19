---
name: cocos2d
description: Expert game development with Cocos2d-x / Cocos Creator - node tree, components, rendering (OpenGL ES/Metal/Vulkan), physics (Box2D), audio, UI, multi-platform build, and performance.
---

# Cocos2d-x / Cocos Creator Deep Engineering Guide

Cocos2d is a family of open-source game frameworks for 2D (and now 3D in Creator) with strong mobile focus. Cocos2d-x is the C++ core; Cocos Creator is the full editor + scene system built on top. This guide focuses on Cocos Creator 3.x (which uses Cocos2d-x under the hood).

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
fixedUpdate()  // physics substeps (if using Box2D)
update()       // gameplay logic per frame
lateUpdate()   // camera, UI follow
render()       // GPU submit
```

Rules:
- Node movement in physics: `move()` or set `RigidBody3D.velocity` in `fixedUpdate`.
- Visual interpolation: `node.setPosition(lerp(...))` in `update()`.

## 2. The Node-Component Model

```typescript
import { Component, _decorator } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property speed: number = 10;

    update(deltaTime: number) {
        // movement, animation, input
    }

    onCollisionEnter(other: Collider) {
        // physics callback
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
import { instantiate, Prefab, resources } from 'cc';
const bullet = instantiate(this.bulletPrefab);
bullet.setPosition(this.node.worldPosition);
director.getScene().addChild(bullet);
```

Rule: cache `prefab` references via `@property(Prefab)`, never load per frame.

## 3. Rendering

### 3.1 Pipeline Backends

| Platform | Renderer |
|----------|----------|
| Desktop/Mobile (GL) | OpenGL ES 3.1+ |
| iOS / Metal devices | Metal |
| Android Vulkan | Vulkan (via Cocos 3.x) |
| Web | WebGL 2.0 |

### 3.2 Draw Calls & Batching

- `Sprite` with the same texture/atlas: automatically batched by `SpriteBatch`/`RenderBatch`.
- Use texture atlases (`TexturePacker`) aggressively.
- UI: `UIOpacity` only on dynamic nodes; static UI should be grouped under a single `Opacity` parent.

### 3.3 Custom Rendering (Cocos Creator 3.x)

```typescript
@ccclass('CustomEffect')
export class CustomEffect extends RenderableComponent {
    getRenderPipeline() { return 'Builtin'; }
    // use this.getMaterial(0) to change uniforms
}
```

- `RenderPipeline` (Forward, Deferred) set in Project Settings.
- 2D games use Forward renderer; 3D can opt Deferred.

## 4. Physics

- Cocos Creator 3.x uses **Bullet** (3D) / **Box2D** (2D) via `physics-3d` / `physics-2d`.
- Nodes: `Collider2D`/`Collider3D` + `RigidBody2D`/`RigidBody3D`.
- Contact callbacks: `onBeginContact`, `onEndContact`.
- Layers: `physicsGroup` in Project Settings.

### 4.1 Character Controller

```typescript
const controller = this.node.getComponent(CharacterController);
controller.move(dir, deltaTime);
```

- For platformers: `RigidBody2D` + `BoxCollider2D`, manual velocity control.
- For 3D: `CharacterController3D` from `cc` (or use Box2D bullet).

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
| **C++ (Cocos2d-x)** | Engine extensions, GDExtension-like via `bindings` |
| **Lua** | Legacy Cocos2d-x; not primary in Creator 3.x |

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