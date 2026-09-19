---
title: Curves and Interpolation
description: lerp/slerp, easing families, Catmull-Rom, cubic Beziers, paths and frame-rate-independent interpolation for game engines.
---

# Curves & Interpolation — Deep Reference

## 1. The Base Ops

| Op | Result |
|----|--------|
| `lerp(a, b, t) = a + (b-a)*t` | linear; `t∈[0,1]` |
| `nlerp(Quat a, Quat b, t)` | normalize(lerp) — the standard cheap rotation blend |
| `slerp(Quat a, Quat b, t)` | shortest-arc rotation (`quaternion.md` §4) |
| `smoothstep(t) = t*t*(3-2t)` | near-circular ease, cheap |
| `smootherstep(t) = t*t*t*(t*(t*6-15)+10)` | C2 ease |

## 2. The Easing Family

Provide as a table driven `t → eased t`:

| Easing | Formula idea | Use |
|--------|--------------|-----|
| `easeIn` | `t^k` | start slow (enter scripts, doors) |
| `easeOut` | `1-(1-t)^k` | end slow (menus, pickups) |
| `easeInOut` | piecewise/`smoothstep` | most UI |
| `easeOutBack` | overshoot past 1 (`1+2.70158t³-1.70158t²` lightly) | lively pop-ins |
| `easeInElastic` | oscillate into 1 | playful FX |

Implement each as `float ease(type, t)`; all cheap algebraic — no allocations.

## 3. Frame-Rate-Independent Interpolation

Interpolating with `t` in *frame time* drifts on variable FPS. Fix: parameterize by **duration**:

```cpp
struct AnimClip { float dur; float t; void update(float dt) { t = min(t + dt/dur, 1.f); } };
```

For netcode interpolation: interpolate between two snapshots by `alpha = accumulator/fixedDt` (see `multiplayer-netcode`, `game-loop-and-timestep`).

## 4. Catmull-Rom Splines

Passes *through* the control points (good for camera paths, roller coasters, level guides):

```cpp
Vec3 catmullRom(Vec3 p0, p1, p2, p3, float t) {
    // hermite basis:
    float t2=t*t, t3=t2*t;
    return 0.5f * (
        (2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3);
}
```

- C1 across segments (piecewise update only needs p-1..p+2).
- Arc-length parameterization if you need constant speed (`reparametrize` by table so `t`≠distance unless asked).

## 5. Cubic Beziers

`B(t) = (1-t)³P0 + 3(1-t)²t P1 + 3(1-t)t²P2 + t³P3` (de Casteljau). Use:
- UI easing (`cubic-bezier(0.17, 0.67, ...)`).
- Path drawing, curve editing.
- Animation motion (with control points as authoring handles).

## 6. Paths & Spline Namespace

Provide a `Path` (list of keyframed points + `t → position/direction/tangent`) built on Catmull-Rom. Precompute a **spline-length table** so `Path::AtDistance(d)` is O(log n), avoiding speed wobble on corners. Provide `tangent(prev,next)` for camera orients.

## 7. Interpolating Non-Scalars

- Colors: `lerp` per channel (gamma-correct if needed; usually fine in linear space).
- Vectors: `lerp`/`smoothstep`.
- Transforms: `nlerp(rot) * lerp(pos,scale)`.
- Angles (`-π..π`): wrap before lerp (`interpAngle`).

## 8. Avoiding Drift & Jitter

| Bug | Fix |
|-----|-----|
| `t` accumulates from global frame time | intrinsic `dur` param |
| slerp long-arc | sign fix (see quaternion) |
| spline speed wobble | arc-length table |
| interpolation at absolute epoch | don't; keep local |
| easing applied twice | one scaffold function |

## 9. Testing

- `interp(0)=a, interp(1)=b` exact.
- Monotonicity for `t∈[0,1]` (assert).
- Spline passes through intermediate keys (`catmullRom(p1)` at t=0 and t=1 = p1? — at t it's between; verify continuity: `catmull(p0..p3,1) == catmull(p1..p4,0)`).

## 10. Checklist

- [ ] lerp/nlerp/slerp/smoothstep/smootherstep base.
- [ ] Easing families (in, out, inout, back, elastic) cheap.
- [ ] Frame-rate-independent (duration-based).
- [ ] Catmull-Rom + arc-length `AtDistance`.
- [ ] Cubic Beziers + de Casteljau.
- [ ] Color/angle/transform wrappers.
- [ ] Unit tests: endpoints + continuity + monotonic.