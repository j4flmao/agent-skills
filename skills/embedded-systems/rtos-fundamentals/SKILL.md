---
name: rtos-fundamentals
description: >
  Use this skill when the user says 'real-time system', 'hard real-time', 'deterministic latency', 'rate monotonic', 'EDF scheduling', 'WCET', 'schedulability', 'which RTOS', 'RTOS vs Linux', 'PREEMPT_RT', 'jitter'. Explains real-time concepts and makes design-level decisions: hard vs soft deadlines, scheduling policies and schedulability tests, WCET, latency sources, and choosing between bare metal, an RTOS, or real-time Linux. Do NOT use for: writing FreeRTOS/Zephyr task code (use rtos), MCU driver code (use c-cpp-patterns), general Linux performance tuning.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [embedded, rtos, real-time, scheduling, wcet]
---

# Real-Time Systems Fundamentals

## Purpose
Real-time means *bounded and predictable* response time, not fast. This skill gives the theory and decision rules needed before writing code: classify deadlines, pick a scheduling policy, check schedulability, budget latency, and choose the platform (superloop, RTOS, or Linux with PREEMPT_RT).

## Agent Protocol

### Trigger
"real-time", "hard real-time", "deterministic latency", "rate monotonic", "EDF", "WCET", "schedulability", "which RTOS", "RTOS vs Linux", "PREEMPT_RT", "jitter".

### Input Context
- Activities with period, deadline, and estimated execution time
- Consequence of a missed deadline (safety, quality, nothing)
- Hardware (MCU vs MPU), memory, certification needs

### Output Artifact
Task model table, schedulability result, platform recommendation with rationale. No file unless requested.

### Response Format
```
Class: {hard | firm | soft} per activity
Model: {task | C | T | D}
Policy: {fixed-priority RM/DM | EDF | cyclic executive}
Test: {utilization bound / response-time analysis result}
Platform: {bare metal | FreeRTOS | Zephyr | QNX/VxWorks | Linux PREEMPT_RT} + why
Risks: {jitter sources, unknown WCET}
```

## 1. Deadline Classes
| Class | Missed deadline means | Example |
|-------|----------------------|---------|
| Hard | System failure / hazard | airbag firing, motor commutation, ABS |
| Firm | Result useless but system survives | dropped video frame in a control display |
| Soft | Degraded quality | audio glitch in infotainment, UI lag |

Only hard deadlines need worst-case proofs; soft ones are handled with statistics (p99 latency).

## 2. General-Purpose OS vs RTOS
- A general-purpose kernel optimises average throughput and fairness; worst-case latency is unbounded in principle (page faults, long non-preemptible sections, SMIs, power management).
- An RTOS kernel offers bounded interrupt latency and dispatch time, fixed-priority preemption, and priority-inheritance locks. It does not make your code real-time: unbounded loops, heap allocation and blocking I/O in a high-priority task still break deadlines.

## 3. Task Model
Each periodic task i: execution time C_i (use WCET), period T_i, relative deadline D_i (often = T_i), plus jitter and blocking B_i from shared resources. Utilisation U = Σ C_i / T_i.

## 4. Scheduling Policies
| Policy | Rule | Optimal for | Notes |
|--------|------|-------------|-------|
| Rate Monotonic (RM) | shorter period → higher fixed priority | fixed-priority, D = T | Liu & Layland (1973) bound: U <= n(2^(1/n) - 1) → ~0.693 as n → ∞ (sufficient, not necessary) |
| Deadline Monotonic (DM) | shorter deadline → higher priority | fixed-priority, D <= T | Use response-time analysis |
| Earliest Deadline First (EDF) | dynamic: nearest absolute deadline runs | uniprocessor, preemptive | Schedulable iff U <= 1 (D = T); overload behaviour is poor (domino misses) |
| Cyclic executive | static timetable of minor/major frames | simple, certifiable systems | No kernel needed; brittle to change |

