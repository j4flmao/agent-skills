---
description: "j4flmao/rules — Mandatory standards for ZK Circuits (Circom, Halo2) to prevent private data leakage"
glob: "*"
---

# ZK Circuit Security Standards

Cursor/AI MUST follow these rules when writing Zero-Knowledge circuits (Circom, Halo2, Cairo) or Smart Contracts that verify ZK proofs.

## 1. Constraint Completeness
- **Rule**: In ZK circuits, assigning a value to a variable does NOT constrain it. You MUST explicitly write mathematical constraints (`<==` or `===` in Circom) for every logic step.
- **Danger**: If an AI assigns `out = in1 * in2` without constraining it, a malicious Prover can forge a proof where `out = 999999` regardless of the inputs.

## 2. Private Signal Protection (No Leakage)
- **Rule**: Never expose private inputs (Witnesses) as public outputs unless mathematically hashed (e.g., Poseidon Hash). 
- **Action**: Always double-check that the `main` component explicitly marks private variables (e.g., `component main {public [pub_key]} = MyCircuit();`).

## 3. Prevent Under-Constrained Signals
- **Rule**: When dealing with boolean checks, you MUST constrain the signal to be strictly 0 or 1.
  ```circom
  // BAD: Signal can be anything
  signal input b;
  
  // GOOD: Force boolean
  signal input b;
  b * (b - 1) === 0;
  ```
