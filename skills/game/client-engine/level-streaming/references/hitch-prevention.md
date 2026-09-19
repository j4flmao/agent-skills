---
title: Hitch Prevention
description: The anti-hitch toolkit, thresholds, hitch tests, watchdogs and hard-load paths.
---

# Hitch Prevention — Deep Reference

## 1. What a Hitch Is

A **hitch** = a frame that stutters (a ~33+ ms spike) caused by loading/decoding/activating too much in one frame. Open worlds die by hitches (spotted a thousand times), and the toolkit is: never load on the frame, never activate mid-frame, never over-budget.

## 2. The Anti-Hitch Toolkit (In Load-Order Usage)

| Tool | When used |
|------|-----------|
| Predict-ahead scope (frustum ∪ radius ∪ triggers) | first defense |
| Shell proxy / low-poly stand-in | LOADING state view |
| Deferred activation (frame boundary) | wakes never mid-frame |
| Progressive LOD (coarse→refine idle) | pick the cheap view first |
| Pop-mask fog/cull (near fade) | hides the seam at crawl |
| Watchdogs (stuck→retry) | self-heal |
| Budget gates (throttling) | hard stop overshoot |

Also: **small reads** (chunk ≤ ~4 MB) so a burst of cells is a sequence of small stutters, not one 100 MB stall.

## 3. The Thresholds (Enforced)

| Metric | Budget |
|--------|--------|
| main-frame load ms | < 8 ms |
| dframe activation cost | < 1 ms |
| resident growth / sec under motion | flat |
| first-frame-of-cell mesh swap | < 0.2 ms |
| in-flight read count | ≤ 8 |

Violations → assertion/log + the profiler gate (streaming profiler gates in async-loading).

## 4. The Hitch Tests (Ship-Gate)

Routine suite (CI or nightly harness):
1. **Deterministic drive test**: drive a fixed path through every region; assert per-frame load budget (no frame > threshold).
2. **Teleport stress**: jump across 3 cells; assert hard-load ≤ 1 hitch, all masks fade.
3. **Slow-disk sim**: throttle disk to 10 MB/s → assert no infinite hitch (predict-ahead shrinks to keep budget).
4. **Load-loop leak**: 100× cell cycle → resident bytes flat (no leak).
5. **Two-player sharing**: same cells, refcounts sane.

A hitch test failure = **block the build** (the trailer's worst enemy).

## 5. Watchdogs & Self-Healing

```
state stuck LOADING > timeout → abort+retry (log)
a cell whose RESIDENT flag lied (mesh torn) → mark FAULT → re-fetch
collector that wrongly unloaded → re-request (self-heal; rarely precipitates)
```
Watchdogs are cheap (a timeout + tag). They turn rendering bugs into self-healing events instead of a crash clip.

## 6. The Hard-Load Path (When You Must Block)

Teleport / fast-travel = a point where the *world mask* is acceptable:
```
hardLoad(cell): flush IO queue, read cell synchronously (masked by a fade), activate.
```
Budget: one hard load per interaction, under a mask; never multiple sequential hard loads (the queue should have predicted).

## 7. Pitfalls

| Pitfall | Fix |
|---------|-----|
| "Load on the frame you're inside" | predict-ahead |
| Mid-frame activation | deferred |
| No shell (hole to see) | proxy |
| Overshoot budget | throttle |
| Big single reads | chunk ≤ 4 MB |
| No hitch tests | ship-gate suite |

## 8. Checklist

- [ ] Toolkit ordered: predict→proxy→deferred→throttle.
- [ ] Thresholds enforced (8 ms load, 0.2 ms swap).
- [ ] Hitch test suite gates builds.
- [ ] Watchdog self-healing on stuck/fault.
- [ ] Hard-load under mask only.