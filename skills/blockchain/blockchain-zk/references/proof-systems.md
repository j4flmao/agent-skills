# Proof Systems Comparison

## Overview

Zero-knowledge proof systems are defined by the NP relation they prove, the
trust assumptions they require, and the efficiency tradeoffs they offer. This
reference covers the major families deployed in production as of 2026.

---

## 1. Groth16

### Scheme
Groth16 is a pairing-based NIZK argument in the common reference string (CRS)
model. It produces the shortest proofs (3 group elements — 2 in G1, 1 in G2 ≈
200–300 bytes) with the cheapest verification (single pairing equation).

### Trusted Setup
Requires a **multi-party ceremony** (MPC) to generate the CRS. If toxic waste
(secret randomness) is leaked, false proofs can be forged. Ceremonies use
`Powers of Tau` (BLS12-381) or `POT22` (BN254). Each circuit needs at least a
**phase 2** setup, although universal ceremonies allow per-circuit contributions.

| Parameter | Value |
|-----------|-------|
| Proof size | ~200 B (BN254), ~300 B (BLS12-381) |
| Prover time | O(n log n) — fastest for small-med circuits |
| Verifier time | ~1.5 ms (pairing) |
| On-chain gas (Ethereum) | ~230k–280k gas verify |
| Recursive proof | Yes — inner pairing required (cycle curves) |
| Trust assumption | PPTR (Prover Prevents Trusted Setup Risk) |

### Advantages
- Smallest proof size among all schemes.
- Fastest verification (single miller loop + final exp).
- Mature tooling: snarkjs, ark-groth16, libsnark.

### Disadvantages
- Per-circuit (or per-updatable) trusted setup.
- No zero-knowledge for the witness by default unless FFT domain masking is applied.
- Pairing-friendly curves required.

---

## 2. PLONK

### Scheme
PLONK is a universal-setup SNARK using polynomial commitments (KZG).
It generalizes the circuit description via a **permutation check** (copy
constraints) and **gate constraints** over a single polynomial.

### Universal Setup
A **single** trusted setup suffices for all circuits up to a chosen size bound.
The setup is "updateable" — new participants can contribute randomness to
refresh the CRS. No per-circuit phase 2 is required.

| Parameter | Value |
|-----------|-------|
| Proof size | ~1.5 kB (KZG on BN254) |
| Prover time | O(n log n) — ~2–3× Groth16 |
| Verifier time | ~5–7 ms (multi-scalar mul + pairing) |
| On-chain gas (Ethereum) | ~350k–400k gas verified |
| Recursive proof | Yes — KZG is accumulation-friendly |
| Trust assumption | Universal & updateable CRS |

### Advantages
- Universal setup: one ceremony, many circuits.
- Relatively simple circuit description.
- Plonkup extension adds lookup arguments natively.

### Disadvantages
- Larger proofs than Groth16.
- Slower verification due to MSM + pairing.
- KZG requires a linear-size CRS per degree bound.

---

## 3. PLONKish Variants

### Overview
A family of proof systems that generalize PLONK's polynomial IOP with
custom gates, lookup tables, and multi-column wiring. The major variants:

| Variant | Key Feature | Prover (relative) | Proof size |
|---------|-------------|-------------------|------------|
| **vanilla PLONK** | Standard | 1× baseline | ~1.5 kB |
| **PLONK + lookup** | Lookup arguments (Plonkup) | 1.1× | ~2 kB |
| **Halo2** | Accumulation scheme (no trusted setup) | 3–5× | ~4 kB |
| **Ultrasound** | Linear-time prover + custom gates | 0.8× | ~1.8 kB |
| **Aztec's UltraPLONK** | Ultra gates + lookup | 1.2× | ~2.2 kB |

### Custom Gates
PLONKish allows designers to define **custom selector polynomials** that
activate specific gate constraints in a row. Common gates:

- **Add gate**: `a + b = c`
- **Mul gate**: `a * b = c`
- **Bool gate**: `a * (1 - a) = 0`
- **Range gate**: decomposition + comparison
- **Lookup gate**: input tuple ∈ precomputed table (range, sha256, etc.)

---

## 4. STARK

### Scheme
Scalable Transparent ARgument of Knowledge (STARK) uses hash-based
polynomial commitments. **No trusted setup** — fully transparent. Requires
only a collision-resistant hash function.

### Transparency
- No CRS, no toxic waste, no ceremony.
- Post-quantum security (hash-based).
- Public-coin protocol; Fiat–Shamir transform suffices.

