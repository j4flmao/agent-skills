---
title: Touch and Gesture Recognition
description: Multitouch stream, gesture recognizers, cancel semantics, hit areas and touch-to-action for engine input.
---

# Touch & Gestures — Deep Reference

## 1. The Touch Stream

Touch is **absolute multitouch**:

```
touchDown (id, x, y)
touchMove (id, x, y, dx, dy)     // id preserved per finger
touchUp   (id, x, y)
cancel     (id)                   // system stole the touch (call/incoming, palm)
```
Never a "single mouse point" abstraction — a game must track *all* ids.

## 2. Hit Areas & Priority

- A touch routes to the deepest *hit target* (a UI button, a world object, the virtual joystick zone).
- Priority: UI overlay > world input > gesture region.
- Coordinates: convert to the *view* (Y-down for screen, Y-up for world) at one spot, not per consumer.

## 3. Gesture Recognizers

A recognizer = a small state machine fed by the touch stream:

| Gesture | Trigger | Updates | Ends by |
|---------|---------|---------|---------|
| Tap | down+up within time+dist | — | up |
| Long press | hold > T | — | up or cancel |
| Drag | move beyond threshold | move events | up |
| Pinch | second touch while dragging | scale factor | either up |
| Swipe | fast up with direction | direction | up |
| Double tap | two taps in window | — | second up |

```
Recognizer base:
  onTouchDown(id,x,y) → maybe start
  onTouchMove(...)    → maybe update
  onTouchUp/cancel     → maybe end / maybe cancel
```

## 4. The Cancel Contract (Crucial)

- A **cancel** means "this gesture is invalid — stop everything":
  - OS-palm rejection (iPad), incoming call, screen transition.
- Every recognizer must handle `cancel` — failures here = stuck "dragging" ghost UX.
- **Possession**: a touch that started on joystick cannot become a tap on a button mid-way (re-route never; end-cancel instead).

## 5. Touch → Action (Mapping)

- Buttons: `pressed/released` map to action `Pressed/Released` (action mapping skill).
- Virtual joystick: a Drag-region → `Move` axis (relative to anchor, deadzoned, response curve applied).
- Swipe: one-shot gesture → e.g., `Dash`.

Rule: *gesture results* feed actions; raw touches feed UI + gesture recognizers only.

## 6. Edge Cases

| Case | Handle |
|------|--------|
| Two fingers on one button | first touch owns; second → next target |
| Palm resting on screen | OS-palm cancellation (iPad), distance filters |
| Multitouch on gamepad-like combos | per-id ownership |
| Very fast swipe < 1 frame | recognize in the same tick (min span + velocity) |

## 7. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Single-point mouse model | per-id touches |
| Recognizers leak on OS cancel | cancel contract |
| Routes change mid-gesture | possession (never reroute) |
| Joystick + tap conflict | region priority at down |
| Deadzone mishandled on touch axis | radial deadzone (action mapping) |

## 8. Checklist

- [ ] Multitouch ids with ownership + cancel.
- [ ] Recognizer base handles cancel.
- [ ] Region priority (UI > world > gesture) at touch-down.
- [ ] Gesture→action mapping (joy, swipe).
- [ ] Touch-axis radial deadzone + response curve.