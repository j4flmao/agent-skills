---
title: Collision Primitives
description: Sphere/AABB/OBB/ray/plane/frustum tests, fast ray-AABB slab, SAT and filtered collision query patterns.
---

# Collision Primitives — Deep Reference

## 1. The Primitives

| Shape | Represented | Fields |
|-------|------------|--------|
| Sphere | `{ Vec3 c; float r; }` | center, radius |
| AABB | `{ Vec3 min, max; }` | axis-aligned box |
| OBB | `{ Vec3 c; Vec3 axes[3]; Vec3 half; }` | center + 3 unit axes + half-extents |
| Ray | `{ Vec3 o; Vec3 d; }` | origin + normalized direction (or any t>0 direction) |
| Plane | `{ Vec3 n; float d; }` | n·x = d |
| Frustum | 6 planes | left, right, top, bottom, near, far |

## 2. Order-of-Test Hierarchy

Filter cheap → expensive so trash tests bail fast:

1. Sphere-sphere: `|d|² <= (r1+r2)²` — 3 adds, 3 mul, compare.
2. Sphere-AABB: clamped distance² ≤ r².
3. Ray vs sphere: quadratic, branchless-ish.
4. AABB-AABB: 6 compares (`max min < min max` each axis).
5. OBB-OBB / OBB-AABB: SAT.
6. Triangle/ray: Möller–Trumbore (after a tri AABB reject).

## 3. Fast Ray-AABB (Slab)

```cpp
// From "Fast, Branchless Ray/Bounding Box Intersection" (Williams et al.)
bool RayAABB(const Ray& r, const AABB& b, float* tIn, float* tOut) {
    float tmin = 0.0f, tmax = INFINITY;
    for (int a = 0; a < 3; ++a) {
        float invD = 1.0f / r.d[a];
        float t0 = (b.min[a] - r.o[a]) * invD, t1 = (b.max[a] - r.o[a]) * invD;
        if (invD < 0) std::swap(t0, t1);
        tmin = std::max(tmin, t0); tmax = std::min(tmax, t1);
        if (tmax < tmin) return false;
    }
    *tIn = tmin; *tOut = tmax;
    return true;
}
```

Branchless variants avoid the swap; on most compilers the `min/max` version is roughly equal and clean. Use it for BVH traversal, culling, picking.

## 4. Sphere-Frustum (Cheap, Primary Cull)

```cpp
bool SphereInFrustum(Frustum f, Vec3 c, float r) {
    for (int i = 0; i < 6; ++i)
        if (dot(f.planes[i].n, c) - f.planes[i].d > r) return false;
    return true;
}
```
All draw-call and stream culling starts here (sphere or AABB of the object vs the frustum 6 planes).

## 5. SAT (Separating Axis Theorem) — OBB Tests

For two convex shapes there exists a separating axis if some axis tests fail to overlap. OBB uses candidates: the 3 axes of each + 9 cross products.

- AABB-OBB: 3 OBB axes already align — test only the OBB's axes (fast!).
- OBB-OBB: 15 tests (3+3+9). Early-out on any absence → usually exits after 1–2 tests.

```cpp
// For each axis u: projection intervals [p1lo,p1hi], [p2lo,p2hi] must overlap.
```

## 6. Ray-Triangle (Möller–Trumbore)

```cpp
bool RayTriangle(const Ray& r, Vec3 v0, Vec3 v1, Vec3 v2, float& tOut, float& u, float& v) {
    Vec3 e1 = v1 - v0, e2 = v2 - v0;
    Vec3 p = cross(r.d, e2);           // main term
    float det = dot(e1, p);
    if (fabsf(det) < 1e-8f) return false;      // parallel
    float inv = 1.0f / det;
    Vec3 s = r.o - v0;
    u = dot(s, p) * inv;
    if (u < 0 || u > 1) return false;
    Vec3 q = cross(s, e1);
    v = dot(r.d, q) * inv;
    if (v < 0 || u + v > 1) return false;
    tOut = dot(e2, q) * inv;
    return tOut >= 0;
}
```

Only after a triangle-level check that passes broad-phase reject (tri AABB test first).

## 7. Ray-Sphere

```cpp
// |o + t·d - c|² = r² → solve quadratic; reject t < 0; keep min positive.
```

## 8. Query Patterns (Collision / Raycast)

- **Raycast to a packed BVH**: node AABB slab first; recurse; triangle tests at leaves.
- **Volume query** (sphere swept): broad-phase spheres vs grid/hash (see `spatial-partitioning`).
- **Use the hierarchy, not brute force**: O(n²) is a design smell in anything hot.

## 9. Numerical Care

- `1e-8` epsilon for det (ray-triangle); enormous parallel cases to NaN. Scale-aware: divide epsilon by the triangle size.
- Frustum plane normalization (or keep un-normalized and correct dot).
- AABB min/max: never allow `min > max` from a bad transform — normalize at write.
- Ray direction need not be normalized (t becomes parametric units), but keep a documented convention; distance checks assume normalized for comparability.

## 10. Checklist

- [ ] Cheap→expensive filtering (sphere→short→exact).
- [ ] Branchless/fast slab for ray-AABB + BVH.
- [ ] Sphere-frustum as the primary obj cull.
- [ ] OBB SAT including the 9 cross axes; AABB-OBB shortcut.
- [ ] Möller–Trumbore with epsilon scale-safe.
- [ ] No O(n²) hot collision; always a spatial index.