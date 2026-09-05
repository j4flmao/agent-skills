# Bare-Metal Rust (Embedded Systems)

## 1. Skill Context
**Focus**: Replacing C/C++ in embedded systems (ARM Cortex-M, RISC-V) with Rust to eliminate memory safety bugs (buffer overflows, use-after-free) at compile time.
**Triggers**: bare-metal-rust, embedded-rust, no_std, cortex-m, svd2rust, memory-safety.

## 2. The `#![no_std]` Environment
When writing bare-metal Rust, you have no OS underneath you. 
- You cannot use the standard library (`std`), because `std` assumes you have an OS that provides threads, networking, and dynamic memory allocation (`malloc`).
- You must use `#![no_std]`, relying only on the `core` library (which provides basic types, iterators, and traits but no heap allocation).

## 3. The Embedded Rust Ecosystem
Rust has built a massive ecosystem for hardware abstraction:
- **PAC (Peripheral Access Crate)**: Auto-generated from the vendor's SVD (System View Description) XML files. It provides raw, unsafe access to hardware registers (MMIO).
- **HAL (Hardware Abstraction Layer)**: Wraps the PAC into safe, ergonomic Rust traits (e.g., `embedded-hal`). Instead of writing raw bits to `0x40021000`, you call `led.set_high()`.

## 4. Concurrency and Safety without an OS
In C, if an Interrupt Service Routine (ISR) mutates a global variable while the main loop is reading it, you get a race condition (and often a silent crash).
In Rust, the compiler **forbids** mutable global variables (`static mut`).

**How to share data safely in Bare-Metal Rust:**
1. Wrap the data in a `Mutex`.
2. Wrap the `Mutex` in a `RefCell` (for interior mutability).
3. To access the data, you MUST disable hardware interrupts (`cortex_m::interrupt::free(|cs| { ... })`). This creates a Critical Section. 
The Rust compiler physically prevents you from accessing the shared hardware state unless you prove to it that interrupts are disabled, achieving 100% thread-safety at compile time.
