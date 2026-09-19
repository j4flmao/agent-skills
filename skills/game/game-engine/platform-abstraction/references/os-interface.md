---
title: Platform Interface and Capabilities
description: PAL interface design, capabilities detection, platform selection, error handling and graceful degradation across engines.
---

# PAL Interface & Capabilities — Deep Reference

## 1. The PAL Interface

The taste of a good PAL: the game's biggest subsystems (render, physics, netcode, job system) never see a platform-specific call. Sample core interface (partially shown):

```cpp
class IPAL {
public:
    virtual ~IPAL() = default;
    // --- memory
    virtual void* Reserve(size_t bytes) = 0;
    virtual void  Commit(void* p, size_t bytes) = 0;
    virtual void  Free(void* p) = 0;
    // --- threads & sync
    virtual int   CreateThread(std::function<void()>, size_t stack) = 0;
    virtual void  Sleep(uint32_t ms) = 0;
    virtual uint32_t NumHardwareThreads() = 0;
    virtual uint64_t AtomicIncrement(uint64_t*) = 0;
    virtual void  YieldProcessor() = 0;
    // --- time
    virtual TimePoint Now() = 0;
    virtual double PeriodSeconds() = 0;
    // --- files
    virtual int   OpenVirtual(const char* vpath, int mode) = 0;
    virtual void  ReadAsync(int fd, void* buf, size_t n, IOResultFn cb) = 0;
    virtual void* MapReadOnly(const char* vpath, size_t& size) = 0;
    // --- window/input/events
    virtual WindowHandle CreateWindow(const char title[], int w, int h) = 0;
    virtual void PollEvents(std::vector<EngineEvent>&) = 0;
    // --- runtime
    virtual void* LoadModule(const char* vpath) = 0;
    virtual void* GetProcAddress(void* mod, const char* sym) = 0;
    virtual void  Exit(int code) = 0;
    // --- diagnostics
    virtual void DebugBreak() = 0;
    virtual bool DebuggerAttached() = 0;
    virtual size_t ProcessMemoryUsage() = 0;
};
```

## 2. Capabilities Struct

```cpp
struct PlatformCaps {
    uint32_t hardwareThreads;
    bool hugePages;
    bool asyncCompute;
    bool raytracing;
    bool fiber;
    uint64_t physicalMemory;
    uint32_t tlbSizeHuge;
    bool isConsole;
    bool isMobile;
    const char* platformName;
    const char* osVersion;
};
```

Query once at boot; subsystems consult `caps` (e.g., use huge pages only if `caps.hugePages`). Never random-detect per frame.

## 3. Platform Selection & Dead-Time

```cpp
IPAL* CreatePlatformPAL() {
#if PLATFORM_WINDOWS
    return new WindowsPAL();
#elif PLATFORM_POSIX
    return new PosixPAL();
#elif PLATFORM_CONSOLE_PS5 || PLATFORM_CONSOLE_XSX
    return new ConsolePAL();
#else
    return new NullPAL();   // dev-only stub: unsupported ops assert
#endif
}
```

The `NullPAL` is a dev-time safety net: if someone calls an unimplemented op in a platform-less build, it asserts loudly instead of crashing cryptically.

## 4. Error Handling Discipline

Platform calls fail for platform reasons (disk full, permissions, device not present). The PAL returns typed errors; callers must not crash on `fread` error.

```cpp
struct IoResult { int code; int64_t bytes; };
enum class IoError : uint8_t { None, NotFound, AccessDenied, DiskFull, IoError, Unsupported };
```

- Gameplay libs assume success → the PAL guarantees sane defaults (0-initialized buffers, null file handles) on error.
- Critical failures (out of disk, GPU lost) → engine-level `FatalError` path with minidump + telemetry.

## 5. Graceful Degradation

Pattern: each subsystem tries the best feature, falls back:

```cpp
if (caps.hugePages)  p = PAL::Reserve(b, kHugePages);
else                 p = PAL::Reserve(b, kDefaultPages);
```

If async compute unsupported → render compute synced; if RT unsupported → raster fallback; if fiber unsupported → blocking reads fallback. Feature gates the entire engine so the same code runs everywhere with degraded-but-functioning paths.

## 6. What Breaks a PAL

| Smell | Because |
|-------|---------|
| `#ifdef WIN32` in gameplay | platform logic leaked |
| `dlopen`/`LoadLibrary` in tooling | duplicated PAL logic |
| Wall-clock time for gameplay | NTP jitter desyncs sim |
| `std::this_thread::sleep_for` everywhere | platform-dependent scheduling |
| Raw file paths in assets | breaks mounts & consoles |
| Untyped engine events | window msg leak to gameplay |

## 7. Tests

- **PAL unit tests**: memory reserve/commit/free cycle, file open/read/write/mmap, thread spawn/join, timer monotonicity (advances, never goes back), atomic RMW visibility.
- **Portability CI**: build each `PLATFORM_*` unit, run the same test suite (asserts portability, not just build).
- **Graceful degradation test**: force `caps.hugePages=false` and run a level — no crash, perf within 2x.

## 8. Day-One Integration

The PAL is set up *before* the physics engine, renderer, netcode, or gameplay can run. Init order:

```
1. PAL boot (bare OS)
2. Memory manager boots on PAL
3. Job system boots on PAL threads
4. RHI (renderer) / Audio / Netcode
5. Input / Window
6. Gameplay bootstraps a frame
```

Any platform-dependent code must route through the PAL first so the engine stays portable even during platform bring-up on a new console.