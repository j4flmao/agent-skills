---
name: platform-abstraction
description: Expert platform abstraction layers for game engines — OS abstraction, filesystem, threads, windowing, input, timers, dynamic loading, and platform-conditional code across Windows/Linux/console.
---

# Platform Abstraction Layer — Deep Engineering Guide

The PAL (Platform Abstraction Layer) is the layer that lets one engine codebase run on Windows, Linux, macOS, and every console generation. If it's leaky, every feature becomes a platform #ifdef. If it's designed well, 95% of engine code is pure, portable C++.

## 1. The Contract — What the PAL Must Cover

| Concern | Platform-specific | Engine API |
|---------|-------------------|------------|
| Memory | VirtualAlloc / mmap / heap | `VirtualAlloc`, `Memory::Reserve` |
| Threads | CreateThread / pthread / fiber | `Thread`, `JobSystem` handles |
| Filesystem | CreateFile / open | `FileSystem::Open`, paths `{Platform.VirtualPath}` |
| Time | QueryPerformanceCounter / clock_gettime | `Time::Now()`, `Time::Delta()` |
| Windowing | Win32 / SDL / GLFW | `Window`, `InputEvent` |
| Input | RawInput / XInput / hid | `InputDevice`, `ActionMap` |
| Dynamic loading | LoadLibrary / dlopen | `Module::Load` |
| Console slots | device-specific | `Console::WaitForDebugger` |
| Render RHI | D3D12 / Vulkan / Metal | `RHIDevice` (see vulkan skill) |
| Networking | winsock / BSD sockets | `NetworkProtocol` (see netcode skill) |

Rule: **every** platform-only symbol lives behind an interface; portals are forbidden (`#ifdef WIN32` inside gameplay code).

## 2. Abstracting the OS

### 2.1 The Interface Pattern

```cpp
struct PAL {
    // Memory
    virtual MemoryPage* Reserve(uint64_t bytes) = 0;
    virtual void Commit(void* p, uint64_t bytes) = 0;
    // Threads
    virtual Thread* CreateThread(ThreadFn, void*, size_t stack) = 0;
    virtual void Sleep(uint32_t ms) = 0;
    virtual uint32_t HardwareThreadCount() = 0;
    // Files
    virtual FileHandle* Open(const Path&, FileMode) = 0;
    virtual void ReadAsync(FileHandle*, uint8_t*, size_t, IoCallback) = 0;
    // Time
    virtual TimePoint Now() = 0;
    virtual double PeriodSeconds() = 0;
    // Misc
    virtual uint32_t ProcessId() = 0;
    virtual void* LoadModule(const Path&) = 0;
    virtual void Exit(int code) = 0;
};
extern PAL* g_platform;   // set once at startup to the platform implementation
```

Debug-build placeholder: a `NullPAL` that asserts on unsupported calls keeps unsupported code from silently running.

### 2.2 Platform Selection

- Windows: `PlatformWindows.cpp` — Win32 + DirectXMath conveniences.
- Linux/BSD: `PlatformPosix.cpp` — pthread, `open`, `clock_gettime(CLOCK_MONOTONIC_RAW)`.
- Consoles: per-SDK, behind a private porting SDK; engine build ships only one active implementation.

### 2.3 graceful Degradation

If a feature isn't available (e.g., energy-perf mode, large pages on older Windows), the PAL returns "unsupported" and the engine falls back — no hard crash. `Platform::Capabilities` struct at init reports feature flags (huge pages, GPU async, RTX, max threads, etc.).

## 3. The Filesystem

### 3.1 Two-Part Path System

The `Path` type has:
- **Engine path** (virtual): `{GameData}/levels/Zone1/lvl.map` — portable, artifact-independent.
- **Disk path** (physical): resolved per platform via mount table (`{GameData} -> D:\...\Packaged\Game\Data`).

```cpp
Path p = Platform::ResolveVirtual("{GameData}/shaders/lighting.hlsl");
```

### 3.2 Mount Table

```
{EngineRoot}   -> engine-source-tree
{GameData}     -> <install>/GameData
{SaveFiles}    -> platform writable dir (AppData / xdg-data-home / console save)
{Temp}         -> sphere-scoped scratch
```