| Parameter | Value |
|-----------|-------|
| Proof size | ~45–250 kB (depends on security level & field) |
| Prover time | O(n log² n) — slower than Groth16 by 10–100× |
| Verifier time | O(log² n) — sublinear |
| On-chain gas (Ethereum) | ~800k–2M gas (uncompetitive for L1 verify) |
| Recursive proof | Yes — via composition, or "STARK recursion" |
| Trust assumption | **None** (transparent) |

### Advantages
- Transparent — no trust assumptions beyond hash collision.
- Post-quantum secure.
- Scalable verifier (logarithmic in circuit size).
- Wide field selection (Goldilocks, Mersenne31, BabyBear) enables fast
  arithmetization.

### Disadvantages
- Large proof size (10–100× SNARKs).
- High on-chain gas cost — impractical for L1 verification without aggregation.
- Slower prover for small circuits (overhead dominates).

### StarkNet / Cairo specifics
- Uses **Cairo** as a CPU-like architecture, compiled to CASM → AIR.
- Prover (Stone/Sharingan) uses FRI-based STARK.
- SHARP (Shared Prover) aggregates multiple proofs into one STARK.

---

## 5. Recursive Proofs

### Nesting (simple recursion)
A proof verifies another proof inside the circuit verifier. This creates a
"proof-of-proof" chain. Used for:

- **Block → batch → L1 proof** (rollup aggregation)
- **zkVM shard** proof composition

### IVC (Incrementally Verifiable Computation)
A recursive proof chain where each step proves the entire history. Key
schemes:

| Scheme | Mechanism | Cost per step |
|--------|-----------|---------------|
| **Nova** | Folding scheme (R1CS) | O(1) group ops — no FFT |
| **SuperNova** | Multi-IVC for different circuits per step | O(1) per circuit |
| **Cyclefold** | Cycle of curves (BN254 → Grumpkin) | O(1) |
| **Protostar** | Polynomial IOP folding | O(1) |

### PCD (Proof-Carrying Data)
Each computation step attaches a proof of its own correctness and the
correctness of all prior steps. Used in zkRollup state transition proofs.

### Aggregation schemes

| Scheme | Prover overhead | Trust |
|--------|----------------|-------|
| SnarkPack | O(k log k) | KZG setup |
| Halo aggregation | O(n log n) | Transparent |
| STARK + FRI composition | O(n log² n) | Transparent |

---

## 6. Comparison Table

| Property | Groth16 | PLONK | Halo2 | STARK |
|----------|---------|-------|-------|-------|
| Trusted setup | Per-circuit | Universal (updateable) | **Transparent** | **Transparent** |
| Proof size | ~200 B | ~1.5 kB | ~4 kB | 45–250 kB |
| Verifier time | ~1.5 ms | ~5 ms | ~10 ms | ~50–100 ms |
| Prover time | O(n log n) | O(n log n) 2–3× | O(n log n) 5× | O(n log² n) |
| On-chain gas | ~250k | ~380k | ~500k | ~1.5M+ |
| Post-quantum | No | No | No | **Yes** |
| Recursive-friendly | Yes (cycle curves) | Yes (KZG accum) | Yes (acc. scheme) | Yes (composition) |
| Mature tooling | snarkjs, arkworks | plonk-gadgets, gnark | h

## 7. Choosing a Proof System

| Use case | Recommended system |
|----------|-------------------|
| Single-circuit L1 app (Tornado, mixer) | Groth16 (BN254) |
| Multi-circuit rollup (zkSync, Scroll) | PLONKish / Halo2 |
| Language-level zkVM (StarkNet, RISC Zero) | STARK |
| Privacy-preserving L1 DEX | Groth16 (ultra-fast verifier) |
| Long-running computation (ML inference, zkML) | IVC (Nova/SuperNova) |
| Quantum-safe rollup | STARK + lattice |

## References

- Groth16: "On the Size of Pairing-Based Non-Interactive Arguments" (2016)
- PLONK: "PLONK: Permutations over Lagrange Bases" (2019)
- Plonkup: "Plonkup: Plonk with Lookup Tables" (2022)
- Halo2: "Halo Infinite: Recursive zk-SNARKs from any Additive Group" (2022)
- STARK: "Scalable, Transparent Arguments of Knowledge" (2018)
- Nova: "Nova: Recursive Zero-Knowledge Arguments from Folding Schemes" (2021)
