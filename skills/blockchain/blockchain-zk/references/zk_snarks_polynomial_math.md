# zk-SNARK Polynomial Math: Finite Fields, R1CS, QAP and Commitments

The mathematics behind pairing-based SNARKs such as Groth16 and PLONK: finite field arithmetic, how a computation becomes constraints (R1CS), how constraints become a polynomial identity (QAP), why checking a polynomial at one random point is enough (Schwartz-Zippel), and how polynomial commitments (KZG) hide and bind polynomials. The Groth16 protocol and tooling are in `zk_snarks_groth16_implementation.md`.

## Finite Fields

- Arithmetic is modulo a prime `p`: addition, subtraction, multiplication, and division via multiplicative inverse `a^-1 = a^(p-2) mod p` (Fermat).
- Circuits work over the **scalar field** `Fr` of a pairing-friendly elliptic curve:

| Curve | Scalar field size | Used by |
|-------|-------------------|---------|
| BN254 (alt_bn128) | ~254 bits | Ethereum precompiles (EIP-196/197), Circom/snarkjs default |
| BLS12-381 | ~255 bits | Zcash Sapling, Ethereum consensus, many newer systems |

- Consequences: there are no negative numbers or overflow errors; `0 - 1 = p - 1`. Integer semantics must be enforced with range checks (see the `zk-circuit-rules` rule set).

```python
p = 21888242871839275222246405745257275088548364400416034343698204186575808495617  # BN254 Fr

def inv(a: int) -> int:
    return pow(a, p - 2, p)

assert (3 * inv(3)) % p == 1
assert (0 - 1) % p == p - 1
```

## Arithmetic Circuits and R1CS

A computation is flattened into gates of the form `left * right = output`. Rank-1 Constraint System:

```
For each constraint i:  <A_i, w> * <B_i, w> = <C_i, w>
w = (1, public inputs..., private witness...)
```

Example: prove knowledge of `x` such that `x^3 + x + 5 = 35`.

```
Flatten:
  s1 = x * x
  s2 = s1 * x
  s3 = s2 + x        (additions fold into linear combinations)
  out = s3 + 5

Witness w = [1, out, x, s1, s2]  with x = 3: [1, 35, 3, 9, 27]

Constraint 1:  (x) * (x)          = s1
Constraint 2:  (s1) * (x)         = s2
Constraint 3:  (s2 + x + 5*1) * 1 = out
```

Each constraint is three sparse vectors `A_i, B_i, C_i` over `w`. Additions and multiplications by constants are free (linear combinations); only multiplications of two variables cost a constraint. Circom's `<==` emits such constraints; `<--` only assigns a witness value without a constraint.

## From R1CS to QAP

1. Choose distinct evaluation points `r_1..r_m` (one per constraint), in practice roots of unity of a multiplicative subgroup of size `n >= m` (a power of two) so FFTs apply.
2. For each witness index `j`, interpolate polynomials `A_j(X), B_j(X), C_j(X)` with `A_j(r_i) = A_i[j]`, etc.
3. Define
   ```
   A(X) = Σ_j w_j A_j(X),  B(X) = Σ_j w_j B_j(X),  C(X) = Σ_j w_j C_j(X)
   P(X) = A(X) B(X) - C(X)
   ```
4. All constraints hold iff `P(r_i) = 0` for every `i`, iff the vanishing polynomial `Z(X) = Π (X - r_i)` divides `P(X)`:
   ```
   A(X) B(X) - C(X) = H(X) Z(X)
   ```
   With roots of unity of order `n`, `Z(X) = X^n - 1`.

The prover computes `H(X) = P(X) / Z(X)` (via FFT/NTT), and the proof convinces the verifier that this identity holds without revealing `w`.

## Why One Random Point Suffices: Schwartz-Zippel

For a nonzero polynomial `f` of degree `d` over a field `F`, and `s` chosen uniformly from `F`:

```
Pr[f(s) = 0] <= d / |F|
```

With `d` around millions and `|F|` around 2^254, a false identity passes a random-point check with negligible probability. SNARKs check `A(s)B(s) - C(s) = H(s)Z(s)` at a secret point `s` hidden in group elements (Groth16) or a Fiat-Shamir challenge (PLONK/KZG).

## Polynomial Arithmetic with FFT/NTT

- Number Theoretic Transform converts between coefficient and evaluation form in `O(n log n)` over fields with large 2-adic subgroups (BN254 Fr supports domains up to 2^28).
- Multiplying polynomials: evaluate on a larger domain (coset), multiply pointwise, interpolate back.
- Division by `Z(X) = X^n - 1` is done on a coset where `Z` has no zeros.
- Prover time is dominated by NTTs and multi-scalar multiplications (MSMs).

## Elliptic Curve Groups and Pairings

- Groups `G1`, `G2` of prime order `r` (equal to the scalar field size), generators `g1`, `g2`; target group `GT`.
- Bilinear pairing `e: G1 x G2 -> GT` with `e(a·g1, b·g2) = e(g1, g2)^(ab)`.
- This lets a verifier check multiplicative relations between hidden values: given `[a]_1`, `[b]_2`, `[c]_1`, `[1]_2`, check `e([a]_1, [b]_2) = e([c]_1, [1]_2)` to confirm `ab = c` without learning `a, b, c`.
- Hardness assumptions: discrete log and pairing-based knowledge assumptions; not post-quantum secure.

## KZG Polynomial Commitments

Used by PLONK-family SNARKs and Ethereum blobs (EIP-4844).

```
Setup (powers of tau): [τ^0]_1, [τ^1]_1, ..., [τ^d]_1, and [τ]_2       (τ must be destroyed)
Commit:   C = [f(τ)]_1 = Σ f_i [τ^i]_1                                  (one MSM)
Open at z: claim y = f(z); quotient q(X) = (f(X) - y) / (X - z); proof π = [q(τ)]_1
Verify:   e(C - [y]_1, [1]_2) = e(π, [τ]_2 - [z]_2)
```

Properties: constant-size commitments and proofs, binding under the q-SDH assumption, and a universal, updatable setup (one ceremony supports all circuits up to degree `d`).

## Setup Types

| Setup | Systems | Notes |
|-------|---------|-------|
| Per-circuit trusted setup | Groth16 | Phase 1 (universal powers of tau) + Phase 2 (circuit-specific); secure if one participant per phase is honest |
| Universal, updatable SRS | PLONK, Marlin (KZG) | One ceremony for many circuits |
| Transparent | STARKs (FRI), Halo2 with IPA, Bulletproofs | No toxic waste; larger proofs or slower verification |

## Constraint Counting Intuition

| Operation (in a circuit over a ~254-bit field) | Approximate cost |
|---|---|
| Field addition, constant multiplication | Free (linear) |
| Field multiplication | 1 constraint |
| Boolean check `b*(b-1)=0` | 1 constraint |
| n-bit decomposition (range check) | ~n constraints |
| Comparison of n-bit values | ~n constraints |
| SHA-256 | Tens of thousands of constraints |
| Poseidon hash | A few hundred constraints (ZK-friendly) |

Use ZK-friendly primitives (Poseidon, Rescue, MiMC-variants with care) inside circuits.

## Checklist

- [ ] Field size and curve known; integer semantics enforced with range checks
- [ ] Every witness assignment constrained (no free `<--` values)
- [ ] Domain size (power of two) covers the constraint count
- [ ] Understand which setup the proof system needs and who generated it
- [ ] Hash and comparison choices made with constraint cost in mind
