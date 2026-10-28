---
name: qubits-and-gates
description: >
  Use this skill when the user says 'qubit', 'Bloch sphere', 'superposition', 'Hadamard', 'Pauli X Y Z', 'CNOT', 'phase gate', 'T gate', 'rotation gates', 'universal gate set', 'unitary matrix', 'measurement basis'. Explains qubit states, measurement, single- and two-qubit gates with exact matrices and identities, universality (Clifford+T), and verifies them with Qiskit's quantum_info tools. Do NOT use for: entanglement protocols (quantum-computing/quantum-entanglement), algorithm design (quantum-computing/quantum-algorithms), or hardware/QEC topics (quantum-computing/quantum-error-correction).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quantum-computing, qubits-and-gates, bloch-sphere, unitary, clifford, qiskit]
---

# Qubits & Gates

## Purpose
Give precise, checkable foundations: what a qubit state is, how measurement works, the standard gates as matrices, the identities used to simplify circuits, and why {Clifford + T} is universal. Every claim here can be verified numerically with `qiskit.quantum_info`.

## Agent Protocol

### Trigger
"qubit", "Bloch sphere", "superposition", "Hadamard", "Pauli", "CNOT", "CZ", "S gate", "T gate", "Rx/Ry/Rz", "universal gates", "unitary", "global phase".

### Input Context
- Concept to explain or circuit to analyze/simplify.
- Desired level (intuition vs matrices).

### Output Artifact
Explanation with matrices/states, identities used, and a numeric verification snippet.

### Response Format
```
State/Gate: {name} = {matrix or ket}
Action: {on |0>, |1>, |+>, |->}
Bloch: {rotation axis, angle}
Identity used: {e.g. HZH = X}
Verify: Operator(...).equiv(...) -> True
```

### Completion Criteria
- [ ] Matrices and conventions stated (basis order, Qiskit little-endian for multi-qubit).
- [ ] Global vs relative phase distinguished.
- [ ] Claims verified numerically where possible.

## Qubit States
- |ψ⟩ = α|0⟩ + β|1⟩, α, β ∈ ℂ, |α|² + |β|² = 1.
- Bloch form: |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩ (global phase dropped; it is unobservable).
- Measurement in the Z basis yields 0 with probability |α|² (Born rule) and collapses the state. Measuring another basis = rotate, then measure Z.
- Useful states: |+⟩ = (|0⟩+|1⟩)/√2, |−⟩ = (|0⟩−|1⟩)/√2, |±i⟩ = (|0⟩ ± i|1⟩)/√2.
- n qubits live in ℂ^(2ⁿ); simulating them classically in general needs exponential memory.

## Single-Qubit Gates
| Gate | Matrix | Bloch action |
|---|---|---|
| X | [[0,1],[1,0]] | π about x (bit flip) |
| Y | [[0,−i],[i,0]] | π about y |
| Z | [[1,0],[0,−1]] | π about z (phase flip) |
| H | (1/√2)[[1,1],[1,−1]] | π about (x+z)/√2; maps Z-basis ↔ X-basis |
| S | [[1,0],[0,i]] | π/2 about z; S² = Z |
| T | [[1,0],[0,e^{iπ/4}]] | π/4 about z; T² = S |
| Rx(θ) | exp(−iθX/2) | θ about x |
| Ry(θ) | exp(−iθY/2) | θ about y |
| Rz(θ) | exp(−iθZ/2) | θ about z (equals P(θ) up to global phase) |

Identities: HXH = Z, HZH = X, HYH = −Y, XYZ = iI, Y = iXZ, X² = Y² = Z² = H² = I. Any single-qubit unitary = e^{iα} Rz(β) Ry(γ) Rz(δ) (ZYZ Euler decomposition).

## Two-Qubit Gates
- **CNOT (CX)**: flips the target if the control is 1. In basis |control,target⟩: |00⟩→|00⟩, |01⟩→|01⟩, |10⟩→|11⟩, |11⟩→|10⟩.
- **CZ**: phase −1 on |11⟩; symmetric in its qubits. CX = (I⊗H) CZ (I⊗H) with H on the target.
- **SWAP** = three CNOTs alternating direction.
- **Controlled phase CP(λ)**: phase e^{iλ} on |11⟩ (used in the QFT).
- Phase kickback: CNOT with target in |−⟩ applies a phase to the control; basis of oracles.

## Universality and Classical Simulability
- {H, S, CNOT} generate the **Clifford group**; Clifford circuits on stabilizer states are efficiently simulable classically (Gottesman-Knill theorem).
- Adding T gives a universal set: any unitary can be approximated to precision ε with O(logᶜ(1/ε)) gates (Solovay-Kitaev); fault-tolerant cost is dominated by T gates.
- Hardware native sets differ (e.g. {√X, Rz, CZ/ECR}); the transpiler rewrites circuits into them.

## Verify with Qiskit

```python
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit.library import HGate, SGate, TGate, XGate, ZGate
from qiskit.quantum_info import Operator, Statevector

# HZH = X
qc = QuantumCircuit(1); qc.h(0); qc.z(0); qc.h(0)
assert Operator(qc).equiv(Operator(XGate()))

# T^2 = S, S^2 = Z
assert (Operator(TGate()) @ Operator(TGate())).equiv(Operator(SGate()))
assert (Operator(SGate()) @ Operator(SGate())).equiv(Operator(ZGate()))

# CX = (I ⊗ H) CZ (I ⊗ H), target = qubit 1
a = QuantumCircuit(2); a.cx(0, 1)
b = QuantumCircuit(2); b.h(1); b.cz(0, 1); b.h(1)
assert Operator(a).equiv(Operator(b))

# Bloch state with theta, phi and its measurement probabilities
theta, phi = np.pi / 3, np.pi / 4
psi = Statevector([np.cos(theta / 2), np.exp(1j * phi) * np.sin(theta / 2)])
print(psi.probabilities())          # [0.75, 0.25]
```

`Operator.equiv` ignores global phase; use `==` for exact equality including phase.

## Common Confusions
- Superposition is not "being 0 and 1 at once" in a classical sense; it is a vector whose amplitudes interfere.
- Relative phase matters (|+⟩ vs |−⟩ give identical Z-basis statistics but differ in X basis); global phase does not.
- Qiskit prints multi-qubit states/bitstrings little-endian (qubit 0 rightmost), while many textbooks use big-endian.
- Measurement is not unitary and cannot be undone.

## Checklist
- [ ] Basis and endianness conventions stated.
- [ ] Matrices correct (normalization factors, signs).
- [ ] Identities verified with `Operator.equiv`.
- [ ] Phase type (global/relative) identified when relevant.

## References
- Nielsen & Chuang, "Quantum Computation and Quantum Information", ch. 1, 2, 4.
- Gottesman, "The Heisenberg Representation of Quantum Computers" (1998) — Gottesman-Knill.
- Qiskit `quantum_info` documentation (Operator, Statevector).
