---
description: "j4flmao/rules — Mandatory standards for ZK Circuits (Circom, Halo2) to prevent private data leakage"
glob: "*"
---

# ZK Circuit Security Standards

Cursor/AI MUST follow these rules when writing Zero-Knowledge circuits (Circom, Halo2, Noir, Cairo) or Smart Contracts that verify ZK proofs.

## 1. Constraint Completeness
- **Rule**: Computing a witness value does NOT constrain it. In Circom, `<--` only assigns; `<==` assigns **and** constrains; `===` only constrains. Every `<--` MUST be followed by constraints that fully determine the value.
- **Danger**: `out <-- in1 * in2;` with no constraint lets a malicious prover submit any `out` (e.g. `999999`) and still produce a valid proof. Write `out <== in1 * in2;`.
- **Rule**: Constraints must be quadratic. Express non-quadratic logic (division, comparisons, bit decomposition) through audited circomlib templates (`IsZero`, `Num2Bits`, `LessThan`), and constrain their outputs.

## 2. Private Signal Protection (No Leakage)
- **Rule**: In Circom 2, inputs are private unless listed in `component main {public [...]} = ...;`, and **all outputs are public**. Review the public list and every output for leaks.
- **Rule**: Hashing a low-entropy private value (age, balance, vote) does not hide it, because it can be brute-forced. Publish commitments that include a random salt/blinding factor (e.g. `Poseidon(value, salt)`).

## 3. Prevent Under-Constrained Signals
- **Rule**: Constrain booleans to {0, 1}:
  ```circom
  signal input b;
  b * (b - 1) === 0;
  ```
- **Rule**: Arithmetic is modulo the field prime. Range-check values that represent integers (`Num2Bits(n)`) before comparing them or summing balances, otherwise overflow wraps around.
- **Tooling**: Run static analyzers for under-constrained signals (e.g. `circomspect`) and test with adversarial witnesses, not only honest ones.

## 4. On-Chain Verification
- **Rule**: Bind every public input the contract relies on, check public inputs are below the scalar field modulus, and prevent replay with nullifiers.
- **Rule**: Groth16 needs a per-circuit trusted setup. Use a multi-party ceremony with a public transcript, and never ship a single-party `zkey` to production.
