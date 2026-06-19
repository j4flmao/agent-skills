---
name: blockchain-zk
description: >
  Zero-knowledge proofs, zk-rollup, zkEVM, Circom, Noir, Halo2, proof systems, Groth16, PLONK, STARK, recursive proofs, circuit optimization, zkSync, StarkNet, Scroll, Polygon zkEVM, and ZK application patterns. Covers proof system selection, circuit programming, prover infrastructure, and ZK rollup architecture. Do NOT use for: general cryptography (use blockchain-cryptography), smart contract development (use blockchain-application), or L1 consensus (use blockchain-core).
version: 2.0.0
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

### Proof System Comparison
```
                Groth16    PLONK      STARK      Halo2
Proof size      128B       250B       100KB      2-4KB
Verify time     5ms        10ms       50ms       15ms
Prove time      10s        30s        5min       2min
Trusted setup   Per circ   Universal  None       None
Recursion       Hard       Hard       Native     Possible
Quantum risk    Yes        Yes        No         Yes
Gas (EVM)       200K       300K       1M+        400K+
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

### Circom: Private Transfer (Tornado-style)
```circom
pragma circom 2.1.0;

include "poseidon2.circom";

template Withdrawal(nLevels) {
    signal input root;           // Merkle root
    signal input nullifierHash;  // Unique spending key hash
    signal input recipient;      // Recipient address
    signal input relayer;        // Relayer address
    signal input fee;            // Relayer fee
    signal input refund;         // Change

    // Private inputs
    signal private input nullifier;
    signal private input secret;
    signal private input pathElements[nLevels];
    signal private input pathIndices[nLevels];

    // Compute commitment = hash(nullifier, secret)
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;
    signal commitment;
    commitment <== commitmentHasher.out;

    // Verify Merkle inclusion
    component merkleProof = MerkleTreeInclusion(nLevels);
    merkleProof.leaf <== commitment;
    merkleProof.root <== root;
    merkleProof.pathIndices <== pathIndices;
    merkleProof.siblings <== pathElements;
    merkleProof.isIncluded === 1;

    // Compute nullifierHash
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash === nullifierHasher.out;
}

component main { public [root, nullifierHash, recipient, relayer, fee, refund] } = Withdrawal(20);
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
|------|----------------|--------------|---------------|
| Type 1 | Full equivalence | Slow (hours) | 100% compatible |
| Type 2 | Full equivalence, optimized | Medium (minutes) | ~99% compatible |
| Type 2.5 | Partial equivalence | Medium | ~95% compatible |
| Type 3 | Near equivalence | Fast (minutes) | ~85% compatible |
| Type 4 | High-level equivalence | Fastest | Requires recompilation |

### zkEVM Project Comparison
| Project | Type | Prover | Proving Time | Status |
|---------|------|--------|--------------|--------|
| Scroll | Type 2/3 | Custom | Minutes | Mainnet |
| Linea | Type 2/3 | Custom | Minutes | Mainnet |
| ZKsync Era | Type 4 | Custom (Boojum) | Seconds | Mainnet |
| StarkNet | Type 4 | STARK prover | Seconds | Mainnet |
| Polygon zkEVM | Type 2 | Custom | Minutes | Mainnet |
| Taiko | Type 1 | Multiple (SGX, ZK) | Hours | Testnet |
| RISC Zero | zkVM | Custom | Minutes | Testnet |

## Recursive Proofs

### Recursion Patterns
```typescript
// Recursive proof aggregation
// 1. Prove each batch individually → individual proofs
// 2. Prover aggregates N proofs into 1 recursive proof
// 3. L1 verifies single proof for N batches

// Benefits:
// - Verification cost: O(1) instead of O(N)
// - Parallel proving: each batch proven independently
// - Compression: N proofs → 1 proof

// Implementations:
// - IVC (Incrementally Verifiable Computation): Nova, Cyclefold
// - PCD (Proof-Carrying Data): continuous computation with proofs
// - Aggregation: combine N independent proofs (Halo2, plonk-verifier)

// Gas savings (EVM):
// N batches verified individually: N × 200K gas
// N batches via recursive proof: 200K gas (regardless of N)
```

## Security Considerations

### Common Circuit Vulnerabilities
| Vulnerability | Description | Prevention |
|---------------|-------------|------------|
| Underconstrained | Circuit allows invalid witnesses | Formal verification of constraints |
| Missing range check | Integer overflow in circuit | Range check gates on all inputs |
| Non-deterministic witness | Multiple constraints don't pin value | Unique constraint per signal |
| Toxic waste exposure | Trusted setup data leaked | Secure multi-party computation |
| Hash function mismatch | Using prover-unfriendly hash | Poseidon, MiMC, or SHA-256 with optimizations |
| Frontrunning on proofs | Third-party submits proof first | Commit-reveal, nonce in public inputs |
| Weak FRI parameters | Insufficient query rounds | Follow ethSTARK parameter recommendations |
| Underpowered field | Field too small for security target | Use 256-bit+ field for 128-bit security |

### Trusted Setup Lifecycle
```
1. Ceremony initiation: Define circuit, generate parameters
2. Multi-party computation: N participants contribute randomness
3. Each participant: generates local randomness, transforms parameters
4. Destroy toxic waste: all but last participant's randomness destroyed
5. Final parameters: last participant must destroy their randomness
6. Verification: verify final CRS against transcript

Risks:
- If any participant retains their randomness, fake proofs are possible
- Malicious participant can bias parameter generation
- Ceremony must be audited by independent third party

Current ceremonies:
- Groth16: Per-circuit ceremony required
- PLONK: Universal ceremony (one for all circuits, e.g., Perpetual Powers of Tau)
- STARK: No ceremony (transparent, hash-based)
```

## Prover Infrastructure

### Prover Hardware Requirements
```
Circuit size     Constraints    RAM    GPU Memory    Time
Small            1K-10K         8GB    4GB           1-10s
Medium           10K-100K       32GB   8GB           10-60s
Large            100K-1M        128GB  16GB          1-10min
zkEVM batch      1M-10M         512GB  48GB          10-60min

Recommended hardware:
├── GPU: RTX 4090 (24GB), A100 (40/80GB), H100 (80GB)
├── CPU: AMD EPYC 64-core, Intel Xeon 56-core
├── RAM: 256GB+ for zkEVM proving
├── Storage: NVMe SSD for circuit data
└── Network: 10Gbps for distributed proving
```

## ZK Application Patterns

### Application Comparison
| Application | Proof System | Circuit Size | Best DSL |
|-------------|--------------|-------------|----------|
| Private transfer (Tornado) | Groth16 | ~1K constraints | Circom |
| Identity (Semaphore) | Groth16 | ~500 constraints | Circom |
| zkAirdrop | Groth16 | ~1K constraints | Circom |
| zkDID (Polygon ID) | Groth16 | ~2K constraints | Circom |
| zkOracle (Axiom) | Halo2 | Variable | Halo2/EVM |
| ZK coprocessor | Halo2/PLONK | Variable | Halo2 |
| On-chain ZKML | PLONKish | 100K-1M+ | Custom |

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
11. STARKs are transparent and quantum-resistant but have large proof sizes
12. Halo2 supports custom gates for highly optimized circuits (essential for zkEVM)
13. Noir abstracts away backend choice — compile to Groth16, PLONK, or STARK
14. Trusted setup ceremonies must be audited and have at least one honest participant
15. Prover infrastructure cost is often the bottleneck for ZK rollup operations

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
  - references/circom-circuit-optimization.md — Circom Circuit Optimization

## Phase: blockchain → blockchain-zk