Most commercial RTOSes (FreeRTOS, Zephyr, VxWorks, QNX) are fixed-priority preemptive, so RM/DM + response-time analysis is the practical default. Linux offers `SCHED_FIFO`/`SCHED_RR` (fixed priority) and `SCHED_DEADLINE` (EDF + CBS).

## 5. Response-Time Analysis (fixed priority)
R_i = C_i + B_i + Σ_{j ∈ hp(i)} ⌈R_i / T_j⌉ · C_j

Iterate from R_i = C_i until it converges or exceeds D_i. Task set is schedulable if every R_i <= D_i. Include ISR load as highest-priority "tasks" and kernel overheads (context switch, tick).

Worked example: T1 (C=1, T=4), T2 (C=2, T=6), T3 (C=3, T=12). U = 0.25 + 0.333 + 0.25 = 0.833 > RM bound for n=3 (0.780), so the bound is inconclusive. RTA: R3: 3 → 3+1+2=6 → 3+2+2=7 → 3+2+4=9 → 3+3+4=10 → 3+3+4=10 converged; 10 <= 12 → schedulable.

## 6. WCET
- Measurement-based: run worst-case inputs on target with caches/branch predictors in realistic state, record max via cycle counter (DWT CYCCNT on Cortex-M), add a safety margin.
- Static analysis tools (e.g. AbsInt aiT) give safe upper bounds for supported cores; needed for high certification levels.
- Things that inflate WCET: caches and flash wait states, DMA contention on the bus, multicore shared resources, interrupts, dynamic allocation, unbounded loops/recursion.

## 7. Latency Budget
End-to-end latency = sensor sampling + interrupt latency + ISR + scheduling delay (higher-priority work + blocking) + task execution + output actuation. Jitter is the variation of that number; control loops are often more sensitive to jitter than to constant delay.

Sources to control:
- Interrupt masking: critical sections that disable interrupts add directly to worst-case interrupt latency — keep them tiny.
- Priority inversion: use priority-inheritance (or ceiling) mutexes.
- Shared buses/caches on multicore parts.
- Power states: wake-up time from deep sleep.

## 8. Choosing a Platform
| Option | Fits | Watch out |
|--------|------|-----------|
| Bare-metal superloop + ISRs | one or two timing domains, tiny MCUs | grows unmaintainable; long loop iterations hurt latency |
| FreeRTOS | MCU, small footprint, huge port list, MIT licence; SafeRTOS for certification | minimal drivers/middleware |
| Zephyr | MCU with rich drivers, networking/BLE, devicetree, Apache-2.0 | larger footprint, steeper build system |
| VxWorks / QNX / INTEGRITY | certified safety (DO-178C, ISO 26262), MPU-based systems | commercial licences |
| Linux + PREEMPT_RT | MPU, complex software stack, latency in the tens of microseconds is acceptable | not provable hard real-time; tune isolcpus, IRQ affinity, `mlockall`. PREEMPT_RT was merged into mainline in Linux 6.12 for x86, arm64 and RISC-V |
| Hybrid (Linux + MCU / AMP) | hard loop on MCU core, UI/network on Linux | inter-processor messaging (RPMsg/OpenAMP) |

## 9. Anti-Patterns
- Assigning priorities by "importance" instead of deadline.
- Using average execution time in schedulability math.
- Running 90%+ utilisation with no margin for WCET error.
- Logging over a blocking UART from a high-priority task.
- Assuming a faster CPU fixes a scheduling bug.

## 10. Checklist
- [ ] Every activity classified hard/firm/soft with C, T, D
- [ ] Policy chosen and schedulability shown (RTA or EDF test) with ISR + kernel overhead included
- [ ] WCET measured on target under worst-case conditions
- [ ] Blocking terms bounded (inheritance/ceiling locks, short critical sections)
- [ ] Platform choice justified against certification and footprint needs
