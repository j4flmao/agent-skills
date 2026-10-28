---
name: ebpf-xdp-networking
description: >
  Use this skill when the user says 'XDP', 'eBPF networking', 'in-kernel packet processing', 'AF_XDP', 'eBPF verifier', 'DDoS filtering in kernel'. Explains XDP packet processing at the NIC driver hook and eBPF verifier constraints. Do NOT use for: userspace kernel-bypass (use niche/hft/kernel-bypass-dpdk) or eBPF security detection (use cybersecurity/ebpf-threat-detection).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [niche, low-level, ebpf, xdp, networking]
---

# eBPF & XDP Networking

## Purpose
Explain high-performance in-kernel packet processing with eBPF/XDP: the XDP hook at the NIC driver, verdicts (XDP_PASS/DROP/TX/REDIRECT), bounds-checking required by the verifier, and maps for userspace coordination.

## Agent Protocol

### Trigger
User phrases: "XDP program", "eBPF packet filter", "AF_XDP", "verifier bounds check", "in-kernel DDoS drop".

### Input Context
- Kernel version and NIC XDP support (native vs generic).
- Drop/redirect objective.

### Output Artifact
XDP program design with verifier-safe bounds checks.

### Response Format
```
Hook: {XDP native/generic}
Verdict: {PASS|DROP|TX|REDIRECT}
Safety: {data+off <= data_end before access}
```


## Core Mechanics

Extended Berkeley Packet Filter (eBPF) allows running sandboxed programs in a privileged context such as the Linux operating system kernel, without changing kernel source code or loading kernel modules.

### 1. eXpress Data Path (XDP)
XDP is a specific eBPF hook that attaches directly to the Network Interface Card (NIC) driver. It intercepts network packets *before* the Linux kernel's networking stack even sees them.
- Used for ultra-fast DDoS mitigation (Cloudflare), Load Balancing, and Firewalls.
- Can return `XDP_DROP` (discard immediately) or `XDP_PASS` (send to kernel).

### 2. The eBPF Verifier
To prevent a custom script from crashing the kernel, the eBPF Verifier analyzes the bytecode before loading. It ensures:
- No infinite loops.
- No out-of-bounds memory access.
- The program terminates safely.

### eBPF/XDP Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph UserSpace ["User Space"]
        A["eBPF Program (C/Rust)"]
        B["Clang/LLVM Compiler"]
        C["eBPF Bytecode"]
    end
    
    subgraph KernelSpace ["Linux Kernel"]
        D["eBPF Verifier"]
        E["JIT Compiler"]
        F["eBPF Map (Shared Memory)"]
    end
    
    subgraph Hardware ["NIC Driver (XDP Hook)"]
        G["Incoming Packet"]
        H{"Run eBPF Logic"}
        I["XDP_DROP"]
        J["XDP_PASS"]
    end
    
    A --> B
    B --> C
    C -->|"bpf() syscall"| D
    D -->|"Safe"| E
    E -->|"Attach"| H
    G --> H
    H -->|"Malicious"| I
    H -->|"Valid"| J
    J -->|"To Kernel TCP/IP Stack"| K["Standard Network Stack"]
    H <-->|"Read/Write"| F
```