Save dir differs per platform — the PAL owns the resolution. All asset loading goes through the mount table (no raw `D:\` paths in assets).

### 3.3 Async & Memory-Mapped Files

See `virtual-memory.md` and `asset-pipeline.md`. Crude: `ReadFile`, `fopen`. Production: async I/O + memory mapping for big read-only assets; the PAL exposes both.

## 4. Time & Timing

### 4.1 The Clock

- Windows: `QueryPerformanceCounter` (QPC), divisor = frequency.
- Linux: `clock_gettime(CLOCK_MONOTONIC_RAW)` (unaffected by NTP jumps).
- Console: device-specific. Use device monotonic, never wall-clock, for sim.

```cpp
struct TimePoint { uint64_t ticks; };
static TimePoint Now() { return { static_cast<uint64_t>(g_qpc) }; }
```

### 4.2 Frame Rate Control

- Frame-limiting: sleep/schedule vs busy-wait (target frame time).
- **Variable vs fixed delta**: the PAL reports the raw `dt`, and the engine's accumulator converts to fixed-step sim (see `game-loop-and-timestep.md`).

## 5. Threading & Fibers

### 5.1 Threads

PAL threads wrap `CreateThread`/`std::thread` with generous split:
- `Thread` = OS thread handle + id + created name (for the debugger).
- `JobSystem` (see its skill) uses PAL threads underneath.

```cpp
Thread* t = Platform::CreateThread(bind(&MySystem::Run), this, 256 * 1024);
```

### 5.2 Fibers

`Platform::CreateFiber`, `SwitchToFiber` — the PAL isolates the platform fiber API so switch cost stays cheap. (See `fibers-and-async.md`.)

### 5.3 Atomic/µsync

`Platform::AtomicIncrement`, `InterlockedCompareExchange`, `YieldProcessor`, `WaitOnAddress`, `WaitForSingleObject`. Wrap so the engine never touches platform intrinsics directly.

## 6. Windowing & Input

### 6.1 Input Abstraction

Raw device → engine input:

```cpp
struct InputRawFrame {
    float leftStickX, leftStickY, rightStickX, rightStickY;
    float triggers[2]; bool buttons[14];
    // per player: controller ID
};
```

The PAL enqueues a raw frame per input device per frame; the engine's input system (see `client-engine/input-systems.md`) maps actions onto it.

### 6.2 Window & Message Philosophy

The PAL owns window creation (or wraps SDL/GLFW). Gameplay code must NOT see Win32 `WM_` messages. Convert to engine events: `WindowEvent::Closed`, `InputEvent::KeyDown(KeyCode::W)`, `AppEvent::Focus`, `DropFileEvent`.

### 6.3 The Debug Overlay, Pause, etc.

PAL owns: window resize (render resizes the RHI swapchain), minimize (frame skip), focus change (pause), and the app-level quit.

## 7. Dynamic Loading & Plug-ins

```cpp
void* h = Platform::LoadModule("{Engine}/devmods/buddha-bot");
auto fn = (CreateDevModFn)Platform::GetProcAddress(h, "CreateDevMod");
```

Used for: dev mods, platform-specific render modules, tool builds, and the game DLL (hot-reload of gameplay). The hot-reload pipeline reloads the module, re-wires entry points, and migrates state (see `asset-pipeline.md`).

## 8. Diagnostics & Platform Tools

- **Console wait**: dev builds `while(!IsDebuggerAttached()) Sleep(1)` so a debugger can attach before crash.
- **Crash handler**: PAL installs a handler (Win32 `SetUnhandledExceptionFilter`) → writes a minidump + logs the callstack + hook to telemetry.
- **Memory limits**: `Platform::GetMemoryUsage()` for the memory dashboard.
- **Proc/event flags**: `Platform::GetCommandLine`, `GetArguments`.

## 9. Conditional Compilation Discipline

Acceptable `#ifdef`s (in the PAL and its consumers):
- Platform family: `PLATFORM_WINDOWS`, `PLATFORM_POSIX`, `PLATFORM_CONSOLE_*`.
- Build config: `BUILD_DEBUG`, `BUILD_SHIPPING`.
- Feature flags: `FEATURE_HUGE_PAGES`, `FEATURE_ASAN`.

Forbidden: CPU `#ifdefs` deep in gameplay; `#ifdef _WIN32` touching window or file code outside the PAL; `#ifndef` as feature gates.

Keeping the engine's gameplay code `#ifdef`-free is the goal; every platform symbol in gameplay is a code smell.

## 10. PAL Design Checklist (Lead-Level)

1. Memory/threads/files/time/windowing/input/modules all behind an interface.
2. Paths through the mount table — no raw disk paths in assets.
3. Async I/O + memory-mapped files available for hot asset loads.
4. Time from a monotonic clock, never wall-clock.
5. Input as raw frames, not device-specific events.
6. Windows messages converted to engine events; gameplay never touches Win32.
7. Platform capabilities struct at init; graceful degradation on missing features.
8. `#ifdef`s confined to the PAL + feature flags.
9. Crash handler + minidump + telemetry in all builds.

## 11. References

- `references/os-interface.md` — PAL interface, capabilities, platform detection, error handling
- `references/filesystem.md` — mount table, virtual paths, async I/O, mmap, save/load
- `references/threading.md` — thread/atomic/fiber wrappers, worker setup, priority
- `references/windowing.md` — window creation, events, resize/focus, multi-window
- `references/input-devices.md` — raw input, gamepads, keyboard/mouse, hid, mapping to engine events
- `references/modules-and-tools.md` — dynamic loading, hot reload, crash handling, dev-tool integration