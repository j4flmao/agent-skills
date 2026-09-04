# Inline Assembly in C

## 1. Breaking the Boundaries of C
C is a powerful language, but it cannot express hardware-specific instructions. For example, C has no syntax to tell the CPU: *"Disable hardware interrupts"* or *"Read the CPU's internal clock cycle counter."*

To do this, Kernel developers use **Extended Inline Assembly** (GCC/Clang syntax).

## 2. Basic Syntax
The syntax acts as a bridge between C variables and CPU registers.
```c
__asm__ volatile (
    "assembly template" 
    : output operands                  /* optional */
    : input operands                   /* optional */
    : list of clobbered registers      /* optional */
);
```
- `__asm__`: Tells the compiler to insert raw assembly.
- `volatile`: Crucial! It prevents the compiler from optimizing, moving, or deleting the assembly block.

## 3. Example 1: `rdtsc` (Time Stamp Counter)
The x86 `rdtsc` instruction returns the number of CPU cycles since reset. It places the lower 32 bits in the `EAX` register and the upper 32 bits in the `EDX` register.

```c
#include <stdint.h>

uint64_t get_cpu_cycles() {
    uint32_t low, high;
    
    __asm__ volatile (
        "rdtsc" 
        : "=a" (low), "=d" (high) // Outputs: 'a' means EAX, 'd' means EDX
        :                         // No inputs
        :                         // No clobbers
    );
    
    return ((uint64_t)high << 32) | low;
}
```

## 4. Example 2: Enabling/Disabling Interrupts
When writing an OS kernel, you must disable interrupts before entering a critical section (e.g., acquiring a Spinlock) to prevent deadlocks.

```c
static inline void cli(void) {
    // Clear Interrupt Flag
    __asm__ volatile("cli" : : : "memory"); 
}

static inline void sti(void) {
    // Set Interrupt Flag
    __asm__ volatile("sti" : : : "memory"); 
}
```
*Note on the "memory" clobber*: The `"memory"` string tells the C compiler: *"This assembly block might read or write to arbitrary RAM."* This forces the compiler to flush all cached variables in CPU registers back to RAM before executing the assembly, ensuring memory consistency.
