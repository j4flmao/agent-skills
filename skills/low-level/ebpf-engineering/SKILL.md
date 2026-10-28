---
name: ebpf-engineering
description: >
  Use this skill when the user says 'eBPF', 'BPF program', 'libbpf', 'CO-RE', 'BTF', 'kprobe', 'fentry', 'tracepoint', 'uprobe', 'XDP', 'tc BPF', 'BPF map', 'ring buffer', 'verifier error', 'bpftrace', 'cilium/ebpf', 'aya'. Writes and debugs production eBPF: program types and attach points, libbpf + CO-RE with skeletons, maps and ring buffers, verifier constraints, user-space loaders in C/Go/Rust, and deployment across kernel versions. Do NOT use for: Cilium cluster configuration (use devops/cilium-ebpf), threat-detection rule design (use cybersecurity/ebpf-threat-detection), general kernel module development (use kernel-development).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [low-level, ebpf, linux, libbpf, co-re, xdp, observability]
---

# eBPF Engineering

## Purpose
eBPF runs verified, sandboxed programs inside the Linux kernel at kernel events (function entry, tracepoints, packets, syscalls, LSM hooks) without writing a kernel module. This skill covers choosing the hook, writing CO-RE programs that load on many kernels, passing data through maps, satisfying the verifier, and shipping a loader.

## Agent Protocol

### Trigger
"eBPF", "libbpf", "CO-RE", "BTF", "kprobe", "fentry", "tracepoint", "uprobe", "XDP", "tc BPF", "BPF map", "ring buffer", "verifier", "bpftrace", "cilium/ebpf", "aya".

### Input Context
- Goal (tracing/observability, networking, security enforcement)
- Minimum kernel version and distros in the fleet; whether `/sys/kernel/btf/vmlinux` exists
- Loader language (C/libbpf, Go/cilium-ebpf, Rust/aya or libbpf-rs)

### Output Artifact
BPF C program, loader code, build commands, verifier-error diagnosis. No file unless requested.

### Response Format
```
Min kernel: {version} (BTF: yes/no)
Hook: {program type + attach point}
Maps: {name | type | key -> value | max_entries}
BPF code: {snippet}
Loader: {snippet / skeleton usage}
Verifier notes: {bounds checks, loops, stack}
```

## 1. Model
- Restricted C compiled by Clang to BPF bytecode (`clang -O2 -g -target bpf`), loaded with `bpf()`; the **verifier** proves safety (bounded execution, valid memory access, no uninitialised reads, correct helper usage); the JIT compiles to native code.
- Programs are event driven; state lives in **maps** shared with user space. Programs need `CAP_BPF` (+ `CAP_PERFMON`/`CAP_NET_ADMIN` depending on type) since 5.8, or root.

## 2. Choosing the Hook
| Need | Program type | Notes |
|------|-------------|-------|
| Trace a kernel function | `fentry`/`fexit` (BPF trampoline, ≥ 5.5) | faster than kprobes, typed args via BTF |
| Trace any kernel function on older kernels | `kprobe`/`kretprobe` | unstable: functions get inlined/renamed |
| Stable kernel events | tracepoints / `tp_btf` raw tracepoints | prefer over kprobes when one exists |
| User-space functions | `uprobe`/`uretprobe`, USDT | e.g. TLS library calls; per-process overhead on each hit |
| Packet processing at the driver | XDP | earliest hook; `XDP_DROP/PASS/TX/REDIRECT`; see `references/xdp-networking.md` |
| Packet processing with skb metadata | tc (`BPF_PROG_TYPE_SCHED_CLS`, tcx links ≥ 6.6) | ingress + egress |
| Security policy | BPF LSM (`lsm/` hooks, ≥ 5.7, `lsm=...,bpf` boot param) | can deny operations |
| Per-cgroup socket/network control | cgroup programs | connect, bind, sockops |

## 3. CO-RE Program Example
```c
// execsnoop.bpf.c — log process execs via a stable tracepoint
#include "vmlinux.h"                  // bpftool btf dump file /sys/kernel/btf/vmlinux format c
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_core_read.h>

struct event { u32 pid; u32 ppid; char comm[16]; };

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);   // bytes, power of two, multiple of page size
} events SEC(".maps");

SEC("tp/sched/sched_process_exec")
int handle_exec(struct trace_event_raw_sched_process_exec *ctx)
{
    struct event *e = bpf_ringbuf_reserve(&events, sizeof(*e), 0);
    if (!e)
        return 0;                                   // buffer full: drop, count it in a map
    struct task_struct *task = (struct task_struct *)bpf_get_current_task();
    e->pid  = bpf_get_current_pid_tgid() >> 32;
    e->ppid = BPF_CORE_READ(task, real_parent, tgid);  // CO-RE relocated field access
    bpf_get_current_comm(e->comm, sizeof(e->comm));
    bpf_ringbuf_submit(e, 0);
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```
Build and load with a skeleton:
```bash
clang -O2 -g -target bpf -D__TARGET_ARCH_x86 -c execsnoop.bpf.c -o execsnoop.bpf.o
bpftool gen skeleton execsnoop.bpf.o > execsnoop.skel.h
```
```c
struct execsnoop_bpf *skel = execsnoop_bpf__open_and_load();
if (!skel) { fprintf(stderr, "load failed: %s\n", strerror(errno)); return 1; }
if (execsnoop_bpf__attach(skel)) { /* handle error */ }
struct ring_buffer *rb = ring_buffer__new(bpf_map__fd(skel->maps.events), on_event, NULL, NULL);
while (!stop) ring_buffer__poll(rb, 100 /* ms */);
```
- CO-RE: `BPF_CORE_READ`, `bpf_core_field_exists()`, and `___suffix` struct flavours let one object run across kernel versions; the loader relocates field offsets using the running kernel's BTF. Kernels without BTF need BTFHub-style external BTF files.
- Go: `cilium/ebpf` with `bpf2go`; Rust: `aya` (BPF side in Rust too) or `libbpf-rs` skeletons.

