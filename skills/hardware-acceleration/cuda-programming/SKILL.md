# CUDA Programming & Hardware Acceleration

## 1. Skill Context
**Focus**: High-performance computing directly on Nvidia GPUs using C++ and CUDA. Escaping the limits of Python/PyTorch for custom kernel development.
**Triggers**: cuda, gpu-programming, nvcc, thread-blocks, shared-memory, warp-divergence.

## 2. The CPU vs. GPU Paradigm
- **CPU (Latency-Optimized)**: A few incredibly powerful cores (e.g., 16 cores) designed to execute sequential logic extremely fast with massive caches.
- **GPU (Throughput-Optimized)**: Thousands of weak cores (e.g., 16,384 CUDA cores in an H100) designed to execute the exact same instruction on different pieces of data simultaneously (SIMT - Single Instruction, Multiple Threads).

## 3. CUDA Memory Hierarchy
In CUDA, memory access speed dictates your performance. If your kernel is slow, it is almost certainly a memory bottleneck, not a compute bottleneck.
- **Global Memory (VRAM)**: Massive (24GB - 80GB) but incredibly slow (~500 cycles). Accessible by all threads.
- **Shared Memory**: Tiny (e.g., 48KB per block) but blazing fast (~5 cycles). Acts as a user-managed L1 Cache. Threads within the same Block can use it to share data and avoid hitting Global Memory.
- **Registers**: The fastest memory. Private to each thread.

**The Golden Rule**: Coalesced Memory Access. When 32 threads in a Warp read from Global Memory, they MUST read adjacent memory addresses. If thread 0 reads index 0, and thread 1 reads index 1000, the GPU memory bus will choke (Uncoalesced Access).

## 4. Execution Configuration (Grid & Blocks)
When you launch a CUDA kernel, you must define the execution grid: `my_kernel<<<blocksPerGrid, threadsPerBlock>>>(args...);`
- **Thread**: The smallest unit of execution.
- **Warp**: A hardware group of 32 threads. They execute in lockstep.
- **Block**: A software group of threads (up to 1024). Threads in a block can synchronize (`__syncthreads()`) and use Shared Memory.
- **Grid**: A collection of Blocks.

## 5. The Silent Killer: Warp Divergence
Because 32 threads in a Warp execute the exact same instruction simultaneously, `if/else` statements are deadly.
```cpp
if (threadIdx.x % 2 == 0) {
    do_something(); // 16 threads execute this
} else {
    do_something_else(); // The other 16 threads execute this
}
```
**What actually happens**: The GPU cannot run `if` and `else` at the same time. It disables half the threads, runs the `if`, then disables the other half, and runs the `else`. Your compute efficiency instantly drops by 50%. This is called Warp Divergence.
