---
name: unity
description: >
  Use this skill when the user says 'unity', 'unity 6', 'monobehaviour', 'URP', 'HDRP', 'addressables', 'unity performance', 'netcode for gameobjects'. Guides Unity projects: player loop, GameObject/component architecture, URP/HDRP, physics, animation, UI, Addressables, multiplayer and profiling. Do NOT use for: DOTS/Entities/Burst code in depth (use unity-csharp), Unreal or Godot.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, unity, csharp, engine]
---

# Unity Deep Engineering Guide

## Purpose
Unity is a component-based game engine built around GameObjects, MonoBehaviours, and a C# scripting layer. Modern Unity adds Data-Oriented Technology Stack (DOTS/E.C.S.) and two Scriptable Render Pipelines (URP/HDRP). This guide covers how a lead engineer thinks about Unity: architecture, C# performance, data-oriented design, rendering, physics, multiplayer, and profiling.

## Agent Protocol

### Trigger
"unity", "unity 6", "monobehaviour", "URP", "HDRP", "addressables", "unity performance", "netcode for gameobjects".

### Input Context
- Unity version (Unity 6.x)
- Render pipeline and target platforms
- Profiler capture if performance-related

### Output Artifact
C# code, project/pipeline settings or a performance plan. No file unless requested.

### Response Format
```
Unity: {6.x}  Pipeline: {URP | HDRP}
Change: {what and why}
Code: {snippet}
Verify: {Profiler / Frame Debugger result}
```

## 1. Engine Architecture

```
Unity Player/Editor
  Application      (UnityEngine)
    SceneManager   -> load/unload Scenes (additive)
      GameObject   (identity + transform)
        Component  (MonoBehaviour, Renderer, Collider, Animator...)
    PlayerLoop:    (fixed update order, engine-driven)
      PlayerLoop.SetPlayerLoop -> custom systems injected
    Module systems: Physics (PhysX/Box2D), Audio (FMOD), UI (UGUI/UI Toolkit),
                    Rendering (URP/HDRP/Built-in), Input (new Input System)
```

### 1.1 The Player Loop & Update Order

Within one frame Unity calls systems in a fixed order:

```csharp
void Update()   // per rendered frame
void FixedUpdate() // fixed timestep: physics, network ticks (default 0.02s)
void LateUpdate()  // camera follow, post-movement
```

Rules:
- **Never move Rigidbody in Update()**; move via `FixedUpdate` or use `rb.linearVelocity` (named `velocity` before Unity 6) / `rb.MovePosition` only in FixedUpdate. Changing `transform` in Update fights the physics solver.
- Camera interpolation in LateUpdate.
- Scene load is synchronous unless using `Addressables`/`SceneManager.LoadSceneAsync`.

### 1.2 Multiple Scenes (Additive Loading)

- Split levels into persistent + gameplay scenes; stream with `SceneManager.LoadSceneAsync(name, LoadSceneMode.Additive)`; set `allowSceneActivation = false` to hold activation until you are ready.
- Use `SceneManager.MergeScenes` or DontDestroyOnLoad root object.

## 2. GameObject & Component Model

```csharp
public class Health : MonoBehaviour {
    public int maxHp = 100;
    int current;

    void OnEnable()  { /* add self to manager lists */ }
    void OnDisable() { /* remove self */ }
}
```

### 2.1 GetComponent Performance

`GetComponent<T>()` per frame per object is a hot-path mistake:

- Cache component references in `Awake()` once.
- Prefer `TryGetComponent`.
- `GetComponentsInChildren` only at load or on structural change.
- Hot update loops use **managers** (single static list of registered components), not per-object `Find`.

### 2.2 FindFirstObjectByType / GameObject.Find

`FindObjectOfType` is deprecated (2023.1+) in favour of `FindFirstObjectByType` / `FindAnyObjectByType`. All of these scan the scene. They MUST not run on the per-frame path. For singletons, register in `Awake`, destroy in `OnDestroy`:

```csharp
public static GameManager I;  // global accessor
void Awake() { I = this; }
void OnDestroy() { if (I == this) I = null; }
```

## 3. The DOTS / ECS Stack

Unity DOTS replaces MonoBehaviours with archetype-based ECS:

```csharp
// Component - plain struct, no MonoBehaviour
public struct Velocity : IComponentData { public float3 Value; }

// System
[BurstCompile]
partial struct MoveSystem : ISystem {
    [BurstCompile]
    public void OnUpdate(ref SystemState state) {
        foreach (var (transform, v) in
                 SystemAPI.Query<RefRW<LocalTransform>, RefRO<Velocity>>())
        {
            transform.ValueRW.Position += v.ValueRO.Value * SystemAPI.Time.DeltaTime;
        }
    }
}
```

