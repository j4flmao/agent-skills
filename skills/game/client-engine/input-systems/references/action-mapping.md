---
title: Action Mapping and Bindings
description: Logical actions, binding resolution, deadzones, modifiers, remap UI and conflict priority.
---

# Action Mapping — Deep Reference

## 1. Actions, Not Keys

The game code reads **actions**:
```cpp
Input.GetAction("Jump").Triggered();   // any binding matched
Input.GetActionAxis("Move").Vector();  // blended from keyboard + stick
```
Binding: `{ device, deviceId, code, activation, deadzone, modifiers, priority }`.

## 2. Activation Kinds

| Activation | Fires when |
|------------|-----------|
| `Pressed` | rising edge |
| `Released` | falling edge |
| `Held` | continuously while down |
| `Axismin/max` | axis beyond deadzone |
| `doubleTap` | two pressings within window |
| `hold` | held a <min span> |
| `drag` | axis beyond threshold with movement |

## 3. Deadzone Handling (Analog)

- **Radial deadzone** (correct): `len = length(xy); if (len < dz) {0,0} else (xy·(len-dz)/(1-dz))`.
- Never apply *per-axis* deadzone to sticks (diagonal fake movement).
- Additional right-stick smoothing curves: `responseCurve` (linear/clamp/exp) — a *feel* lever stored per-action.

## 4. Modifiers

| Modifier | Meaning |
|----------|---------|
| `Shift/Win/Alt` shortcut | define "jump + run" etc. |
| `toggle` | sticky state (crouch toggle) |
| `oneShot` | consume-once (menus) |

Modifiers belong to *bindings*, not actions — so remap can split them.

## 5. Conflict Resolution (Two Bindings Both Fire)

Order: **priority** then **first-arrival in the tick**. If both `Jump (Space)` and `Jump (GamepadA)` fire in one tick:
- Take the higher-priority (dev = gamepad for gameplay).
- Never apply both → the sim sees one intent (deterministic).

## 6. Remap UI

- Editor: `bind(action, device, code)` → validate (no duplicate code) → persist.
- The UI lists actions, not keys (labels from the layout table).
- Persist `{action → binding}` JSON; first-run = defaults seeded from `config/defaults`.

## 7. The Axis→Vector Blend

```cpp
vec2 axisVector(action) {
    vec2 acc{0};
    for bindings: acc += contribution(binding);    // keyboard keys: ±1; analog: deadzoned
    return normalize_or_clamp(acc, maxMag);
}
```
Keyboard analog blend: WASD gives diagonals ≈ (1,1) — normalize to unit circle (not square).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Per-axis deadzone | radial |
| Two devices double-apply | priority + first-arrival |
| Keys baked in UI | action-name labels |
| No response curve | per-action curves |
| Modifier = another action | binding-level |

## 9. Checklist

- [ ] Game reads actions only.
- [ ] Activation kinds + modifiers + deadzones (radial).
- [ ] Conflict = priority + first-arrival.
- [ ] Remap UI + persisted bindings.
- [ ] Axis vector normalized (unit circle).