# Systems & Embedded Engineer

**Who this is for:** You write low-level, embedded, kernel or performance-critical code.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`lang-c`](../../skills/languages/c/SKILL.md) | `languages/c` | C gives direct control over memory and layout, and the compiler assumes you never break the standard's rules. |
| [`lang-cpp`](../../skills/languages/cpp/SKILL.md) | `languages/cpp` | C++ offers zero-overhead abstractions and full control, at the price of undefined behaviour and lifetime bugs when used carelessly. |
| [`lang-rust`](../../skills/languages/rust/SKILL.md) | `languages/rust` | Rust guarantees memory safety and freedom from data races in safe code through ownership and borrowing, with performance comparable to C/C++. |
| [`cpu-architecture`](../../skills/low-level/cpu-architecture/SKILL.md) | `low-level/cpu-architecture` | Code that looks sequential runs on superscalar, out-of-order, speculative cores behind a deep cache hierarchy. |
| [`core-algorithms-system-design`](../../skills/system-design/core-algorithms/SKILL.md) | `system-design/core-algorithms` | A handful of algorithms keep appearing inside caches, databases and stream processors: ways to spread keys over changing node sets, and compact… |

## Level 2 — Professional (8 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`compiler-design`](../../skills/low-level/compiler-design/SKILL.md) | `low-level/compiler-design` | Build a language implementation that is correct first and fast second. |
| [`kernel-development`](../../skills/low-level/kernel-development/SKILL.md) | `low-level/kernel-development` | Kernel code runs with full privilege, cannot sleep in many contexts, and a single bug crashes the machine. |
| [`network-protocols`](../../skills/low-level/network-protocols/SKILL.md) | `low-level/network-protocols` | Latency spikes, stalled transfers, connection exhaustion and "slow on mobile" problems usually trace back to transport behaviour: handshakes,… |
| [`ebpf-engineering`](../../skills/low-level/ebpf-engineering/SKILL.md) | `low-level/ebpf-engineering` | eBPF runs verified, sandboxed programs inside the Linux kernel at kernel events (function entry, tracepoints, packets, syscalls, LSM hooks)… |
| [`rtos`](../../skills/embedded-systems/rtos/SKILL.md) | `embedded-systems/rtos` | Turn a firmware feature into a set of tasks, priorities and communication primitives that meet deadlines deterministically. |
| [`bare-metal-rust`](../../skills/embedded-systems/bare-metal-rust/SKILL.md) | `embedded-systems/bare-metal-rust` | Rust removes whole classes of firmware bugs (buffer overruns, use-after-free, data races between ISR and main) at compile time while compiling to… |
| [`c-cpp-patterns`](../../skills/embedded-systems/c-cpp-patterns/SKILL.md) | `embedded-systems/c-cpp-patterns` | Firmware bugs come from a short list: wrong register access, data shared with ISRs unsafely, heap fragmentation, undefined behaviour the optimiser… |
| [`iot-protocols`](../../skills/embedded-systems/iot-protocols/SKILL.md) | `embedded-systems/iot-protocols` | Constrained devices run on batteries, lossy radios and tiny RAM. |

## Level 3 — Specialist (8 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`kernel-bypass-dpdk`](../../skills/niche/hft/kernel-bypass-dpdk/SKILL.md) | `niche/hft/kernel-bypass-dpdk` | Explain how DPDK achieves microsecond-scale networking by bypassing the kernel: poll-mode drivers instead of interrupts, userspace NIC access,… |
| [`lock-free-ring-buffers`](../../skills/niche/hft/lock-free-ring-buffers/SKILL.md) | `niche/hft/lock-free-ring-buffers` | Explain lock-free inter-thread communication for low-jitter systems: ring-buffer (LMAX Disruptor) design, sequence/claim coordination, and… |
| [`ebpf-xdp-networking`](../../skills/niche/low-level/ebpf-xdp-networking/SKILL.md) | `niche/low-level/ebpf-xdp-networking` | Explain high-performance in-kernel packet processing with eBPF/XDP: the XDP hook at the NIC driver, verdicts (XDPPASS/DROP/TX/REDIRECT),… |
| [`llvm-compiler-architecture`](../../skills/niche/low-level/llvm-compiler-architecture/SKILL.md) | `niche/low-level/llvm-compiler-architecture` | Explain LLVM's modular compiler architecture: the frontend/optimizer/backend three-phase split, the SSA-form LLVM IR as the common interface, and… |
| [`lang-assembly`](../../skills/languages/assembly/SKILL.md) | `languages/assembly` | Most engineers need assembly to read compiler output — to confirm vectorisation, find a hidden branch, or understand a crash — and occasionally to… |
| [`edge-ai`](../../skills/embedded-systems/edge-ai/SKILL.md) | `embedded-systems/edge-ai` | A model that works in a notebook still has to fit the device's memory, latency, power and operator support. |
| [`cuda-programming`](../../skills/hardware-acceleration/cuda-programming/SKILL.md) | `hardware-acceleration/cuda-programming` | Write correct, fast CUDA C++ kernels for NVIDIA GPUs. |
| [`qubits-and-gates`](../../skills/quantum-computing/qubits-and-gates/SKILL.md) | `quantum-computing/qubits-and-gates` | Give precise, checkable foundations: what a qubit state is, how measurement works, the standard gates as matrices, the identities used to simplify… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-c --skill lang-cpp --skill lang-rust --skill cpu-architecture --skill core-algorithms-system-design
```

**Level 1 + 2 (13 skills):**

```bash
npx skills add j4flmao/agent-skills --skill lang-c --skill lang-cpp --skill lang-rust --skill cpu-architecture --skill core-algorithms-system-design --skill compiler-design --skill kernel-development --skill network-protocols --skill ebpf-engineering --skill rtos --skill bare-metal-rust --skill c-cpp-patterns --skill iot-protocols
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`systems-programming`](../bundles.md#systems-programming) | 17 | Systems programming: C/C++/Rust/assembly, compilers, kernels, eBPF, networking, lock-free and kernel-bypass |
| [`embedded-iot`](../bundles.md#embedded-iot) | 9 | Embedded and IoT: RTOS, bare-metal Rust, C/C++ patterns, IoT protocols, edge AI |
| [`languages`](../bundles.md#languages) | 14 | Programming language deep dives: TypeScript, Python, Go, Rust, Java, Kotlin, Swift, C#, C, C++, Scala, Elixir, Dart, Assembly |
| [`quantum-computing`](../bundles.md#quantum-computing) | 12 | Quantum computing: qubits and gates, algorithms (Grover, Shor), Qiskit, error correction, post-quantum cryptography |

## Combine with

- [Game Developer](game.md)
- [ML & AI Engineer](ml-ai.md)

## Watch out

Read `.claude/rules/misra-c-standards.md` and `.claude/rules/ebpf-safety-rules.md` with this track.
