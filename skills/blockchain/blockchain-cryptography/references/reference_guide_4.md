# Commitment Schemes: Hash, Pedersen, Vector and Polynomial (KZG) Commitments

A commitment lets a party fix a value now and reveal it later, so it cannot change its mind (binding) and others learn nothing before the reveal (hiding). Commitments underpin commit-reveal auctions, confidential transactions, Verkle trees, data availability sampling (EIP-4844 blobs) and most zero-knowledge proof systems. This reference compares the main schemes and their correct use.

## Properties

| Property | Meaning | Computational vs perfect |
|----------|---------|--------------------------|
| Hiding | Commitment reveals nothing about the value | Perfect hiding: even unbounded adversaries learn nothing |
| Binding | Committer cannot open to a different value | Perfect binding: impossible to open two ways |
| Homomorphic | `Com(a) * Com(b) = Com(a + b)` | Enables arithmetic on hidden values |

No scheme is both perfectly hiding and perfectly binding; choose which property must survive future cryptanalysis (including quantum attacks).

## Hash Commitments

```text
commit: c = H(value || r)      r = 32 random bytes
open:   reveal (value, r); verifier checks H(value || r) == c
```

- Computationally hiding and binding under standard hash assumptions (collision and preimage resistance).
- The random salt `r` is mandatory for low-entropy values: without it, a vote or bid can be brute-forced from the hash.
- Use unambiguous encoding (fixed-width fields or length prefixes) and domain separation so `H(a || b)` cannot be reinterpreted.

### Commit-reveal in Solidity

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SealedBid {
    mapping(address => bytes32) public commitments;
    uint256 public immutable revealStart;

    constructor(uint256 _revealStart) { revealStart = _revealStart; }

    function commit(bytes32 c) external {
        require(block.timestamp < revealStart, "commit phase over");
        commitments[msg.sender] = c;
    }

    function reveal(uint256 bid, bytes32 salt) external {
        require(block.timestamp >= revealStart, "reveal not started");
        bytes32 expected = keccak256(abi.encode(msg.sender, address(this), block.chainid, bid, salt));
        require(commitments[msg.sender] == expected, "bad opening");
        delete commitments[msg.sender];
        _recordBid(msg.sender, bid);
    }
}
```

Binding the commitment to `msg.sender`, contract address and chain ID prevents another user from copying a commitment and revealing it as their own, and prevents cross-chain replay. Use `abi.encode` (not `abi.encodePacked` with multiple dynamic types) to avoid ambiguous encodings. Plan for non-revealers (deposits that are forfeited), since a party can refuse to open.

## Pedersen Commitments

In a prime-order group with generators `G` and `H` where nobody knows `log_G(H)`:

```text
C = v*G + r*H
```

- **Perfectly hiding**, computationally binding (binding breaks if someone learns `log_G(H)` or can compute discrete logs, for example with a large quantum computer).
- **Additively homomorphic**: `C(v1, r1) + C(v2, r2) = C(v1 + v2, r1 + r2)`.
- `H` must be generated with "nothing up my sleeve": hash-to-curve of a public string, never a random multiple of `G` chosen by a party.

Use in confidential transactions (Monero RingCT, Mimblewimble, Liquid): inputs and outputs are Pedersen commitments, and balance is checked by verifying that `sum(inputs) - sum(outputs) - fee*G` is a commitment to zero. Because values are modular, every output also needs a **range proof** (Bulletproofs / Bulletproofs+) proving `0 <= v < 2^64`; otherwise a negative value wraps around and creates money.

## Vector Commitments and Merkle Trees

A Merkle root commits to a vector of values with logarithmic-size openings (`log2(n)` hashes). Polynomial and inner-product-based vector commitments give smaller or constant-size proofs:

| Scheme | Proof size | Setup | Assumption |
|--------|------------|-------|------------|
| Merkle tree | O(log n) hashes | None | Hash function |
| KZG | Constant (1 group element) | Trusted setup (powers of tau) | Pairings, q-SDH |
| IPA (Bulletproofs-style, used in Verkle designs) | O(log n) | Transparent | Discrete log |
| FRI-based (STARKs) | O(log^2 n) hashes | Transparent | Hash function; plausibly post-quantum |

## KZG Polynomial Commitments

Commit to a polynomial `p(X)` of degree < `d` using a structured reference string `[tau^i]G1` for `i < d`, where `tau` is secret and destroyed:

```text
commit:  C = p(tau) * G1                            (computed from SRS, tau unknown)
open at z with y = p(z):
  q(X)   = (p(X) - y) / (X - z)
  proof  pi = q(tau) * G1
verify:  e(C - y*G1, G2) == e(pi, tau*G2 - z*G2)
```

- Constant-size commitment and proof, constant verification (two pairings).
- Security depends on nobody knowing `tau`: setups are multi-party ceremonies where a single honest participant suffices (the Ethereum KZG ceremony for EIP-4844 had over 140,000 contributions).
- Binding relies on pairing-based assumptions that are not post-quantum secure.

### EIP-4844 blobs

- Each blob is 4096 field elements of BLS12-381, interpreted as a polynomial in evaluation form.
- The block carries `versioned_hash = 0x01 || SHA256(kzg_commitment)[1:]`.
- The point evaluation precompile (address `0x0A`) verifies a KZG opening against a versioned hash, letting rollups prove facts about blob data that is not itself accessible to the EVM.
- Use `c-kzg-4844` or language bindings (go-kzg-4844, rust-kzg) with the official trusted setup file; never generate your own setup for mainnet use.

## Choosing a Scheme

| Need | Choose |
|------|--------|
| Simple commit-reveal (votes, bids, randomness) | Hash commitment with salt and context binding |
| Hidden amounts with arithmetic | Pedersen + range proofs |
| Membership proofs, light clients | Merkle trees (simple, post-quantum friendly) |
| Small proofs, data availability | KZG with ceremony SRS |
| Transparent setup, post-quantum concerns | FRI / hash-based commitments |

## Pitfalls

| Pitfall | Consequence |
|---------|-------------|
| No salt on low-entropy committed values | Brute-force reveals the value early |
| Commitment not bound to sender/context | Front-running by copying commitments |
| Pedersen `H` with known discrete log | Committer can open to any value |
| Pedersen values without range proofs | Inflation via modular wraparound |
| Self-generated KZG setup | Whoever knows `tau` can forge openings |
| Ambiguous encoding before hashing | Two different inputs share a commitment |

## Checklist

- [ ] Security property needed (hiding vs binding, post-quantum) identified
- [ ] Salts are 32 random bytes from a CSPRNG
- [ ] Commitments bound to sender, contract and chain where relevant
- [ ] Generators derived by hash-to-curve; setup from a public ceremony
- [ ] Range proofs accompany homomorphic value commitments
- [ ] Implementation uses audited libraries and official test vectors
