---
name: math-foundation
description: Expert game engine math foundation — SIMD vectors/matrices, quaternions, transforms, interpolation, collision primitives, curves and numerical stability under real-time budgets.
---

# Math Foundation — Deep Engineering Guide

Every frame pushes millions of floats through vectors, matrices, quaternions, and collision tests. Math is the substrate: correct under 16.6 ms, deterministic for netcode, and SIMD-friendly or it dies. This skill covers the core math library every engine needs.

## 1. The Canonical Type Set

| Type | Represents | Memory |
|------|-----------|--------|
| `float2/3/4` | position, uv, color, dir | 8/12/16 B |
| `quat` | orientation | 16 B |
| `mat3/mat4` | transforms, projections | 36/64 B |
| `aabb`, `sphere`, `plane`, `frustum` | volume queries | 24/16/16/64 B |
| `ray` | intersection tests | 32 B |
| `transform` (pos, rot, scale) | rigid + scale | 48 B (hot tier) |

Rules:
- **Value types**, `struct` (not class), no vtables — SIMD can then reinterpret.
- **NaN/Inf guards**: default init to 0; assert on non-finite inputs in hot paths.
- Deterministic math when needed (see §6).

## 2. SIMD: The Practical Diet

### 2.1 The SIMD Types

`float4` maps to `__m128` (SSE), `float4x4` to rows of `__m128`. Use intrinsic headers you control (or DirectXMath/Eigen/SIMD eigen) rather than accidental scalar loops.

```cpp
struct alignas(16) float4 { float x, y, z, w; };
// SSE: _mm_add_ps(a, b) etc.
inline float4 FMA(float4 a, float4 b, float4 c) {
    return _mm_fmadd_ps(a, b, c);   // a*b + c — 1 instr, no rounding split
}
```

### 2.2 Alignment & Layout

- `alignas(16)` on every SIMD type (avoid `memcpy` warnings, use `aligned_alloc(16, …)`).
- Hot arrays (vertex pos, transforms) live in SoA SIMD lanes (§ in memory skill).
- Avoid `-ffast-math` unless you know: it breaks NaN propagation (netcode determinism).

### 2.3 When SIMD Matters Most

Matrix×Vector, quaternion×vector, AABB test packs, and any tight loop with uniform ops. At 100k transforms: SIMD mat×vec = ~4–8x over scalar.

## 3. Quaternions: The Correct Rotation

### 3.1 Why Not Euler

Gimbal lock (order-dependent), non-unique representations, bad interpolation. Quaternions: 4 floats, no gimbal lock, `slerp` smooth, compose cheaply.

### 3.2 The Core Ops

```cpp
quat mul(q1, q2);        // compose: apply q2 first, then q1. ~8 mults via SIMD
vec3  rotate(q, v);      // q v q^-1  →  t=2 cross(q.xyz,v);  v + q.w*t + cross(q.xyz,t)
quat  slerp(a, b, t);    // shortest arc, accounting for sign (a·b<0 → negate b)
quat  nlerp(a, b, t);    // cheap approx (normalize lerp); fine for small arcs
quat  fromAngleAxis(angle, axis);     // normalized
quat  fromMat4(m);/mat4 toMat4(q);    // round-trip must preserve axis/angle
```

### 3.3 The Sign Problem

`q` and `-q` represent the same rotation. Correct **slerp/nlerp**: if `dot(a,b) < 0`, flip `b` sign first (else the path follows the long way). Meets every engine bug report: "model spins 360° on t=0..1".

### 3.4 Normalization Drift

Composing 1k quats drifts norm → normalize periodically (per-frame per-transform), cheap with `rsqrt`.

## 4. Transforms & Coordinate Conventions

### 4.1 Transform Composition

World transform = `T(parent) * R * S` (translation × rotation × scale, parent-first). Store as `Transform { pos, rot, scale }`; combine for children.

Convention decision (critical, document it):
- **Row vectors × matrices** (D3D-style) or **column vectors** (GL style)? Pick ONE for the whole engine + renderer; document in the codebase header; mismatch = mirrored sprites.

### 4.2 Handedness

- Engine convention: e.g., **right-handed, Z-up** (DOOM/Unreal) vs **Z-forward left-handed (Unity-ish)** — pick and convert at import (see `import-and-cook`).
- All camera/projection/shadow conversions flow through one place to avoid 50 copies of the flip.

### 4.3 Fast Paths

- World→local: combine inverse `T * R^-1 * S^-1` without building a full inverse matrix.
- AABBs re-computed from transform (or a 3-vector math) — cheaper than matrix multiply then recompute box.
- LOD/stream culling: cheap sphere test first, then exact.

## 5. Numerical Stability

