---
name: kernel-development
description: >
  Use this skill when the user says 'kernel module', 'Linux driver', 'device driver', 'ring 0', 'system call', 'interrupt handler', 'spinlock', 'RCU', 'kernel panic', 'oops', 'write an OS', 'bootloader', 'page tables', 'Rust for Linux'. Covers OS internals and Linux kernel development: privilege levels, syscalls, interrupts and deferred work, kernel memory allocation, synchronisation (spinlocks, mutexes, RCU), loadable modules and drivers, debugging, and hobby-OS bring-up. Do NOT use for: eBPF programs (use ebpf-engineering), user-space performance (use cpu-architecture), RTOS firmware (use rtos).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [low-level, kernel, linux, drivers, os, synchronization]
---

# Kernel Development and OS Internals

## Purpose
Kernel code runs with full privilege, cannot sleep in many contexts, and a single bug crashes the machine. This skill explains the execution contexts and rules that matter (process vs interrupt context, what may sleep, which lock to use), shows a minimal correct module, and lists the debugging tools that make kernel work tractable.

## Agent Protocol

### Trigger
"kernel module", "Linux driver", "device driver", "ring 0", "system call", "interrupt handler", "spinlock", "RCU", "kernel panic", "oops", "write an OS", "bootloader", "page tables", "Rust for Linux".

### Input Context
- Kernel version and architecture; in-tree vs out-of-tree module
- Device/bus (platform, PCI, USB, I2C/SPI with device tree or ACPI)
- Execution context of the code being written (process, softirq, hardirq)

### Output Artifact
Kernel C (or Rust) code, Kbuild/Makefile, debugging plan. No file unless requested.

### Response Format
```
Kernel: {version, arch}
Context: {process | softirq/tasklet | hardirq} — may sleep: {yes/no}
Locking: {primitive and why}
Code: {snippet}
Debug: {config options / tools to verify}
```

