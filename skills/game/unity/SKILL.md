---
name: unity
description: Expert game development with Unity - engine architecture, C# scripting, DOTS ECS, rendering (URP/HDRP), physics, animation, UI, asset pipeline, multiplayer, and performance.
---

# Unity Deep Engineering Guide

Unity is a component-based game engine built around GameObjects, MonoBehaviours, and a C# scripting layer. Modern Unity adds Data-Oriented Technology Stack (DOTS/E.C.S.) and two Scriptable Render Pipelines (URP/HDRP). This guide covers how a lead engineer thinks about Unity: architecture, C# performance, data-oriented design, rendering, physics, multiplayer, and profiling.

## 1. Engine Architecture

```
Unity Player/Editor
  Application      (UnityEngine)
    SceneManager   -> load/unload Scenes (additive)
      GameObject   (identity + transform)
        Component  (MonoBehaviour, Renderer, Collider, Animator...)
    PlayerLoop:    (fixed update order, engine-driven)
      ScriptableRunLoops -> custom systems injected
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
- **Never move Rigidbody in Update()**; move via `FixedUpdate` or use `rb.velocity` only in FixedUpdate. Changing `transform` in Update fights the physics solver.
- Camera interpolation in LateUpdate.
- Scene load is synchronous unless using `Addressables`/`SceneManager.LoadSceneAsync`.

### 1.2 Multiple Scenes (Additive Loading)

- Split levels into persistent + gameplay scenes; stream with `LoadSceneAsync` + `AllowSceneActivation = false` to keep the load from blocking.
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

### 2.2 FindObjectOfType / GameObject.Find

These are O(n) with allocations. They MUST not run on the per-frame path. For singletons, register in `Awake`, destroy in `OnDestroy`:

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
| **URP** | Default for most new projects (PC+mobile), SRP Batcher optimal |
| **HDRP** | Film-grade lighting: deferred, ray tracing, volumetrics, high-end PC/console |
| `ScriptableRenderer` (custom) | You own pass ordering; use with `RenderGraph` |

### 4.2 URP vs HDRP in practice

- URP: forward rendering, 2D lights, SRP batcher, simplified.
- HDRP: deferred, clustered lighting, volumetric fog, SSR, RT reflections (DXR).
- Both are `ScriptableRenderPipeline`; they run in the `Rendering.Update` player-loop phase.

### 4.3 Draw Call Reduction

1. **Enable SRP Batcher** (URP/HDRP property `UseSRPBatcher`) — batches dynamic shadows+lit objects with compatible materials.
2. **GPU instancing**: `Graphics.DrawMeshInstanced` for repeated meshes (grass, crowds, particles).
3. **Static batching**: mark static → combined at build.
4. **Addressables + SDF 2D**: not draw-call related, but stream textures to control bandwidth.
5. Minimize material variants (`KeywordEnum`, `MaterialPropertyBlock` for per-object color).
6. Bake lighting (Lightmapping) instead of dynamic.

### 4.4 Shader Lab & Shader Graph

- Shader Graph (node-based) is preferred for artists; expose exposed properties only.
- Hand-written shaders: write in HLSL; SRP uses `HLSLPROGRAM` blocks and `#pragma target` 3.0+.
- Watch out: Unity editor implicit `#pragma multi_compile _ _ALPHATEST_ON`; use `#pragma shader_feature_local` to avoid variants.

## 5. Physics

- Unity uses **PhysX** (3D) and **Box2D** (2D).
- Fixed timestep at 0.02s (50Hz); fast small objects tunnel → use `Physics.Burst`/`Physics.Solver` or a dedicated CCD sensor.
- Sleeping: overlapping static triggers should disable colliders (`isTrigger = true`) to avoid touches every frame.
- Layers & matrix matter: `Physics.IgnoreLayerCollision(playerLayer, enemyLayer, true)` reduces contact generation.
- `Physics.SyncTransforms()` forces syncing; avoid calling per-frame.

## 6. Animation & Timing

- **Animator** state machine with transitions; avoid heavy tree layers per object.
- `Time.deltaTime` may be 0 on pause; use `Time.unscaledDeltaTime` for UI.
- Animation events are editor-time; use `OnAnimationEvent` or `AnimationEvent` binding.
- For 100s of animating characters prefer playables or `AnimationUpdateMode` fixed with simple lerps.

## 7. UI (UGUI / UI Toolkit / IMGUI)

- **UGUI** (Canvas): fine for HUD; keep panels/Canvas to 1-2, enable `Vertex Buffer` reuse, disable raycast on static.
- **UI Toolkit** (new): UXML/USS, better for menus and editor tooling; runtime since 2023.
- **IMGUI**: editor windows and debugging only, not runtime UI.
- Rule: no layout rebuild per frame; cache `RectTransform`s, minify `GraphicRaycaster` blockers.

## 8. Asset Pipeline

### 8.1 Addressables

Addressables = load by key, async, memory-managed:

```csharp
Addressables.LoadAssetAsync<GameObject>("enemies/wolf").Completed += h => {
    var go = Instantiate(h.Result);
    go.AddComponent<DeferredUnload>();
};
Addressables.Release(handle);
```

- Use `AssetReference` fields instead of hardcoded strings.
- Set `addressables` remote catalog for updates.
- Remember: `Instantiate(referencedObject)` body must be released too.

### 8.2 Streaming & Background Loading

- Texture streaming (`Texture2D.streamingEnabled`) or Addressables load in `OnTriggerEnter`.
- Audio: `AudioClip.Create` streaming for ambience.
- Never `Resources.Load` in Update; use `Resources.LoadAll` once.

## 9. Multiplayer (Netcode for GameObjects / Netcode Transport / UnityTransport)

- Authoritative: server owns state; clients send inputs; interpolate snapshot positions.
- `[ServerRpc]` from client to server; `[ClientRpc]` from server to clients.
- Sim tick = fixed timestep; physics simulation server-side only; clients render interpolated states.
- Use `NetworkVariable<T>` — beware of per-frame `NetworkVariable` writes (delta encode, avoid 60/s floats).
- Prediction: `PredictedPlayer` pattern with client-side `NetworkTransform` interpolation.

## 10. Performance Rules (Lead Level)

1. **Profile first**: Unity Profiler + Burst metrics; GPU profiler (RenderDoc, GPUView).
2. `ExecuteInEditMode` scripts only where needed; keep editor-only work in `#if UNITY_EDITOR`.
3. Avoid `transform.position` in a loop (accessing Transform is cheap-ish, but allocations from `Find`/`GetComponentsInChildren` are not).
4. Garbage: minimize per-frame allocations; cache arrays; use `NativeArray`/`NativeList` in jobs.
5. Broke update: use `FixedUpdate` only for physics; game logic in `Update`.
6. Root motion vs scripted movement: profile `Animator` cost.
7. Hidden cost: `Camera.main` cached; avoid in Update.

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
| `FindObjectOfType` in Update | GC spikes, slow | cache in Awake |
| Rigidbody move in Update | physics jitter | FixedUpdate + rb.Move |
| Per-frame allocations (strings) | GC pauses | string builders, pooling |
| Resources.Load in loop | load spikes | Addressables + cache |
| One Canvas for everything | layout rebuild | split by update frequency |
| Scripts in Editor without serialization | lost state | `[SerializedField]` |
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