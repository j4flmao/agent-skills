# Recursive Proof Aggregation

## Overview

Recursive proof aggregation is the technique of proving the validity of multiple proofs inside a single proof. A recursive proof verifies one or more child proofs and produces a single compact proof that attests to the validity of all children. This is the key scalability mechanism for ZK-rollups: it enables batching thousands of transactions into one succinct proof that is cheap to verify on L1. This reference covers recursive proof architectures (IVC, PCD, accumulation schemes), implementation patterns with Halo2 and Plonky2, aggregation circuit design, on-chain verification optimization, and trade-offs between different recursion approaches.

## Core Architecture Concepts

### Recursion Hierarchy

```
Level 0: Individual transaction proofs (many)
Level 1: Block proof (aggregates ~100 tx proofs)
Level 2: Batch proof (aggregates ~10 block proofs)
Level 3: Day/settlement proof (aggregates ~100 batch proofs)

Each level verifies the proofs from the level below,
outputting a single proof of constant size (~1 KB for Groth16).
```

### Recursion Schemes Comparison

| Scheme | Proof Size | Recursion Overhead | Prover Time | Trust Assumption | Maturity |
|---|---|---|---|---|---|
| Groth16 recursive | ~300 bytes | High (pairing checks in circuit) | 2-5x | Trusted setup per circuit | Very mature |
| PLONK recursive | ~1 KB | Medium (polynomial checks) | 1.5-3x | Transparent (or trusted setup) | Mature |
| Halo2 recursive | ~1 KB | Medium (inner product argument) | 2-4x | Transparent | Mature |
| Plonky2 recursive | ~200 bytes | Low (FRI-based) | 1.2-2x | Transparent | Mature |
| STARK recursive | ~50 KB | Low (arithmetization) | 1.1-1.5x | Transparent | Mature |
| Nova (IVC) | ~1 KB | Very low (folding) | 1.1-1.2x | Transparent | Emerging |
| Protogalaxy (IVC) | ~1 KB | Very low (multi-folding) | 1.05-1.1x | Transparent | Research |

### Recursion Overhead Breakdown

```
For a recursive Groth16 proof:
  ┌──────────────────────────────────┐
  │  Step 1: Verify child proof       │  ~200ms (1600 pairings for 2 children)
  │  Step 2: Compute recursive proof  │  ~3s (1M constraint circuit)
  │  Step 3: Verify on L1             │  ~500k gas
  └──────────────────────────────────┘

Total aggregation overhead: ~3.2s + 500k gas per recursion level
Without recursion: 10 proofs × 300k gas = 3M gas → $90 at 30 gwei
With recursion (2-level): 10 proofs → 1 proof → 500k gas → $15 at 30 gwei
Savings: 83% on L1 verification cost
```

## Architecture Decision Trees

### Recursion Strategy Selection

```
Recursion requirement?
├── Rollup: batch many txs → need aggregator
│   ├── Single prover → Sequential recursion (aggregate one by one)
│   ├── Multiple provers → Tree-based aggregation (parallel)
│   └── Maximum L1 cost savings → Deep recursion (4+ levels)
├── zkApp: private computation → need recursive composition
│   ├── Sequential private ops → IVC (Nova, Protogalaxy)
│   ├── Parallel private ops → Tree aggregation (Halo2)
│   └── Public + private mix → Hybrid recursion strategy
└── L3 (rollup on rollup) → need nested recursion
    ├── Same proving system → Direct recursive verifier
    └── Different proving systems → Translation layer (wrapper proof)
```

### Aggregation Tree Shape Selection

```
Number of proofs to aggregate (N)?
├── N < 10 → Flat aggregation (all proofs in one circuit)
├── N 10-100 → Binary tree (log2 N depth)
├── N 100-1000 → k-ary tree (optimal k determined by circuit cost)
│   ├── k=2 (binary): lowest total compute, highest latency
│   ├── k=4: good balance of compute vs latency
│   └── k=16: lowest latency, highest compute
└── N > 1000 → Multi-level tree with batching at each level
```

