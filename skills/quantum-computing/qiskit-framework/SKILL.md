---
name: qiskit-framework
description: >
  Use this skill when the user says 'Qiskit', 'QuantumCircuit', 'transpile', 'Sampler', 'Estimator', 'run on IBM Quantum', 'qiskit-aer', 'qiskit-ibm-runtime', 'execute() removed', 'migrate to Qiskit 1.0/2.0'. Builds, simulates, transpiles, and runs quantum circuits with current Qiskit (1.x/2.x) using the primitives (Sampler/Estimator V2), local Aer simulation, and IBM Quantum Runtime, including migration from removed legacy APIs. Do NOT use for: algorithm theory (quantum-computing/quantum-algorithms, grovers-algorithm, shors-algorithm), QEC simulation with Stim (quantum-computing/quantum-error-correction), or gate math basics (quantum-computing/qubits-and-gates).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quantum-computing, qiskit-framework, qiskit, ibm-quantum, aer, primitives]
---

# Qiskit Framework

## Purpose
Qiskit is IBM's open-source Python SDK for building quantum circuits, compiling (transpiling) them to a backend's native gates and connectivity, and executing them through primitives. Qiskit 1.0 (2024) and 2.0 (2025) removed many legacy APIs (`execute`, `qiskit.Aer` import path, `BasicAer`, V1 primitives), so older tutorials often fail. This skill gives the current workflow and migration notes.

## Agent Protocol

### Trigger
"Qiskit", "QuantumCircuit", "transpile", "pass manager", "SamplerV2", "EstimatorV2", "AerSimulator", "IBM Quantum", "QiskitRuntimeService", "ImportError execute".

### Input Context
- Installed versions (`qiskit`, `qiskit-aer`, `qiskit-ibm-runtime`) and Python version.
- Goal: sampling bitstrings (Sampler) or expectation values (Estimator).
- Target: exact statevector, noisy local simulation, or IBM hardware.

### Output Artifact
Working script: circuit construction, transpilation for the target, primitive execution, result extraction; plus fixes for legacy code.

### Response Format
```
Versions: qiskit {x}, aer {y}, runtime {z}
Circuit: {n} qubits, depth {d}, 2q gates {g}
Target: {StatevectorSampler|AerSimulator|ibm backend}  Optimization level: {0-3}
Primitive: {SamplerV2 shots=n | EstimatorV2 observables=...}
Result access: {result[0].data.<creg>.get_counts() | result[0].data.evs}
```

### Completion Criteria
- [ ] No removed APIs (`execute`, `qiskit.Aer`, V1 primitives, `backend.run` on IBM hardware).
- [ ] Circuits transpiled to the backend's ISA before running on hardware.
- [ ] Classical register name matches result access.
- [ ] Shots and seeds recorded for reproducibility.

## Install
```bash
uv add qiskit qiskit-aer qiskit-ibm-runtime
```

## Core Workflow

```python
from __future__ import annotations

from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorEstimator, StatevectorSampler
from qiskit.quantum_info import SparsePauliOp

# 1. Build: Bell state
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)

# 2a. Expectation values (no measurements in the circuit)
estimator = StatevectorEstimator()
obs = [SparsePauliOp("ZZ"), SparsePauliOp("XX"), SparsePauliOp("ZI")]
evs = estimator.run([(qc, obs)]).result()[0].data.evs
print(evs)                     # [1, 1, 0] for |Φ+>

# 2b. Sampling (add measurements)
meas = qc.copy()
meas.measure_all()             # creates classical register named "meas"
counts = StatevectorSampler(seed=7).run([meas], shots=1000).result()[0].data.meas.get_counts()
print(counts)                  # ~{'00': 500, '11': 500}
```

Notes:
- Qiskit orders bits little-endian: qubit 0 is the **rightmost** character in printed bitstrings.
- With `QuantumCircuit(2, 2)` and `qc.measure([0, 1], [0, 1])`, the register is named `c`, so use `.data.c.get_counts()`.
- Parameterized circuits: `from qiskit.circuit import Parameter`; pass values in the PUB: `(circuit, observables, parameter_values)` or `(circuit, parameter_values)` for Sampler.

## Local Noisy Simulation (Aer)

```python
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_aer import AerSimulator
from qiskit_aer.primitives import SamplerV2 as AerSampler

sim = AerSimulator()                                    # or AerSimulator.from_backend(real_backend) for its noise model
pm = generate_preset_pass_manager(optimization_level=1, backend=sim)
isa = pm.run(meas)
counts = AerSampler().run([isa], shots=4000).result()[0].data.meas.get_counts()
```

## IBM Quantum Hardware (Runtime)

```python
import os

from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler

service = QiskitRuntimeService(channel="ibm_quantum_platform", token=os.environ["IBM_QUANTUM_TOKEN"])
backend = service.least_busy(operational=True, simulator=False)
pm = generate_preset_pass_manager(optimization_level=2, backend=backend)
isa = pm.run(meas)                       # hardware requires ISA circuits (native gates + layout)
job = Sampler(mode=backend).run([isa], shots=4000)
print(job.job_id())
counts = job.result()[0].data.meas.get_counts()
```
Channel names and plan options change over time (the legacy `ibm_quantum` channel was retired in favour of IBM Quantum Platform); check the runtime docs for your account. Save credentials once with `QiskitRuntimeService.save_account(...)` instead of embedding tokens.

## Transpilation
- `optimization_level` 0-3: higher reduces depth/2-qubit gates at more compile time; level 2 or 3 for hardware runs.
- Inspect cost: `isa.depth()`, `isa.count_ops()`, number of two-qubit gates (the main error source).
- Error suppression/mitigation options (dynamical decoupling, twirling, resilience levels for Estimator) are set on the Runtime primitive `options`.

## Migration from Legacy Code
| Legacy | Current |
|---|---|
| `from qiskit import execute; execute(qc, backend)` | Primitives: `SamplerV2` / `EstimatorV2` (or `backend.run` on Aer only) |
| `from qiskit import Aer` / `BasicAer` | `from qiskit_aer import AerSimulator`; `qiskit.primitives.Statevector*` for exact |
| `Sampler()` / `Estimator()` V1 returning quasi-dists | V2 primitives with PUBs; results per PUB |
| `transpile(qc, backend)` | Still available; preset pass managers recommended |
| `qiskit.opflow` | `qiskit.quantum_info` (`SparsePauliOp`) |
| `qc.cnot`, `qc.toffoli` aliases | `qc.cx`, `qc.ccx` |

## Anti-Patterns
- Copying pre-1.0 tutorials without migration.
- Sending non-transpiled circuits to hardware.
- Reading counts from the wrong register name.
- Misreading bitstrings (forgetting little-endian order).
- Hardcoding API tokens in notebooks.

## Checklist
- [ ] Versions pinned in `pyproject.toml`/`uv.lock`.
- [ ] Exact simulation validates logic before noisy/hardware runs.
- [ ] ISA circuits, depth and 2q-gate counts reported.
- [ ] Primitive choice matches the question (samples vs expectation values).
- [ ] Seeds, shots, backend name, and job ids logged.

## References
- IBM Quantum / Qiskit documentation: primitives, transpiler, migration guides to 1.0 and 2.0.
- qiskit-aer and qiskit-ibm-runtime API references.
