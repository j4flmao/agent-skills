---
name: grovers-algorithm
description: >
  Use this skill when the user says 'Grover', 'Grover search', 'amplitude amplification', 'quantum unstructured search', 'oracle and diffuser', 'how many Grover iterations', 'quadratic speedup', 'Grover attack on AES'. Explains Grover's algorithm and amplitude amplification, computes the optimal iteration count, implements oracle + diffuser in Qiskit, and assesses realistic speedups (including key search). Do NOT use for: Shor's factoring (quantum-computing/shors-algorithm), general algorithm survey (quantum-computing/quantum-algorithms), or Qiskit setup questions (quantum-computing/qiskit-framework).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quantum-computing, grovers-algorithm, amplitude-amplification, qiskit, search]
---

# Grover's Algorithm

## Purpose
Grover's algorithm finds one of M marked items among N = 2ⁿ using about (π/4)√(N/M) oracle calls, versus ~N/M classically: a quadratic, provably optimal speedup for unstructured search. It generalizes to amplitude amplification, which boosts the success probability of any quantum subroutine. This skill gives the math, a correct Qiskit implementation, and a realistic view of when the speedup matters.

## Agent Protocol

### Trigger
"Grover", "amplitude amplification", "oracle", "diffuser", "inversion about the mean", "unstructured search", "Grover iterations", "Grover vs AES".

### Input Context
- Search space size n qubits, number of solutions M (known or unknown).
- How the oracle is built (classical predicate → reversible circuit).
- Target: simulator or hardware.

### Output Artifact
Iteration count, circuit (oracle + diffuser), simulation results, and a cost/feasibility note.

### Response Format
```
N = 2^{n}, M = {m}  θ = arcsin(√(M/N))
Iterations k = floor(π/(4θ)) = {k}  P(success) = sin²((2k+1)θ) = {p}
Oracle: {phase oracle construction}  Diffuser: H X MCZ X H
Result: top counts {bitstring: count}
Feasibility: oracle depth {..}, error budget {..}
```

### Completion Criteria
- [ ] Iteration count computed from M/N (too many iterations reduce success).
- [ ] Oracle is a phase oracle (or phase kickback with |−⟩ ancilla).
- [ ] Bit ordering of the target verified (Qiskit is little-endian).
- [ ] Speedup claim accounts for oracle cost and error correction.

## Math
- Start in the uniform superposition |s⟩ = H^⊗n |0⟩.
- **Oracle** O_f: |x⟩ → (−1)^{f(x)} |x⟩ flips the phase of marked states.
- **Diffuser** D = 2|s⟩⟨s| − I reflects amplitudes about their mean.
- Each Grover iteration G = D·O_f rotates the state by 2θ in the plane spanned by the marked and unmarked superpositions, where sin θ = √(M/N).
- After k iterations, P(success) = sin²((2k+1)θ). Optimal k ≈ ⌊π/(4θ)⌋ ≈ (π/4)√(N/M). Overshooting rotates past the target and lowers success.
- Unknown M: use randomized iteration counts (Boyer-Brassard-Høyer-Tapp) or quantum counting (phase estimation on G).
- Optimality: any quantum algorithm needs Ω(√(N/M)) oracle queries (Bennett-Bernstein-Brassard-Vazirani 1997).

| n | N | k (M=1) | P(success) |
|---|---|---|---|
| 2 | 4 | 1 | 1.000 |
| 3 | 8 | 2 | 0.945 |
| 4 | 16 | 3 | 0.961 |
| 10 | 1024 | 25 | 0.999 |

## Qiskit Implementation

```python
from __future__ import annotations

import math

from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler


def mcz(qc: QuantumCircuit, qubits: list[int]) -> None:
    """Multi-controlled Z on all listed qubits (phase -1 on |11...1>)."""
    target = qubits[-1]
    qc.h(target)
    qc.mcx(qubits[:-1], target)
    qc.h(target)


def oracle(n: int, marked: str) -> QuantumCircuit:
    """Phase-flip the basis state `marked`, written as Qiskit prints it (qubit 0 is the rightmost bit)."""
    if len(marked) != n or set(marked) - {"0", "1"}:
        raise ValueError(f"marked must be a {n}-bit string, got {marked!r}")
    qc = QuantumCircuit(n, name="oracle")
    zeros = [i for i, bit in enumerate(reversed(marked)) if bit == "0"]
    if zeros:
        qc.x(zeros)
    mcz(qc, list(range(n)))
    if zeros:
        qc.x(zeros)
    return qc


def diffuser(n: int) -> QuantumCircuit:
    qc = QuantumCircuit(n, name="diffuser")
    qc.h(range(n))
    qc.x(range(n))
    mcz(qc, list(range(n)))
    qc.x(range(n))
    qc.h(range(n))
    return qc


def grover(n: int, marked: str, m_solutions: int = 1) -> QuantumCircuit:
    theta = math.asin(math.sqrt(m_solutions / 2**n))
    k = max(1, math.floor(math.pi / (4 * theta)))
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for _ in range(k):
        qc.compose(oracle(n, marked), inplace=True)
        qc.compose(diffuser(n), inplace=True)
    qc.measure_all()
    return qc


qc = grover(4, "1011")
result = StatevectorSampler().run([qc], shots=2048).result()[0]
counts = result.data.meas.get_counts()          # measure_all() creates register "meas"
print(sorted(counts.items(), key=lambda kv: -kv[1])[:3])   # "1011" ≈ 96%
```

On hardware, transpile with `generate_preset_pass_manager(optimization_level=..., backend=backend)` and expect much lower fidelity: multi-controlled gates decompose into many two-qubit gates.

## Realistic Speedup
- The oracle must evaluate f reversibly; for real problems (e.g. a SAT instance, AES encryption) its depth dominates and each Grover iteration is a full evaluation.
- Grover iterations are inherently sequential; splitting the search across S machines reduces each machine's work only by √S, not S.
- Fault-tolerant overhead (error correction, T gates) makes the constant factors enormous, so the quadratic speedup pays off only for very large N.
- **Cryptography**: Grover reduces brute-force key search from 2ᵏ to ~2^(k/2) sequential evaluations. Because of the costs above, NIST still treats AES-128 as acceptable (it defines PQC security category 1 relative to AES-128 key search); AES-256 is the conservative choice for long-lived data and is required by CNSA 2.0.

## Anti-Patterns
- Using a fixed iteration count regardless of M.
- Forgetting Qiskit's little-endian bit order when marking states.
- Claiming Grover gives exponential speedups or that it "breaks" symmetric crypto.
- Ignoring oracle construction cost in complexity claims.

## Checklist
- [ ] θ, k, and success probability computed.
- [ ] Oracle verified on statevector (marked amplitude sign flipped).
- [ ] Simulation shows the marked state dominating.
- [ ] Hardware run includes transpiled depth/2-qubit count.
- [ ] Speedup statement includes oracle and QEC costs.

## References
- Grover, "A fast quantum mechanical algorithm for database search" (STOC 1996).
- Boyer, Brassard, Høyer & Tapp, "Tight bounds on quantum searching" (1998); Brassard et al., "Quantum Amplitude Amplification and Estimation" (2002).
- Nielsen & Chuang, "Quantum Computation and Quantum Information", ch. 6.
