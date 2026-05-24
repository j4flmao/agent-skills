# Zero-Knowledge Proofs in Blockchain

## Comparison

| Scheme | Proof Size | Prover Time | Verifier Time | Setup | Post-Quantum |
|--------|-----------|-------------|---------------|-------|-------------|
| Groth16 | ~128-200 B | Very fast | Very fast (2-3 pairings) | Trusted per-circuit | No |
| PLONK | ~1-2 KB | Fast | Fast (1 pairing + 1 MSM) | Universal + CRS | No |
| Halo2 | ~1-2 KB | Fast | Fast (accumulation) | None (transparent) | No |
| zk-STARK | ~45-200 KB | Slow | Fast (hash-based) | None (transparent) | Yes |
| Bulletproofs | ~1.5-3 KB | Fast | Slow (linear verifier) | None (transparent) | No |

## Groth16

Most efficient for single-prover, single-verifier. Used by ZCash, Filecoin, Celo.

### Setup (per-circuit)

```python
# Phase 1: Powers of Tau (universal, MPC)
# tau ← random, output: [tau]₁, [tau²]₁, ..., [tauⁿ]₁
# Phase 2: Circuit-specific
# Uses tau to generate proving/verification keys specific to R1CS
```

### Proof generation

```
π = (A, B, C) where:
  A = [α + Σ a_i · u_i(x)]₁       # G1
  B = [β + Σ a_i · v_i(x)]₂       # G2
  C = [Σ a_i · w_i(x) · βu_i(x) + αv_i(x) + w_i(x) / δ]₁   # G1
```

### Verification (1 pairing equation)

```python
def verify_groth16(vk, public_inputs, proof):
    # e(A, B) = e(α, β) · e(C, δ) · Π e([pk_i], γ)
    lhs = pairing(proof.A, proof.B)
    rhs = pairing(vk.alpha, vk.beta) * pairing(proof.C, vk.delta)
    for i, pi in enumerate(public_inputs):
        rhs *= pairing(pi, vk.gamma_abc[i])
    return lhs == rhs
```

### On-chain verification (EVM)

```solidity
// ~200k gas for Groth16 verify
function verifyProof(
    uint256[2] memory a,
    uint256[2][2] memory b,
    uint256[2] memory c,
    uint256[2] memory pub
) public view returns (bool) {
    uint256[12] memory input;
    // encode a, b, c, and public inputs
    (bool success, bytes memory out) = address(0x08).staticcall(
        abi.encodePacked(input)
    );
    return success && out.length == 32 && abi.decode(out, (uint256)) == 1;
}
```

## PLONK

Universal setup: one-time CRS (Structured Reference String) up to max circuit size. Permutation-based rather than R1CS.

### Key components

- **Arithmetization**: Circuit → constraint system of gates with selector polynomials
- **Permutation argument**: Wiring constraints (copy constraints) via grand product
- **Lookup argument** (plookup): Efficient table lookups for arbitrary gates

### PLONK verification equation

```
Verify: Q_L·a + Q_R·b + Q_M·a·b + Q_O·c + Q_C = 0
          +
          PI(x) = public input polynomial
          +
          z(x) · ω · z(ω·x) = f(a, b, c) ... grand product for permutation
```

### On-chain verification cost

```
Groth16: ~200k gas, ~128 byte proof
PLONK:   ~400k gas, ~1-2 KB proof
STARK:   ~1M+ gas, ~100 KB proof (not practical on L1)
```

## Halo2

PLONK-based, uses inner product argument instead of Kate commitments. Transparent (no trusted setup), recursive-friendly.

### Key innovations

1. **IPA commitment**: No trusted setup. Uses Pedersen commitments and inner product argument.
2. **Accumulation scheme**: Recursive proofs verified efficiently; verifier work independent of recursion depth.
3. **Chip model**: Custom gates via lookup tables and reusable "chips".

```rust
// Halo2 circuit example: simple addition gate
use halo2_proofs::plonk::*;
use halo2_proofs::poly::ipa::commitment::IPAParams;

fn configure<F: Field>(meta: &mut ConstraintSystem<F>) -> Selector {
    let a = meta.advice_column();
    let b = meta.advice_column();
    let c = meta.advice_column();
    let s = meta.selector();

    meta.create_gate("a + b = c", |cells| {
        let a = cells.query_advice(a, Rotation::cur());
        let b = cells.query_advice(b, Rotation::cur());
        let c = cells.query_advice(c, Rotation::cur());
        let s = cells.query_selector(s);
        vec![s * (a + b - c)]
    });
    s
}
```