## Implementation Strategies

### Halo2 Recursive Verifier Circuit

```rust
// Halo2 recursive aggregation circuit (simplified)
use halo2_proofs::{arithmetic::FieldExt, plonk::*, poly::*};
use halo2_recursion::*;

/// Circuit that verifies multiple child Groth16 proofs
#[derive(Clone, Debug)]
struct RecursiveAggregatorCircuit<F: FieldExt> {
    // Child proofs to aggregate
    child_proofs: Vec<Groth16Proof<F>>,
    // Public inputs of child proofs (accumulated)
    child_public_inputs: Vec<Vec<F>>,
}

impl<F: FieldExt> Circuit<F> for RecursiveAggregatorCircuit<F> {
    type Config = RecursiveVerifierConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            child_proofs: vec![],
            child_public_inputs: vec![],
        }
    }

    fn configure(meta: &mut ConstraintSystem<F>) -> Self::Config {
        // Configure the recursive verifier chip
        // This includes:
        // - Pairing check chip (for verifying Groth16 proofs inside the circuit)
        // - Hash chip (for Fiat-Shamir transcript verification)
        // - Accumulator chip (for aggregating public inputs)
        RecursiveVerifierConfig {
            pairing_check: PairingCheckChip::configure(meta),
            transcript: TranscriptChip::configure(meta),
            accumulator: AccumulatorChip::configure(meta),
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<F>,
    ) -> Result<(), Error> {
        // Phase 1: Verify each child proof
        let mut accumulated_public_inputs = Vec::new();

        for (i, proof) in self.child_proofs.iter().enumerate() {
            let child_public = &self.child_public_inputs[i];

            // Verify the child Groth16 proof inside the circuit
            config.pairing_check.verify_proof(
                layouter.namespace(|| format!("verify_proof_{}", i)),
                proof,
            )?;

            // Hash the child's public inputs into the accumulator
            let hashed = config.transcript.hash_public_inputs(
                layouter.namespace(|| format!("hash_public_{}", i)),
                child_public,
            )?;
            accumulated_public_inputs.push(hashed);
        }

        // Phase 2: Compute the aggregate public output
        // The aggregate proof's public input is the Merkle root of child public inputs
        config.accumulator.compute_root(
            layouter.namespace(|| "compute_accumulator_root"),
            &accumulated_public_inputs,
        )?;

        Ok(())
    }
}
```

### Plonky2 Recursive Aggregation

```rust
// Plonky2 recursive proof aggregation
use plonky2::plonk::{
    circuit_data::CircuitConfig,
    proof::ProofWithPublicInputs,
};
use plonky2::recursion::*;

struct RecursiveAggregator {
    config: CircuitConfig,
    // FRI parameters for efficient recursion
    fri_config: FriConfig,
}

impl RecursiveAggregator {
    /// Aggregate multiple proofs into one recursive proof
    fn aggregate_proofs(
        &self,
        proofs: Vec<ProofWithPublicInputs<F, C, D>>,
    ) -> ProofWithPublicInputs<F, C, D> {
        // Start with first proof
        let mut accumulator = proofs[0].clone();

        // Recursively verify and fold each subsequent proof
        for proof in &proofs[1..] {
            accumulator = self.recursive_verify_and_accumulate(accumulator, proof.clone());
        }

        accumulator
    }

    fn recursive_verify_and_accumulate(
        &self,
        acc: ProofWithPublicInputs<F, C, D>,
        next: ProofWithPublicInputs<F, C, D>,
    ) -> ProofWithPublicInputs<F, C, D> {
        // Build a circuit that:
        // 1. Verifies the accumulator proof
        // 2. Verifies the next proof
        // 3. Outputs a single proof attesting to both
        let circuit = RecursiveCircuit {
            accumulator: acc.clone(),
            new_proof: next.clone(),
        };

        // Prove the recursive circuit
        let (circuit_data, _) = prove_recursively(circuit);
        // The circuit_data contains the combined proof
        circuit_data.proof
    }
}

// Note: Plonky2's recursive proofs are particularly efficient
// because the verification circuit is itself a Plonky2 circuit,
// creating a self-recursive structure with minimal overhead.
```

