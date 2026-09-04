# Virtual Memory, Paging & TLB

## 1. The Virtual Memory Illusion
When you print a pointer in C (`printf("%p", ptr);`), the address you see (e.g., `0x7ffe4b...`) is a **Virtual Address**, not physical RAM.
Every process is given the illusion that it owns the entire contiguous RAM space. In reality, physical RAM is heavily fragmented and shared among hundreds of processes.

## 2. Page Tables and the MMU
To translate a Virtual Address to a Physical Address, the OS creates a mapping data structure called **Page Tables**. 
- Memory is divided into **Pages** (typically 4KB chunks).
- The hardware chip that performs the translation is the **Memory Management Unit (MMU)**.

When a process runs, the OS tells the CPU where that process's Page Table is stored in RAM (On x86_64, it writes the physical address of the highest-level Page Directory into the `CR3` register).

### The Translation Cost
Modern x86_64 uses a 4-level Page Table hierarchy. This means a single memory read instruction in C (`int val = *ptr;`) actually requires **4 additional memory reads** by the MMU just to walk the tree and find the physical address. This is catastrophically slow.

## 3. The TLB (Translation Lookaside Buffer)
To solve the translation cost, the CPU utilizes the TLB. 
The TLB is a tiny, ultra-fast hardware cache specifically for storing recent Virtual-to-Physical page translations.

- **TLB Hit**: The CPU instantly knows the physical address (0 extra RAM reads).
- **TLB Miss**: The CPU must pause, wait for the MMU to walk the 4-level Page Table in RAM, and update the TLB (extremely slow).

## 4. Context Switching Overhead
When the Kernel performs a context switch from Process A to Process B, it must change the `CR3` register to point to Process B's Page Tables.
By design, changing `CR3` **flushes (erases) the entire TLB**. 
When Process B resumes, its first few thousand memory accesses will all be TLB Misses, causing a massive performance spike. This is why Context Switching is considered a heavy operation.

*(Modern CPUs use ASID / PCID - Process Context IDentifiers - to tag TLB entries and avoid total flushes, but the architectural constraint remains a critical optimization target).*
