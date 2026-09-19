---
title: Transform Conventions and Handedness
description: Row vs column convention, handedness, T·R·S composition, world/local inverse, AABB-from-transform and coord-system harmonization.
---

# Transforms & Conventions — Deep Reference

## 1. The One-Time Convention Decision

Pick and document once:
- **Vector convention**: row vectors × matrices (`v*M`, D3D/DirectXMath) → matrices usually left-handed. Column vectors `M*v` (GL math) → right-handed typical.
- **Handedness**: engine world = right-handed Z-up (common AAA) vs left-handed Y-up. Whatever you pick: **convert at import, not in 50 plugins**.

```cpp
// SEC: a single `CoordSpace::ToEngine(...)` per external tool input.
// Folders: tools/*/Convert → three files each doing the Y-up→Z-up flip.
```

## 2. T·R·S Composition

`World = Parent * T * Rx * Ry * Rz * S`:

```cpp
struct Transform { Vec3 pos; Quat rot; Vec3 scale; };
Transform mul(Transform a, Transform b) {
    // a∘b: result pos = a.rot*(b.pos*a.scale) + a.pos ; rot = a.rot*b.rot ; scale = a.scale*b.scale
}
```

Rules:
- **Scale then rotate then translate** is the standard (games, engines).
- Non-uniform scale + rotation = only valid if matrices; represent as matrix if needed.
- Never rotate with rotation matrix if quats suffice.

## 3. World → Local Without a Full Inverse Matrix

```cpp
Transform inverseLocal(Transform w, Transform p) {   // world→parent space
    return {
        p.rot.conj() * (w.pos - p.pos),   // translate back
        p.rot.conj() * w.rot,
        { 1/w.scale.x, 1/w.scale.y, 1/w.scale.z }
    };
}
```
Skips building/assembling a whole mat4 inverse. Unit test: `mul(w, inverseLocal(w,p)) == p` within eps.

## 4. Building World Matrices for Render

Convert Transform → mat4 once per entity at render time (hot path):

```cpp
Mat4 toMatrix(Transform t) {
    Mat4 r = t.rot.toMat3();
    r.col3 = t.pos;              // + translation
    r = r * Mat4::Scale(t.scale);
    return r;
}
```
Batch: an SoA of transforms → SIMD matrix build (see `simd.md`).

## 5. AABB from Transform

Don't AABB-by-transforming 8 corners (slow + wrong).

```cpp
AABB transformedAABB(Transform t, AABB local) {
    // world = |scale| * |rot| * local + pos
    Vec3 extent = abs(t.rot.toMat3()) * (local.extent * t.scale);
    return { t.pos - extent, t.pos + extent };
}
```
`abs(matrix)` is the correct growth for rotations — a cube rotated 45° grows its AABB by √2 along the diagonal: the math handles it.

## 6. Frustum / Camera Spaces

Camera has: world transform + projection matrix. Convert a point to view space: `viewPos = inverseWorld * worldPos`. Clipping planes derived from view matrix rows (column-major) or columns (row-major) — be consistent (mismatched clipping = disappearing shadow geoms).

## 7. Handedness & Cross-Product Consistency

- Right-handed: `cross(X, Y) = Z`.
- Left-handed: `cross(X, Y) = -Z` (or Z points toward viewer).
- Normal winding: CCW (right-handed) vs CW — affects backface culling; keep winding consistent through the pipeline (glue at import).

Documentation bits to nail early (put in `math-foundation` roots):
```
Convention: row-vector · mat; right-handed, Z-up; +forward = +Z; CCW front faces; scale-then-rotate-then-translate.
```

## 8. Determinism Under Conventions

- All platforms use the *same* convention → no platform dimmer world.
- The netcode state serializer must fix the same axis order (no per-platform confusion).
- Replay/tools: same coordinate math in editor as gameplay (else editing differs from running).

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Two conventions in one tree | one documented convention; review-in-CI |
| Scale after rotate | wrong non-uniform scale handles |
| Full matrix inverse for local-space | combine-inverse formula |
| AABB via 8-corner transform | abs(rot)*extent |
| Handedness flip in 1 importer | centralized coord converter (see §1) |
| Frustum derived from half-half different convention | one camera->clip path |

## 10. Checklist

- [ ] One convention documented (row/col, handedness, Z-up/Y-up, winding).
- [ ] Import-time coord conversion centralized.
- [ ] World→local via combined inverse, no full mat4 inverse.
- [ ] AABB from transform via abs(rot).
- [ ] Deterministic axes across platforms.
- [ ] Unit tests for composition + inverse + AABB growth.