### IVC with Nova (Folding Scheme)

```rust
// Nova-based IVC for incrementally verifiable computation
use nova_snark::{
    traits::Group, 
    CompressedSNARK, PublicParams, RecursiveSNARK,
};
use ff::Field;

struct IVCProver<G1: Group, G2: Group> {
    pp: PublicParams<G1, G2>,
    recursive_snark: Option<RecursiveSNARK<G1, G2>>,
}

impl<G1: Group, G2: Group> IVCProver<G1, G2> {
    fn new(pp: PublicParams<G1, G2>) -> Self {
        Self { pp, recursive_snark: None }
    }

    /// Fold a new step into the cumulative proof
    fn fold_step(
        &mut self,
        primary_input: Vec<G1::Scalar>,
        // The step computation (e.g., "execute one block")
        step_circuit: impl Circuit<G1::Scalar>,
    ) -> Result<(), NovaError> {
        match &self.recursive_snark {
            None => {
                // First step: create initial recursive SNARK
                let snark = RecursiveSNARK::new(
                    &self.pp,
                    step_circuit,
                    primary_input,
                    vec![],
                )?;
                self.recursive_snark = Some(snark);
            }
            Some(snark) => {
                // Fold the new step into the existing proof
                let new_snark = snark.fold(
                    &self.pp,
                    step_circuit,
                    primary_input,
                    vec![],
                )?;
                self.recursive_snark = Some(new_snark);
            }
        }
        Ok(())
    }

    /// Compress the IVC proof into a succinct SNARK
    fn compress(&self) -> Result<CompressedSNARK<G1, G2>, NovaError> {
        let snark = self.recursive_snark.as_ref().unwrap();
        CompressedSNARK::prove(&self.pp, snark)
    }
}

// Nova folding is fundamentally different from recursive verification:
// Instead of verifying a proof inside a circuit (expensive),
// it "folds" the instance into an accumulator (cheap).
// This makes Nova the most efficient scheme for sequential recursive computation.
```

## Integration Patterns

### Aggregator Service Architecture

```typescript
// Aggregator service that collects proofs and submits aggregated proof
class AggregatorService {
  private pendingProofs: Proof[] = []
  private aggregationLevel = 0
  private maxBatchSize = 100
  private treeDepth = 3

  async onNewProof(proof: Proof): Promise<void> {
    this.pendingProofs.push(proof)

    if (this.pendingProofs.length >= this.maxBatchSize) {
      await this.aggregateAndSubmit()
    }
  }

  private async aggregateAndSubmit(): Promise<void> {
    let currentLevel = this.pendingProofs
    this.pendingProofs = []

    // Build aggregation tree
    for (let level = 0; level < this.treeDepth; level++) {
      const nextLevel: Proof[] = []

      for (let i = 0; i < currentLevel.length; i += this.aggregationFactor) {
        const batch = currentLevel.slice(i, i + this.aggregationFactor)
        const aggregated = await this.proveAggregation(batch)
        nextLevel.push(aggregated)
      }

      currentLevel = nextLevel
    }

    // Submit the final root proof to L1
    const finalProof = currentLevel[0]
    const tx = await this.submitToL1(finalProof)
    console.log(`Aggregated proof submitted: ${tx.hash}`)
  }

  private async proveAggregation(proofs: Proof[]): Promise<Proof> {
    // Send to prover cluster
    return await this.proverClient.submitAggregationJob(proofs)
  }
}
```

### L1 Verifier Contract for Aggregated Proofs

