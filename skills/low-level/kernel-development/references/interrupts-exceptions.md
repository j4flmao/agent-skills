# Interrupts and Exceptions

## 1. The Asynchronous CPU
Without interrupts, an OS would have to constantly poll hardware (e.g., "Keyboard, do you have a key? Network Card, do you have a packet?") in an infinite loop. This wastes 100% of CPU cycles.
Instead, hardware utilizes **Interrupts** to asynchronously tap the CPU on the shoulder.

## 2. The Interrupt Descriptor Table (IDT)
When the CPU receives an electrical interrupt signal (IRQ), it must know what code to execute.
During boot, the OS builds an array in RAM called the **IDT** and loads its physical address into the CPU's `IDTR` register.
The IDT maps an Interrupt Number (0-255) to a specific memory address containing the **Interrupt Service Routine (ISR)**.

- **0-31**: Exceptions (CPU-generated). E.g., `14` is Page Fault, `0` is Divide by Zero.
- **32-255**: Hardware Interrupts (IRQs) or Software Interrupts.

## 3. The Execution Flow
1. Network Card receives a packet and pulls the IRQ pin high.
2. The CPU finishes its current instruction.
3. The CPU hardware switches to Ring 0 (if in Ring 3), pushes `RIP`, `CS`, `RFLAGS`, and `RSP` to the Kernel Stack.
4. The CPU jumps to the ISR address found in the IDT.
5. The OS Kernel executes the ISR C/Assembly code.
6. The Kernel calls `iretq` (Interrupt Return), popping the saved state and resuming the original program seamlessly.

## 4. Top Halves vs. Bottom Halves
Interrupts run with interrupts **disabled**. If an ISR takes too long (e.g., copying a massive 10GB file from disk), the system freezes and drops other hardware signals.
To fix this, Linux splits ISRs into two parts:
- **Top Half (Hard IRQ)**: Extremely fast. Acknowledges the hardware, copies minimal data, schedules the bottom half, and immediately returns.
- **Bottom Half (SoftIRQs / Tasklets / Workqueues)**: Runs later with interrupts enabled, performing the heavy lifting (e.g., parsing TCP/IP packets).
