---
name: blockchain-zk
description: >
  Zero-knowledge proofs, zk-rollup, zkEVM, Circom, Noir, Halo2, proof systems, Groth16, PLONK, STARK, recursive proofs, circuit optimization, zkSync, StarkNet, Scroll, Polygon zkEVM, and ZK application patterns. Covers proof system selection, circuit programming, prover infrastructure, and ZK rollup architecture. Do NOT use for: general cryptography (use blockchain-cryptography), smart contract development (use blockchain-application), or L1 consensus (use blockchain-core).
version: 1.1.0
author: j4flmao
license: MIT
tags: [blockchain, zero-knowledge, zk, rollup, proof, phase-blockchain]
---

# Blockchain ZK

## Purpose
Guide zero-knowledge proof integration in blockchain systems covering proof system selection, circuit programming, prover/verifier infrastructure, ZK rollup architecture, and application patterns. Enables building privacy-preserving and scalability-enhancing ZK solutions.

## Agent Protocol

### Trigger Keywords
"zero-knowledge", "zk", "zkp", "groth16", "plonk", "stark", "plonkish", "circom", "noir", "halo2", "bellman", "arkworks", "snarkjs", "zk-rollup", "zkrollup", "zkevm", "recursive proof", "aggregation", "ivc", "nifs", "pcd", "circuit", "constraint", "r1cs", "acir", "ssa", "witness", "sequencer", "prover", "verifier", "zksync", "starknet", "scroll", "polygon zkevm", "taiko", "trusted setup", "ceremony", "toxic waste", "crs", "merkle proof", "nullifier", "commitment", "babyjubjub", "zkapp", "zk-application"

### Input Context
- Application type (privacy/scaling/identity/gaming)
- Proof system requirements (trusted setup? proof size? verification cost?)
- Target blockchain (EVM/Solana/Cosmos/StarkNet)
- Performance constraints (proving time, verification gas, proof size)
- Security requirements (transparent vs PPTR, audit history)

### Output Artifact
ZK architecture specification: proof system selection, circuit design, prover infrastructure, verifier deployment, and integration plan.

### Response Format
```
## [Topic]
- Proof System Category: <Groth16 / PLONK / STARK / PLONKish / Custom>
- DSL: <Circom / Noir / Halo2 / Leo / Zinc>
- Constraints: <number of constraints>
- Proving Time: <time estimate>
- Verification Gas: <gas cost on target chain>
- Security: <trusted setup? audit?>
- Recommendation: <best approach for this use case>
```

### Completion Criteria
- Proof system selected with justification against alternatives
- Circuit design specifies: DSL, constraints, public inputs, private inputs
- Proving time and verification cost estimated with benchmarks
- Security analysis covers: trusted setup, underconstrained circuits, toxic waste
- Integration plan covers: on-chain verifier, off-chain prover, circuit upgrades

### Max Response Length
5000 tokens

## Decision Trees

### Proof System Selection
```
ZK use case:
├── On-chain verification (EVM)?
│   ├── Fixed circuit → Groth16 (most gas-efficient)
│   │   ├── Pros: ~200K gas verify, smallest proof (~130 bytes)
│   │   ├── Cons: Trusted setup per circuit, no recursion naively
│   │   └── Best: Token privacy, identity, one-shot proofs
│   ├── Variable circuit → PLONK
│   │   ├── Pros: Universal trusted setup, flexible circuits
│   │   ├── Cons: Larger proof (~250 bytes), ~300K gas verify
│   │   └── Best: Multi-circuit systems, upgradable circuits
│   └── No trusted setup → STARK (via Ethereum validium)
│       ├── Pros: Transparent, quantum-resistant
│       ├── Cons: Large proofs (~100KB), expensive on-chain verify
│       └── Best: L2 rollups, high-value systems
├── Off-chain verification?
│   ├── Fast proving → STARK (FRI-based)
│   ├── Small proofs → Groth16
│   └── Recursive → IVC (Nova, Cyclefold)
└── ZK-rollup?
    ├── EVM-equivalent → Type 2/3 zkEVM (Scroll, Linea)
    │   ├── Pros: Full EVM compatibility
    │   └── Cons: Complex circuits (millions of constraints)
    ├── Custom VM → Type 4 zkEVM (ZKsync Era, StarkNet)
    │   ├── Pros: Simpler circuits, faster proving
    │   └── Cons: Not EVM-equivalent (compilation needed)
    └── Specific use → Custom circuit (zk-application)
```

