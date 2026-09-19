---
title: Component Architecture
description: GameObject vs Component, Unity MonoBehaviour, Unreal Actor/Component, composition over inheritance, and hybrid ECS strategies.
---

# Component Architecture — Deep Reference

## 1. The Core Idea

Instead of a deep inheritance tree where a `Boss` is a `Character` which is a `GameObject`, we compose behavior from small, reusable components:

```
Monster = PositionComponent + HealthComponent + AIController + RenderComponent
```

Components are mixed to create *any* behavior. This is **composition over inheritance**.

## 2. Inheritance vs Composition

| | Inheritance | Composition |
|---|------------|-------------|
| Reuse | via parent class | via attached parts |
| Editing | change parent → all children change | per-instance mix |
| Runtime change | impossible (class fixed at compile time) | swap components live |
| Coupling | high (tight base) | low (interface-only) |
| Debugging | single class tree | many small pieces |
| Fits | small, stable, vertical hierarchies | evolving, many-variant games |

## 3. Unity's MonoBehaviour Model

Every gameplay behavior in Unity is a `MonoBehaviour` **attached** to a `GameObject`:

```csharp
public class Grabber : MonoBehaviour {
    private Rigidbody grabbed;

    void OnTriggerEnter(Collider other) { grabbed = other.attachedRigidbody; }
    void Update() {
        if (Input.GetMouseButtonDown(0) && grabbed != null) {
            grabbed.useGravity = false;
        }
    }
}
```

Lifecycle: `Awake → OnEnable → Start → (Update | FixedUpdate) → OnDisable → OnDestroy`.

Best practices:
- One responsibility per script.
- Avoid `FindObjectOfType` (slow) — use `[SerializeField]` references, or ServiceLocator.
- Avoid Update() for things that don't change every frame (use events/dirty flags).
- Structure via `GetComponent<T>()` rarely; prefer prefab-configured references.

## 4. Unreal's Actor/Component Model

- **Actor** (`AActor`): presence in the world; owns components.
- **Component** (`UActorComponent`) / `USceneComponent` (has transform) / `UPrimitiveComponent` (renders).
- **Pawn** (`APawn`) / **Character** (`ACharacter`) wait specialized actors.

```cpp
void AMyCharacter::BeginPlay() {
    Super::BeginPlay();
    USphereComponent* col = NewObject<USphereComponent>(this);
    col->AttachToComponent(RootComponent, FAttachmentTransformRules::KeepRelativeTransform);
    col->RegisterComponent();
}
```

Unreal deliberately mixes component composition with some inheritance (Pawn → Character) because gameplay code widely relies on the semantic build-in.

## 5. Godot's Node/Scene Model

Godot uses **nodes** in a scene tree. Everything is a `Node`:

- `CharacterBody2D`: kinematics + collisions.
- `Sprite2D`: rendering.
- `Node2D`: base for 2D.

Unlike Unity (component on GameObject), Godot arranges these as *child nodes* in a tree → hierarchy is structural + functional. Scripts attach to nodes.

```gdscript
extends CharacterBody2D

func _physics_process(delta):
    velocity = Vector2(Input.get_axis("left", "right") * 100, 0)
    move_and_slide()
```

## 6. Component Communication Patterns

### Direct Reference

Component holds pointer/reference to another component it needs:

```csharp
public class DamageDealer : MonoBehaviour {
    [SerializeField] Health target;
    void Deal(float amount) => target.TakeDamage(amount);
}
```

### Event/Callback

Component exposes an event; others subscribe:

```csharp
public class Health : MonoBehaviour {
    public event Action<float> OnDamaged;
}
```

### Message/Messaging Bus

Global bus decouples producers and consumers. Use sparingly — hidden coupling hurts debugging.

### Command Objects

Encapsulate actions, e.g., `ICommand { Execute(); Undo(); }` for editor actions.

## 7. When Components Fail

### Problem: Component Sprawl / Interconnect

Components that *always* need each other (Health always paired with Armor) suggests a subsystem or a parent component. Consolidate tightly coupled sets into a single component or a "bundle."

### Problem: Circular Dependencies

`Health` notifies `UI`, `UI` reads `Health` — infinite loops. Break: one writes, other reads (single-writer rule).

### Problem: Update Ordering

Component `A.Update()` needs `B` updated first. Unity doesn't guarantee order → use explicit phases (Input → Sim → Visual) or events.

## 8. The Hybrid: Components + ECS

Production engines blend both:

- **Gameplay logic**: MonoBehaviour/Actor components (ergonomic, editor-friendly).
- **Bulk simulation**: ECS (particles, crowds, physics, large worlds).

Unity bridged via "conversion" (GameObject → Entity in SubScene). Unreal bridges via Mass (MassEntity + MassAgent). This dual-track is the current industry best practice.

## 9. Rules for Component Design

1. Components should own a single responsibility.
2. Components should not know each other's internals — communicate via events/commands.
3. Components should serialize cleanly (for inspectors, save games, netcode).
4. Avoid `Update()` when the value is static (dirty flag pattern).
5. Prefer editor-inspecting fields over code-initialized values for game tuning.
6. Provide meaningful debug Gizmos/visualization for every gameplay component.