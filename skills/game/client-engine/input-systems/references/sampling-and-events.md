---
title: Sampling, Events and Input Timing
description: Poll vs event channels, accumulated deltas, fixed-tick braid, input-to-sim latency and determinism.
---

# Sampling & Events — Deep Reference

## 1. Two Channels, Two Consumers

| Channel | Shape | Consumers |
|---------|-------|-----------|
| **Poll/state** | action state sampled per tick | gameplay, netcode, sim |
| **Event queue** | discrete `onKeyDown`... | UI, menus, gestures, text |

Never mix: **sim reads the polled snapshot; UI reads events.** A sim that awaits keydown events races frames.

## 2. Accumulated Deltas (Mouse, Scroll)

- Mouse movement should be *accumulated* in the device and *read-and-consumed* per poll: `dx = dev.consumeDx()`.
- Two consumers (aiming + menu) → sample once per frame and keep the one shared snapshot (see device-abstraction).
- Avoid: an O-frame-rest retread that sums the same delta twice.

## 3. The Fixed-Tick Braid (Also the Netcode Setup)

```cpp
// at frame start: build this tick's input snapshot from device state
InputSnap snap = InputSystem.Snapshot(tick);   // actions → values
sim(tick, snap);                                // deterministic
render(interp = snapshot1..2);                  // interpolate action -> presentation
```
Serialized online: the *polled* snapshot per tick = the exact thing the authoritative server validates (see `input-authority`). Key rule: **one snapshot per tick, order deterministic, redundant presses coalesced.**

## 4. Latency Budgets (The Feel Engine)

| Stage | Budget | Notes |
|-------|--------|-------|
| device→provider OS | 1–4 ms | console; OS buffering |
| provider→poll | ≤ 1 ms | atomic snapshot |
| poll→sim tick | ≤ 1 tick @60 (16.6 ms) | fixed |
| sim→render | ≤ 1 frame | presentation lamb (`best/pacing`) |
| **click→result** | **33–80 ms** | the feel number |

Measure *actual* in the profiler (`input.latency_click_to_result`) with a real frame mark. > 80 ms p95 = feels heavy.

## 5. Determinism Contract

- The snapshot per tick is *pure*: same device inputs → same action values, same order.
- Never use *wall-clock* in the poll→sim crossing.
- Input replay (deterministic tests) = feed the snapshot stream, re-run sim, compare.

## 6. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Sim reacts to events | polled snapshot |
| Mouse delta eaten twice | single consume |
| Input processed outside tick | tick-ordered |
| Wall-clock latency drift | tick counts |
| Coalesced? no (double jumps) | merge in snapshot |

## 7. Checklist

- [ ] Sim = polled snapshot at fixed tick.
- [ ] UI/gesture/text = event queue.
- [ ] Mouse delta single-consumer.
- [ ] click→result profiled (33–80 ms).
- [ ] Deterministic input replay tests.