# eBPF Deep Dive

## Overview

eBPF (extended Berkeley Packet Filter) is a kernel technology that allows running sandboxed programs in kernel space without changing kernel source or loading kernel modules. It's the foundation of Cilium's networking, security, and observability features.

## BPF Program Types

### Networking Programs
```c
// BPF_PROG_TYPE_XDP — Earliest hook, before kernel network stack
// Use cases: DDoS mitigation, load balancing, packet filtering

// BPF_PROG_TYPE_SCHED_CLS — TC (Traffic Control) ingress/egress
// Use cases: Policy enforcement, encapsulation, observability

// BPF_PROG_TYPE_SOCKET_FILTER — Socket-level filtering
// Use cases: Per-socket traffic inspection
```

### Tracing Programs
```c
// BPF_PROG_TYPE_KPROBE — Dynamic kernel function tracing
// Use cases: Debugging, performance analysis, security monitoring

// BPF_PROG_TYPE_TRACEPOINT — Static kernel tracepoints
// Use cases: Low-overhead kernel event monitoring

// BPF_PROG_TYPE_PERF_EVENT — Performance counter sampling
// Use cases: CPU profiling, PMC (Performance Monitoring Counter) sampling
```

### Other Program Types
```c
// BPF_PROG_TYPE_CGROUP_SKB — cgroup-level packet filtering
// Use cases: Container network policy enforcement

// BPF_PROG_TYPE_SOCK_OPS — Socket operations interception
// Use cases: TCP optimization, congestion control

// BPF_PROG_TYPE_LWT_* — Lightweight tunnel encapsulation
// Use cases: MPLS, IP-in-IP, segment routing
```

## BPF Maps

Maps are key-value stores shared between kernel and user space.

### Map Types
```c
// BPF_MAP_TYPE_HASH — General-purpose hash map
struct bpf_map_def SEC("maps") my_map = {
    .type = BPF_MAP_TYPE_HASH,
    .key_size = sizeof(u32),
    .value_size = sizeof(struct my_value),
    .max_entries = 1024,
};

// BPF_MAP_TYPE_ARRAY — Fixed-size array (faster than hash)
struct bpf_map_def SEC("maps") my_array = {
    .type = BPF_MAP_TYPE_ARRAY,
    .key_size = sizeof(u32),
    .value_size = sizeof(u64),
    .max_entries = 256,
};

// BPF_MAP_TYPE_PERCPU_HASH — Per-CPU hash (lock-free)
struct bpf_map_def SEC("maps") percpu_counter = {
    .type = BPF_MAP_TYPE_PERCPU_HASH,
    .key_size = sizeof(u32),
    .value_size = sizeof(u64),
    .max_entries = 1024,
};

// BPF_MAP_TYPE_LRU_HASH — LRU eviction hash
// Useful for connection tracking (Cilium uses this)
struct bpf_map_def SEC("maps") lru_ct = {
    .type = BPF_MAP_TYPE_LRU_HASH,
    .key_size = sizeof(struct ct_key),
    .value_size = sizeof(struct ct_value),
    .max_entries = 65536,
};
```

### Map Operations
```c
// Lookup
value = bpf_map_lookup_elem(&my_map, &key);

// Update
bpf_map_update_elem(&my_map, &key, &value, BPF_ANY);

// Delete
bpf_map_delete_elem(&my_map, &key);

// Iterate (from user space)
// Use bpf_map_get_next_key() from libbpf
```

## Kprobes and Tracepoints

### Kprobe Example
```c
SEC("kprobe/tcp_connect")
int kprobe_tcp_connect(struct pt_regs *ctx)
{
    // Record TCP connection attempts
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    bpf_map_update_elem(&conn_attempts, &pid, &timestamp, BPF_ANY);
    return 0;
}
```

### Tracepoint Example
```c
SEC("tracepoint/syscalls/sys_enter_openat")
int tracepoint_openat(struct trace_event_raw_sys_enter *ctx)
{
    // Monitor file open operations
    const char *filename = (const char *)ctx->args[0];
    bpf_probe_read_user_str(&buf, sizeof(buf), filename);
    bpf_map_update_elem(&open_tracker, &pid, &buf, BPF_ANY);
    return 0;
}
```

### Return Probe (Kretprobe)
```c
SEC("kretprobe/tcp_connect")
int kretprobe_tcp_connect(struct pt_regs *ctx)
{
    // Measure TCP connection duration
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 *start_ts = bpf_map_lookup_elem(&conn_attempts, &pid);
    if (start_ts) {
        u64 delta = bpf_ktime_get_ns() - *start_ts;
        update_latency_histogram(delta);
    }
    return 0;
}
```

## XDP (eXpress Data Path)

### XDP Action Codes
```c
enum xdp_action {
    XDP_ABORTED = 0,  // Error, drop packet
    XDP_DROP = 1,     // Drop packet silently
    XDP_PASS = 2,     // Pass to kernel network stack
    XDP_TX = 3,       // Transmit back out same interface
    XDP_REDIRECT = 4, // Redirect to another interface/CPU
};
```

