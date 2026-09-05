# eBPF Engineering (Extended Berkeley Packet Filter)

## 1. Skill Context
**Focus**: Safely running user-defined programs inside the Linux kernel at native speed. Used for hyper-optimized networking (Cilium), security (Tetragon), and deep system observability.
**Triggers**: ebpf, bpf, linux-kernel, kprobes, uprobes, libbpf, co-re.

## 2. "JavaScript for the Linux Kernel"
Historically, modifying kernel behavior required writing and loading a Kernel Module (`.ko`). This was extremely dangerous: a single null-pointer dereference would cause a Kernel Panic and crash the entire server.

**eBPF** revolutionized this by introducing a sandboxed virtual machine *inside* the Linux kernel. 
- You write an eBPF program in restricted C.
- You compile it to eBPF bytecode using Clang/LLVM.
- The kernel's **JIT (Just-In-Time) Compiler** translates it to native machine code for maximum speed.

## 3. The eBPF Verifier (The Guardian)
Before the kernel runs your eBPF bytecode, it passes through an incredibly strict static analyzer called the **Verifier**. The Verifier guarantees your code will not crash the kernel.
- **Rule 1**: No unbounded loops. The program must be guaranteed to terminate.
- **Rule 2**: Every pointer must be strictly bounds-checked before access.
- **Rule 3**: Uninitialized variables are forbidden.
If your code violates any rule, the kernel rejects it instantly.

## 4. Hooks and Maps
- **Hooks**: eBPF programs are event-driven. They are attached to specific triggers in the system.
  - `kprobes`/`kretprobes`: Attach to any internal kernel function.
  - `uprobes`: Attach to user-space functions (e.g., intercepting SSL encryption inside a Node.js app).
  - `tracepoints`: Static, stable markers in the kernel.
- **Maps**: eBPF programs cannot use global variables or standard memory allocation. To share data between the kernel program and your user-space dashboard (e.g., written in Go), you use **eBPF Maps** (Hash tables, Arrays, Ring buffers residing in kernel memory).

## 5. CO-RE (Compile Once - Run Everywhere)
Older eBPF tools (like `BCC`) required compiling the C code on the target server, requiring heavy kernel headers installed everywhere. Modern eBPF uses **CO-RE** (via `libbpf` and BTF - BPF Type Format), allowing you to compile the eBPF binary once on your laptop and run it on any Linux kernel version without recompilation.
