---
title: Input Device Abstraction
description: Raw input frames, gamepad, keyboard/mouse, HID devices and conversion to engine events for the PAL.
---

# Input Device Abstraction — Deep Reference

## 1. The Raw Input Frame

All platforms deliver input with different APIs (RawInput, XInput, hidapi, console SDK). The PAL unifies to one **raw frame**:

```cpp
struct RawDeviceFrame {
    uint8_t deviceId;          // player 0..N
    enum Kind : uint8_t { Keyboard, Mouse, Gamepad, Touch, HID } kind;
    // union payload
    struct Gamepad {
        float leftX, leftY, rightX, rightY, lt, rt;   // analogs
        uint32_t buttons;                              // bitmask
        float vibration;
    };
    struct Mouse  { int32_t x, y, dx, dy; int32_t wheel; uint32_t buttons; };
    struct Keyboard{ uint8_t keys[256]; uint32_t mods; };
};
```

The engine's **input system** (see `client-engine/input-systems.md`) maps these raw frames into gameplay actions (`WalkLeft`, `Jump`, `MenuConfirm`).

## 2. Gathering

- **Windows**: `RawInput` (WM_INPUT) for mouse/keys; XInput for gamepads; Windows.Gaming.Input for controller state.
- **Linux**: evdev / libinput; SDL for gamepads.
- **Consoles**: device SDK events.
- Old/lab: hidapi for hardware flight-sticks etc.

The PAL *owns* event gathering; it posts exactly one `RawDeviceFrame` per device per OS frame into the engine input queue.

## 3. Gamepad Abstraction

Gamepads differ by vendor (XInput vs DualShock vs Switch Pro). The PAL normalizes to:
- Analog sticks (deadzones applied at the PAL level — the engine sees clean normalized values).
- Buttons as `UP_*` semantics (`PlayerButton::A`, `B`, `X`, `Y` = layout-agnostic), remapped from the physical layout per device.

```cpp
RawDeviceFrame frame = PAL::ReadGamepad(player);
// classic problem: XInput(A)=bottom, PS(Cross)=bottom — PAL remaps by device type
```

## 4. Mouse Capture & Cursor

- Relative mouse (FPS): the PAL sets exclusive capture + hides cursor, and reports relative `dx,dy` (fast, no OS boundary jitter).
- UI cursor: normal positioning mode + position event per frame.

Params per window: `CaptureMode { Table, Relative }`, cursor visibility, sensitivity.

## 5. HID & Config

HID devices (flight sticks, racing wheels, VR gloves) come through hidapi; the PAL parses their raw report into a generic `RawDeviceFrame::HID` with a per-device legend so gameplay can remap arbitrary axes/buttons.

## 6. Timeline & Latency

- Input gathered once per frame (poll) at a fixed point — never interleaved mid-frame.
- `PollEvents` gives input the lowest possible latency (Poll first in frame).
- Gamepads: keep into account wireless latency (~5–10 ms) — sensibly the engine compensates nothing; design affordances (input buffers) instead.

## 7. Testing Input

- A virtual input device: the test/CI injects raw frames (keyboard `A`, gamepad `LT=0.5`) into the same queue — input systems get unit-tested headless.
- Record/replay: dump raw frames to a file for reproducibly testing netcode timing.

## 8. Pitfalls

1. Applying deadzone twice (PAL + gameplay) → mushy stick.
2. Polling at different points in the frame for different devices → non-determinism.
3. Leaking platform input structs (`XINPUT_STATE`) into gameplay.
4. Not normalizing stick ranges (0..1 vs -1..1) across platforms.
5. Forgetting battery/low-status for enable/disable UIs.

## 9. Checklist

- [ ] One `RawDeviceFrame` type; per-device normalization done in PAL.
- [ ] Deadzones at PAL; gameplay sees clean values.
- [ ] Layout-agnostic button semantics.
- [ ] Input polled once per frame at a fixed point.
- [ ] Mouse relative vs absolute modes per window.
- [ ] HID devices routed to raw frames.
- [ ] Test via injected raw frames.