---
name: quantum-algorithms
description: >
  Use this skill when the user says 'quantum algorithms overview', 'which problems have quantum speedup', 'QFT', 'phase estimation', 'VQE', 'QAOA', 'HHL', 'quantum advantage', 'is my problem suitable for quantum', 'dequantization'. Surveys the main quantum algorithm families, their proven or heuristic speedups, the assumptions that make speedups real (oracles, state preparation, readout, error correction), and how to assess a use case honestly. Do NOT use for: deep dives on Grover (quantum-computing/grovers-algorithm) or Shor (quantum-computing/shors-algorithm), SDK usage (quantum-computing/qiskit-framework), or QEC (quantum-computing/quantum-error-correction).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quantum-computing, quantum-algorithms, qft, phase-estimation, vqe, qaoa, advantage]
---

# Quantum Algorithms: Map and Reality Check

## Purpose
Quantum speedups exist for specific structures: periodicity (Shor), unstructured search (Grover), simulating quantum systems, and some linear-algebra tasks under strong assumptions. Many popular claims ignore input loading, output readout, or error-correction overhead. This skill maps algorithm families to their speedups and caveats and gives a checklist for assessing whether a problem is a plausible quantum use case.

## Agent Protocol

### Trigger
"quantum algorithms", "quantum speedup", "QFT", "phase estimation", "VQE", "QAOA", "HHL", "quantum machine learning", "quantum advantage for my problem".

### Input Context
- The problem and its classical best-known algorithm and scale.
- Data size and how it would be loaded into a quantum state.
- What output is needed (a few numbers, a sample, a full vector).
- Timeline: NISQ experiments or fault-tolerant planning.

### Output Artifact
Algorithm family match, speedup type with assumptions, resource/feasibility notes, and a recommendation.

### Response Format
```
Problem: {x}  Classical best: {algorithm, complexity}
Quantum candidate: {family}  Speedup: {exponential|superpolynomial|quadratic|heuristic/unknown}
Assumptions: {oracle|QRAM|sparsity/condition number|readout}
Era: {NISQ|fault-tolerant}  Resource estimate: {logical qubits, T-count/depth if known}
Verdict: {pursue|research only|classical is better}
```

### Completion Criteria
- [ ] Compared against the best classical algorithm, not a naive one.
- [ ] Input loading and output extraction costs included.
- [ ] Heuristic algorithms not described as proven speedups.

## Algorithm Families
| Family | Examples | Speedup | Key caveats |
|---|---|---|---|
| Hidden subgroup / period finding | Shor (factoring, discrete log) | Superpolynomial over best known classical | Needs fault tolerance; thousands of logical qubits for RSA-2048 |
| Amplitude amplification | Grover, amplitude estimation | Quadratic (provably optimal for unstructured search) | Oracle cost; sequential; large constants |
| Quantum simulation | Trotterization, qubitization for chemistry/materials | Exponential vs exact classical simulation for many systems | Most credible long-term application; resource counts still large |
| Phase estimation (QPE) | Eigenvalue estimation; core of Shor and chemistry | Enables the above | Deep circuits |
| Linear systems | HHL and successors | Exponential in dimension under conditions | Sparse, well-conditioned A; efficient state preparation of b; output is a quantum state, not the vector |
| Variational (NISQ) | VQE, QAOA | Heuristic, no general proof | Barren plateaus, noise, optimizer cost; often matched by classical methods |
| Quantum ML | Kernels, QNNs | Mostly unproven | Dequantization results (Tang 2018 onward) removed several claimed speedups |
| Sampling problems | Random circuit sampling, boson sampling | Evidence of classical hardness | Demonstrations, not useful computations so far |

## Building Blocks
- **Quantum Fourier Transform (QFT)**: maps |x⟩ to (1/√N) Σ_k e^{2πi xk/N} |k⟩ with O(n²) gates on n qubits (vs O(N log N) for classical FFT on N = 2ⁿ amplitudes). It does not give fast classical Fourier transforms of data; it transforms amplitudes you cannot read out directly.
- **Phase estimation**: with a controlled-U and an eigenstate |u⟩, estimates the eigenphase φ to t bits using a t-qubit register and inverse QFT.
- **Shor's period finding**: superposition over x, compute aˣ mod N into a second register, inverse QFT on the first, measure, then continued fractions to recover the period r.
- **Grover diffusion**: D = 2|s⟩⟨s| − I, with matrix entries 2/N off-diagonal and 2/N − 1 on the diagonal.

```python
import math
from qiskit import QuantumCircuit


def qft(n: int, swaps: bool = True) -> QuantumCircuit:
    qc = QuantumCircuit(n, name="QFT")
    for j in reversed(range(n)):
        qc.h(j)
        for k in reversed(range(j)):
            qc.cp(math.pi / 2 ** (j - k), k, j)
    if swaps:
        for i in range(n // 2):
            qc.swap(i, n - 1 - i)
    return qc
# Library equivalent: qiskit.circuit.library.QFT (or QFTGate in newer releases).
```

## Use-Case Assessment
1. **Is there structure** a known quantum algorithm exploits (periodicity, quantum dynamics, amplitude estimation)?
2. **Input**: can the data be prepared as a quantum state efficiently? Loading N classical numbers generally costs Ω(N) operations, erasing exponential claims unless the input is implicit (a formula, a Hamiltonian).
3. **Output**: do you need only a few numbers or samples? Reading out a full state needs exponentially many measurements.
4. **Classical competition**: tensor networks, Monte Carlo, and dequantized algorithms are strong; compare to state of the art.
5. **Resources**: under fault tolerance, logical qubits, T-count, and runtime at realistic clock speeds; a quadratic speedup with large constants may never beat a classical cluster.

## Anti-Patterns
- "Quantum computers try all answers in parallel" (measurement returns one outcome; interference is the mechanism).
- Citing HHL's exponential speedup without its conditions.
- Presenting VQE/QAOA results as advantage without strong classical baselines.
- Ignoring error correction when estimating runtimes.

## Checklist
- [ ] Problem mapped to a family with its speedup type.
- [ ] Loading/readout and classical competition analyzed.
- [ ] Resource estimate cited or produced (e.g. with a resource estimator tool).
- [ ] Honest verdict and near-term alternative.

## References
- Nielsen & Chuang, "Quantum Computation and Quantum Information" (2010), ch. 5-6.
- Montanaro, "Quantum algorithms: an overview" (npj Quantum Information, 2016).
- Aaronson, "Read the fine print" (Nature Physics, 2015) — caveats of HHL-style speedups.
- Tang, "A quantum-inspired classical algorithm for recommendation systems" (STOC 2019).
- Quantum Algorithm Zoo (quantumalgorithmzoo.org).