## zk-STARKs

Transparent (no trusted setup), post-quantum (only collision-resistant hash functions). Larger proof sizes.

### Tradeoffs vs SNARKs

| Aspect | STARK | SNARK |
|--------|-------|-------|
| Proof size | ~45-200 KB | ~128-2000 B |
| Prover time | 10-100x slower | Fast |
| Setup | None | Trusted or universal |
| Post-quantum | Yes | No (elliptic curve pairing based) |
| Recursion | Native (ARITH) | Via pairing or cycles |

### STARK construction overview

```
1. Arithmetization: computation → execution trace (algebraic intermediate representation)
2. Low-degree extension: evaluate trace polynomial on larger domain
3. FRI protocol: commit to Merkle tree of evaluations, then query random positions
4. Folding: Merkle proofs + low-degree testing → logarithmic verification
```

## Bulletproofs

Range proofs for confidential transactions. No trusted setup.

- Proof size: O(log n) for n-bit range (e.g., 64-bit range → ~738 bytes)
- Verification: O(n) scalar multiplications (slower than SNARKs)
- Used in: Monero (RingCT), Grin/Mimblewimble, Liquid sidechain

```rust
use bulletproofs::{BulletproofGens, PedersenGens, RangeProof};
use merlin::Transcript;

fn range_proof_example() {
    let pc_gens = PedersenGens::default();
    let bp_gens = BulletproofGens::new(64, 1);  // 64-bit range

    let secret_value = 42u64;
    let blinding = Scalar::random(&mut thread_rng());

    let (proof, commitment) = RangeProof::prove_single(
        &bp_gens, &pc_gens, &mut Transcript::new(b"range"),
        secret_value, &blinding, 64,
    ).unwrap();

    let ok = proof.verify_single(
        &bp_gens, &pc_gens, &mut Transcript::new(b"range"),
        &commitment, 64,
    ).is_ok();
}
```

## circom + snarkjs

Domain-specific language for arithmetic circuits. Compiles to R1CS.

```circom
pragma circom 2.0.0;

template Multiplier2() {
    signal input a;
    signal input b;
    signal output c;

    c <== a * b;
}

template IsZero() {
    signal input in;
    signal output out;

    signal inv;
    inv <-- in != 0 ? 1 / in : 0;
    out <== 1 - in * inv;
    in * out === 0;
}

component main = Multiplier2();
```

```bash
# compile circuit
circom circuit.circom --r1cs --wasm --sym

# generate witness
node generate_witness.js circuit.wasm input.json witness.wtns

# setup (Groth16)
snarkjs powersoftau new bn254 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000 pot12_0001.ptau
snarkjs powersoftau prepare phase2 pot12_0001 pot12_final.ptau
snarkjs groth16 setup circuit.r1cs pot12_final circuit.zkey

# generate proof
snarkjs groth16 prove circuit.zkey witness.wtns proof.json public.json

# verify
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Prover cost comparison

| Circuit Size | Groth16 | PLONK | Halo2 | STARK |
|-------------|---------|-------|-------|-------|
| 1K gates | 50ms | 80ms | 100ms | 500ms |
| 10K gates | 200ms | 350ms | 500ms | 5s |
| 100K gates | 1.5s | 3s | 5s | 60s |
| 1M gates | 15s | 30s | 45s | 600s |

## Security Considerations

1. **Trusted setup toxic waste**: Groth16 CRS must be destroyed after ceremony. Leaked tau allows forging proofs. Use multi-party ceremonies (Powers of Tau) with at least one honest participant.
2. **FRI proof soundness**: STARK security depends heavily on the FRI query parameter, which trades proof size for security. 100+ queries needed for 128-bit security.
3. **Recursive proof composition**: Must handle cycles of elliptic curves (e.g., Pasta curves in Halo2) to avoid infinite regress.
4. **Constraint system bugs**: R1CS ↔ witness mismatches. Always verify witness generation against constraints with random test vectors.
5. **Lookup argument soundness**: PLONKup/plookup with insufficient randomness in challenges can be attacked via degree overflow.
6. **Groth18 malleability**: Proof malleability in Groth16 (multiply A by scalar, divide C by same scalar). Use hash of proof as nullifier, not proof itself.
