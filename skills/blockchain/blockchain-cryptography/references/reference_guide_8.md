# Cryptographic Library Selection, Testing and Audit Checklist

Most cryptographic failures in blockchain software are implementation failures: hand-rolled primitives, missing validation, timing leaks, and incompatible encodings. This reference lists vetted libraries per language, the validation every implementation must perform, how to test with standard vectors, and a review checklist for audits.

## Vetted Libraries

| Language | Curves / signatures | Hashing | Notes |
|----------|---------------------|---------|-------|
| C | libsecp256k1 (Bitcoin Core), blst (BLS12-381), libsodium (Ed25519/X25519) | libsodium, OpenSSL 3.x | libsecp256k1 is constant time and heavily reviewed |
| Rust | `k256`, `secp256k1` (bindings), `ed25519-dalek`, `blst`, `ark-*` (arkworks) | `sha2`, `sha3`, `blake3` | RustCrypto crates; check audit status per crate |
| Go | `github.com/decred/dcrd/dcrec/secp256k1/v4`, go-ethereum `crypto` (libsecp256k1 via cgo), `crypto/ed25519`, `github.com/supranational/blst` | `crypto/sha256`, `golang.org/x/crypto/sha3` | Standard library `crypto/ecdsa` has no secp256k1 |
| TypeScript / JS | `@noble/curves`, `@noble/hashes`, `@scure/bip32`, `@scure/bip39` | `@noble/hashes` | Audited, dependency-free; used by ethers v6 and viem |
| Python | `coincurve` (libsecp256k1), `cryptography`, `py_ecc` (reference only), `pycryptodome` (Keccak) | `hashlib`, `pycryptodome` | `py_ecc` is not constant time; do not use for production keys |
| Solidity | OpenZeppelin `ECDSA`, `SignatureChecker`, `MerkleProof`, `MessageHashUtils`, `EIP712`, `P256` | `keccak256`, `sha256` precompile | P-256 verification via RIP-7212 precompile where available, with Solidity fallback |

Selection criteria:
- Maintained, with security advisories published and a disclosure process.
- Independent audit of the version you use.
- Constant-time handling of secret data.
- Used by major projects (more scrutiny).
- Minimal dependencies.

## Validation Every Implementation Must Do

| Input | Validation |
|-------|------------|
| Public key (ECDSA/ECDH) | On the curve, not the point at infinity, in the correct subgroup (cofactor curves) |
| Scalar / private key | `1 <= d < n` |
| ECDSA signature | `1 <= r, s < n`; enforce low-`s` where malleability matters |
| Schnorr (BIP-340) | `r < p`, `s < n`, x-only key lifts to a point with even y |
| Ed25519 | Reject non-canonical encodings and small-order points where your protocol requires strict verification (ZIP-215 vs RFC 8032 rules differ; choose deliberately for consensus) |
| BLS signatures | Subgroup checks on G1/G2 points; proof of possession or message augmentation against rogue-key attacks in aggregation |
| Hash inputs | Unambiguous encoding, domain separation tags |
| Field elements (ZK, KZG) | Canonical, `< modulus` |

Consensus code must also agree bit-for-bit across clients: a validation difference between implementations (for example accepting a signature one client rejects) is a chain-split bug.

## Constant-Time Requirements

Operations on secrets must not branch or index memory based on secret values:

- Scalar multiplication with secret scalars (key generation, signing, ECDH).
- Comparison of MACs, tags and secrets: use constant-time comparison (`hmac.compare_digest`, `crypto.timingSafeEqual`, `subtle.ConstantTimeCompare`).
- Modular inversion of the nonce in ECDSA.

Tools: `dudect`-style statistical timing tests, `ctgrind`/Valgrind memcheck tricks, compiler output review for critical paths. Remember that JavaScript and Python cannot guarantee constant time; keep high-value signing in native libraries, HSMs or hardware wallets.

## Test Vectors

| Source | Covers |
|--------|--------|
| BIP-32, BIP-39, BIP-340, BIP-341, BIP-327, BIP-173/350 test vectors | HD derivation, mnemonics, Schnorr, Taproot, MuSig2, Bech32/Bech32m |
| RFC 6979 appendix | Deterministic ECDSA nonces |
| RFC 8032 | Ed25519 |
| RFC 9380 | Hash-to-curve |
| RFC 9591 | FROST |
| Ethereum consensus-specs and execution-spec-tests | BLS, SSZ, precompiles, KZG (EIP-4844) |
| Project Wycheproof (C2SP) | Edge cases and known attacks for ECDSA, ECDH, EdDSA, AEADs |

```python
# Example: run BIP-340 vectors against your implementation (CSV from the BIPs repo)
import csv
from my_schnorr import verify  # implementation under test

with open("test-vectors.csv", newline="") as f:
    for row in csv.DictReader(f):
        pk = bytes.fromhex(row["public key"])
        msg = bytes.fromhex(row["message"])
        sig = bytes.fromhex(row["signature"])
        expected = row["verification result"] == "TRUE"
        assert verify(pk, msg, sig) == expected, f"vector {row['index']} failed"
```

## Property-Based and Differential Testing

- **Round-trip properties**: `verify(pk, m, sign(sk, m))` is true; decode(encode(x)) == x.
- **Negative properties**: flipping any bit of signature, message or key makes verification fail.
- **Differential testing**: compare your implementation with a reference library over random inputs, including malformed encodings.
- **Fuzzing**: fuzz parsers (transactions, signatures, public keys, Merkle proofs) with libFuzzer, cargo-fuzz, Go native fuzzing or Foundry invariant/fuzz tests for contracts.

## Smart Contract Specifics

- Use OpenZeppelin `MerkleProof` with leaves double-hashed (`keccak256(bytes.concat(keccak256(abi.encode(...))))`) to prevent second-preimage attacks where an inner node is presented as a leaf.
- Never implement `ecrecover` wrappers yourself; see the signature verification reference.
- Precompile availability differs across EVM chains (for example BLS12-381 from EIP-2537, P-256 from RIP-7212/EIP-7951); check per chain and handle absence.
- Gas cost of on-chain cryptography is part of the security model: verification that can exceed block gas limits can be used for denial of service.

## Key Storage

| Tier | Storage |
|------|---------|
| Highest value (treasury, validator withdrawal keys) | HSM, hardware wallets, offline signing, threshold/multisig |
| Operational hot keys | Cloud KMS/HSM with policy, or TSS; secp256k1 support varies by KMS (AWS KMS supports `ECC_SECG_P256K1` signing) |
| Developer and test keys | Generated per environment, never reused in production |

Never keep production private keys in environment variables, source code, CI logs or container images.

## Audit Checklist

- [ ] Only vetted libraries; versions pinned; advisories monitored
- [ ] No custom primitives or "improved" variants of standard schemes
- [ ] All validation rules in the table above enforced
- [ ] Constant-time operations on secrets; constant-time comparisons
- [ ] CSPRNG for all keys, salts and nonces (or RFC 6979 / BIP-340 derivation)
- [ ] Domain separation for every hash use
- [ ] Standard test vectors and Wycheproof cases pass in CI
- [ ] Differential and fuzz testing for parsers and verifiers
- [ ] Key storage tier matches value at risk
- [ ] Consensus-relevant validation identical across implementations
