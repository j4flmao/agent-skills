---
title: Numerical Stability and Determinism
description: Float pitfalls, catastrophic cancellation, epsilon discipline, and cross-platform deterministic math for game engines.
---

# Numerical Stability & Determinism — Deep Reference

## 1. Float Facts That Bite

| Fact | Example |
|------|---------|
| Non-associativity | `(a+b)+c != a+(b+c)` |
| Precision loss | `1e8f + 1f == 1e8f` |
| Not exact decimal | `0.1f * 3 != 0.3f` |
| Cancellation | `(1e12f + 1f) - 1e12f == 0f` (lost the 1) |
| Denormals | tiny denorm operations µslow on some CPUs |
| NaN poisoning | any NaN op returns NaN, spreads |

## 2. Catastrophic Cancellation

Two nearly-equal large numbers differ → the result loses almost all precision:

```cpp
float d = 1e9f;  float delta = (d+1e-3f) - d;   // 1e-3 → actually ~0 on float!!
```
When it appears: physics restitution (`1 - r`), near-duplicate point tests, AABB tiny overlaps. Mitigate:
- Reparametrize: compute differences in a scaled space.
- Accumulate state in a smaller range (use local coordinates near origin — see §3).
- Keep a `double` accumulator for sum/comparison-heavy paths (ray marching, rare path math).

## 3. The Origin Problem (Large-World Coordinates)

At world coordinates ~1e6, a unit float loses 0.06 precision:
- **Float origin** at camera / chunk origin: store local coords relative to an anchor, add anchor per frame.
- **Double world** for exact large coordinates (tools/streaming), float per-draw local.
- Rendering: draw at local-but-shifted (camera at origin).

```
world = anchor + local
update: local = pos - newAnchor + ...   // camera-space math
```

## 4. Epsilon Discipline

```cpp
// WRONG (identity ideal for any scale):
if (a == b)

// GOOD: relative epsilon:
inline bool approxEq(float a, float b) {
    float scale = max(abs(a), abs(b), 1.f);
    return abs(a-b) <= 4 * std::numeric_limits<float>::epsilon() * scale; // ULP-ish
}
```
For 3D: `|a-b| <= eps * max(scale, 1)`. Never hand-wave `1e-6` constants without scale-awareness.

## 5. Determinism Across Compilers/Platforms

### 5.1 The Build Suspects

| Suspect | Cause |
|---------|-------|
| `-O3` + `-ffast-math` | reassociation |
| FMA contraction differences | last-bit |
| MSVC vs GCC `sin/cos/sqrt` | libm differences |
| `long double` on x86 (80-bit) | width differs from SSE |

### 5.2 Countermeasures

- **No `-ffast-math`** for netcode/physics modules.
- **Pin `libm`**: use a fixed implementation (`something like a deterministic sin/cos` table or a fixed algo) in the DIGHT path.
- **FMA**: explicit `_mm_fmadd_ps` both here or fully avoided; pick once.
- **Integers** for canvas/per-fixed steps where "exact" matters.
- **Cross-compile CI**: compile the same level with MSVC+GCC+Clang, run a 10 s sim, assert states equal bit-for-bit.

### 5.3 The Practical Determinism Bar

For *lockstep* netcode: byte-identical state after a tick.
For *replay*: outcomes match (within the engine's allowed tolerance).
Profile: build with `fenv` test? No — simple: run twice, compare a world-hash.

## 6. NaN/Inf Guards in Hot Paths

```cpp
#ifdef BUILD_DEBUG
assert(allfinite(pos) && "pos NaN in physics");
#endif
```
NaN is the frame-killer: assert at physics input, render submit. Shipping: clamp to sane defaults on non-finite (ball back to spawn).

## 7. Deterministic RNG

Covered in `determinism.md`: seed = fnv(frame, systemId, workerId, itemIdx); never a shared global.

## 8. Summary Cheat Sheet

| Rule | Why |
|------|-----|
| relative epsilon, no `==` | scale-safe |
| camera-relative/local coords | origin precision |
| double accumulators where summing | cancellation |
| no fast-math in deterministic code | reassociation |
| FMA decided once cross-platform | last-bit |
| allfinite asserts in debug | catch NaN early |
| deterministic sin/cos in netcode path | libm differences |
| CI: multi-ABI sim compare | catch build drift |

## 9. Checklist

- [ ] Origin strategy for large worlds (local/camera coords).
- [ ] Relative epsilon everywhere; `approxEq` used.
- [ ] No `==` floats; NaN guards in hot paths.
- [ ] No fast-math in phys/netcode; FMA pinned.
- [ ] Deterministic libm chosen; CI multi-ABI compare.