# Lock-Free Concurrency & LMAX Disruptor

## 1. Skill Context
**Focus**: High-throughput, low-latency messaging between threads without lock contention.
**Triggers**: lock-free, lmax-disruptor, ring-buffer, mechanical-sympathy.
**Deep dive**: `skills/niche/hft/lock-free-ring-buffers/SKILL.md`.

## 2. The Cost of Locks
An uncontended mutex is cheap: futex-based locks take a user-space fast path with a single atomic operation. The cost comes from **contention**:
- Waiters spin, then make a syscall and sleep.
- The scheduler wakes them later, adding microseconds of latency and leaving their caches cold.
- The lock's cache line bounces between cores.

Lock-free designs avoid sleeping and lock convoys, but they are harder to get right. Use them only where profiling shows contention.

## 3. The LMAX Disruptor Architecture
LMAX Exchange built the Disruptor; its business-logic processor handled about 6 million orders per second on a single thread (described by Martin Fowler, 2011).
- **Pre-allocated ring buffer**: A fixed-size, power-of-two array of reusable event objects, created at startup. No per-message allocation, so no GC pressure. The slot index is `sequence & (size - 1)`.
- **Sequences**: Producers claim slots by advancing a sequence counter. A single producer needs only an ordered write; multiple producers claim slots with an atomic CAS or fetch-add. Consumers track their own sequences and read only up to the published cursor.
- **Single Writer Principle**: Each variable has exactly one writing thread, so writes need memory ordering (release/acquire), not locks.
- **Wait strategies**: Busy-spin (lowest latency, uses a full core), yielding, or blocking. Choose based on the latency budget.
- **Padding**: Sequence counters are padded onto separate cache lines to prevent false sharing.

## 4. Rules
- Use proven implementations (LMAX Disruptor for Java, `crossbeam` channels in Rust, `boost::lockfree::spsc_queue`, `rigtorp::SPSCQueue`) before writing your own.
- Specify memory ordering explicitly (`acquire`/`release`). Test with ThreadSanitizer, loom (Rust), or jcstress (Java).
- Watch for the ABA problem in CAS-based structures; handle it with tagged pointers, hazard pointers, or epoch-based reclamation.
