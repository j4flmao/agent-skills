# Blockchain ZK Advanced Topics

## Recursive Proof Aggregation

### IVC (Incrementally Verifiable Computation)
Prove that a sequence of computations was executed correctly. Each step produces a proof that the previous step was correct AND the current step was executed. Enables: privacy-preserving smart contracts (Aztec), continuous computation (Mina).

### Nova (IVC Scheme)
Nova is an efficient IVC scheme using relaxed R1CS. No trusted setup. Proving time is O(n) for n steps. Verification is constant time. Used by: customized rollups, ZK coprocessors.

### Proof Aggregation
Aggregate multiple Groth16 proofs into one. Reduces on-chain verification cost from N proofs to 1. Uses: rollup batch verification, cross-chain proof verification. ~500K gas per aggregation on EVM.

## zkEVM Designs

### Type 1 (Full EVM Equivalence)
Scroll: Proves EVM execution at the opcode level. Most compatible (100% of existing contracts). Most complex proving (millions of constraints per block). Proving time: hours per block.

### Type 2 (Full Equivalence with Optimizations)
Linea: Similar to Type 1 with optimized constraint generation. ~99% compatible. Faster proving than Type 1. Some precompile modifications for efficiency.

### Type 3 (Near Equivalence)
Polygon zkEVM: Changes some precompile behavior for efficiency. ~85% compatible. Fast proving (minutes). Most dApps work with minor adjustments.

### Type 4 (High-Level Equivalence)
ZKsync Era (zkEVM): Compiles Solidity to custom ZK-friendly bytecode. Not EVM opcode-equivalent. Fastest proving. Requires recompilation (but uses Solidity source).

## Prover Infrastructure

### Prover Operations
- Provers are computationally intensive (GPU clusters)
- Proof generation takes minutes to hours per block
- Multiple provers can run in parallel for different batches
- Prover availability is critical for L2 liveness

### Hardware Requirements
| Proof System | GPU | RAM | Proving Time (per tx) |
|---|---|---|---|
| Groth16 | 1x A100 | 64GB | ~1 second |
| PLONK | 2x A100 | 128GB | ~2 seconds |
| STARK | CPU cluster | 256GB+ | ~10 seconds |
| Recursive | 4x A100 | 256GB | ~30 seconds |

## Trusted Setup Ceremonies

### What Is a Trusted Setup
Generates a Common Reference String (CRS) used by SNARK provers and verifiers. If the toxic waste (random values used in setup) is leaked, fake proofs can be generated. Multi-party ceremonies ensure that as long as one participant is honest, the setup is secure.

### Ceremony Best Practices
- Multi-party computation (MPC) with 100+ participants
- Geographic and organizational diversity
- Each participant contributes randomness, destroys their secret
- Verification of final CRS against known properties
- Formal verification of ceremony software
