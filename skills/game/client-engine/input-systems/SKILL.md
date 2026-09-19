---
name: input-systems
description: Expert game input systems — device abstraction, action mapping, sampling vs events, text/IME, touch/gestures, haptics and input-to-game timing.
---

# Input Systems — Deep Engineering Guide

Input is the player's handshake: it must be lag-free, remappable, device-agnostic and deterministic. This skill covers device abstraction, action mapping, raw sampling vs event flows, text/IME, touch/gestures, haptics and the input-to-simulation timing that separates "responsive" from "floaty".

## 1. The Three Layers

```
device world (keyboard/mouse/stick/controller/gamepad/touch)
  → InputProvider (concrete device driver)
  → InputSystem (maps physical → logical actions, accumulates)
  → Game (consumes actions; sim at fixed tick)
```

The **action abstraction** is what makes one input system serve every device + remap UIs.

## 2. Device Abstraction

```cpp
struct InputEvent { Device device; DeviceId id; float3 raw; ButtonState state; };
```

| Device | Raw data | Notes |
|--------|----------|-------|
| Keyboard | key codes | layout-aware (AZERTY!) |
| Mouse | dx/dy, buttons, wheel | raw vs OS-corrected |
| Gamepad | axis, buttons, triggers | analog, deadzone |
| Touch | touches[], gesture stream | multitouch |
| VR | controller linear/angular | motion |
| Pen/touchpad | extended | per-OS |

The abstraction must *retain the raw* for remap-sensitive consumers — never bake layout into the engine core (see `device-abstraction.md`).

## 3. Action Mapping (The Remap Surface)

```cpp
// logical: Jump (physical: Space | GamepadA)
// triggered by any binding that matches
struct Action { vector<Binding> bindings; Activation mode; };
```

- Actions express *intent* (`Move`, `Attack`, `Talk`) — the game reads actions only, never key codes.
- Bindings: `{key, gamepadButton, axis-min/max, deadzone, doubleTap, hold, drag}`.
- Conflicts: an action triggered by multiple bound devices — resolve by priority + first-arrival (never two).
- Remap UI edits the bindings; the engine logic never changes.

## 4. Sampling vs Events

| Style | Use | Tradeoff |
|-------|-----|----------|
| **Poll (sample)** every frame / fixed-tick | deterministic sims, netcode | 1 sample/frame |
| **Event (queued)** fired on change | UI, menus, gestures | lossless, ordering |
| **Accumulated (delta)** | mouse movement, scroll | sums raw deltas |

Gameplay = poll the *action state* at the fixed tick (deterministic). UI/menus = events. Mouse = accumulated delta between polls (the "eats the delta" contract).

### 4.1 The Fixed-Tick Braid

```cpp
// sim tick consumes the latest action state — never processes events mid-tick
frame: poll → build actionSamples[tick] → sim(tick) → render
```
Determinism requires: input snapshot per fixed tick, ordered, deduplicated (see `sampling-and-events.md`).

## 5. Text & IME (The Hidden Beast)

- Text input ≠ keydown: a keyboard produces *characters* (layout + modifiers), and CJK uses an **IME** composition window.
- Engine must route through the platform IME: `compositionStart/update/end` + the committed string.
- Differentiator: paste handling, dead-keys, numpad, and per-UI-context focus (chat field vs game).

Details in `text-and-ime.md` — a surprising chunk of "input bugs" live here.

## 6. Touch & Gestures

- Touch = absolute multitouch stream (down/move/up per touch id).
- **Gestures** are recognized *upstream* of game logic: tap, long-press, drag, pinch, double-tap, swipe — each with begin/update/end + a cancel case.
- Never synthesize mouse from touch frames (the mouse is a different device with a cursor concept).

## 7. Haptics & Feel

| Device | Haptics |
|--------|---------|
| Gamepad | rumble (left/right motor), pulse frequencies |
| PS5/VR | adaptive triggers, high-fidelity haptics |
| Mobile | vibration (primitive) |
| Desktop | — (rare) |

Haptic events are *timed impulses* ("hit feedback 20 ms, 60% L / 0% R"), remapped per-device, rate-limited (rumble spam ruins feel). See `haptics-and-tuning.md`.

## 8. Input-to-Sim Latency (The Feel Metric)

| Stage | Budget |
|-------|--------|
| device → provider | OS-level (~1–4 ms console, up to ~poll-rate) |
| provider → poll | < 1 ms |
| poll → sim tick | ≤ 1 tick (16.6 ms @60) |
| sim → render | ≤ 1 frame |
| **full click-to-result** | **≤ ~33–50 ms** (imperceptible), p95 < 80 ms |

Threads/queue/timing decisions that add a tick of latency are *the* feel killers — measure, don't assume.

## 9. The Input → Simulation Contract (For Netcode)

Serialized online: the polling *must* be fixed-tick snapshot per tick (see `authoritative-server` input authority) with a deterministic order per tick, and redundant presses coalesced. Client prediction replays it identically.

## 10. References

- `references/device-abstraction.md` — drivers, raw data, layout-awareness, device unplug/replug
- `references/action-mapping.md` — bindings, deadzones, modifiers, remap UI, priority/conflicts
- `references/sampling-and-events.md` — poll vs event, accumulated deltas, fixed-tick braid, determinism
- `references/text-and-ime.md` — text input, IME composition, layout, focus routing
- `references/touch-and-gestures.md` — multitouch, gesture recognizers, cancel semantics, areas
- `references/haptics-and-tuning.md` — rumble/haptics model, rate limits, feel calibration