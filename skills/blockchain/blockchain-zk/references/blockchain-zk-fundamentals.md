# Blockchain ZK Fundamentals

## Zero-Knowledge Proof Concepts

### What ZK Proofs Prove
A zero-knowledge proof allows a prover to convince a verifier that a statement is true without revealing any information beyond the statement's truth. For blockchains: "I know a secret value that satisfies this circuit" without revealing the secret.

### Key Properties
- **Completeness**: If the statement is true, an honest prover can convince an honest verifier
- **Soundness**: If the statement is false, no dishonest prover can convince the verifier (except negligible probability)
- **Zero-knowledge**: The verifier learns nothing except whether the statement is true

### zk-SNARKs vs zk-STARKs
| Aspect | SNARK | STARK |
|---|---|---|
| Proof size | ~130-250 bytes | ~100KB |
| Verification time | ~10ms | ~100ms |
| Proving time | Minutes | Hours (larger) |
| Trusted setup | Required (PPTR) | Transparent |
| Quantum resistant | No | Yes |
| Best for | On-chain verification | Off-chain, high-throughput |

## Proof Systems

### Groth16
Most gas-efficient SNARK on EVM (~200K gas per verification). Requires per-circuit trusted setup. Fixed circuit (cannot modify without new setup). Used by: ZCash, Tornado Cash, many ZK rollups.

### PLONK
Universal trusted setup (one setup for all circuits of same size). Flexible circuit updates (new circuits use same setup). Slightly larger proof and higher verification cost. Used by: Aztec, Mina.

### STARK (FRI-based)
No trusted setup (transparent). Large proofs (~100KB). Fast proving for large computations. Quantum resistant. Used by: StarkNet, dYdX.

## Circuit Programming

### Constraint System (R1CS)
Circuits are expressed as a system of rank-1 constraint satisfiability (R1CS). Each constraint: `A * B = C`. Circuit size = number of constraints. Public inputs are exposed to verifier. Private inputs remain secret.

### DSL Selection
| DSL | Backend | Best For |
|---|---|---|
| Circom 2 | Groth16, PLONK | EVM zk-apps, Groth16 proofs |
| Noir | Multiple (Groth16, PLONK, STARK) | Multi-backend portability |
| Halo2 | PLONKish (custom gates) | High-performance custom circuits |
| Leo | Marlin (Aleo) | Aleo blockchain apps |

### Common Constraints
```circom
// Range check: value < 2^k
template RangeCheck(k) {
    signal input value;
    component bits[k];
    for (var i = 0; i < k; i++) {
        bits[i] = Num2Bits(1);
        bits[i].in <== value;
    }
}

// Equality check
template IsEqual() {
    signal input a;
    signal input b;
    signal output out;
    out <== a == b ? 1 : 0;
}
```
