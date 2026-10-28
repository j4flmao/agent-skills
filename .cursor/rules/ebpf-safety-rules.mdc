---
description: "j4flmao/rules — Mandatory standards for generating eBPF code (Verifier compliance and libbpf)"
glob: "*"
---

# eBPF Safety & Engineering Standards

Cursor/AI MUST follow these rules when writing eBPF (Extended Berkeley Packet Filter) code.

## 1. Verifier Compliance is Absolute
- **Rule**: All eBPF C code MUST pass the kernel verifier on the minimum kernel version the project targets. State that version.
- **Loops**: Every loop must provably terminate. Kernels ≥ 5.3 accept bounded loops with a constant upper bound; ≥ 5.17 offer `bpf_loop()`; ≥ 6.4 offer open-coded iterators (`bpf_for`). Use `#pragma unroll` only when targeting kernels older than 5.3.
- **Bounds**: Check every packet/pointer access before dereferencing it:
  ```c
  struct ethhdr *eth = data;
  if ((void *)(eth + 1) > data_end)
      return XDP_PASS; /* choose PASS/DROP/ABORTED deliberately */
  ```
- **Limits**: The BPF stack is 512 bytes. Put large buffers in a per-CPU array map, not on the stack.
- **License**: Declare `char LICENSE[] SEC("license") = "GPL";` (or a GPL-compatible license) when using GPL-only helpers.

## 2. Modern Stack (CO-RE and libbpf)
- **Rule**: Do not generate legacy BCC Python tooling unless the user explicitly asks for it. Use `bpftrace` for one-off tracing.
- **Action**: Write production programs with `libbpf` + BTF CO-RE: include `vmlinux.h` (from `bpftool btf dump file /sys/kernel/btf/vmlinux format c`), read kernel structs with `BPF_CORE_READ()`, and load them through a `bpftool gen skeleton` skeleton (or `cilium/ebpf` in Go, `aya`/`libbpf-rs` in Rust).

## 3. State Management (eBPF Maps)
- **Rule**: eBPF programs have no heap. Global variables (kernel ≥ 5.2) are backed by `.data`/`.bss`/`.rodata` array maps. Use `.rodata` for load-time configuration.
- **Action**: Share state with user space through BPF maps (`BPF_MAP_TYPE_HASH`, `LRU_HASH`, `PERCPU_ARRAY`, ...). Prefer `BPF_MAP_TYPE_RINGBUF` (kernel ≥ 5.8) over `PERF_EVENT_ARRAY` for event streaming: it preserves ordering across CPUs and shares one buffer.
- **Rule**: Concurrent updates to shared map values need atomics (`__sync_fetch_and_add`) or `bpf_spin_lock`, or per-CPU maps.