### XDP Program Example
```c
SEC("xdp")
int xdp_ddos_filter(struct xdp_md *ctx)
{
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    struct ethhdr *eth = data;
    if ((void*)eth + sizeof(*eth) > data_end)
        return XDP_ABORTED;

    // Parse IP header
    struct iphdr *ip = data + sizeof(*eth);
    if ((void*)ip + sizeof(*ip) > data_end)
        return XDP_ABORTED;

    // Drop packets from known bad IPs
    u32 src_ip = ip->saddr;
    u32 *drop = bpf_map_lookup_elem(&blocked_ips, &src_ip);
    if (drop)
        return XDP_DROP;

    // Forward SYN flood protection
    if (ip->protocol == IPPROTO_TCP) {
        struct tcphdr *tcp = (void*)ip + sizeof(*ip);
        if (tcp->syn && !tcp->ack) {
            // Rate limit SYN packets per source
            u64 *count = bpf_map_lookup_elem(&syn_count, &src_ip);
            if (count && *count > 1000)
                return XDP_DROP;
            increment_counter(&syn_count, src_ip);
        }
    }

    return XDP_PASS;
}
```

## TC (Traffic Control) Hooks

### TC Ingress/Egress
```c
// TC ingress — called for incoming packets
SEC("classifier/ingress")
int tc_ingress(struct __sk_buff *skb)
{
    // Check policy map
    // Apply Cilium network policy
    // Update connection tracking
    // Emit Hubble flow event
    return TC_ACT_OK;  // Or TC_ACT_SHOT to drop
}

// TC egress — called for outgoing packets
SEC("classifier/egress")
int tc_egress(struct __sk_buff *skb)
{
    // Apply encryption if needed
    // Update load balancer state
    // Emit Hubble flow event
    return TC_ACT_OK;
}
```

## CO-RE (Compile Once, Run Everywhere)

CO-RE enables BPF programs compiled once to run on different kernel versions.

### BTF (BPF Type Format)
```bash
# Check BTF support
ls /sys/kernel/btf/vmlinux

# Generate BTF for kernel
bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h
```

### CO-RE Relocation
```c
// Instead of hardcoding struct offsets, use CO-RE relocations
// No more:
//   struct task_struct *task = (void *)ctx->di;
//   int pid = task->pid;  // Offset may differ across kernels

// With CO-RE:
#include "vmlinux.h"

struct task_struct *task = (void *)bpf_get_current_task();
int pid = BPF_CORE_READ(task, pid);  // Automatically relocated
```

### BPF CO-RE Example
```c
// Compile once — runs on kernel 5.x, 6.x, etc.
SEC("tracepoint/syscalls/sys_enter_execve")
int trace_execve(struct trace_event_raw_sys_enter *ctx)
{
    // CO-RE safe field access
    struct task_struct *task = (void *)bpf_get_current_task();
    
    // These are automatically relocated for any kernel version
    u32 pid = BPF_CORE_READ(task, pid);
    u32 tgid = BPF_CORE_READ(task, tgid);
    u64 start_time = BPF_CORE_READ(task, start_time);
    
    // Use bpf_core_read for complex field paths
    char comm[16];
    BPF_CORE_READ_STR_INTO(&comm, task, comm);
    
    bpf_printk("execve: pid=%d comm=%s", pid, comm);
    return 0;
}
```

## BPF Development Tools

### bpftool
```bash
# List loaded BPF programs
bpftool prog list

# Show program details
bpftool prog show id <id>

# Dump BPF map contents
bpftool map dump id <map-id>

# Trace BPF output
bpftool prog tracelog

# Build BPF program
bpftool gen object prog.o prog.bpf.o
```

### bcc (BPF Compiler Collection)
```python
# Python-based BPF development
from bcc import BPF

bpf_code = """
int kprobe__sys_clone(void *ctx) {
    bpf_trace_printk("clone syscall\\n");
    return 0;
}
"""

b = BPF(text=bpf_code)
b.trace_print()
```

### libbpf
```c
// C library for BPF development
#include <bpf/libbpf.h>
#include "prog.skel.h"  // Auto-generated skeleton

int main() {
    struct prog_bpf *skel;
    
    // Load and verify BPF program
    skel = prog_bpf__open_and_load();
    if (!skel) { error }
    
    // Attach to hook
    prog_bpf__attach(skel);
    
    // Interact with maps
    int key = 0;
    u64 value = 0;
    bpf_map__update_elem(skel->maps.counter, &key, sizeof(key),
                         &value, sizeof(value), BPF_ANY);
    
    // Clean up
    prog_bpf__destroy(skel);
    return 0;
}
```

## BPF Verification

The BPF verifier ensures programs are safe to run in kernel space.

### Verifier Constraints
```
- Maximum 1 million instructions (4,096 for classic BPF)
- No loops (unless bounded and verifier can prove termination)
- No kernel memory leaks
- All memory accesses checked (bounds checking)
- No pointer arithmetic on returned pointers
- Helper functions must be allowed
```

## Best Practices

1. **Use CO-RE** for portable BPF programs — avoid per-kernel compilation.
2. **Prefer tracepoints** over kprobes when available — stable API, lower overhead.
3. **Use percpu maps** for counters to avoid lock contention.
4. **Set appropriate map sizes** — too small causes drops, too large wastes memory.
5. **Handle map lookup failures** — the entry might not exist.
6. **Validate packet boundaries** — always check `data_end` before accessing.
7. **Use bpf_printk** for debugging, remove in production.
8. **Monitor verifier stats** — complex programs may fail to load on older kernels.
9. **Use BPF skeletons** from libbpf for clean program lifecycle management.
10. **Kernel 5.10+** for most features, 5.15+ for CO-RE and BPF iterators.