```solidity
// Solidity verifier that checks an aggregated proof
// The aggregated proof attests to N individual transactions

contract AggregatedVerifier {
    // Verifier address for the aggregation circuit
    address public immutable aggregationVerifier;

    // Accumulated public inputs from the aggregation
    // This is a Merkle root of all individual transaction hashes
    event BatchVerified(
        bytes32 indexed batchRoot,
        uint256 indexed batchSize,
        uint256 batchIndex
    );

    constructor(address _aggregationVerifier) {
        aggregationVerifier = _aggregationVerifier;
    }

    /// @param batchRoot Merkle root of all transaction hashes in this batch
    /// @param batchSize Number of transactions in the batch
    /// @param proof The aggregated Groth16 proof
    function verifyBatch(
        bytes32 batchRoot,
        uint256 batchSize,
        bytes calldata proof
    ) external {
        // Encode public inputs for the aggregation circuit
        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = batchRoot;
        publicInputs[1] = bytes32(batchSize);

        // Verify the aggregated proof
        bool valid = IVerifier(aggregationVerifier).verify(
            publicInputs, proof
        );
        require(valid, "Invalid aggregated proof");

        emit BatchVerified(batchRoot, batchSize, batchIndex++);
    }
}

// Gas comparison:
// Verification of 1 aggregated proof (500k gas for 1000 txs)
// vs
// Verification of 1000 individual proofs (300M gas)
// Savings: 99.8% reduction in L1 verification gas
```

### Nested Recursion for L3

```solidity
// L3 verifier: L3 proof verified inside an L2 proof, verified on L1
// Each level adds ~500k gas for verification

// Level 1: L3 transactions → L3 proof
// Level 2: L3 proof → L2 proof (recursive verification inside L2 circuit)
// Level 3: L2 proof → L1 verification (on-chain verifier)

contract L3Verifier {
    // The L2 aggregation verifier incorporates L3 proof verification
    // into the L2 circuit, creating a nested proof structure:
    // L1 verifier ← L2 proof (contains: L2 state + verified L3 proofs)

    function verifyL3State(
        bytes32 l3StateRoot,
        bytes calldata l2AggProof
    ) external {
        // The L2 aggregate proof already verified:
        // 1. L2 state transition
        // 2. L3 state transition (via recursive verification in L2 circuit)
        // Single L1 verification for both L2 and L3 state
    }
}
```

## Performance Optimization

### Aggregation Cost Analysis

| Number of Transactions | Without Recursion (Gas) | With Recursion (Gas) | Savings |
|---|---|---|---|
| 10 | 3,000,000 | 500,000 | 83% |
| 100 | 30,000,000 | 750,000 (2-level) | 97.5% |
| 1000 | 300,000,000 | 1,000,000 (3-level) | 99.7% |
| 10000 | 3,000,000,000 | 1,500,000 (4-level) | 99.95% |

### Proving Time vs Aggregation Depth

```
Aggregation Depth vs Prover Time (for 1000 tx proofs):
  Depth 1 (flat):   1 hour prover time → 1 proof, 1M gas L1
  Depth 2 (binary): 1.5 hours → 1 proof, 750k gas L1  
  Depth 3 (binary): 2 hours → 1 proof, 600k gas L1
  Depth 4 (binary): 2.5 hours → 1 proof, 500k gas L1

Trade-off: Each recursion level adds ~50% prover overhead
but reduces L1 verification cost by ~25-30%.
Optimal depth depends on L1 gas price vs compute cost.
```

## Security Considerations

- **Recursive verifier soundness**: The circuit that verifies child proofs must be sound. A bug in the recursive verifier can make all aggregated proofs invalid. Formal verification of the recursive verifier circuit is strongly recommended.
- **Amortization attack**: An attacker could batch a valid proof with many invalid proofs if the aggregation circuit has a flaw in public input accumulation. Ensure that public inputs from all children are committed in the aggregation proof.
- **Infinite recursion bombs**: A recursive proof could theoretically contain an infinite number of nested proofs. Bound recursion depth at each level and enforce maximum batch sizes.
- **Folding scheme freshness**: Nova-style folding requires that each step is distinct and fresh. Replaying the same step (same witness, same public inputs) can create degenerate folding proofs. Include a nonce or step counter in each fold.
- **Proof malleability**: Recursive proofs that are malleable can be modified to produce valid-looking but semantically different proofs. Use robust Fiat-Shamir transcript commitments.