### 5.1 The Sneaky FP Facts

- `a+b+c != (a+b)+c` (float non-associativity).
- `0.1f` is not `0.1`.
- Large + small = the small is lost (catastrophic cancellation near equal values).

### 5.2 Mitigations

- Use `double` for accumulation templates (ray-tracing accumulators, physics) — speed cost acceptable there.
- Long lerps / slerps: interpolate `t` relative to start, not absolute.
- `epsilon` comparisons with `std::numeric_limits<T>::epsilon() * errorScale`, never `a == b`.
- Retain a "stable normal" path: recompute normals from the transform each frame.

### 5.3 Determinism (Netcode Critical!)

- No `-ffast-math`, no FMA being used in some builds but not others, same `float` ops per platform.
- Fixed-point integer math for lockstep position where feasible (see `determinism.md`).
- Deterministic `sqrt`/`sin` implementations cross-compiler (see multiplayer netcode determinism references).

## 6. Collision Primitives

### 6.1 The Primitive Zoo

| Shape | Store | Tests |
|-------|-------|-------|
| Sphere | center r | sphere-sphere (|d|² ≤ (r1+r2)²) |
| AABB | min max | overlap, point-in, ray-slab |
| OBB | center, axes(3 rot), halfsizes | SAT |
| Ray | o, d(t) | sphere, aabb (slab), triangle (Möller–Trumbore) |
| Plane | n·p = d | side, distance |
| Frustum | 6 planes | tight test: sphere + box + point |

### 6.2 Prioritize Cheap → Expensive

Collision/streaming queries:
1. Sphere vs frustum (cheap) → skip.
2. AABB/AABB exact.
3. OBB/OBB via SAT only when needed.
4. Triangle/ray only on candidate hits.

### 6.3 Ray-AABB Slab (fastest shape test)

```cpp
bool RayAABB(Ray r, AABB b, float& tmin, float& tmax) {
    float t0 = DBL_MIN, t1 = DBL_MAX;
    for (int a = 0; a < 3; ++a) {
        float inv = 1.0f / r.d[a];
        float tNear = (b.min[a] - r.o[a]) * inv;
        float tFar  = (b.max[a] - r.o[a]) * inv;
        std::swap if inverted...
        t0 = max(t0, tNear); t1 = min(t1, tFar);
        if (t0 > t1) return false;
    }
    return true;
}
```

The 3-iteration slab test beats general AABB intersection on hot paths.

## 7. Curves & Interpolation

| Curve | Use | Notes |
|-------|-----|-------|
| `lerp` | positions, colors, alpha | scalar/vector |
| `slerp`/`nlerp` | rotations | sign-correct |
| `smoothstep` | easing | `t*t*(3-2t)` cheap |
| Catmull-Rom | camera splines, paths | C1 continuous through points |
| Cubic Beziers | UI/easing/curves | de Casteljau |

### 7.1 The Easing Family

Linear → use `EaseInOut` for UI, camera; avoid linear for non-linear feel. Include `easeOutBack(s)`, `easeInOutCubic`, etc. Table-driven `t` function + cheap.

## 8. The Math Library Checklist (Lead-Level)

1. Value types, SIMD-aligned, deterministic (no fast-math).
2. Quaternions everywhere for rotation; sign-correct slerp; periodic normalization.
3. One matrix convention documented end to end.
4. Collision tests ranked cheap→expensive; slab/static fast paths.
5. Numerical stability patterns (double accumulators, relative epsilon, no `==`).
6. Easing/curves table.
7. Unit tests: properties (round-trips, orthonormality, no drift), fuzz a few.

## 9. Unit-Testing the Library

- Algebraic identities: quat compose distributes; inverse round-trips; slerp endpoints exact.
- Determinism: run same sim under MSVC+GCC+Clang, compare hashes.
- SIMD vs scalar reference within epsilon.
- Fuzz: random transforms → inverse → reconstruct, assert within tolerance.
- NaN/Inf injection: assert allfinite guards fire.

Ship a `math_self_test` executable run in CI.

## 10. References

- `references/simd.md` — SIMD intrinsics, alignment, SoA, FMA/fast-math, specialized mat×vec
- `references/quaternion.md` — algebra, composition, slerp/nlerp, axis-angle, drift fix, matrix round-trip
- `references/transforms.md` — conventions, handedness, T·R·S, world/local inverse, AABB from transform
- `references/numerical-stability.md` — FP facts, cancellation, determinism, epsilon discipline
- `references/collision-primitives.md` — sphere/aabb/obb/ray/plane/frustum tests, slab ray-AABB, SAT
- `references/curves-and-interp.md` — lerp/slerp, easing family, Catmull-Rom, Beziers, frame-rate independent