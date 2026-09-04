# Kernel Development & OS Internals

## 1. Skill Context
**Focus**: Understanding how an Operating System manages hardware, isolates processes, and provides safe abstractions for user applications.
**Triggers**: kernel, os, ring-0, linux-kernel, bare-metal-os.

## 2. Protection Rings (Privilege Levels)
Modern CPUs implement hardware-enforced privilege levels. x86_64 has 4 rings, but OSes typically only use two:
- **Ring 3 (User Space)**: Unprivileged. Applications (browsers, databases) run here. They cannot execute hardware I/O instructions (like `in`/`out` or `cli`), nor can they modify Page Tables.
- **Ring 0 (Kernel Space)**: Absolute power. The OS Kernel runs here. It can access any memory address and execute any CPU instruction.

If a User Space process tries to execute a privileged instruction, the CPU hardware generates a **General Protection Fault (Exception)**, and the Kernel kills the process (Segfault).

## 3. The Kernel Architecture
- **Monolithic Kernel (e.g., Linux, Windows)**: The entire OS (Scheduler, File System, Network Stack, Device Drivers) runs in Ring 0. It is extremely fast (minimal context switching) but vulnerable—a bug in a graphics driver can crash the entire OS (Kernel Panic / BSOD).
- **Microkernel (e.g., MINIX, QNX, L4)**: Only the bare minimum (Scheduler, IPC) runs in Ring 0. Drivers and File Systems run in Ring 3 as isolated processes. Highly secure and stable, but heavily penalized by constant IPC context switching.

## 4. References
- `references/interrupts-exceptions.md` — Hardware signals and IDT.
- `references/syscall-mechanism.md` — Crossing the User/Kernel boundary.
- `references/kernel-synchronization.md` — Spinlocks, Atomics, and RCU.
