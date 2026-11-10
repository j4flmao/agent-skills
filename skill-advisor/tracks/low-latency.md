# Low-Latency & HFT Engineer

**Who this is for:** You build trading or networking systems where microseconds matter.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`lock-free-ring-buffers`](../../skills/niche/hft/lock-free-ring-buffers/SKILL.md) | `niche/hft/lock-free-ring-buffers` | Explain lock-free inter-thread communication for low-jitter systems: ring-buffer (LMAX Disruptor) design, sequence/claim coordination, and… |
| [`kernel-bypass-dpdk`](../../skills/niche/hft/kernel-bypass-dpdk/SKILL.md) | `niche/hft/kernel-bypass-dpdk` | Explain how DPDK achieves microsecond-scale networking by bypassing the kernel: poll-mode drivers instead of interrupts, userspace NIC access,… |
| [`cpu-architecture`](../../skills/low-level/cpu-architecture/SKILL.md) | `low-level/cpu-architecture` | Code that looks sequential runs on superscalar, out-of-order, speculative cores behind a deep cache hierarchy. |
| [`lang-cpp`](../../skills/languages/cpp/SKILL.md) | `languages/cpp` | C++ offers zero-overhead abstractions and full control, at the price of undefined behaviour and lifetime bugs when used carelessly. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ebpf-xdp-networking`](../../skills/niche/low-level/ebpf-xdp-networking/SKILL.md) | `niche/low-level/ebpf-xdp-networking` | Explain high-performance in-kernel packet processing with eBPF/XDP: the XDP hook at the NIC driver, verdicts (XDPPASS/DROP/TX/REDIRECT),… |
| [`network-protocols`](../../skills/low-level/network-protocols/SKILL.md) | `low-level/network-protocols` | Latency spikes, stalled transfers, connection exhaustion and "slow on mobile" problems usually trace back to transport behaviour: handshakes,… |
| [`lang-rust`](../../skills/languages/rust/SKILL.md) | `languages/rust` | Rust guarantees memory safety and freedom from data races in safe code through ownership and borrowing, with performance comparable to C/C++. |
| [`dev-loop-performance-profiler`](../../skills/dev-loop/performance-profiler/SKILL.md) | `dev-loop/performance-profiler` | Identify, analyze, and resolve performance bottlenecks in applications — CPU profiling, memory profiling, I/O analysis, database query… |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`rdma-roce`](../../skills/hardware-acceleration/rdma-roce/SKILL.md) | `hardware-acceleration/rdma-roce` | RDMA lets a NIC read and write registered memory on a remote host without involving the remote CPU or the kernel in the data path. |
| [`double-entry-ledger`](../../skills/niche/fintech-web3/double-entry-ledger/SKILL.md) | `niche/fintech-web3/double-entry-ledger` | Explain double-entry ledger design where every transaction posts balanced debits and credits (Assets = Liabilities + Equity), and why FinTech… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lock-free-ring-buffers --skill kernel-bypass-dpdk --skill cpu-architecture --skill lang-cpp
```

**Level 1 + 2 (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lock-free-ring-buffers --skill kernel-bypass-dpdk --skill cpu-architecture --skill lang-cpp --skill ebpf-xdp-networking --skill network-protocols --skill lang-rust --skill dev-loop-performance-profiler
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`systems-programming`](../bundles.md#systems-programming) | 17 | Systems programming: C/C++/Rust/assembly, compilers, kernels, eBPF, networking, lock-free and kernel-bypass |

## Combine with

- [Systems & Embedded Engineer](systems.md)
- [Performance Engineer](performance.md)

## Watch out

Measure with hardware timestamps on your own hardware; do not trust published latency numbers.
