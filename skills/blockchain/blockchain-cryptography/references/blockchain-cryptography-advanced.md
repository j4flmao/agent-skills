# Blockchain Cryptography Advanced Topics

## Threshold Cryptography

### FROST (Flexible Round-Optimized Schnorr Threshold)
- t-of-n threshold Schnorr signing
- 2-round signing protocol (preprocess + sign)
- Identifiable abort: if a signer misbehaves, they can be identified
- Requires distributed key generation (DKG)
- Library: frost-lib (Rust, Zcash Foundation)
- Security: UC-secure, proven in random oracle model

### GG20 (Groth-Gruber) vs CMP (Canetti-Makri-Pelay)
- GG20: Older threshold ECDSA, 2 rounds. Known vulnerability: malicious party can extract secret during signing via additive share manipulation.
- CMP (CGGMP21): Current standard, 4 rounds, UC-secure, no known extraction attacks.
- Both require Paillier encryption for ECDSA (not needed for Schnorr-based schemes).
- Recommendation: use CMP for ECDSA, FROST for Schnorr/EdDSA.

## Advanced Signature Aggregation

### MuSig2
- 2-round interactive Schnorr key aggregation
- Key aggregation: Q = ΣH(pubkey_i || L) × Q_i (with coefficient)
- Prevents rogue key attacks without proof of possession
- Used in Bitcoin Taproot for multi-sig
- Library: libsecp256k1-zkp (Blockset), rust-musig2

### BLS Aggregate Signatures
- Non-interactive aggregation (anyone can combine)
- Verification: e(σ_agg, g₂) == Π e(H(m_i), Q_i) over pairing
- Batch verification: aggregate multiple signature verifications into one
- Rogue key defense: require PoP π = H(Q || domain) × sk
- Used in Ethereum 2.0, Chia consensus

## Post-Quantum Cryptography

### CRYSTALS-Dilithium (ML-DSA, FIPS 204)
- Lattice-based signature scheme (Module-LWE)
- Security reduction to Module-SIS/SLWE
- Signature size: ~4,592 bytes (vs 64 for ECDSA)
- Verification speed: ~0.2ms (on modern CPU)
- No aggregation support (active research via KKW/KRW)
- Standardized by NIST August 2024 (FIPS 204)

### FALCON (FN-DSA, FIPS 205)
- Lattice-based (NTRU)
- Signature size: ~1,333 bytes (compact, vs 4,592 for Dilithium)
- Verification speed: ~0.1ms (fastest post-quantum)
- Implementation complexity: very high (floating-point arithmetic in verification)
- Standardized by NIST alongside Dilithium

### SPHINCS+ (SLH-DSA, FIPS 205)
- Stateless hash-based signature
- No lattice assumptions (security from hash functions only)
- Signature size: ~8,888 bytes (largest of the three)
- Slow signing (~10ms), fast verification (~0.1ms)
- Conservative choice: security assumption is minimal

## ZK Proof Systems

### Groth16
- 3 elements (2 G1, 1 G2) = ~130-256 bytes
- Verification: 1 pairing equation (3 pairings) = ~200K gas on EVM
- Proving time: ~1s per constraint (depends on circuit size)
- Trusted setup required (one per circuit)
- Most gas-efficient option for on-chain verification

### PLONK
- Proof size: ~1-2 KB
- Verification: ~500K gas on EVM
- Universal trusted setup (one size fits all circuits up to N constraints)
- Custom gates for circuit-specific optimizations
- Better for circuits that need updating

### STARK (FRI-based)
- Proof size: ~50-100 KB (large)
- No trusted setup (transparent)
- Post-quantum secure
- Verification: ~1M gas on EVM (~5ms)
- Best for: large computation, quantum-safe needs, no setup ceremony

## Hash-to-Curve (IETF draft-irtf-cfrg-hash-to-curve)

### Methods
- **Simplified SWU**: For ordinary curves (secp256k1, P-256, BLS12-381 G1)
- **Icart's method**: For supersingular curves
- **Elligator**: For curves with specific properties (Curve25519, Ed448)

### Domain Separation
Each protocol must use a unique Domain Separation Tag (DST) for hash-to-curve operations:
- `"ETH2_BLS_POP_"` for Ethereum 2.0 BLS PoP
- `"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_"`
- DST prevents cross-protocol replay of hash-to-curve outputs

## EVM Precompile Crypto Operations

### ecrecover (0x01)
- Input: 128 bytes (hash, v, r, s)
- Gas: 3,000
- Output: 20-byte address (recovered from signature)
- Returns address(0) on invalid signature
- Always check return != address(0) in Solidity
- Malleability: use ecrecover with lower-s form (s ≤ n/2)

### BN254 Pairing (0x08)
- Base cost: 45,000 gas
- Per-pairing cost: 34,000 gas
- Computing e(P₁, Q₁) × e(P₂, Q₂) × ... × e(Pₙ, Qₙ)
- Returns 1 if product equals 1 in GT (identity element)
- Used for BLS verification, zk-SNARK verification

## Cryptographic Nonce Generation

### RFC 6979 (Deterministic ECDSA)
- k = HMAC-SHA256(private_key || message_hash)
- Process: generate via HMAC-DRBG seeded with private key + message hash
- Same message + same key = same nonce (deterministic)
- Prevents nonce reuse even with bad RNG
- Implementation: OpenSSL's ECDSA_sign with nonce_type = NIST

### Entropy Sources
- OS-provided: /dev/urandom, CryptGenRandom, getrandom()
- Hardware: TPM, secure element, hardware wallet TRNG
- Never use: Math.random(), time(), PID-based, or user-generated input
- Minimum entropy: 256 bits for key generation, 128 bits for nonce

## EIP-2333 / EIP-2334 (Ethereum 2.0 Key Derivation)

### Validator Key Derivation
- Master seed (BIP-39) → EIP-2333 withdrawal key
- Withdrawal key → signing key via `derive_child_signing_key(withdrawal_sk, index)`
- Signing key = `(withdrawal_sk × H(lamport_privkey || prefix))` mod curve_order
- Path: `m/12381/3600/validator_index/0/0`
- Supports voluntary exit: withdraw key signs exit message, signing key signs attestation
