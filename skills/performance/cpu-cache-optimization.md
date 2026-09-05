# CPU Cache Optimization & False Sharing

## 1. Skill Context
**Focus**: Structuring memory layout to respect CPU hardware architecture (Mechanical Sympathy).
**Triggers**: cache-line, false-sharing, memory-alignment, cpu-cache.

## 2. Cache Lines (The 64-Byte Rule)
CPUs do not read RAM byte-by-byte. When you read a single 4-byte integer, the CPU fetches a 64-byte chunk of memory (a Cache Line) from RAM into the ultra-fast L1 Cache.
- **Data Locality**: Arrays are fast because reading index 0 pulls indexes 1-15 into the cache automatically. Linked Lists are slow because every pointer dereference misses the cache and hits slow RAM.

## 3. False Sharing (The Silent Killer)
Imagine a struct: struct Stats { int thread1_count; int thread2_count; }
Both integers fit inside the same 64-byte cache line. 
- If Thread 1 updates 	hread1_count (Core 1) and Thread 2 updates 	hread2_count (Core 2), the CPU hardware cache coherency protocol (MESI) thinks the *entire cache line* is invalidated.
- Core 1 and Core 2 end up constantly invalidating each other's L1 cache, causing massive performance drops even though they are writing to different variables.
- **Solution**: Cache-line Padding. Add 60 bytes of dummy variables between the two integers so they land on separate cache lines.
