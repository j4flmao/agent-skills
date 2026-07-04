---
name: "Quantum Circuits"
description: >
  Designing and optimizing quantum logic gates using Qiskit/Cirq.
  Focuses on state management, architecture patterns, and error handling.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - quantum-computing
  - qiskit
  - cirq
  - quantum-circuits
---

# Designing and Optimizing Quantum Logic Gates

## Purpose
This skill provides complete guidelines for designing, optimizing, and deploying quantum logic gates and circuits. It encompasses quantum state management, topological constraints, transpilation rules, and execution models using major frameworks like Qiskit and Cirq.

## Core Principles
1. **Fidelity over Depth**: Minimize gate count and depth to prevent state decoherence and improve physical gate fidelity.
2. **Topological Awareness**: Design logical circuits keeping physical qubit connectivity (e.g., heavy-hex lattice) in mind to reduce SWAP gate insertion.
3. **Decoupling and Error Mitigation**: Always implement Zero Noise Extrapolation (ZNE) and probabilistic error cancellation.
4. **Parameterized Reusability**: Use Parameterized Quantum Circuits (PQCs) to create modular and reusable quantum operations.
5. **Robust State Measurement**: Manage mid-circuit measurements and quantum-classical feedforward efficiently.

## Agent Protocol
**Triggers**: "Design a quantum circuit", "Optimize Qiskit circuit", "Implement QAOA/VQE in Cirq"
**Input Context Required**: Qubit topology, target backend metrics (T1/T2 times), framework preference.
**Output Artifact**: Optimized `.qasm` files or Python scripts containing circuit definitions.
**Response Formats**:
```json
{
  "circuit_id": "vqe_ansatz_1",
  "framework": "qiskit",
  "depth": 45,
  "gate_counts": {"cx": 12, "rz": 20, "sx": 15}
}
```

## Decision Matrix
```text
+-----------------------+
| Determine Task Type   |
+-----------+-----------+
            |
    +-------+-------+
    |               |
[Optimization]   [Design]
    |               |
[Sabre/Qiskit]  [PQC/Ansatz]
```

## Detailed Architectural Overview
```text
[High-Level Algorithm] -> [Qiskit/Cirq Frontend]
       |                          |
[Logical Circuit] -> [Transpiler/Optimizer Pass Manager]
       |                          |
[Physical Circuit] -> [Backend Provider (AER/IBMQ)]
```

## Workflow Steps
1. **Design Phase**
   1. Identify computational requirements and basis gates.
   2. Select an appropriate PQC ansatz (e.g., RealAmplitudes).
   3. Draft the logical circuit in Qiskit or Cirq.
2. **Optimization Phase**
   1. Analyze backend topology constraints.
   2. Run `transpile` with `optimization_level=3`.
   3. Review gate cancellation and SWAP insertions.
3. **Error Mitigation**
   1. Apply dynamic decoupling (DD) sequences.
   2. Set up ZNE or PEC for readout errors.
   3. Verify metrics with `aer_simulator`.
4. **Simulation Testing**
   1. Run noiseless statevector simulation.
   2. Run density matrix simulation with thermal noise.
   3. Validate probability amplitudes.
5. **Deployment**
   1. Batch jobs using Qiskit Runtime Primitives.
   2. Submit to actual hardware backends.
   3. Store results in cloud storage.
6. **Post-Processing**
   1. Gather quasi-probabilities.
   2. Apply readout error mitigation matrices.
   3. Update parameters (if using VQE).

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---|---|---|
| High error rates | Decoherence (T1/T2) | Insert dynamic decoupling pulses |
| Too many SWAPs | Poor qubit routing | Change Sabre layout heuristic |
| Depolarizing noise | Gate over-rotation | Use robust pulse calibration |
| Memory limits hit | Statevector size > 30 qubits | Switch to MPS or TN simulator |
| API Rate Limits | Polling too frequently | Use Qiskit Runtime session jobs |
| State decay | Long idle times | Apply ALIGN/BARRIER delays |

## Complete Execution Scenario
```text
User Requests PQC -> Agent Drafts Circuit -> Agent Transpiles -> Submits to QASM Simulator -> Analyzes Noise -> Returns Script
```

## Rules and Guidelines
1. Do not use un-transpiled circuits on real hardware.
2. Ensure API tokens are always retrieved securely.
3. Keep circuit depths within backend-specific limits.
4. Prefer Runtime Primitives over legacy backend.run().
5. Validate unitary equivalence after heavy optimization.

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
- Link to `machine-learning` for hybrid ML models.
- Link to `cloud-deployment` for quantum cloud jobs.

<!-- COMPRESSION_FOOTER -->
