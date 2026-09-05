---
description: "j4flmao/rules — Mandatory standards for generating eBPF code (Verifier compliance and libbpf)"
glob: "*"
---

# eBPF Safety & Engineering Standards

Cursor/AI MUST follow these rules when writing eBPF (Extended Berkeley Packet Filter) code.

## 1. Verifier Compliance is Absolute
- **Rule**: All eBPF C code MUST pass the kernel Verifier.
- **Action**: 
  - Strictly avoid unbounded `for` or `while` loops. Always use bounded loops (e.g., `#pragma unroll`).
  - Explicitly bounds-check all pointer accesses. If reading from a packet in XDP, you MUST check `if (data + offset > data_end) return XDP_DROP;` before accessing the memory.

## 2. Modern Stack (CO-RE and libbpf)
- **Rule**: NEVER generate legacy BCC (BPF Compiler Collection) python scripts unless explicitly mandated by the user. 
- **Action**: Always generate modern eBPF code using `libbpf` and BPF Type Format (BTF) to guarantee Compile-Once-Run-Everywhere (CO-RE).

## 3. State Management (eBPF Maps)
- **Rule**: eBPF programs cannot use global dynamic state.
- **Action**: Use BPF Maps (e.g., `BPF_MAP_TYPE_HASH` or `BPF_MAP_TYPE_RINGBUF`) to communicate safely between the kernel context and the user-space orchestrator. Prefer `RINGBUF` over `PERF_EVENT_ARRAY` for high-throughput event streaming.