- Entities stored in archetypes (SoA per component) → cache-friendly.
- `Burst` + `Jobs` compiles to native SIMD-optimized code.
- SubScene baking: author GameObject scenes → baked entities at build.

### When to use DOTS vs classic GameObjects

| Need | Path |
|------|------|
| 1000s of agents, bullets, particles | DOTS/ECS + Burst + Jobs |
| Rapid prototyping / small games | Classic GameObject/MonoBehaviours |
| UI, gameplay narrative, inventory | Classic (UGUI) |
| Massive open world streaming | DOTS SubScene streaming |

## 4. Rendering Pipelines

### 4.1 Choose the Pipeline

| Pipeline | Use |
|----------|-----|
| Built-in | Legacy, quick prototypes, simple mobile games |
| **URP** | Default for most new projects (mobile to PC/console); Forward, Forward+ or Deferred paths |
| **HDRP** | Film-grade lighting: deferred, ray tracing, volumetrics, high-end PC/console |
| Custom SRP | Only with a dedicated rendering team; URP/HDRP passes are extended via Render Graph (`ScriptableRenderPass.RecordRenderGraph`, Unity 6) |

### 4.2 URP vs HDRP in practice

- URP: scalable, 2D renderer with 2D lights, Forward+/Deferred for many lights.
- HDRP: physically based lighting, volumetric fog, SSR, ray-traced effects (DXR) on high-end PC/console.

### 4.3 Draw Call Reduction

1. **SRP Batcher** (on by default in URP/HDRP) — cuts CPU cost per draw for materials using the same shader variant; keep shaders SRP-Batcher compatible (per-material CBUFFER).
2. **GPU Resident Drawer** (Unity 6, BatchRendererGroup-based) or GPU instancing via `Graphics.RenderMeshInstanced` for many repeated meshes (vegetation, crowds).
3. **Static batching**: mark static → combined at build.
5. Minimize material variants (`KeywordEnum`, `MaterialPropertyBlock` for per-object color).
6. Bake lighting (Lightmapping) instead of dynamic.

### 4.4 Shader Lab & Shader Graph

- Shader Graph (node-based) is preferred for artists; expose exposed properties only.
- Hand-written shaders: write in HLSL; SRP uses `HLSLPROGRAM` blocks and `#pragma target` 3.0+.
- Variant explosion: `multi_compile` always builds every combination; prefer `shader_feature_local` (unused keywords are stripped at build) and add `IPreprocessShaders` stripping for the rest.

## 5. Physics

- Unity uses **PhysX** (3D) and **Box2D** (2D).
- Fixed timestep defaults to 0.02 s (50 Hz). Fast small objects tunnel → set `Rigidbody.collisionDetectionMode` to `ContinuousDynamic` (vs static and dynamic) or `ContinuousSpeculative` (cheaper, can produce ghost contacts).
- Triggers (`isTrigger = true`) report overlaps without collision response; keep trigger volumes on layers that only test against what they need.
- Layers & matrix matter: `Physics.IgnoreLayerCollision(playerLayer, enemyLayer, true)` reduces contact generation.
- `Physics.SyncTransforms()` forces syncing; avoid calling per-frame.

## 6. Animation & Timing

- **Animator** state machine with transitions; avoid heavy tree layers per object.
- `Time.deltaTime` may be 0 on pause; use `Time.unscaledDeltaTime` for UI.
- Animation Events invoke a method by name on the GameObject; keep handlers cheap and allocation-free.
- For 100s of characters: set `Animator.cullingMode` to `CullUpdateTransforms`/`CullCompletely`, reduce layers, and consider vertex-animation textures for distant crowds.

## 7. UI (UGUI / UI Toolkit / IMGUI)

- **UGUI** (Canvas): any change rebuilds the whole Canvas mesh — split static and frequently changing elements into separate Canvases; untick Raycast Target on non-interactive graphics.
- **UI Toolkit**: UXML/USS, retained-mode; runtime support since 2021.2, the recommended system for new editor tooling and menus.
- **IMGUI**: editor windows and debugging only, not runtime UI.
- Rule: no layout rebuild per frame; cache `RectTransform`s, minify `GraphicRaycaster` blockers.

## 8. Asset Pipeline

### 8.1 Addressables

Addressables = load by key, async, memory-managed:

```csharp
// Instantiate + track in one call; release the instance, not the prefab
var handle = Addressables.InstantiateAsync("enemies/wolf", spawnPoint.position, Quaternion.identity);
GameObject wolf = await handle.Task;
// ... later
Addressables.ReleaseInstance(wolf);

// Or load once, instantiate many, release the load handle when done
var prefabHandle = Addressables.LoadAssetAsync<GameObject>("enemies/wolf");
GameObject prefab = await prefabHandle.Task;
// Instantiate(prefab) ... destroy instances normally ...
Addressables.Release(prefabHandle);
```

