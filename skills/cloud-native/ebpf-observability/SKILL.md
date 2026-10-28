---
name: cloud-native-ebpf-observability
description: >
  Use this skill when the user says 'ebpf tracing', 'ebpf observability', 'bpftrace', 'trace syscalls', 'kprobe', 'tracepoint', 'uprobe', 'off-cpu profiling', 'continuous profiling ebpf', 'libbpf ringbuf', 'measure latency in kernel'. Builds kernel- and user-level observability with eBPF: bpftrace one-liners for investigation, libbpf CO-RE programs with ring buffers for production agents, and guidance on Kubernetes-ready tools (Pixie, Parca, Tetragon, Beyla/OBI). Do NOT use for: packet processing and Cilium datapath (cloud-native-ebpf-networking), OpenTelemetry SDK tracing (opentelemetry-tracing), runtime threat detection rules (ebpf-threat-detection).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, ebpf, observability, bpftrace, libbpf, profiling, tracing]
---

# eBPF Observability

## Purpose
Observe what the kernel and processes are actually doing — syscalls, scheduling, I/O latency, network connections, function calls in binaries — with low overhead and no code changes. Start with bpftrace to answer a question in minutes; build a libbpf CO-RE program only when you need a long-running agent.

## Agent Protocol

### Trigger
"ebpf tracing", "ebpf observability", "bpftrace", "trace syscalls", "kprobe", "tracepoint", "uprobe", "off-cpu", "continuous profiling", "ringbuf", "kernel latency".

### Input Context
- Question to answer (which process opens files, where is latency, who connects where).
- Kernel version and BTF availability (`ls /sys/kernel/btf/vmlinux`).
- One-off investigation vs permanent agent; container/Kubernetes context.

### Output Artifact
bpftrace script or libbpf program + user-space loader outline. No file unless requested.

### Response Format
```
Question: {...}
Probe type: {tracepoint|fentry/fexit|kprobe|uprobe|USDT|perf_event}
Tool: {bpftrace one-liner|libbpf CO-RE agent|existing tool}
Overhead note: {event rate, filtering in kernel}
Min kernel: {version}
```

### Completion Criteria
- [ ] Prefer stable tracepoints over kprobes where one exists.
- [ ] Aggregation/filtering happens in kernel (maps/histograms), not per-event to user space, when rates are high.
- [ ] Minimum kernel version stated.

## Probe Types
| Probe | Stability | Use |
|---|---|---|
| Tracepoints (`tracepoint:syscalls:sys_enter_openat`) | Stable ABI | First choice for syscalls, scheduler, block I/O, net events |
| fentry/fexit (BTF trampolines, kernel ≥ 5.5) | Function signatures may change between kernels | Low-overhead kernel function entry/exit with typed args |
| kprobe/kretprobe | Unstable (internal functions can be renamed/inlined) | When no tracepoint exists |
| uprobe/uretprobe | Binary-specific | User-space functions (TLS libraries, Go/Java runtimes with care) |
| USDT | Stable if the app defines them | Instrumented runtimes/databases |
| perf_event (CPU sampling) | Stable | CPU profiling (flame graphs) |

## bpftrace for Investigation
```bash
# Who opens which files (system-wide)
bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\n", comm, str(args.filename)); }'

# Syscall counts by process
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Block I/O latency histogram (µs)
bpftrace -e 'tracepoint:block:block_rq_issue { @s[args.dev, args.sector] = nsecs; }
  tracepoint:block:block_rq_complete /@s[args.dev, args.sector]/ {
    @usecs = hist((nsecs - @s[args.dev, args.sector]) / 1000); delete(@s[args.dev, args.sector]); }'

# New process executions with arguments
bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%d %s\n", pid, str(args.filename)); }'

# CPU profile at 99 Hz, kernel+user stacks
bpftrace -e 'profile:hz:99 { @[kstack, ustack, comm] = count(); }'
```
Older bpftrace versions use `args->field` instead of `args.field`. The bcc-tools/libbpf-tools packages (`execsnoop`, `opensnoop`, `biolatency`, `tcplife`, `runqlat`) cover many common questions already — prefer the libbpf-tools builds.

