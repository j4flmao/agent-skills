---
name: physics-engine
description: Expert physics engine internals - collision detection (broad/narrow phase), rigid body dynamics, constraint solvers, integration, character controllers, and scene queries.
---

# Physics Engine Internals — Deep Guide

A physics engine simulates rigid bodies through three pipelines every tick: **collision detection** (find contacts), **collision resolution** (apply impulses/constraints), and **integration** (advance positions/velocities). This guide gives a lead engineer's view of how real engines (PhysX, Jolt, Bullet, Box2D) work underneath.

## 1. The Physics Step Pipeline

```
1. For each body: apply forces -> linear/angular velocity (accelerate)
2. Broad-phase:  generate candidate pairs of AABB-overlapping bodies
3. Narrow-phase: exact contact detection -> contact manifold (points, normals, penetration)
4. Constraint solver: iterate contacts + joints to correct penetration & velocities
5. Integration:   x += v * dt; Rot += omega * dt (per body)
6. Sleep/wake:    mark bodies nearly at rest for deactivation
```

### 1.1 Determinism vs Performance

- Fixed timestep required (see `skills/game/game-engine/patterns/SKILL.md` → game-loop section).
- Deterministic engines (rollback netcode, replays) must avoid unordered map iteration, use fixed float ops, and sort contact manifolds deterministically.

## 2. Broad-Phase Collision Detection

Goal: reject distant pairs cheaply; output pairs of possibly-intersecting AABBs.

### 2.1 Sweep-and-Prune (SAP)

- Sort AABB min/max along one/main axis; maintain lists; in the sorted order, intervals that overlap can be tracked incrementally.
- O(N log N) sort + O(N + P) query.
- Great when most overlap is on one axis and lists are already nearly sorted frame-to-frame.

### 2.2 Dynamic Bounding Volume Hierarchy (DBVH)

- Tree of AABBs; leaf = one body; internal node = union.
- Insert/remove/update with surface-area-heuristic (SAH) rebalancing.
- O(log N) queries; supports fast updates per moving-body (refit, not rebuild).
- Used by PhysX, Jolt, most modern engines.

```cpp
class DbvhNode {
    AABB box;
    DbvhNode* parent;
    DbvhNode* children[2];   // internal
    int32_t bodyIndex;       // leaf: body id
    int32_t height;
};
// update: if (invalidated) reinsert; else refit bbox walking up the tree
```

### 2.3 Uniform Grid / Hash Grid

- Cell-keyed hash of body IDs in each cell; only adjacent cells checked.
- Best for uniform-distribution particles (SPH, crowds). Non-uniform scenes degenerate — use hierarchical grid.

## 3. Narrow-Phase Collision

Given a pair, compute contact geometry: point(s), normal, penetration depth.

### 3.1 The Collider Zoo

| Shape | Query cost | Notes |
|-------|-----------|-------|
| Sphere | O(1) | cheap, common for ragdolls/CCD |
| Box (AABB/OBB) | O(1) | standard |
| Capsule | O(1) | characters (built from 2 spheres + cylinder) |
| Triangle mesh (static) | O(log N) via BVH | world geometry |
| Convex hull | O(log N) via facing/support | player phys |
| Heightfield | O(log N) | terrains |

### 3.2 SAT (Separating Axis Theorem)

For convex vs convex: if a separating axis exists, no collision. Project both shapes onto each candidate axis (edge + face normals); if separated → done; else find minimum overlap axis → contact plane.

### 3.3 GJK + EPA

- **GJK**: fast convex-vs-convex *boolean* test using Minkowski difference and evolving simplex; O(log N) iterations.
- **EPA**: extends GJK to extract penetration depth + normal (expanding polytope).
- Best for arbitrary convex hulls; less numerically fragile than SAT for many axes.

### 3.4 Contact Manifold

Result of narrow-phase: a contact manifold:

```cpp
struct ContactPoint { Vec3 localA, localB, normal, position; float penetration; };
struct Manifold {
    ContactPoint points[4];   // up to 4 (box-box), reduced for others
    Vec3 normal;              // shared frame
    Body* a, * b;
};
```

Simplify: reduce to 1-1 points for spheres, up to 4 for box/box. Give the solver a small set of contact points, NOT the full polygon intersection.

## 4. Collision Resolution — the Solver

### 4.1 Impulse-Based vs Penalty

| Method | Approach | Used by |
|--------|----------|---------|
| **Impulse-based (constraint solver)** | Compute change in velocity per contact to satisfy non-penetration | PhysX, Jolt, Bullet, Box2D |
| Position-based dynamics (PBD/XPBD) | Direct position correction, stable for cloth/soft | many UE chaos modes / Unreal cloth |
| Penalty force | spring force pushing apart | simple engines; unstable at large dt |

### 4.2 The Sequential Impulse Solver (per contact)

For each contact: relative velocity at contact point

```
v_rel = (v_b + w_b x r_b) - (v_a + w_a x r_a)
vn = dot(v_rel, n)                // approach velocity along normal

// bias: penetration restitution (bounce)
e = restitution(a,b)
j = -(1 + e) * vn / (invMass_a + invMass_b + r cross terms)
v_a -= j * invMass_a * n ; v_b += j * invMass_b * n
// + angular impulse terms
```

Iterate all contacts several times (4-20 iterations) to converge a global solution — each contact affects others.

### 4.3 Friction

Apply two orthogonal tangent impulses:

```
t = v_rel - dot(v_rel,n)*n   (tangent direction)
jt = clamp(-v_rel_t * 1/(totalInvMass...), -mu*jn, mu*jn)
```

Use `mu` = Coulomb coefficient (static/dynamic blend).

