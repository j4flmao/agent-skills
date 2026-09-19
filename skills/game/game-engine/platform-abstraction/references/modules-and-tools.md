---
title: Modules, Hot Reload and Tooling
description: Dynamic loading, module system, hot-reload of gameplay code, crash handling and dev-tool integration for the PAL.
---

# Modules, Hot-Reload & Tooling — Deep Reference

## 1. The Module System

The engine can be split into reloadable modules — typically the core is a static lib; the **game** (and dev-mods) are dynamic modules loaded via the PAL:

```cpp
// Path: {GameData}/bin/win64/Gamemod.dll (win) / libGamemod.so (linux)
void* h = PAL::LoadModule("{GameData}/mods/replay-tool");
auto ping = (int(*)())PAL::GetProcAddress(h, "Ping");
```

Why: hot-reload (dev iteration), modding, updates.

## 2. Hot-Reload Patterning

Hot reload = swap the gameplay DLL while the engine runs. Requirements:
1. Everything the DLL touches goes through a **stable ABI** defined by the engine (`IRealtimeModule`).
2. The engine stops the frame, saves minimal state, swaps the DLL, re-creates the module instance.
3. Any allocation the module made before the swap is invalid — modules must allocate through engine allocators (see `memory-management`).

```cpp
struct IRealtimeModule {
    virtual void Init(void* bootsrapCtx) = 0;
    virtual void Update(float dt) = 0;
    virtual void Render() = 0;
    virtual void Shutdown() = 0;
    virtual const char* Name() const = 0;
};
```

On `F5`:
```
engine -> UnloadModule(oldDll) -> LoadModule(newDll) -> module->Init(prevState) -> resume
```

Watch: module factories must not hold static C++ objects across the reload (static destruction at unload corrupts heap).

## 3. Crash Handling

```cpp
// Windows
SetUnhandledExceptionFilter(EngineCrashHandler);
// Linux
sigaction(SIGSEGV, &handler); handler for SIGABRT, SIGBUS
// Console: SDK handlers.
```

What the handler writes:
- Minidump (`MiniDumpWriteDump`) for Win32; core-dump equivalent on POSIX.
- A `crash.log` with: exception code, module, function, callstack (via `StackWalker`/`execinfo`).
- Snapshot of the memory dashboard (per-tag RSS).
- Telemetry ping: `exception, buildid, timestamp`.

Dev builds: `__debugbreak()` + print; shipping: write dump + exit gracefully (or relaunch).

## 4. Tool Builds & Headless

- Tool builds (editor, exporters, unit tests) can run **headless** (no window) or with a window.
- The PAL boots minimal for headless: memory, files, threads, time, no renderer/audio.
- Editor same binary as game with extra modules + a window.

## 5. Profiler & Remote Tooling

- The engine exposes a **profiler API**: event capture (`Begin/End` + timestamp) — the PAL gives a locked-in monotonic clock.
- Telemetry push: `PAL::SendTelemetry(Event)` — batching + flush on crash (see crash above).
- Remote console: a small TCP server on the engine for dev commands, in dev builds.

## 6. Dev-Mod Loading & Security

- Dev mods trusted only in dev builds; shipping validates digital signatures if mods are supported.
- Loading a module from an untrusted path in shipping is a security hole (see `security` rules).
- Cap module instantiation: one instance per module, detect double-init.

## 7. Pitfalls

| Pitfall | Result | Fix |
|---------|--------|-----|
| Static objects in a reloaded DLL | crash on unload | modules allocate via engine |
| Not saving/restoring state | hot reload loses gameplay state | `IRealtimeModule` + state save/restore |
| Crash handler not installed | unexplainable crashes | install at module init, all platforms |
| Minidump without symbols | useless debug | strip debug info only in shipping |
| Telmetry overwhelmed | spam | batch + cap rate |
| Load untrusted mod in shipping | security | signed-load only |

## 8. Checklist

- [ ] Game/editor/dev-mods as dynamic modules with stable ABI.
- [ ] Hot reload: unload→load→re-init with state restore.
- [ ] Crash handler + minidump + callstack + telemetry on all platforms.
- [ ] Headless boot for tools/tests.
- [ ] Remote console + profiler API via PAL.
- [ ] Signed-load in shipping.