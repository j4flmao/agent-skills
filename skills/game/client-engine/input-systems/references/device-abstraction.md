---
title: Device Abstraction
description: Input device drivers, raw data shape, keyboard layout awareness, lifecycle (plug/unplug) and per-item raw retention.
---

# Device Abstraction — Deep Reference

## 1. The Provider Layer

```cpp
class IInputDevice {
    virtual void Poll();                 // called once per frame (or per poll cull)
    virtual DeviceId deviceId();
    virtual DeviceKind kind();           // keyboard/mouse/gamepad/touch...
};
```
Every concrete device implements a provider; the engine never sees device specifics.

## 2. The Raw Retention Rule

The engine core (action mapper) must **never assume a layout**. Concretely:

| Pitfall | Reason |
|---------|--------|
| `Key(KEY_UP)` means "W" | AZERTY users get the wrong key |
| `Gamepad.GUID` hardcoded | offbrand pads vary |
| Mouse `dx` baked into absolute pos | per-OS behavior differs |

Keep the raw `{deviceId, keyCode, rawAxis}` as the first-class object; *interpret* at the action/binding layer (layout table, controller mapping, OS config).

## 3. Per-Device Data Shapes

| Device | Raw |
|--------|-----|
| keyboard | scancode (layout-independent) + char (for text) |
| mouse | dx,dy (accumulated), buttons, wheel |
| gamepad | 2 axes × 2 (stick), triggers, buttons, hat |
| touch | id, x, y, state, pressure |
| VR | pose + button/axis |

Physical `dx,dy`: accumulate in the *device* (not the consumer) so two consumers (aim + camera drift) read the same.

## 4. Device Lifecycle

```
connect → probe (ID + capability mask) → register provider → notify action rebind
disconnect mid-game → keep a "ghost provider" so bindings don't unbind
replug → re-provider with same deviceId (if possible) or remap
```

Rules:
- Unplug → the action mapper keeps last-state; don't mid-game unbind actions (scary UX).
- Two same-kind devices (2 controllers) — distinguish by index + uniqueId.

## 5. Layout Awareness (The Keyboard Zone)

- The engine must know `azerty/qwerty/dvorak/...`.
- Two interpretation layers: **scancode** (physical) for muscle-memory binding, **layout char** for text (see text/IME).
- Remap UI display: physical label (scancode) vs logical label (char) — decide deliberately.

## 6. Polling Cost

| Device poll cost | Notes |
|------------------|-------|
| keyboard/mouse | O(1) state snapshot |
| gamepad (XInput) | cheap; latency ~1–4 ms |
| touch | event-driven natural |

Poll once per frame *period* (not per-thread) — shared device state with an atomic snapshot, readers lock-free.

## 7. Testing

- Fake-device harness: inject synthetic events (deterministic replay tests — same input file → same sim).
- Unplug/replug test suite. Layout switch test (azerty → dvorak) on keyboard.

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Baked key layout | raw scancode + layer |
| Two devices double-consume (axis) | per-device provider only |
| Unplug unbinds config | ghost provider |
| Mouse absolute vs delta mix | accumulated delta per device |
| Poll from two threads | atomic snapshot |

## 9. Checklist

- [ ] Provider per device; engine sees DeviceKind only.
- [ ] Raw retained (scancode/char separation).
- [ ] Lifecycle ghost-provider on unplug.
- [ ] Layout layer at the action mapper.
- [ ] Fake-ish harness + unplug/layout tests.