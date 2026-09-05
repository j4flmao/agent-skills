# Lock-Free Concurrency & LMAX Disruptor

## 1. Skill Context
**Focus**: Achieving millions of transactions per second on a single machine by eliminating Mutex locks.
**Triggers**: lock-free, lmax-disruptor, ring-buffer, mechanical-sympathy.

## 2. The Cost of Locks
A standard Mutex lock forces the OS to intervene if two threads contend for data. The blocked thread goes to sleep, losing its CPU cache, and requires a massive context switch to wake up. This kills high-throughput systems.

## 3. The LMAX Disruptor Architecture
Designed by the LMAX Exchange to process 6M orders/sec on a single thread.
- **Pre-allocated Ring Buffer**: Instead of dynamically allocating queues (which fragments memory and triggers Garbage Collection), create a massive, fixed-size circular array (Ring Buffer) at startup.
- **Sequence Numbers**: Threads claim a "slot" in the ring buffer using atomic CAS (Compare-And-Swap) operations on a Sequence number, not locks.
- **Single Writer Principle**: Only one thread is allowed to mutate a specific piece of data. Multiple consumer threads read behind it. No locks are needed if only one thread writes.