## libbpf CO-RE Agent (exec events via ring buffer)
```c
// execsnoop.bpf.c — kernel >= 5.8 (BPF ring buffer), BTF enabled
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_core_read.h>

struct event {
    __u32 pid;
    __u32 ppid;
    char comm[16];
    char filename[256];
};

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} events SEC(".maps");

SEC("tracepoint/syscalls/sys_enter_execve")
int handle_execve(struct trace_event_raw_sys_enter *ctx)
{
    struct event *e = bpf_ringbuf_reserve(&events, sizeof(*e), 0);
    if (!e)
        return 0;                                   /* buffer full: drop, count if needed */

    struct task_struct *task = (struct task_struct *)bpf_get_current_task();
    e->pid  = bpf_get_current_pid_tgid() >> 32;     /* upper 32 bits = TGID (user-visible PID) */
    e->ppid = BPF_CORE_READ(task, real_parent, tgid);
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    bpf_probe_read_user_str(&e->filename, sizeof(e->filename), (const char *)ctx->args[0]);

    bpf_ringbuf_submit(e, 0);
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```
User space (C with skeleton): `bpftool gen skeleton execsnoop.bpf.o > execsnoop.skel.h`, then `execsnoop_bpf__open_and_load()`, `execsnoop_bpf__attach()`, `ring_buffer__new(bpf_map__fd(skel->maps.events), handle_event, NULL, NULL)`, and loop on `ring_buffer__poll(rb, 100)`. In Go use `cilium/ebpf` (`bpf2go` + `ringbuf.NewReader`).

Key details:
- `bpf_get_current_pid_tgid()` returns `tgid << 32 | pid`; the user-visible process ID is the upper half.
- `BPF_CORE_READ` relocates field offsets at load time using BTF → one binary works across kernels.
- Ring buffer (≥ 5.8) preserves event order across CPUs and uses one shared buffer; prefer it over `PERF_EVENT_ARRAY`.

## Kubernetes-Ready Tools
| Need | Tool |
|---|---|
| Auto-instrumented HTTP/gRPC metrics and traces | Grafana Beyla / OpenTelemetry eBPF Instrumentation (OBI), Pixie |
| Continuous CPU profiling | Parca, Pyroscope (eBPF agent) |
| Process/file/network security observability | Tetragon, Falco |
| Network flow visibility | Hubble (Cilium) |
| Ad-hoc tracing in pods | `kubectl debug` + bpftrace, or Inspektor Gadget |

Map host PIDs to containers via cgroup ID (`bpf_get_current_cgroup_id()`) and the container runtime.

## Overhead Rules
- Cost scales with event rate × work per event. Tracing every `sys_enter` on a busy host can be expensive; filter by PID/cgroup in-kernel and aggregate in maps.
- uprobes trap into the kernel per hit (microsecond-scale each) — avoid on very hot user functions.
- Stack collection and string copies are the expensive parts; cap sizes.

## Anti-Patterns
- BCC Python in production agents (runtime compilation, kernel headers required on nodes).
- kprobes on functions that have a tracepoint equivalent.
- Streaming every event to user space and aggregating there.
- Running privileged tracing DaemonSets without restricting who can deploy them (they can read any process memory via probes).

## Checklist
- [ ] BTF present; minimum kernel documented.
- [ ] Tracepoint/fentry chosen before kprobe.
- [ ] In-kernel filtering/aggregation; ring buffer sized; drops counted.
- [ ] Capabilities limited (`CAP_BPF`, `CAP_PERFMON` instead of full root where possible, kernel ≥ 5.8).

## References
- Related skills: `skills/cloud-native/ebpf-networking/SKILL.md`, `skills/low-level/ebpf-engineering/SKILL.md`, `skills/cybersecurity/ebpf-threat-detection/SKILL.md`.
