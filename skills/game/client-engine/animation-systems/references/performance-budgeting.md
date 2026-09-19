---
title: Animation Performance Budgeting
description: Bone counts, LOD ladder, impostors, profiler histograms and scaling hundreds of animated characters.
---

# Performance Budgeting — Deep Reference

## 1. The Crowd Budget

Animating 200 characters at LOD0 full-rig is a frame-killer. Budget math:

| Item | Per character | For 100 chars |
|------|---------------|---------------|
| ASM eval + blending (LOD0) | 0.3–0.8 ms | 30–80 ms ✗ |
| pose locals + globals | ~0.1 ms | 10 ms |
| skin GPU (LOD0) | 0.2 ms | 20 ms |
| IK (interaction-only) | 0.05 ms | rare |

The graph shows the fix: **you cannot afford LOD0 for everyone**. Distance defines the ladder.

## 2. The LOD Ladder

| Distance | Skeleton | Blending | Skinning |
|----------|----------|----------|----------|
| 0–15 m | full (30–60 bones) | ASM active | GPU at vert budget |
| 15–40 m | reduced (16–24 key bones + hold) | ASM reduced | GPU lower verts |
| 40–120 m | ~8 bones, "simple motion" | baked sample | cheap |
| > 120 m | **impostor** (billboard/flipbook) | none | none |

Distance thresholds tuned by FOV/scale — an impostor at 60 m in a tiny room = obvious.

### 2.1 The Impostor

- Pre-rendered billboard images or a **flipbook** sprite of key poses (8–16 frames animating at ~8 Hz).
- Cost ≈ a transparent quad + a timer; indistinguishable beyond ~100 m.

## 3. The Per-Bone Reduction Tricks

| Technique | Savings |
|-----------|---------|
| Hold zero-cost bones (fingers) | ~30% bones eval |
| Shared skeleton (same rig) − pose cache | ASM/Pose once (see skeleton refs) |
| LOD "eval every-Nth frame, interpolate" | ~2–4× on pose |
| Blend on GPU (some engines) | CPU→GPU |

**Never** LOD the *player's own* character (closest, most important). For NPC crowds: all of the ladder applies.

## 4. Profile Data (Get the Numbers First)

In the animation profiler:
```
bonesEvaled/s, skinVerts/s, ASM evals/s
LOD0 count vs LOD2 count (should be mostly LOD1/2+impostor)
transition pops, IK solves/s (interaction-only should be low)
```
Two dashboards: per-region (which areas are anim-heavy) + per-frame p99 sim time.

## 5. Fine-Scale Levers

| Lever | Effect | Watch |
|-------|--------|-------|
| clip sample rate (30 vs 60) | ~2× eval | foot-slide on fast clips |
| interpolation stride | fewer frames between samples | visible on fast transitions |
| impostor flipbook stills per mode | memory | — |
| upper-layer masking off far chars | blend savings | seamless look |

## 6. Scaling to Hundreds (Practical Stack)

1. Main character + close NPCs: full pipeline.
2. Mid: reduced bones + N-eval frames.
3. Far: baked samples (precomposed clip slices) reused across the crowd (they all play a shared pool of 4–8 samples).
4. Extreme: impostor billboards.

## 7. Pitfalls

| Pitfall | Fix |
|---------|-----|
| LOD0 for everyone | ladder |
| Pop at distance thresholds | blend LOD transitions (a short fade) |
| Impostor too early | tune by FOV |
| No profile data | instrument bones/verts/SKO budgets |
| Full IK on crowds | interaction-only |

## 8. Checklist

- [ ] LOD ladder with hand-picked distances.
- [ ] Professional per-bone/hold/reduce eval.
- [ ] Impostors for extreme distance.
- [ ] Histograms (bones, skin verts, ASM) in profiler.
- [ ] Crowd p99 under budget (test a max-crowd scene).