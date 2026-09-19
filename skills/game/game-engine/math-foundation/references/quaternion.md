---
title: Quaternion Foundation
description: Quaternion algebra, composition, slerp/nlerp, axis-angle, drift correction, matrix round-trip and common bugs.
---

# Quaternions — Deep Reference

## 1. Why Quaternions

- 4 scalars (`i²=j²=k²=ijk=−1`), no gimbal lock, smooth interpolation, cheap compose.
- All engine rotations should use them; Euler only for authoring/debug display.

Representation: `q = (qx, qy, qz, qw)` where `qw` is the scalar part.

## 2. Core Algebra

```cpp
inline float dot(Quat a, Quat b) { return a.x*b.x + a.y*b.y + a.z*b.z + a.w*b.w; }
inline Quat mul(Quat a, Quat b) {
    // a THEN b composition:
    return {
        a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
        a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
        a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
        a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z };
}
```
Note: `mul(a,b)` = apply b first then a (body-frame convention) — document once.

## 3. Quat-Vector Rotation

```cpp
inline Vec3 rotate(Quat q, Vec3 v) {
    Vec3 t = 2.0f * cross(q.xyz, v);
    return v + q.w * t + cross(q.xyz, t);      // Rodrigues, no matrix
}
```
This is the fastest rotate (2 cross + FMA). For many vectors, precompute the equivalent 3x3 (`toMat3`) once.

## 4. Sign & Interpolation

### 4.1 The Sign Flaw

`q` and `-q` are the same rotation. `slerp(q1, q2, t)` with `dot<0` walks the long arc → the classic full-spin bug. Always:

```cpp
Quat slerp(Quat a, Quat b, float t) {
    float d = dot(a, b);
    if (d < 0.0f) { b = -b; d = -d; }
    float theta = acosf(clamp(d, -1, 1)), so = sinf(theta);
    if (so < 1e-6f) return nlerp(a, b, t);
    float wa = sinf((1-t)*theta) / so, wb = sinf(t*theta) / so;
    return wa * a + wb * b;
}
```

### 4.2 nlerp (cheap slerp)

`normalize(lerp(a,b,t))` — visually equivalent for small arcs, 2 add + rsqrt + 2 mult. Standard for animation blending at scale; slerp where exactness matters (camera).

## 5. Axis-Angle & Matrix Round-Trip

```cpp
Quat fromAngleAxis(float ang, Vec3 axis) {
    float h = ang * 0.5f, s = sinf(h);
    return { s*axis.x, s*axis.y, s*axis.z, cosf(h) };
}
Mat3 toMat3(Quat q) {
    // standard; row-major per convention.
    // validate: return roughly identity transform for q=identity.
}
```

Round-trip pitfalls:
- `toMat3` then `fromMat3` must reproduce within 1e-6 (assert in unit test).
- Non-unit inputs bread drift → normalize at call sites.

## 6. Drift & Normalization Discipline

- Composing per-frame drifts magnitude ~1e-6/frame × 10k frames = visible. Normalize once after an update cycle (cheap, `rsqrt`).
- Keep a *guaranteed identity* unit test (normalize to within 1e-7).

## 7. The Look-At / FromCardinal

```cpp
Quat lookAt(Vec3 dir, Vec3 up);     // build rotation aligning +Z to dir
Quat alignTo(Vec3 from, Vec3 to);   // smallest rotation taking from→to:
    Vec3 v = cross(from, to);
    float w = sqrt(dot(from,from)*dot(to,to)) + dot(from,to);
    return { v.x, v.y, v.z, w }.normalized();
```

Rarely but vital for characters, camera rigs, particles alignment.

## 8. Common Bugs

| Bug | Symptom | Fix |
|-----|---------|-----|
| Slerp without sign fix | character spins 360° | flip b when dot<0 |
| Composition order | rotates wrong way | document + test "apply q2 then q1" |
| Non-normalized input | weird interpolation | normalize at API boundary |
| Euler on hot path | gimbal lock + slow | get rid of Euler internally |
| `toMat3/fromMat3` mismatch | identity test fails | symmetric impl + unit test |
| `-q` used for `q` | mirror images | sign canonicalization (w>=0) at serialize |

## 9. Serialization & Netcode

- Serialize quats as **canonical**: ensure `w >= 0` (flip sign) so byte-compare deterministic + smallest-delta quantization for netcode (see `multiplayer-netcode`).
- Quantize: `q = 4-component` → 3-component smallest-three (the "smallest three" trick) saves 25%.

## 10. Checklist

- [ ] All rotations via quats (no Euler in sim).
- [ ] Sign-correct slerp; nlerp for mass blending.
- [ ] Periodic normalization with drift test.
- [ ] Symmetric mat↔quat with unit-test identity.
- [ ] Canonical serialization (w≥0) for netcode.
- [ ] `lookAt`/`alignTo` utilities.