## 4. Maps
| Type | Use |
|------|-----|
| `HASH` / `LRU_HASH` | per-key state (per-PID, per-flow); LRU evicts under pressure |
| `ARRAY` / `PERCPU_ARRAY` | counters, config, scratch buffers (per-CPU avoids atomics and the 512-byte stack limit) |
| `PERCPU_HASH` | high-rate counters without contention |
| `RINGBUF` (≥ 5.8) | events to user space, ordered across CPUs, shared buffer — prefer over `PERF_EVENT_ARRAY` |
| `LPM_TRIE` | IP prefix matching |
| `PROG_ARRAY` | tail calls |
| `DEVMAP` / `CPUMAP` / `XSKMAP` | XDP redirect targets / AF_XDP |

- Global variables (≥ 5.2) map to `.bss/.data/.rodata`; set `.rodata` constants from user space before load for configuration (dead-code eliminated by the verifier).
- Shared map values updated from several CPUs need `__sync_fetch_and_add`, `bpf_spin_lock`, or per-CPU maps.
- Pin maps/links in `/sys/fs/bpf` when they must outlive the loader process.

## 5. Verifier Survival Guide
- Bounds-check every pointer before use, against the end pointer the context gives:
```c
struct ethhdr *eth = (void *)(long)ctx->data;
if ((void *)(eth + 1) > (void *)(long)ctx->data_end)
    return XDP_PASS;
```
- Loops: bounded loops with a constant bound (≥ 5.3), `bpf_loop()` (≥ 5.17), open-coded iterators `bpf_for` (≥ 6.4); `#pragma unroll` only for older kernels.
- Stack is 512 bytes; use a per-CPU array map as scratch for larger buffers.
- Read kernel memory through helpers/CO-RE macros (`bpf_probe_read_kernel`, `BPF_CORE_READ`) where direct access is not allowed by the program type.
- Read the log: `libbpf_set_print()` / `bpftool prog load ... -d`; the last lines show the failing instruction and register states (e.g. `R1 invalid mem access 'scalar'` means a pointer lost its type after arithmetic the verifier cannot track — re-check or clamp it).
- Complexity limit: 1 million verified instructions per program (≥ 5.2); split with tail calls or BPF-to-BPF function calls.

## 6. Quick Tracing with bpftrace
```bash
bpftrace -e 'tracepoint:syscalls:sys_enter_openat { @[comm] = count(); }'
bpftrace -e 'kprobe:vfs_read { @start[tid] = nsecs; } kretprobe:vfs_read /@start[tid]/ { @us = hist((nsecs - @start[tid]) / 1000); delete(@start[tid]); }'
```
Use bpftrace for investigation; write libbpf/CO-RE programs for anything that ships.

## 7. Production Concerns
- Overhead: per-event cost is small, but hooks on hot functions (scheduler, `tcp_sendmsg`, every syscall) multiply it; aggregate in kernel (maps, histograms) instead of emitting every event.
- Handle ring buffer drops (count failed reserves) and user-space consumer lag.
- Test on the oldest supported kernel and each distro; feature-probe with `libbpf_probe_bpf_helper()` / `bpftool feature probe`.
- Signed/allow-listed BPF objects and restricted `CAP_BPF` in production; unprivileged BPF is disabled by default on most distros.

## 8. Anti-Patterns
- Legacy BCC Python tools that compile on the target host (needs kernel headers + LLVM there) for production agents.
- kprobes on static/inlined functions and assuming they fire.
- `PERF_EVENT_ARRAY` for new event pipelines when ring buffer is available.
- Large structs on the BPF stack.
- Unbounded per-event output from very hot hooks.

## 9. Checklist
- [ ] Minimum kernel stated; BTF availability handled
- [ ] Most stable hook chosen (tracepoint/fentry over kprobe)
- [ ] CO-RE reads, skeleton loader, license declared
- [ ] Every packet/pointer access bounds-checked; loops bounded per kernel support
- [ ] Maps sized; drops counted; concurrency on shared values handled
- [ ] Verified on oldest and newest target kernels

## References
- `references/xdp-networking.md` — XDP actions, AF_XDP, redirect maps, driver vs generic mode