### DSL Selection
```
Circuit programming DSL:
├── EVM-focused Groth16?
│   ├── Circom 2 — largest ecosystem, best tooling
│   ├── Good: snarkjs, ffjavascript, quick integration
│   ├── Bad: Limited to R1CS, steep learning curve
│   └── Use: Token mixers, identity, airdrop proofs
├── Multi-backend abstraction?
│   ├── Noir — Aztec's DSL, compiles to multiple backends
│   ├── Good: Abstracted backend, ACIR IR, easy syntax
│   ├── Bad: Newer ecosystem, fewer libraries
│   └── Use: General ZK, cross-backend portability
├── Custom PLONKish gates?
│   ├── Halo2 — Zcash's framework, highest flexibility
│   ├── Good: Custom gates, lookup tables, ultra-PLONK
│   ├── Bad: Complex, Rust-only, steep learning curve
│   └── Use: High-performance circuits, custom arithmetization
└── Research / academic?
    ├── Arkworks — Rust ZK library ecosystem
    └── Bellman — Rust ZK-SNARK library (old, replaced by halo2)
```

## Circuit Programming Patterns

### Circom Basic Circuit
```circom
pragma circom 2.1.0;

// Merkle tree inclusion proof circuit
template MerkleTreeInclusion(nLevels) {
    signal input leaf;
    signal input root;
    signal input pathIndices[nLevels];
    signal input siblings[nLevels];

    signal output isIncluded;

    // Compute Merkle root from leaf up
    component hashes[nLevels];
    signal computed[nLevels+1];
    computed[0] <== leaf;

    for (var i = 0; i < nLevels; i++) {
        hashes[i] = Poseidon(2);
        hashes[i].inputs[0] <== pathIndices[i] == 0
            ? computed[i]
            : siblings[i];
        hashes[i].inputs[1] <== pathIndices[i] == 0
            ? siblings[i]
            : computed[i];
        computed[i+1] <== hashes[i].out;
    }

    // Check computed root matches provided root
    isIncluded <== computed[nLevels] == root;
}

component main = MerkleTreeInclusion(20);
```

### Noir Circuit
```rust
// Noir — Aztec's ZK DSL
// Merkle tree membership proof
use dep::std;

fn main(
    leaf: Field,
    root: Field,
    path_indices: [Field; 20],
    siblings: [Field; 20],
) -> pub bool {
    let mut computed = leaf;

    for i in 0..20 {
        let left: Field;
        let right: Field;

        if path_indices[i] == 0 {
            left = computed;
            right = siblings[i];
        } else {
            left = siblings[i];
            right = computed;
        }

        computed = std::hash::pedersen([left, right])[0];
    }

    computed == root
}
```

### Halo2 Circuit (Rust)
```rust
use halo2_proofs::{plonk::*, arithmetic::*, poly::*};
use pasta_curves::pallas;

// Custom chip for range check
#[derive(Debug, Clone)]
struct RangeCheckConfig {
    value: Column<Advice>,
    q_range: Selector,
}

impl<F: FieldExt> Chip<F> for RangeCheckChip {
    type Config = RangeCheckConfig;
    type Loaded = ();

    fn configure(
        meta: &mut ConstraintSystem<F>,
        config: Self::Config,
    ) -> Self::Config {
        // Create gate: value * (1 - value) = 0 (binary constraint)
        meta.create_gate("range check", |meta| {
            let q = meta.query_selector(config.q_range);
            let value = meta.query_advice(config.value, Rotation::cur());
            vec![q * value.clone() * (Expression::Constant(F::ONE) - value)]
        });
        config
    }
}
```

