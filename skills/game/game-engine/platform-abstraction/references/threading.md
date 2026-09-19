---
title: Threading and Sync Wrappers
description: Thread creation, priorities, atomic wrappers, fiber wrappers, worker setup and synchronization primitives for the PAL.
---

# Threading & Sync Wrappers — Deep Reference

## 1. The Wrapper Layer

The engine doesn't touch pthread/Win32 threading directly — the PAL exposes a thin, feature-correct wrapper:

```cpp
// creation
int Thread_Spawn(ThreadFn fn, void* ctx, size_t stackBytes, const char* name);
void Thread_Join(int id);

// sync
void AtomicIncr(uint64_t* p);
bool CAS(uint64_t* p, uint64_t expected, uint64_t des);
void YieldProcessor();                 // _mm_pause / __builtin_ia32_pause / switch
void MemoryFence();                    // full barrier

// waits
void WaitSemaphore(void* s);
void SignalSemaphore(void* s, uint32_t n);
void WaitOnAddress(void* addr, uint64_t expected);   // Windows; best-in-class
```

Why not `std::thread`/`std::atomic` directly:
- Debuggers/consoles need named threads + debug thread info.
- `YieldProcessor` and waits differ per platform; the PAL centralizes the right choice.
- The console SDK might not be `std::thread`-compatible everywhere.

## 2. Thread Priorities & Affinity

| System | Priority (Windows) | Affinity |
|--------|-------------------|----------|
| game thread | `THREAD_PRIORITY_NORMAL` | all |
| physics/anim workers | Normal | all cc |
| audio | `ABOVE_NORMAL` | dedicated core(s) |
| I/O | `NORMAL` | dedicated (disk) |
| render thread | `NORMAL` | all |

Affinity: don't pin to an OS-specific core index blindly — query `Platform::HardwareThreadCount()` and a `GetCoreList()`.

## 3. Workers & Stack Size

- Worker stacks: 256 KB (Windows default is 1 MB — wasteful).
- Fiber stacks: 64 KB (see `fibers-and-async.md`).
- A worker's stack should be *just* enough for its job types; deep recursion (recursive BVH, pathfinding) needs headroom.

```cpp
for (i < workers) worker[i].stack = (workerRole == IO_ROLE) ? 64_KB : 256_KB;
```

## 4. The Mutex Famine

Avoid mutexes in the PAL where you can:

| Need | Replace with |
|------|--------------|
| per-frame particles | per-worker scratch, no lock |
| UI list | single-thread mutation on UI thread |
| counters | `AtomicIncr` relaxed |
| queue | per-worker deques + work stealing |
| double-buffer | fence + two arenas |

If a PAL mutex is contended in the profiler → restructure, don't just lock harder.

## 5. Fibers — PAL Wrapper

```cpp
Fiber* Fiber_Create(FiberFn fn, void* ctx, size_t stack);
void   Fiber_Switch(Fiber* to);
void   Fiber_Delete(Fiber* f);
```

The PAL owns `SwitchToFiber`/`makecontext` so the job system can use fibers when the app asks (narrow use — see `fibers-and-async.md`).

## 6. Timeouts & Waits

- `Sleep(0)`/`YieldProcessor` for spinning variants.
- `WaitOnAddress` + `WakeByAddressSingle` — park a worker without kernel transition (Windows; the fastest "wait for push" on Windows).
- On POSIX: `futex_wait` (Linux) or a `condvar`+`mutex` fallback.

The PAL exposes a unified `WaitUntil(Atomic*, expected)` so one implementation runs everywhere.

## 7. Debug & Crash Safety

- Name every thread (shows in Visual Studio / Xcode / console tools).
- On a fatal deadlock, the debug crash handler walks all threads' stacks and dumps — the threading wrappers should cooperate (record `WaitReason` string per thread).
- In DEBUG, a watchdog asserts no thread holds the same PAL mutex for > 50 ms.

## 8. Tools

- Thread-sanitizer (TSan) with the wrapper layer ON in CI (it instruments `std::atomic` usage... use the PAL wrappers so the sanitizer sees the memory ops).
- Or Valgrind helgrind on a reduced job graph.

## 9. Checklist

- [ ] No raw pthread/Win32 in engine (only PAL).
- [ ] Prioritized, named threads; correct affinities.
- [ ] Stack sizes tailored per role.
- [ ] Mutexes scarce; atomics + per-thread structures instead.
- [ ] Waits use the best primitive per platform.
- [ ] TSan catches races in CI.