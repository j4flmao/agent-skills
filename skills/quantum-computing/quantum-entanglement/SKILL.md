---
name: quantum-entanglement
description: >
  Use this skill when the user says 'entanglement', 'Bell state', 'EPR pair', 'CHSH', 'Bell inequality', 'quantum teleportation', 'superdense coding', 'GHZ state', 'no-communication theorem', 'entanglement entropy'. Explains entanglement precisely (non-separable states, Bell/CHSH violations, what it can and cannot do), builds Bell/GHZ states, and implements teleportation and CHSH tests in Qiskit with verification. Do NOT use for: single-qubit gate basics (quantum-computing/qubits-and-gates), QKD/network engineering, or QEC codes (quantum-computing/quantum-error-correction).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quantum-computing, quantum-entanglement, bell-states, teleportation, chsh, qiskit]
---

# Quantum Entanglement

## Purpose
A multi-qubit state is entangled when it cannot be written as a product of individual qubit states. Entanglement produces correlations no local hidden-variable theory can reproduce (Bell's theorem), and it is a resource for teleportation, superdense coding, QKD (E91), and quantum algorithms. It does not allow faster-than-light signalling. This skill gives correct definitions, the key protocols, and runnable checks.

## Agent Protocol

### Trigger
"entanglement", "Bell state", "EPR", "CHSH", "Bell test", "teleportation", "superdense coding", "GHZ", "W state", "entanglement entropy", "no-cloning", "no-signalling".

### Input Context
- Conceptual question or implementation task.
- Simulator vs hardware; number of qubits.

### Output Artifact
Explanation with states/equations, circuit, and a verification (fidelity, correlations, CHSH value).

### Response Format
```
State: {formula}  Circuit: {gates}
Verification: {fidelity|⟨ZZ⟩,⟨XX⟩|CHSH S}
Expected: {value}  Measured: {value}
Limits: {no-signalling, no-cloning notes}
```

### Completion Criteria
- [ ] Entanglement claims verified with a quantitative check, not only counts in one basis.
- [ ] Teleportation includes both classical bits and corrections.
- [ ] No FTL-communication implications.

## Definitions
- **Product state**: |ψ⟩ = |a⟩ ⊗ |b⟩. **Entangled**: not expressible that way.
- **Bell states**: |Φ±⟩ = (|00⟩ ± |11⟩)/√2, |Ψ±⟩ = (|01⟩ ± |10⟩)/√2. Prepare |Φ+⟩ with H on qubit 0 then CNOT(0→1); apply X/Z on one qubit to reach the others.
- **GHZ**: (|0…0⟩ + |1…1⟩)/√2 via H then a CNOT chain.
- **Measure of entanglement (pure states)**: entanglement entropy S(ρ_A) = −Tr ρ_A log₂ ρ_A of the reduced state; 1 ebit for a Bell pair, 0 for product states.
- Correlations in one basis (00/11 counts) are not proof of entanglement; a classical mixture of |00⟩ and |11⟩ gives the same Z-basis counts. Check another basis (⟨XX⟩ = +1 for |Φ+⟩) or compute fidelity.

## Bell / CHSH
CHSH quantity S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′). Local hidden variables: |S| ≤ 2. Quantum mechanics: |S| ≤ 2√2 ≈ 2.83 (Tsirelson bound), achieved by |Φ+⟩ with Alice measuring Z, X and Bob measuring (Z+X)/√2, (Z−X)/√2. Loophole-free Bell tests were reported in 2015 (Delft, Vienna, NIST); the 2022 Nobel Prize in Physics recognized Aspect, Clauser, and Zeilinger.

```python
import numpy as np
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorEstimator
from qiskit.quantum_info import SparsePauliOp

bell = QuantumCircuit(2)
bell.h(0)
bell.cx(0, 1)

# Pauli strings are written qubit1 qubit0 (little-endian); Alice = qubit 0, Bob = qubit 1.
s = 1 / np.sqrt(2)
B  = lambda a: SparsePauliOp(["Z" + a, "X" + a], coeffs=[s,  s])   # Bob (Z+X)/√2 ⊗ Alice a
Bp = lambda a: SparsePauliOp(["Z" + a, "X" + a], coeffs=[s, -s])   # Bob (Z−X)/√2 ⊗ Alice a
terms = [B("Z"), Bp("Z"), B("X"), Bp("X")]
e = StatevectorEstimator().run([(bell, terms)]).result()[0].data.evs
S = e[0] + e[1] + e[2] - e[3]
print(round(float(S), 3))      # 2.828
```

## Teleportation
Alice holds unknown |ψ⟩ (qubit 0) and half of a Bell pair (qubit 1); Bob holds qubit 2.
1. Alice applies CNOT(0→1) then H(0).
2. Alice measures qubits 0 and 1 → bits m₀, m₁ and sends them classically.
3. Bob applies X^{m₁} then Z^{m₀} to qubit 2, recovering |ψ⟩.
The original state is destroyed at Alice (consistent with no-cloning), and Bob's qubit is useless until the classical bits arrive (no-signalling).

```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity

theta, phi = 1.1, 0.4
qc = QuantumCircuit(3)
qc.ry(theta, 0); qc.rz(phi, 0)       # |ψ> on qubit 0
qc.h(1); qc.cx(1, 2)                 # Bell pair 1-2
qc.cx(0, 1); qc.h(0)                 # Alice's Bell-basis rotation
qc.cx(1, 2); qc.cz(0, 2)             # corrections via deferred measurement (equivalent to classically controlled X, Z)

target = QuantumCircuit(1); target.ry(theta, 0); target.rz(phi, 0)
bob = partial_trace(Statevector(qc), [0, 1])
print(state_fidelity(bob, Statevector(target)))   # 1.0
```
On hardware with mid-circuit measurement, use real measurements and `with qc.if_test((creg[1], 1)): qc.x(2)` style conditionals (dynamic circuits).

## Superdense Coding
With a shared Bell pair, Alice applies one of I, X, Z, XZ to her qubit and sends it; Bob's Bell measurement recovers 2 classical bits from 1 transmitted qubit (plus the pre-shared ebit).

## What Entanglement Does Not Do
- No faster-than-light communication: local measurement statistics are unchanged by distant operations.
- No copying of unknown states (no-cloning theorem).
- Not automatically a speedup: algorithms need interference designed around entanglement.

## Anti-Patterns
- Calling Z-basis correlation alone "entanglement".
- Teleportation without the classical channel.
- Interpreting Pauli strings in big-endian order in Qiskit.

## Checklist
- [ ] States prepared and verified in at least two bases or by fidelity.
- [ ] CHSH S computed with correct operator ordering (> 2 for entangled ideal state).
- [ ] Teleportation fidelity checked for several random input states.
- [ ] Hardware runs report noise-reduced values honestly.

## References
- Bell, "On the Einstein Podolsky Rosen Paradox" (1964); Clauser, Horne, Shimony & Holt (1969).
- Bennett et al., "Teleporting an unknown quantum state..." (PRL 1993); Bennett & Wiesner (superdense coding, 1992).
- Hensen et al., "Loophole-free Bell inequality violation..." (Nature 2015).
- Nielsen & Chuang, ch. 1-2.
