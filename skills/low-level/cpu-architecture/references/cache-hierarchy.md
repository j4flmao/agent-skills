# CPU Cache Hierarchy & False Sharing

## 1. The Memory Wall
RAM is unbelievably slow. An L1 Cache hit takes ~1 ns. A Main Memory (RAM) fetch takes ~100 ns. If the CPU had to wait for RAM on every instruction, a 4 GHz CPU would operate at the speed of a 1990s processor.

To bridge this gap, CPUs use a cache hierarchy:
- **L1 Cache (Data & Instruction)**: Small (~32KB), extremely fast (1-3 cycles), private to each Core.
- **L2 Cache**: Larger (~256KB - 1MB), fast (10-12 cycles), private to each Core.
- **L3 Cache (LLC)**: Massive (10MB - 128MB), slower (~40 cycles), shared across all Cores.

## 2. Cache Lines (Spatial Locality)
The CPU does not fetch memory byte-by-byte. When you read a 1-byte `char` from RAM, the CPU fetches the surrounding **64 bytes** into the Cache. This chunk is called a **Cache Line**.

*Performance Rule*: Structs and arrays should be packed linearly. Iterating through a multi-dimensional array column-by-column causes constant Cache Misses, slowing down your program by 10x-50x compared to iterating row-by-row.

## 3. Cache Coherence (The MESI Protocol)
What happens if Core 0 and Core 1 both cache the exact same memory address, and Core 0 writes a new value to it? Core 1's cache is now invalid.
CPUs solve this using a hardware protocol like **MESI** (Modified, Exclusive, Shared, Invalid). 
When Core 0 writes, it broadcasts an "Invalidate" signal on the hardware bus. Core 1 must drop its cached copy and fetch the new data from L3/RAM.

## 4. The Silent Killer: False Sharing
This occurs in multithreaded code when two threads modify completely independent variables that happen to reside on the **same 64-byte Cache Line**.

```c
struct Counters {
    volatile int thread1_count; // Modifed by Core 0
    volatile int thread2_count; // Modifed by Core 1
};
```
Because `thread1_count` and `thread2_count` are adjacent, they are loaded into the same 64-byte Cache Line. 
When Core 0 increments its counter, the hardware invalidates the entire Cache Line for Core 1. When Core 1 increments its counter, it invalidates the Cache Line for Core 0. 
The Cache Line bounces violently back and forth across the CPU interconnect bus, crippling multi-core performance.

**The Fix**: Pad the struct to force the variables onto separate Cache Lines.
```c
struct Counters {
    volatile int thread1_count;
    char padding[60]; // Force 64-byte alignment
    volatile int thread2_count;
};
```