- Use `AssetReference` fields instead of hardcoded strings.
- Set `addressables` remote catalog for updates.
- Every `LoadAssetAsync` needs a matching `Release`; every `InstantiateAsync` a matching `ReleaseInstance` — otherwise bundles stay in memory.

### 8.2 Streaming & Background Loading

- Mipmap streaming: enable "Stream Mipmaps" on texture import and `QualitySettings.streamingMipmapsActive` with a memory budget.
- Audio: long music/ambience clips use Load Type = Streaming; short SFX Decompress On Load or Compressed In Memory.
- Avoid the `Resources` folder for content (everything in it ships and is indexed at startup); use Addressables.

## 9. Multiplayer (Netcode for GameObjects / Netcode Transport / UnityTransport)

- Authoritative: server owns state; clients send inputs; interpolate snapshot positions.
- RPCs: `[Rpc(SendTo.Server)]` / `[Rpc(SendTo.ClientsAndHost)]` (NGO 1.8+ universal RPCs; older code uses `[ServerRpc]`/`[ClientRpc]`).
- Sim tick = fixed timestep; physics simulation server-side only; clients render interpolated states.
- Use `NetworkVariable<T>` — beware of per-frame `NetworkVariable` writes (delta encode, avoid 60/s floats).
- Netcode for GameObjects has no built-in client prediction; owner-authoritative `NetworkTransform` or hand-written prediction are the options. Netcode for Entities provides built-in prediction and lag compensation for competitive games.

## 10. Performance Rules (Lead Level)

1. **Profile first**: Unity Profiler + Burst metrics; GPU profiler (RenderDoc, GPUView).
2. `ExecuteInEditMode` scripts only where needed; keep editor-only work in `#if UNITY_EDITOR`.
3. Avoid `transform.position` in a loop (accessing Transform is cheap-ish, but allocations from `Find`/`GetComponentsInChildren` are not).
4. Garbage: minimize per-frame allocations; cache arrays; use `NativeArray`/`NativeList` in jobs.
5. Broke update: use `FixedUpdate` only for physics; game logic in `Update`.
6. Root motion vs scripted movement: profile `Animator` cost.
7. `Camera.main` is cached internally since 2020.2, but still store camera references in fields rather than looking them up everywhere.

### 10.1 Frame Budget Table Template

| System | Budget (ms) @ 60fps |
|--------|---------------------|
| Simulation (Update) | 2.0 |
| Physics (Fixed) | 2.0 |
| Animation | 2.0 |
| AI / NavMesh | 1.5 |
| Rendering (CPU submit) | 3.0 |
| Rendering (GPU) | 8.3–14.0 |
| UI | 1.0 |
| Netcode | 1.0 |
| Misc / Driver | 2.0 |

Total must fit in 16.6ms (or 1000/refresh).

## 11. Project Structure Convention

```
Assets/
  Scripts/         # namespaces by system
  Scenes/
  Prefabs/
  Addressables/    # addressable groups
  Materials/
  Textures/
  Audio/
  _BuildTools/     # editor scripts, CI
  .gitignore: Library/ Temp/ Logs/ UserSettings/
```

Use `.asmdef` (assembly definition) per folder to speed up compile times and control references.

## 12. Anti-Patterns

| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| `FindFirstObjectByType`/`GameObject.Find` in Update | full scene scan | cache in Awake or register with a manager |
| Rigidbody move in Update | physics jitter | `MovePosition`/forces in FixedUpdate + Rigidbody interpolation |
| Per-frame allocations (strings) | GC pauses | string builders, pooling |
| Resources.Load in loop | load spikes | Addressables + cache |
| One Canvas for everything | layout rebuild | split by update frequency |
| Private state not serialized | inspector values lost | `[SerializeField] private` fields |
| Not using .asmdef | long compile | per-system asmdefs |
| Physics without layer matrix | wasted contacts | `IgnoreLayerCollision` |

## 13. When to NOT Use Unity

- Native console/PC-only huge world with full control → custom engine + Vulkan (see `skills/game/game-development/vulkan/SKILL.md`).
- Web "tiny" canvas game → Engines like Phaser or vanilla canvas might be lighter.
- Deep customization of renderer required beyond URP/HDRP budget → engine-level control required.
- For ECS patterns independent of engine, see `skills/game/game-engine/ecs-pattern/SKILL.md`.

## 14. References

- `skills/game/game-development/unity-csharp/SKILL.md` — Unity C# scripting and DOTS internals
- `skills/game/game-engine/ecs-pattern/references/unity-dots-in-practice.md` — DOTS in real projects
- `skills/game/game-engine/patterns/references/game-loop-and-timestep.md` — update timing patterns
- `skills/game/multiplayer-netcode/SKILL.md` — netcode patterns & prediction
- `skills/game/game-development/physics-engine/SKILL.md` — physics internals used by engines