# Circuit Programming

## Overview

Circuit programming bridges high-level computation to the constraint systems
that proof systems operate over. Three major DSLs dominate the ecosystem as
of 2026: Circom (R1CS), Noir (ACIR/SAS), and Halo2 (PLONKish). This
reference covers each with a running Merkle proof circuit example.

---

## 1. Circom

### Language Model
Circom compiles to R1CS (Rank-1 Constraint System). The core concepts:

- **signal**: A variable in the circuit. Types: `input`, `output`, internal
  (unnamed). Public signals are visible to the verifier; private signals
  remain hidden but must be provided as witness.
- **template**: A parameterizable circuit module. Templates can be
  instantiated as `component`s.
- **component**: An instantiated template. Must be wired to other signals.
- **constraint**: Generated with `===` (assigns + constrains) or `<==`
  (shortcut for signal assignment with auto-constraint).

### Merkle Proof Circuit (Circom)

```circom
pragma circom 2.1.0;

include "poseidon.circom";

template MerkleProof(levels) {
    signal input leaf;
    signal input root;
    signal input pathIndices[levels];
    signal input siblings[levels];

    signal output valid;

    component hasher = Poseidon(2);
    component computed[levels];

    signal computedHash[levels + 1];
    computedHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hasher.a <== siblings[i];
        hasher.b <== computedHash[i];

        var selector = pathIndices[i];
        component mux = MultiMux1(2);

        mux.in[0] <== computedHash[i];
        mux.in[1] <== siblings[i];
        mux.s <== selector;
        computedHash[i + 1] <== hasher.out;
    }

    valid <== computedHash[levels] == root;
}

component main { public [root] } = MerkleProof(16);
```

### Constraint Generation Pipeline

```
circom merkle.circom --r1cs --wasm --sym --c
      │
      ▼
   merkle.r1cs          ← Constraint system
   merkle_js/           ← Witness calculator (JS)
   merkle_cpp/          ← Witness calculator (C++)
      │
      ▼
snarkjs groth16 setup merkle.r1cs pot22.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey
snarkjs zkey export verificationkey circuit_final.zkey verifier.json
      │
      ▼
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json pub.json
snarkjs groth16 verify verifier.json pub.json proof.json
```

### Key Constraints Rules
- Every signal must be assigned exactly once (single-assignment).
- `===` creates a constraint and must involve only linear combinations of
  signals with constants (quadratic constraints only).
- Conditional logic uses `<--` (no constraint) followed by `===` manually.
- Range checks must be explicit (e.g., `Num2Bits` for bit decomposition).

### Performance
- ~20k constraints per Poseidon hash (3-to-1).
- ~2.5M constraints for a full ETH block witness (EVM circuit).
- Prover time ~1–5 s for small proofs (snarkjs WASM), ~50 ms (rapidsnark C++).

---

## 2. Noir

### Language Model
Noir compiles to ACIR (Abstract Circuit Intermediate Representation) which
is then processed by the SSA optimizer (Static Single Assignment) and
finally to a backend-specific constraint system (Barretenberg, UltraPLONK).

- **nargo**: Noir's build tool and package manager.
- **Prover.toml**: Private witness inputs.
- **Verifier.toml**: Public inputs.
- Supports `#[public]` annotations on function parameters.

### Merkle Proof Circuit (Noir)

```noir
// main.nr
use dep::std::hash::pedersen_hash;
use dep::std::merkle::compute_merkle_root;

fn main(
    leaf : Field,
    index : Field,
    hash_path : [Field; 16],
    root : pub Field
) -> pub bool {
    let computed_root = compute_merkle_root(leaf, index, hash_path);
    computed_root == root
}
```

```noir
// Prover.toml
leaf = "0x1234..."
index = "5"
hash_path = ["0x...", "0x...", ...]
root = "0x..."
```

### Build and Prove Pipeline

```bash
nargo new merkle_proof
cd merkle_proof
# edit src/main.nr, Prover.toml
nargo check                         # Type-check + compile
nargo prove merkle_proof            # Generate proof
nargo verify merkle_proof           # Verify locally
nargo codegen-verifier              # Solidity verifier contract
```

### ACIR and SSA

```
Noir source
    │
    ▼  (frontend)
ACIR (Abstract Circuit IR)
    │  - BlackBox function calls (pedersen, sha256, range, etc.)
    │  - Arithmetic gates
    │  - Brillig VM calls (oracle, dynamic loops)
    ▼  (SSA optimizer)
Optimized ACIR
    │  - Dead constraint elimination
    │  - Expression simplification
    │  - Mem2reg
    ▼  (backend)
Barretenberg / UltraPLONK / Honk proof
```

### Key Features
- **Brillig**: Unconstrained execution VM for non-circuit code (oracles,
  dynamic branching, I/O). Marked with `unconstrained` keyword.
- **BlackBox functions**: Hardware-accelerated by the backend. Include
  `pedersen_hash`, `hash_to_field`, `schnorr_verify`, `eddsa_verify`,
  `compute_merkle_root`, `range`, `fixed_base_scalar_mul`.