### 4.4 Solver Order & Warm Starting

- Order contacts (e.g., by penetration) matters for determinism.
- **Warm starting**: store previous-frame impulses and apply them as initial guesses → stable stacks, big speedup.
- Contact persistence: keep manifolds between frames (don't rebuild) so stacks stay stable.

## 5. Integration

### 5.1 Choosing the integrator

| Method | Stability | Cost | Use |
|--------|-----------|------|-----|
| Explicit Euler | unstable (energy gains) | 1x | never in production |
| Semi-implicit Euler | stable, standard | 1x | default rigid-body |
| Verlet | good energy | ~1.3x | cloth, particles |
| RK4 | high accuracy | 4x | precise simulation/ragdolls |

Semi-implicit (symplectic):

```
v += a * dt
x += v * dt        // velocity updated BEFORE position
```

### 5.2 Rigid Body State

```cpp
struct RigidBody {
    Vec3 position;
    Quat rotation;
    Vec3 linearVelocity, angularVelocity;
    float invMass, invI[3];      // inverse inertia tensor (diagonal local space)
    Vec3 force, torque;          // accumulated this tick
    bool sleeping;
};
```

Integrate rotation: apply angular velocity about local axes via quaternion derivative and normalize.

### 5.3 CCD (Continuous Collision Detection)

High-speed small objects tunnel through thin walls at large dt. Solutions:
- Swept line/ball vs world (PhysX CCD): expand collider along velocity, find first hit.
- Substeps: split dt into smaller steps for fast movers only.
- Cast-double-check: `sweep` a test then narrow-phase at midpoint.

Rule: CCD only for fast bodies vs static world (never CCD-vs-dynamic — expensive/nonsensical).

## 6. Joints & Constraints

- **Distance joint**: keeps 2 anchor points at fixed distance.
- **Revolute joint (hinge)**: rotate about one axis.
- **Prismatic joint**: slide along one axis.
- **Ball/socket**: 3-MOI constraint point.
- **Pulley / gear**: derived from distance/velocity ratios.

Constraint form: `C = 0` (position) → `Cdot = J * v = 0` (velocity). Solve with the same sequential impulse pattern using Jacobian `J`.

```cpp
// generalized velocity constraint solve
lambda = -(J v + bias) / (J M^-1 J^T)
v = v + M^-1 J^T lambda
```

## 7. Sleeping & Activation

- Bodies accumulate kinetic energy; if below threshold for N ticks, mark `sleeping`.
- Wake via: any new contact/impulse, joint activity, or external query of sizable magnitude.
- Deterministic order: wake in fixed order, not map order.

## 8. Character Controllers

PhysX/Jolt expose character controllers that are NOT rigid-body player physics:

- Capsule body, ray/sweep down to floor.
- Move with `move_and_slide`-style: attempt move; slide along obstacles (collide-and-slide).
- Step over small obstacles (max step height), avoid vertical tunneling on slopes.

Implement yourself (matching forced checkpoints), or use engine built-in (Godot `CharacterBody3D`, Unreal `CharacterMovementComponent`, Unity `CharacterController`).

## 9. Scene Queries (Raycasts / Overlaps)

```cpp
// raycast against static + dynamic
Hit hit;
physics.rayCast(origin, dir, maxDist, out hit);
// overlap test
physics.overlapSphere(pos, radius, filter, out bodies[]);
```

Rules:
- Batch queries; per-frame thousands of raycasts in a loop → use `QueryFilterCallback` and broad-phase fast paths.
- Respect layer masks so objects don't self-collide.
- Cache query results when they don't need per-frame freshness.

## 10. Determinism & Networking

- Game server physics: authoritative; clients never simulate physics that matters for gameplay.
- Replays: log the *input stream* + fixed-step physics; deterministic engines can reproduce.
- Float determinism: same binary across all clients; avoid `sqrt` in solver hot paths where precision differs (or order-preserve).
- Lockstep (RTS): same inputs ticked identically; requires tick-aligned inputs with delay.

## 11. Tuning Cheat-Sheet

| Symptom | Fix |
|---------|-----|
| Jittery stack of boxes | warm-starting missing; iterations too low (>=8) |
| Tunneling bullets | CCD or substeps for fast bodies |
| Ragdoll explodes | solver iterations low; joints wrong axes; dt too big |
| Character sinks in floor | max step vs penetration resolution mismatch; reproject |
| Spinning car on apex | angular damping missing; inertia too low |
| Non-deterministic replays | map iteration + warm-start order |
| Sleeping bodies never wake | wake threshold too high |

## 12. Engine Comparison (when to choose what)

| Engine | Strengths | Weaknesses |
|--------|-----------|-----------|
| **PhysX** (Unity) | proven, fast, great docs; Unity built-in | closed-source dev; Unity's API hides internals |
| **Jolt** (Godot option, Hotline Miami dev) | open source, high-perf, deterministic, excellent for immersion | smaller ecosystem |
| **Bullet** | open source, cross-platform, legacy w/ known bugs | older code, less friendly API |
| **Box2D** | best 2D solver; tiny, fast | 2D only |
| Unity DOTS Physics | ECS-native, burst-friendly | complex, newer |

## 13. References

- `skills/game/game-engine/patterns/SKILL.md` — engine patterns (game loop, fixed timestep)
- `skills/game/game-engine/patterns/references/spatial-partitioning.md` — broad-phase data structures
- `skills/game/game-engine/ecs-pattern/SKILL.md` — ECS storage relevant to physics hotspots
- `skills/game/game-engine/ecs-pattern/references/ecs-netcode.md` — deterministic sim across the wire
- `skills/game/multiplayer-netcode/SKILL.md` — server-authoritative simulation