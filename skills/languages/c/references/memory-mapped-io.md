# Memory-Mapped I/O (MMIO)

## 1. How the CPU Talks to Hardware
In a bare-metal environment (like writing a bootloader or a device driver), the CPU needs to communicate with external hardware (UART, GPIO, Timers, GPUs). 
It does this through **Memory-Mapped I/O**.

The hardware designer maps the peripheral's internal registers to specific physical memory addresses. When the CPU writes a value to address `0x40020000`, it is not writing to RAM; it is physically flipping bits on a hardware chip.

## 2. The Golden Rule: `volatile`
You must use the `volatile` keyword when defining MMIO pointers. If you do not, the C compiler's optimizer will ruin your driver.

### The Bug (Without Volatile)
```c
uint32_t* status_register = (uint32_t*) 0x40020000;

// Wait for the hardware to set bit 0 to '1'
while (*status_register == 0) {
    // The compiler sees that status_register is never changed inside the loop.
    // It optimizes this into: if (*status_register == 0) while(true) {}
}
```

### The Fix (With Volatile)
```c
volatile uint32_t* status_register = (volatile uint32_t*) 0x40020000;

// The compiler is forced to issue a physical memory READ instruction 
// on every single iteration of the loop.
while (*status_register == 0) {
    // Wait for hardware
}
```

## 3. Creating Safe Hardware Abstractions
To avoid sprinkling raw pointers everywhere, OS developers wrap MMIO in cleanly packed `structs` mapped to the base address.

```c
// Define the hardware register layout (e.g., a UART controller)
typedef struct {
    volatile uint32_t DATA;       // Offset 0x00
    volatile uint32_t STATUS;     // Offset 0x04
    volatile uint32_t CTRL;       // Offset 0x08
} UART_Regs;

// Map the struct to the exact physical memory address specified in the datasheet
#define UART0 ((UART_Regs*) 0x4000C000)

void uart_send(char c) {
    // Wait until the Transmit Buffer is empty (Bit 5 of STATUS)
    while ((UART0->STATUS & (1 << 5)) == 0) {
        // Spin
    }
    // Write the character to the hardware data register
    UART0->DATA = c;
}
```

## 4. Caching Hazards
MMIO addresses must be marked as **Uncacheable** in the CPU's Page Tables (by the OS). If the CPU caches an MMIO read in the L1 Cache, it will read the stale cached value instead of the live hardware state.