## 1. Privilege and Address Spaces
- x86-64 defines rings 0–3; mainstream OSes use ring 0 (kernel) and ring 3 (user). ARM64 uses exception levels EL0 (user), EL1 (kernel), EL2 (hypervisor), EL3 (secure monitor).
- Privileged instructions in user mode trap (#GP on x86); invalid memory access raises a page fault that the kernel turns into `SIGSEGV`.
- User and kernel share the virtual address space layout (kernel in the upper half); KPTI (Meltdown mitigation) unmaps most kernel pages while in user mode. Never dereference user pointers directly — use `copy_from_user`/`copy_to_user`/`get_user`, which handle faults and SMAP.

## 2. Kernel Architectures
| Design | Examples | Trade-off |
|--------|----------|-----------|
| Monolithic (with loadable modules) | Linux, FreeBSD | fast in-kernel calls; a driver bug can take down the system |
| Microkernel | seL4, QNX, MINIX 3 | drivers/filesystems as user processes; isolation and verifiability, IPC cost |
| Hybrid | Windows NT, XNU | monolithic in practice with microkernel structure |

## 3. System Calls
x86-64 Linux: arguments in `rdi, rsi, rdx, r10, r8, r9`, number in `rax`, `syscall` instruction; return in `rax` (negative errno on failure, translated by libc). ARM64: `x0–x5`, number in `x8`, `svc #0`. Kernel entry saves user registers, switches to the kernel stack, and dispatches through the syscall table. vDSO provides some calls (e.g. `clock_gettime`) without a mode switch. See `references/syscall-mechanism.md`.

## 4. Interrupts and Deferred Work
- Hard IRQ handlers run with the interrupt line (often all local interrupts) masked: do the minimum (ack the device, grab data), never sleep.
- Defer the rest:
| Mechanism | Context | May sleep |
|-----------|---------|-----------|
| Threaded IRQ (`request_threaded_irq`) | kernel thread | yes — preferred for most drivers |
| Softirq / tasklet | softirq | no (tasklets are being phased out in favour of threaded IRQs / BH workqueues) |
| Workqueue (`queue_work`) | kernel thread | yes |
| Timers (`timer_list`, hrtimer) | softirq/hardirq | no |
See `references/interrupts-exceptions.md`.

## 5. Memory
- `kmalloc(size, GFP_KERNEL)` may sleep; in atomic context use `GFP_ATOMIC`. Check for `NULL`, free with `kfree`.
- `vmalloc` for large, virtually contiguous buffers (not DMA-able as-is). `devm_*` managed allocations in drivers are freed automatically on unbind.
- DMA: use the DMA API (`dma_alloc_coherent`, `dma_map_single`), never `virt_to_phys` for device addresses (IOMMUs and bounce buffers).
- Kernel stacks are small (16 KB on x86-64): no large local arrays, no deep recursion.

## 6. Synchronisation
| Primitive | Use | Rules |
|-----------|-----|-------|
| `spinlock_t` (`spin_lock_irqsave` when shared with IRQ handlers) | short critical sections, atomic context | never sleep while holding |
| `mutex` | process context, may sleep inside | not from IRQ context |
| `rw_semaphore`, `seqlock` | read-mostly data | seqlock readers retry on concurrent write |
| Atomics (`atomic_t`, `refcount_t`) | counters, refcounts | `refcount_t` saturates instead of overflowing |
| RCU | read-mostly linked data, lock-free readers | readers `rcu_read_lock()`; writers publish with `rcu_assign_pointer()` and free after `synchronize_rcu()` / `kfree_rcu()` |
Lock ordering must be consistent; enable lockdep (`CONFIG_PROVE_LOCKING`) during development. See `references/kernel-synchronization.md`.

## 7. Minimal Module
```c
// hello.c
#include <linux/module.h>
#include <linux/init.h>

static int __init hello_init(void)
{
    pr_info("hello: loaded\n");
    return 0;                       /* non-zero aborts the load */
}

static void __exit hello_exit(void)
{
    pr_info("hello: unloaded\n");
}

module_init(hello_init);
module_exit(hello_exit);
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("minimal example");
```
```make
# Makefile (out-of-tree)
obj-m += hello.o
all:
	$(MAKE) -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules
clean:
	$(MAKE) -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean
```
`insmod hello.ko`, `dmesg`, `rmmod hello`. Secure Boot systems require signed modules. There is no stable in-kernel API: out-of-tree modules must be rebuilt (and often adapted) per kernel version — upstream drivers when possible.

Drivers use the device model: register a `platform_driver`/`pci_driver`/`i2c_driver` with an `of_match_table`/ID table, set up in `probe()`, tear down in `remove()`, prefer `devm_` helpers. Rust drivers are supported for a growing set of subsystems (Rust for Linux, mainline since 6.1).

## 8. Debugging
- Debug configs: `CONFIG_KASAN` (memory errors), `CONFIG_PROVE_LOCKING` (lockdep), `CONFIG_DEBUG_ATOMIC_SLEEP` (sleeping in atomic context), `CONFIG_KCSAN` (data races), `CONFIG_UBSAN`.
- Read oopses: decode with `scripts/decode_stacktrace.sh`; `addr2line`/`gdb vmlinux` for the faulting line.
- Dynamic debug (`pr_debug` + `/sys/kernel/debug/dynamic_debug/control`), ftrace (`trace-cmd`), perf, kgdb, and QEMU + `-s -S` with gdb for early boot.
- Test in a VM (QEMU/virtme-ng) rather than on your workstation.

## 9. Hobby OS Bring-up (x86-64)
Boot via UEFI or a Multiboot2/Limine bootloader → set up GDT/IDT and paging (4-level, optionally 5-level) → enable interrupts (APIC) → physical frame allocator → kernel heap → scheduler with context switch in assembly → syscalls → user mode. Use QEMU, a serial console for logs, and the OSDev wiki as the reference.

## 10. Anti-Patterns
- Sleeping (mutex, `GFP_KERNEL`, `copy_from_user`) while holding a spinlock or in IRQ context.
- Dereferencing user pointers directly.
- Ignoring return values of `request_irq`, allocation, and `copy_*_user`.
- Busy-waiting with `mdelay` in normal paths; use `usleep_range`/`msleep` where sleeping is allowed.
- Global state in drivers that support multiple device instances.

## 11. Checklist
- [ ] Execution context known for every function; nothing sleeps in atomic context
- [ ] Locks chosen per context; lockdep clean
- [ ] User memory accessed only via uaccess helpers
- [ ] KASAN/UBSAN/lockdep builds pass the test suite
- [ ] Resources managed with `devm_*` or symmetric cleanup paths
- [ ] Tested in QEMU on the target kernel versions

## References
- `references/interrupts-exceptions.md` — IDT/exception vectors, IRQ flow, deferred work
- `references/syscall-mechanism.md` — syscall entry/exit, ABI, vDSO
- `references/kernel-synchronization.md` — spinlocks, atomics, RCU
