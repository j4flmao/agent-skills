---
title: Clip Compression
description: Keyframe dedup, quantization, smallest-three quats, clip streaming and deterministic decode for animation.
---

# Clip Compression — Deep Reference

## 1. Why Compress

A raw 60-fps clip at 64 bones × (3×float pos + 4×float rot) ≈ 26 KB/s → 2 min clip ≈ 560 KB *per animation*. Thousands of clips would eat RAM. Compression targets 10–30× without visible quality loss.

## 2. Keyframe Dedup (The Biggest Win)

- Bones with constant values (a finger stays straight) → store **1 key** (or skip + hold).
- Variable bones store keys only when they differ beyond a threshold (e.g., > 1e-3).
- Result: effective keyframes per bone drop 10–50× vs frame-60.

```cpp
// store {firstKey, keys[], held} per bone; evaluator: keys[(t-dur) ranges]
```
Determinism note: dedup by a *fixed quantization band*, not by "visually equal" — the evaluator must see the same key set on every platform.

## 3. Quantization

| Value | Representation | Bits |
|-------|----------------|------|
| translation | fixed int (mapped range, e.g., ±20 m → int16) | 16/axis |
| rotation | smallest-three quat (index of smallest + 3×8-bit) | 18–27 |
| scale | uniform float8 (rarely) | 8 |

### 3.1 Smallest-Three for Quats

A unit quat (x,y,z,w) is 4 numbers but 3 suffice: drop the largest-magnitude component, store (`2`-bit index + 3× 8-bit). Common ~75% cut on rotations *without* perceptual change. Deterministic (index chosen by fixed rule `argmax`, tie-break defined).

## 4. Packing & Interleaving

- Pack per-bone channel arrays; the evaluator loads one bone's track sequentially (sequential hot-lane).
- Store times as compact uint16 offsets from clip start (×1 ms granularity).
- Keep “held” bones virtually free (they reduce to a single matrix).

## 5. Streaming Clips (Runtime-On-Demand)

- Huge catalogs: load the *header* (frame count, bone info) at init; stream keyframes from disk/pak on first use (see `asset-pipeline` hot-reload/streaming refs).
- Cold clips decode to a CPU cache with an FIFO eviction per `clipCacheSize` budget.

## 6. Deterministic Decode

```
decode(clip, t) must be a pure function: same bytes + t → same pose, ANY platform
```
- Fixed-point decode path (no float differences in the interpolation) or a single multiplication path.
- Never use the *driver's* math to decode.

## 7. Quality Tradeoffs (Measure, Don't Feel)

| Bit depth | Visible error (humanoid walk) |
|-----------|------------------------------|
| 16-bit pos | ~0.2 mm — invisible |
| 8-bit rotation | ~0.5° — ok local, check FK chain |

Tune per clip group: **foot-IK clips** need tighter landing precision than an idle.

## 8. Pipeline Check

- Author-side: compresses on import (`import-and-cook`); determinism verified by hashing the compressed bytes for the same source.
- Runtime: no decompression on the hot frame — decoders run on workers (see `job-system`).

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Dedup by visibility | quantized bands |
| Float decode differs | fixed path |
| Every clip held in RAM | streaming + FIFO |
| No smallest-three | 75% rotation cut |
| Decode on main frame | job workers |

## 10. Checklist

- [ ] Keyframe dedup by band.
- [ ] Translations int16; rotations smallest-three.
- [ ] Deterministic decode (pure function).
- [ ] Streaming cold clips with FIFO budget.
- [ ] Compressed bytes hashed at import (CI equality).