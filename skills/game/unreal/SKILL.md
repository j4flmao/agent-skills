---
name: unreal
description: Expert game development with Unreal Engine - architecture, C++/Blueprint, rendering (RenderGraph/Nanite/Lumen), physics (Chaos), animation, AI, multiplayer, and performance.
---

# Unreal Engine Deep Engineering Guide

Unreal Engine is a C++ game engine with a powerful actor-component framework (UObject/AActor), Blueprint visual scripting, the Chaos physics system, and the modern rendering stack built on RenderGraph, Nanite virtualized geometry, and Lumen GI.

## 1. Engine Architecture

```
Unreal Engine 5
  Modules (UObject-based reflection)
    Core, Engine, Renderer, RHI (D3D12/Vulkan/Metal), Niagara, Chaos
  Engine loop -> UEngine::Tick -> UWorld::Tick -> Actor::Tick
  GWorld: The current UWorld (loaded levels)
```

- `UObject` base: GC (garbage collector), reflection (UFUNCTION/UPROPERTY), serialization.
- `AActor`: spawnable entity; placement via `UWorld::SpawnActor<T>()`.
- `UActorComponent`: reusable behavior attached to actors.

### 1.1 The Game Framework

| Class | Role |
|-------|------|
| `UGameInstance` | Per-process, survives level loads, global save data |
| `UWorld` | The active level + subsystems (GameMode, GameState) |
| `AGameModeBase` | Rules: spawn points, teams, win condition (server-only) |
| `AGameStateBase` | Replicated match state |
| `APlayerController` | Input + view; replicated to owner |
| `APawn`/`ACharacter` | The controllable entity |

Rule: GameMode is server-only; never game logic from clients. Use `GameState` for replicated data.

## 2. UObject Reflection & C++ / Blueprint

### 2.1 Macros

```cpp
UCLASS()
class MYGAME_API APlayerCharacter : public ACharacter {
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Stats")
    int32 MaxHealth = 100;

    UFUNCTION(BlueprintCallable, Category="Stats")
    void Heal(int32 Amount);
};
```

- UPROPERTY: serialized, reflected, GC-tracked.
- UFUNCTION: callable from Blueprint/other C++, serialization of delegates.
- Naming: `U` prefix for UObject, `A` for Actor, `F` for structs, `T` for templates.

### 2.2 C++ vs Blueprint Decision

| Concern | Choose |
|---------|--------|
| Data, core logic, perf-critical hot loops | C++ |
| Designer-facing flow, tuning, event wiring | Blueprint |
| Heavy algorithms (async, math-costly) | C++ + Async tasks |
| Prototypes and small features early | Blueprint then port to C++ |

Rule: Blueprint is for content, C++ is for code. Keep hot paths in native.

### 2.3 Compilation & Deployment

- `Build.cs`/`Target.cs` (UBT). Module dependencies declared there.
- Hot Reload (Live Coding) in editor; full build via Build.bat.
- UE 5 compile times: keep modules small; use IWYU.
- `PCHUsage`, `CppWarnings`, UnityBuild.
## 3. Rendering Pipeline (Modern UE5)

### 3.1 RenderGraph

UE5 renderer records a DAG of passes; the RenderGraph merges/splits passes, computes transient resources, and drives barriers automatically:

```
SceneColorInit -> BasePass (GBuffer) -> LightCulling -> DeferredShading
               -> Reflection capture -> Sky -> Translucency -> PostProcess -> Present
```

Resources auto-lifecycled (scopes), driver-managed. You can author custom passes via `FRenderingCompositePass` or `FSceneRenderer`.

### 3.2 Nanite

- Virtualized geometry: clusters, hierarchical LOD (HLOD), custom datastreams.
- Efficient for high-poly static meshes; NOT for skinned/animated meshes (fallback classic LODs).
- Enable on large static scenes; avoid vertex-modifying effects.

### 3.3 Lumen

- Global illumination (GI) via radiance cache (software ray tracing), optionally hardware RT.
- GPU-heavy; disable on low-end; control with `Lumen.` console vars.
- For stylized/flat art, skip Lumen; use precomputed lightmaps.

### 3.4 Niagara Particles

- GPU/CPU emitters; prefer `NiagaraDataInterfaceArrays` for bulk data.
- Minimize material complexity in particle shaders.

## 4. Physics — Chaos

- Chaos replaced PhysX in UE5.
- `FPhysicsSolver` fixed substep at `PhysicsSubstep` (default 0.0083s).
- `USceneComponent::SetSimulatePhysics(true)` to enable RigidBody.
- Contact: `OnComponentHit` / `OnComponentBeginOverlap` delegates.
- Destruction: `AChaosDestructible` with geometry collections.

### 4.1 Tunneling & CCD

Fast small projectiles: enable `bCCDEnablePhysics` on the body; or use sweep `UKismetSystemLibrary::LineTraceSingle` per tick.

### 4.2 Level Streaming

`UWorld::StreamLevel` async; `RegisterActor`/`UnregisterActor` for hot unload.