## ZK Rollup Architecture

### Rollup Components
```typescript
interface ZKRollup {
  // Sequencer: orders transactions, creates batches
  sequencer: {
    collect(): UserOperation[]
    order(ops: UserOperation[]): OrderedBatch
    submitBatch(batch: OrderedBatch): void
  }

  // Prover: generates validity proofs for batches
  prover: {
    generateProof(batch: OrderedBatch): ZKProof
    // Can be: Groth16, PLONK, STARK, or recursive proof
  }

  // Verifier contract on L1
  verifierContract: {
    address: `0x${string}`
    verifyProof(proof: ZKProof, stateRoot: bytes32): boolean
    // Called by relayer after batch submission
  }

  // State: L2 state committed to L1 via state root updates
  state: {
    lastFinalizedStateRoot: bytes32
    pendingBatches: Batch[]
  }
}
```

### zkEVM Types (Vitalik's Classification)
| Type | EVM Equivalence | Proving Time | Compatibility |
|---|---|---|---|
| Type 1 | Full equivalence | Slow (hours) | 100% compatible |
| Type 2 | Full equivalence, optimized | Medium (minutes) | ~99% compatible |
| Type 2.5 | Partial equivalence | Medium | ~95% compatible |
| Type 3 | Near equivalence | Fast (minutes) | ~85% compatible |
| Type 4 | High-level equivalence | Fastest | Requires recompilation |

## Security Considerations

### Common Circuit Vulnerabilities
| Vulnerability | Description | Prevention |
|---|---|---|
| Underconstrained | Circuit allows invalid witnesses | Formal verification of constraints |
| Missing range check | Integer overflow in circuit | Range check gates on all inputs |
| Non-deterministic witness | Multiple constraints don't pin value | Unique constraint per signal |
| Toxic waste exposure | Trusted setup data leaked | Secure multi-party computation |
| Hash function mismatch | Using prover-unfriendly hash | Poseidon, MiMC, or SHA-256 with optimizations |
| Frontrunning on proofs | Third-party submits proof first | Commit-reveal, nonce in public inputs |

## Rules
1. Always identify which phase: proofs, circuits, rollups, or zkEVM
2. Distinguish: protocol-level (proof system, DSL), infrastructure-level (prover, sequencer), or application-level (zkApp, private transfer)
3. When comparing proof systems: trust assumption, proof size, verification cost, prover time, recursive-friendliness
4. Recommend DSL suited to context: Circom for EVM Groth16, Noir for multi-backend, Halo2 for custom gates
5. Classify rollup projects by zkEVM type (1-4) and sequencer-prover architecture
6. Always reference: proving time, circuit constraints, verification gas cost, trusted setup ceremony size
7. Security-first: underconstrained circuits, missing range checks, oracle manipulation, toxic waste, old SNARK parameters
8. Prefer Poseidon hash over SHA-256 in circuits (~10 vs ~30K constraints per hash)
9. Use Groth16 for fixed circuits (most gas-efficient on EVM), PLONK for variable circuits
10. Recursive proofs (IVC, aggregation) for scaling further — prove many proofs with one proof

## References
  - references/blockchain-zk-advanced.md — Blockchain Zk Advanced Topics
  - references/blockchain-zk-fundamentals.md — Blockchain Zk Fundamentals
  - references/circuit-programming.md — Circuit Programming
  - references/proof-systems.md — Proof Systems Comparison
  - references/prover-infrastructure-operations.md — Prover Infrastructure & Operations
  - references/recursive-proof-aggregation.md — Recursive Proof Aggregation
  - references/zk-patterns.md — ZK Application Patterns
  - references/zk-rollup-architecture.md — ZK Rollup Architecture
  - references/zkevm-types.md — zkEVM Types
  - references/trusted-setup-ceremonies.md — Trusted Setup Ceremonies
  - references/zk-deployment.md — ZK System Deployment

## Phase: blockchain → blockchain-zk
