---
title: Windowing and Engine Events
description: Window creation, message loop conversion to engine events, resize/focus handling and multi-window for game engines.
---

# Windowing & Engine Events — Deep Reference

## 1. Window Creation via the PAL

```cpp
WindowHandle h = PAL::CreateWindow(u"J4Engine", 1920, 1080, WindowFlags::Resizable | WindowFlags::MSAA4);
PAL::SetWindowTitle(h, u"My Game");
PAL::ShowWindow(h);
```

The PAL wraps Win32 `CreateWindowEx` or SDL/GLFW internally. The engine never calls `CreateWindowEx` itself — it's behind the PAL so a console port remains possible (consoles have no window UI).

## 2. The Message→Event Conversion

The fatal mistake is letting `WM_PAINT`, `WM_KEYDOWN`, etc. leak into code that should be portable. Convert each OS message to a typed engine event at the PAL boundary:

```cpp
// Windows WndProc does:
case WM_KEYDOWN: events.push_back({EngineEvent::KeyDown, wParam, lParam, 0});
case WM_SIZE:    events.push_back({EngineEvent::Resize, LOWORD, HIWORD});
case WM_CLOSE:   events.push_back({EngineEvent::RequestClose});
```

Engine event types (subset):

| Event | Payload | Handler |
|-------|---------|---------|
| `KeyDown/Up` | keycode, repeat | InputAction system |
| `MouseMove` | x, y, dx, dy | camera / UI |
| `MouseButtonDn/Up` | button | UI / gameplay |
| `MouseWheel` | delta | camera zoom |
| `GamepadButton` | player, button, value | action map |
| `Resize` | w, h | avatar/context resize |
| `FocusLost/Gained` | — | pause, framerate |
| `RequestClose` | — | save & exit |
| `DropFile` | path | editor/dev mods |

The engine's `EventQueue` (single producer — main thread) feeds UI + gameplay + editor.

## 3. CPU Frame Flow

```
PAL::PollEvents() → fills EventQueue
                       → engine updates (input → sim → render)
PAL::Present()    → swap buffers
```

Put `PollEvents` *first* in the frame so input latency is low. Never `GetMessage` in the middle of the frame (adds latency + drag window responsiveness).

## 4. Resize & Minimize

- `Resize`: update the RHI swapchain size (see vulkan skill for swapchain rules) and the camera's aspect — do it deferred (at the start of next frame) to avoid mid-frame reallocations.
- `Minimize` / focus lost: skip rendering (or render at a low tick), notify the audio to duck. Games that keep rendering while minimized waste battery/console power.

## 5. Aspect & Output Monitor

The PAL reports the monitor's DPI scale, refresh rate (for v-sync and frame limiting), and per-monitor bounds. `Window::GetBackingScale()` matters for UI text scaling on Windows with 125/150% scaling.

## 6. Multi-Window

For editor/tooling builds (and occasionally gameplay split-screen):

- Each window has its own `WindowHandle` + camera attachment.
- Input: the window under the pointer gets events; a global "current window" for hotkeys.
- The PAL keeps a registry; the engine iterates windows to render each.

## 7. Pitfalls

| Pitfall | Why | Fix |
|---------|-----|-----|
| Blocking `GetMessage` deep in frame | input lag | PollEvents first |
| Rendering while minimized | battery/console power | skip render on minimize |
| OS message ids in engine events | portability | convert at PAL |
| Resize mid-frame reallocation | frame spike | defer resize |
| DPI unaware UI | blurry text | backing-scale-aware |
| Window created with default size then resized | flicker | create at desired size |

## 8. Checklist

- [ ] PAL owns window creation; engine uses `WindowHandle`.
- [ ] OS messages → typed engine events; no Win32 symbols in gameplay.
- [ ] `PollEvents` at frame start.
- [ ] Deferred resize; skip render when minimized.
- [ ] DPI / monitor info via PAL.
- [ ] Multi-window supported for editor/tools.