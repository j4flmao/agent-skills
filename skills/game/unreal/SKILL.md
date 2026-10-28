---
name: unreal
description: >
  Use this skill when the user says 'unreal', 'unreal engine 5', 'UE5', 'blueprint', 'UObject', 'gameplay ability system', 'nanite', 'lumen', 'unreal replication'. Guides Unreal Engine 5 projects: UObject/Actor framework, C++ vs Blueprint, rendering (Nanite/Lumen), Chaos physics, animation, AI, replication and profiling. Do NOT use for: Unity or Godot, custom engine rendering (use render-graph/vulkan).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [game, unreal, cpp, engine]
---

# Unreal Engine Deep Engineering Guide

## Purpose
Unreal Engine is a C++ game engine with a powerful actor-component framework (UObject/AActor), Blueprint visual scripting, the Chaos physics system, and the modern rendering stack built on RenderGraph, Nanite virtualized geometry, and Lumen GI.

## Agent Protocol

### Trigger
"unreal", "unreal engine 5", "UE5", "blueprint", "UObject", "gameplay ability system", "nanite", "lumen", "unreal replication".

### Input Context
- UE version (5.x)
- C++ / Blueprint split
- Target platforms and performance targets

### Output Artifact
C++/Blueprint guidance, config or a profiling plan. No file unless requested.

### Response Format
```
UE: {5.x}
Change: {what and why}
Code: {snippet}
Verify: {Unreal Insights / stat commands}
```

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

Resources are transient and lifetime-tracked by the Render Dependency Graph (RDG). Custom passes are added with `FRDGBuilder::AddPass` from a plugin, usually hooked in through a `FSceneViewExtensionBase` subclass (no engine fork needed).

### 3.2 Nanite

- Virtualized geometry: meshes split into clusters with a cluster LOD hierarchy, streamed and culled on the GPU.
- Best for high-poly opaque static meshes; masked materials and World Position Offset (foliage) are supported since 5.1 at extra cost; skinned-mesh support is experimental in recent 5.x releases — check your version.
- Keep translucent and heavily deforming content on classic LODs.

### 3.3 Lumen

- Dynamic GI and reflections. Software ray tracing traces mesh distance fields against a surface cache; hardware ray tracing is used when enabled and supported.
- GPU-heavy; disable on low-end; control with `Lumen.` console vars.
- For stylized/flat art, skip Lumen; use precomputed lightmaps.

### 3.4 Niagara Particles

- GPU/CPU emitters; prefer `NiagaraDataInterfaceArrays` for bulk data.
- Minimize material complexity in particle shaders.

## 4. Physics — Chaos

- Chaos replaced PhysX in UE5.
- By default Chaos steps with the game frame; enable substepping or Async Physics (Project Settings > Physics > Tick Async Physics) for a fixed physics step.
- `UPrimitiveComponent::SetSimulatePhysics(true)` to simulate a body.
- Contact: `OnComponentHit` / `OnComponentBeginOverlap` delegates.
- Destruction: Geometry Collection assets (`UGeometryCollectionComponent`, fractured in the Fracture editor mode).

### 4.1 Tunneling & CCD

Fast small projectiles: enable CCD on the body (`BodyInstance.bUseCCD = true`), or skip physics bodies and sweep each tick with `GetWorld()->SweepSingleByChannel` (hitscan: `LineTraceSingleByChannel`).

### 4.2 Level Streaming

Open worlds use World Partition (grid cells streamed around streaming sources, data layers, HLODs). Classic sublevels stream with `UGameplayStatics::LoadStreamLevel` / `UnloadStreamLevel` or Level Streaming Volumes.

## 5. Animation

- Animation Blueprint (AnimGraph): blend spaces, aim offset, state machine, layered blend per bone.
- Control Rig for procedural animation/IK in the AnimGraph; IK Rig + IK Retargeter for retargeting between skeletons.
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
- Push model: enable push-model replication, declare properties with `FDoRepLifetimeParams{.bIsPushBased = true}` and call `MARK_PROPERTY_DIRTY_FROM_NAME` when they change. Iris is the newer replication system (opt-in in 5.x).

## 8. UI (UMG)

- Widget Blueprints (UMG) for in-game HUDs.
- `UUserWidget::NativeConstruct` for init; `NativeTick` for per-frame logic.
- Keep tick logic in C++ via `BlueprintNativeEvent`; avoid Blueprint Tick.
- `Invalidation Box` to reduce widget re-rendering.

## 9. Asset Pipeline

- Content Browser assets (.uasset) are binary, versioned, auto-serialized.
- Cook + stage + package per platform: `RunUAT BuildCookRun -project=... -platform=... -cook -stage -pak -package`.
- Asset Manager: async loading, soft references (`TSoftObjectPtr`, `TSoftClassPtr`).
- Async loading via `FStreamableManager::RequestAsyncLoad` or `UAssetManager::LoadPrimaryAsset`.

## 10. Performance Rules (Lead Level)

1. Profile first: `stat unit`, `stat gpu`, `ProfileGPU`, `stat game`, Unreal Insights.
2. Minimize tick cost: disable tick on actors that don't need it; use timers for periodic logic.
3. Avoid `GetAllActorsOfClass` in tick; maintain manager lists.
4. Object pools for frequently spawned/destroyed actors.
5. GC: minimize UObject allocation in hot paths; use native allocators for transient data.
6. Shader complexity: check the Shader Complexity view mode and material stats; set per-platform instruction budgets with your art team and enforce them in review.
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
