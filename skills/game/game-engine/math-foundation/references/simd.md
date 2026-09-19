---
title: SIMD Vector Math
description: SIMD intrinsics, alignment, SoA layouts, FMA, fast-math hazards and specialized matrix-vector paths.
---

# SIMD — Deep Reference

## 1. The Instruction Rings

| ISAt | Width | Typical |
|------|-------|---------|
| SSE2 | 128-bit float4 | baseline x64 |
| AVX/AVX2 | 256-bit float8 | desktop 2013+ |
| AVX-512 | 512-bit float16 | some servers |
| NEON | 128-bit float4 | ARM/mobile/console |

Write to **SSE2/float4** as the portable floor; add an AVX2 path behind a compile switch if you must (rarely worth it for math library — memory-bound anyway).

## 2. Types & Alignment

```cpp
struct alignas(16) Vec4 { float x, y, z, w; };
static_assert(sizeof(Vec4) == 16 && alignof(Vec4) == 16);
```

- `aligned_alloc(16, n)` for arrays (or `_mm_malloc`/`posix_memalign` via PAL).
- Never `std::vector<Vec4>` without a custom allocator — `alignof` is 16 so the allocator must honor it (C++17 `std::pmr` or a PAL allocator).
- If you must pack, use `alignas(16)` on the *array of* `Vec4`.

## 3. Core Ops (SSE)

```cpp
inline __m128 vadd(__m128 a, __m128 b) { return _mm_add_ps(a, b); }
inline __m128 vmul(__m128 a, __m128 b) { return _mm_mul_ps(a, b); }
inline __m128 vfma(__m128 a, __m128 b, __m128 c) { return _mm_fmadd_ps(a, b, c); }
inline __m128 vdot3(__m128 a, __m128 b) {           // sum of lane products
    __m128 t = _mm_mul_ps(a, b);
    __m128 s = _mm_hadd_ps(t, t);                    // (t0+t1, t2+t3, ...)
    return _mm_hadd_ps(s, s);
}
```

`_mm_fmadd_ps` is one FMA instruction — but see next section for the determinism caveat.

## 4. FMA & fast-math Hazards

| Flag | Effect | When |
|------|--------|------|
| `-ffast-math` | reassociates + contracts, NaN/Inf maybe not propagated | NEVER for netcode/phys; OK for pure render prep if results local |
| `-ffp-contract=fast` | uses FMA | determinism ACROSS compilers needs pinning |
| default | safe | — |

FMA changes last-bit rounding vs mul+add. If two platforms/builds differ, netcode desyncs. Rule: **deterministic code = explicit ops; no `-ffast-math`; same intrinsics per platform unless you lock the bits.**

## 5. SIMD Mat-Vec

```cpp
// mat4x4 stored rows; mat * vec = 4 FMA chains
__m128 r0 = vfma(row0, v.xyz, ...);   // per row
// Or transposed column-major w/ dot — pick per lib; document.
```

For 10k transform updates, SIMD mat×vec in SoA is the standard win (4x lanes through the inner loop).

## 6. SoA vs AoS Revisited

Physics particles (`pos`,`vel`,`mass`) as AoS loops the same fields across lanes — SIMD friendly:

```cpp
struct Particles { std::vector<Vec4> pos, vel; }   // SoA: pos[i] = 4 particles' x
// SIMD loop over i< n/4 processing 4 particles per Vec4 lane.
```

(Greppable guideline in `cache-aware-layout.md`.)

## 7. Reductions & Determinism

Sum-reducing SIMD lanes with `hadd` orders lanes (0+1+2+3) — deterministic *if all platforms use the same lane-map*. For per-entity deterministic results, accumulate per-lane and merge in fixed order (see `parallel-for.md`).

## 8. Float4 Specializations

| Op | Trick |
|----|-------|
| length | `vmul` + `vdot` + `sqrt` |
| length (precise) | `sqrt` on the dot; no `rsqrt` in netcode |
| normalize | `vrsqrt` once + `vmul` (fine for render; verify for phys lockstep) |
| reflect | `v - 2*dot(v,n)*n` |
| clamp | `_mm_min_ps/_mm_max_ps` |

## 9. Unit-Testing SIMD

- Property tests: `mul(a,b) == mul(b,a)` within eps (not always) — test *algebraic identities* under alignment.
- Compare SSE path vs scalar reference in the test (bit or 1-ulp epsilon), per instruction where feasible.
- Assert alignment invariants (`reinterpret_cast<uintptr_t>& 0xF == 0`).

## 10. Checklist

- [ ] SIMD types `alignas(16)`; aligned alloc.
- [ ] Base path SSE2; optional AVX2 guarded by `#if`.
- [ ] No `-ffast-math` in deterministic modules.
- [ ] FMA pinned/avoided cross-platform.
- [ ] SoA for wide hot arrays.
- [ ] Deterministic reductions (fixed lane order).