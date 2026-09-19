---
title: Haptics and Input Tuning
description: Rumble/haptic models, timed impulses, rate limiting, response curves and feel calibration.
---

# Haptics & Tuning — Deep Reference

## 1. The Haptic Model

Haptics = **timed impulses**, not "set motor level":

```cpp
struct HapticEvent {
    HapticTarget target;    // left/right motor, adaptive trigger, whole-device
    float intensity;        // 0..1
    float durationMs;       // impulse length
    float frequencyHz;      // rumble wave freq (high-fidelity devices)
    Envelope attack/release;// easing
};
```
Emit-event → the haptics layer *plays* it with a rate-limiter (two impulses 10 ms apart merge, don't double-fire).

## 2. Device Capability Map

| Device | Haptic World |
|--------|--------------|
| Xbox/PC gamepad | 2 motors (L/R), low calls → 4–8 Hz base |
| PS5 DualSense | hi-fi: haptic (positional), adaptive triggers |
| Switch | 2 haptics (NH approach) |
| Mobile | vibration only (binary, short) |
| Mouse/kb | none (or light LED) |

Capability map routes a *single* HapticEvent to the platform's best translation (a PS5 hit → precise hf; a Switch hit → 150 ms buzz).

## 3. Rate Limiting (The Feel Governor)

- Rule: max 1 HapticEvent per 25–50 ms per target (below that, pulses blur).
- Merge overlapping: keep the *larger-intent* + cumulative duration (never "add" levels to 200%).
- When the device's OS has its own throttle (gamepad rumble APIs), still gate engine-side (visible in telemetry).

## 4. When to Trigger (Feel Patterns)

| Moment | Haptic |
|--------|--------|
| hit dealt | short pulse to the *hit* side |
| hit received | pulse to the *body* side + camera shake ref |
| aim (trigger) | adaptive trigger progressive |
| footstep | tiny pulse L/R (feet sync) |
| status critical | constant low hum (with end-pulse) |

Rule: **haptics must follow the *result*, not the *request*** — fire on the confirmed hit (sim tick), not on input press (input press = prediction-only).

## 5. Tuning & Response (The Feel Levers)

| Lever | Effect |
|-------|--------|
| axis deadzone | prevents drift (radial) |
| response curve | linear / clamp / exp per action |
| aim smoothing | `lerp(aim, target, 1-pow(k,dT))` — framerate-independent |
| recoil/hit lag | pixels-ms per weapon |

Every lever lives in a `feel_config` table (per action), tweakable in-game (developer menu), baseline tuned at the feel table session.

## 6. Determinism + Replay

- Haptic events are *tick-derived* (from the sim result) — a replay of the sim replays the same impulses.
- Never wall-clock-haptic timing; use the tick-relative impulse duration (interp to presentation).

## 7. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Haptics on input press | result (sim-confirmed) |
| Motor 100% constant | envelopes + timing |
| Rate-limiter absent | buzzy annoy |
| Set-level (not event) | `HapticEvent` API |
| Response curve applied twice | single curve per action |

## 8. Checklist

- [ ] Event-based haptics + envelope.
- [ ] Capability map per device.
- [ ] Rate limiter + merge rule.
- [ ] Trigger on sim-confirmed results.
- [ ] Feel config table tweakable (developer menu).
- [ ] Replay-safe haptic timing.