## 5. Animation

- Animation Blueprint (AnimGraph): blend spaces, aim offset, state machine, layered blend per bone.
- Controls Rig (IK) via `UAnimationBlueprintLibrary`.
- Cached Pose / reduce `FAnimNode_*` graph cost.
- Root motion drives movement; `bUseControllerRotationYaw=false` for root-motion characters.

## 6. AI

- `UAIController` + `UBehaviorTree` + Blackboard.
- BT: Selector/Sequence nodes; decorators (conditions), services (refresh), tasks.
- `UNavigationSystemV1` for path finding; `NavMesh`/`NavLinkProxy`.
- `UAIPerceptionComponent` for senses.

## 7. Multiplayer / Netcode

### 7.1 Replication

- RPCs: `UFUNCTION(Server)` / `Multicast` / `Client`.
- Replicated properties: `UPROPERTY(Replicated)` + `GetLifetimeReplicatedProps`.
- `ReplicatedUsing` for on-rep callbacks.

### 7.2 Network Architecture

- Dedicated server (no rendering), or listen server (client+host).
- Tick rate: `NetServerMaxTickRate` (default 30) for server simulation.
- Client-side prediction with `ServerMove` RPC + `ClientAckGoodMove`.
- `UCharacterMovementComponent` handles built-in prediction/reconciliation.

### 7.3 Replication Optimization

- `Dormancy`: actors freeze replication when unchanged (`DORM_DormantAll`).
- `NetUpdateFrequency`: throttle per-actor replication (default 100Hz, reduce for background actors).
- Property conditions: `COND_OwnerOnly`, `COND_InitialOnly`.
- Push model (UE5): `MARK_PROPERTY_DIRTY` + `NET_SERIALIZATION`.

## 8. UI (UMG)

- Widget Blueprints (UMG) for in-game HUDs.
- `UUserWidget::NativeConstruct` for init; `NativeTick` for per-frame logic.
- Keep tick logic in C++ via `BlueprintNativeEvent`; avoid Blueprint Tick.
- `Invalidation Box` to reduce widget re-rendering.

## 9. Asset Pipeline

- Content Browser assets (.uasset) are binary, versioned, auto-serialized.
- Cook + Stage: `Cook.bat` + `Stage.bat` per platform.
- Asset Manager: async loading, soft references (`TSoftObjectPtr`, `TSoftClassPtr`).
- Hot-loaded assets via `AsyncLoadAsset` / `StreamableManager`.

## 10. Performance Rules (Lead Level)

1. Profile first: `stat unit`, `stat gpu`, `ProfileGPU`, `stat game`, Unreal Insights.
2. Minimize tick cost: disable tick on actors that don't need it; use timers for periodic logic.
3. Avoid `GetAllActorsOfClass` in tick; maintain manager lists.
4. Object pools for frequently spawned/destroyed actors.
5. GC: minimize UObject allocation in hot paths; use native allocators for transient data.
6. Shader complexity: keep material instruction count <200 for mobile, <500 for PC.
7. LODs mandatory for foliage, large scenes.

### 10.1 Frame Budget Template

| System | Budget (ms) @ 60fps |
|--------|---------------------|
| Gameplay (Tick) | 2.0 |
| Physics (Chaos) | 2.0 |
| Animation | 2.0 |
| AI / NavMesh | 1.5 |
| Rendering (CPU) | 3.0 |
| Rendering (GPU) | 8.3-14.0 |
| UI | 1.0 |
| Netcode | 1.0 |
| Misc / Driver | 2.0 |

## 11. Anti-Patterns

| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| Blueprint Tick heavy logic | Slow, GC | Move to C++ |
| Actor with no tick disabled | CPU wasted | Set bCanEverTick=false |
| Massive Blueprint inheritance chains | Hard to maintain, slow | Composition over deep inheritance |
| Not setting NetUpdateFrequency | Bandwidth | Lower on background actors |
| Full scene replication every frame | Network spike | Dormancy + conditions |
| Nanite on skinned meshes | Error | Fallback LODs |
| Lumen on low-end GPU | Frame drops | Disable or use baked GI |

## 12. When to NOT Use Unreal

- Mobile-only lightweight games → Unity, Godot, or native platform SDKs.
- Scripting-heavy tools/modding without C++ → Unity + C# or Godot + GDScript.
- Tiny canvas/2D games → Godot, Cocos2d, web engine.
- Maximum native rendering control with zero abstraction → Vulkan/custom engine.

## 13. References

- `skills/game/game-engine/ecs-pattern/SKILL.md` — ECS patterns, useful alongside Chaos/UObject
- `skills/game/game-engine/patterns/SKILL.md` — engine design pattern catalog
- `skills/game/multiplayer-netcode/SKILL.md` — netcode prediction and reconciliation
- `skills/game/game-development/vulkan/SKILL.md` — low-level GPU rendering under the RHI
- `skills/game/game-development/physics-engine/SKILL.md` — physics solver internals (Chaos)