- **Automatic range checks**: The compiler inserts range constraints when
  a field element is treated as an integer.

### Performance
- Poseidon hash: ~100–200 ACIR opcodes (backend reduces to ~30–50 gates).
- Full zkApp circuit: 10k–500k gates depending on complexity.
- Prover time via Barretenberg: ~10–50 ms per proof (WASM), ~1 ms (native).

---

## 3. Halo2

### Language Model
Halo2 uses a PLONKish arithmetization. Circuits are built from:

- **Chip**: A reusable unit defining a set of columns (advice, instance,
  fixed) and gates that operate on them.
- **Region**: A rectangular grid placement where chip columns are assigned
  concrete cells and gate constraints are enabled at specific rows.
- **Lookup**: Precomputed table to enforce that a tuple of cells belongs to
  a known set (e.g., range check [0..256]).
- **Layouter**: An algorithm that places regions onto the grid, minimizing
  column usage and satisfying gate adjacency requirements.

### Merkle Proof Circuit (Halo2)

```rust
use halo2_proofs::*;

#[derive(Debug, Clone)]
struct MerkleChip {
    config: MerkleConfig,
}

#[derive(Debug, Clone)]
struct MerkleConfig {
    advice: [Column<Advice>; 3],    // left, right, hash output
    instance: Column<Instance>,      // root
    hash: PoseidonChip<(), 2, 1>,   // 2-to-1 hash
    s_layout: Selector,
}

impl Circuit<Fr> for MerkleCircuit {
    type Config = MerkleConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn configure(meta: &mut ConstraintSystem<Fr>) -> Self::Config {
        let advice = [
            meta.advice_column(),
            meta.advice_column(),
            meta.advice_column(),
        ];
        let instance = meta.instance_column();
        let s_layout = meta.complex_selector();
        // ... gate definitions ...
        MerkleConfig { advice, instance, hash, s_layout }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fr>,
    ) -> Result<(), Error> {
        let root = layouter.assign_region(
            || "merkle proof",
            |mut region| {
                // Assign leaf, siblings, path indices
                // For each level: hash(prev || sibling)
                // Constrain: final hash == root
                Ok(())
            },
        )?;
        // ... constrain against instance column ...
        Ok(())
    }
}
```

### Lookup Example (Range Check)

```rust
meta.lookup(|meta| {
    let q_lookup = meta.query_selector(q_lookup);
    let value = meta.query_advice(advice, Rotation::cur());
    vec![(q_lookup * value, table_range)]
});
```

### Chip Architecture Pattern

```
Circuit
  └── Chip (PoseidonChip)
        ├── advice columns [3]
        ├── fixed column (round constants)
        └── gate: s_perm → 5-cycle permutation
  └── Chip (RangeChip)
        ├── advice column
        ├── table column (precomputed 0..2^k)
        └── lookup: value ∈ table
  └── Chip (MerkleChip)
        ├── MerkleConfig (wires + PoseidonChip ref)
        └── region: assign + hash step
```

### Performance
- Halo2 prover is 3–5× slower than Groth16 for equivalent circuit size due
  to accumulation scheme overhead.
- No trusted setup (transparent).
- Proof size: ~4 kB (multiple inner product arguments).
- Verification: configurable recursion (cycle of curves or KZG accumulation).

---

## 4. DSL Comparison

| Feature | Circom | Noir | Halo2 |
|---------|--------|------|-------|
| Constraint system | R1CS | ACIR → backend-specific | PLONKish |
| Backend | snarkjs, arkworks | Barretenberg, UltraPLONK | Halo2, KZG |
| Trusted setup | Required | Per-backend | Transparent |
| Learning curve | Medium | Low | High |
| Loops | Unrolled at compile | Brillig + unrolling | Region iteration |
| Recursive proofs | Manual (cycle curves) | Built-in (Barretenberg) | Built-in (accumulation) |
| EVM verifier | Solidity (snarkjs) | Solidity (BB codegen) | Solidity (axiom) |
| Maturity | Highest | Medium | Medium |
| IDE support | VSCode extension | VSCode + LSP | Rust-analyzer |
| Package manager | NPM-like (`circomlib`) | Nargo (`noir-libs`) | Cargo |
| Cross-compilation | WASM, C++ | WASM, native | Rust-native |

## 5. Choosing a DSL

| Scenario | Recommended DSL |
|----------|----------------|
| Single proof on Ethereum L1 (low gas) | Circom → Groth16 |
| Multi-circuit zkApp (privacy DEX, voting) | Noir → Barretenberg |
| Custom gates / lookups (ZK-EVM) | Halo2 |
| Prototyping / fast iteration | Noir |
| Production EVM rollup (Scroll, Polygon) | Halo2 or custom PLONKish |
| Recursive / folding-heavy workloads | Noir (Barretenberg) or custom Halo2 |

## References

- Circom 2.0: https://docs.circom.io/
- Noir Language: https://noir-lang.org/
- Halo2 Book: https://zcash.github.io/halo2/
- Barretenberg: https://github.com/AztecProtocol/barretenberg