## Operational Excellence

### Aggregator Monitoring

```promql
// Aggregation specific metrics

// Aggregation success rate
rate(aggregator_batches_submitted_total[1h])
  / ignoring(job)
rate(aggregator_batches_attempted_total[1h])

// Aggregation depth distribution
aggregator_aggregation_depth

// Time from first proof in batch to batch submission
aggregator_batch_accumulation_seconds

// L1 verification cost per batch
avg(l1_verification_gas_used) by (aggregation_depth)

// Proving time for aggregation circuits
histogram_quantile(0.95,
  rate(aggregator_proving_duration_seconds_bucket[5m])
)
```

## Testing Strategy

### Recursive Proof Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_two_level_aggregation() {
        // Generate 10 individual transaction proofs
        let tx_proofs: Vec<Proof> = (0..10).map(|i| generate_tx_proof(i)).collect();

        // Level 1: aggregate into 2 batch proofs
        let batch1 = aggregate(&tx_proofs[0..5]);
        let batch2 = aggregate(&tx_proofs[5..10]);

        // Level 2: aggregate into 1 root proof
        let root = aggregate(&[batch1, batch2]);

        // Verify root proof on L1 verifier
        let result = l1_verifier.verify(root);
        assert!(result.is_ok());
    }

    #[test]
    fn test_single_invalid_proof_rejected() {
        let valid_proofs: Vec<Proof> = (0..9).map(|i| generate_tx_proof(i)).collect();
        let invalid_proof = generate_invalid_tx_proof();

        let mut proofs = valid_proofs;
        proofs.push(invalid_proof);

        let result = std::panic::catch_unwind(|| aggregate(&proofs));
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_batch_rejected() {
        let result = aggregate(&[]);
        assert!(result.is_err());
    }
}
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Recursive circuit too large | Excessive prover time, memory OOM | Optimize verifier circuit, use smaller curve |
| Wrong public input accumulation | Invalid aggregation accepted | Hash all child public inputs into Merkle tree |
| Unbounded recursion depth | Proof explosion, gas limit exceeded | Enforce max depth per aggregation chain |
| Ignoring FRI proof size | STARK recursion produces large proofs | Use Groth16/PLONK wrapper for L1 submission |
| Single-level recursion | L1 cost savings limited to 83% | Multi-level recursion for 99%+ savings |
| Folding scheme with non-uniform steps | IVC performance degrades | Normalize step circuits to uniform constraint count |
| Not testing verifier circuit equivalence | Local verification passes, on-chain fails | Use same verifier code for test and production |
| Over-aggregation latency | Users wait too long for finality | Set max accumulation time window (e.g., 30 min) |

## Key Takeaways

1. **Recursion is the key scalability mechanism for ZK-rollups** — it compresses thousands of proofs into one, reducing L1 verification cost by 99%+.
2. **Multi-level tree aggregation is optimal** — binary trees balance prover time vs L1 cost. k-ary trees (k=4) reduce latency at slightly higher compute cost.
3. **Nova/Protogalaxy folding schemes are the future** — they achieve recursion with near-zero overhead compared to verifier-circuit-based recursion which has 2-5x overhead.
4. **Each recursion level adds ~50% prover time but reduces L1 gas by 25-30%** — optimal depth depends on L1 gas price vs compute cost.
5. **Plonky2 is currently the most practical for production aggregation** — transparent setup, fast proving, and efficient self-recursion make it the gold standard.
6. **The recursive verifier circuit must be formally verified** — a bug in the aggregation circuit invalidates every proof it produces.
7. **L3 architectures depend on nested recursion** — verifying an L3 proof inside an L2 proof creates a nested validity chain that settles on L1 in one verification.
8. **Monitor aggregation depth and batch size as operational metrics** — deviations may indicate prover issues or economic inefficiency.