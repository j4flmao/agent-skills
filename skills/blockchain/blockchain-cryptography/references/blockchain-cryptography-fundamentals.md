# Blockchain Cryptography Fundamentals

## Elliptic Curve Cryptography

### secp256k1
Used by Bitcoin, Ethereum (EOA), and all EVM chains. Curve equation: `y² = x³ + 7` over Fp where p = 2²⁵⁶ − 2³² − 2⁹ − 2⁸ − 2⁷ − 2⁶ − 2⁴ − 1. Provides ~128-bit security level. The generator point G is standardized; public key = private_key × G. ECDSA signatures use this curve with RFC 6979 deterministic nonces.

### Ed25519
Used by Solana, Near, Cardano. Based on Curve25519 twisted Edwards curve: `−x² + y² = 1 + dx²y²`. Provides ~128-bit security. Faster verification than secp256k1 (~0.05ms vs ~0.15ms). Deterministic signing by default (no random nonce needed). Supports batch verification.

### BLS12-381
Used by Ethereum 2.0 (consensus), Chia, Filecoin. Pairing-friendly curve with 381-bit field. Provides ~128-bit security. Supports signature aggregation (combine N sigs into 1). Requires Proof of Possession (PoP) to prevent rogue key attacks.

## Hash Functions

### SHA-256
Used by Bitcoin (double SHA-256 for transactions), many L2s. 256-bit output. ~30,000 constraints in ZK circuits.

### Keccak-256
Used by Ethereum (EVM), all EVM chains. 256-bit output. Used for address derivation, contract storage slot computation, event signatures.

### Poseidon
ZK-friendly hash. ~10 constraints per 256-bit hash in ZK circuits. Used in zk-SNARKs, Merkle trees in ZK systems. Not suitable as general-purpose hash (weaker collision resistance than SHA-256).

## Merkle Trees

### Binary Merkle Tree
Standard proof of inclusion with O(log n) proof size. Each leaf is hashed; internal nodes are hash of children. Root commits to entire data set.

### Merkle Patricia Trie
Used by Ethereum for state storage (account, storage, transaction tries). Branch nodes encode 16 children. Path compression reduces depth. Hex-prefix encoding for efficient key-path representation.

### Sparse Merkle Tree (SMT)
Full binary tree of depth 256. Empty leaves default to zero hash. Proves non-membership efficiently. Used by Celestia, rollup state commitments.

## Digital Signatures

### ECDSA
Elliptic Curve Digital Signature Algorithm. Sign: (r, s) where r = (k×G).x and s = k⁻¹×(hash + r×privkey) mod n. Verify: calculate u₁ = hash×s⁻¹, u₂ = r×s⁻¹, check (u₁×G + u₂×Q).x == r. Deterministic nonce via RFC 6979 prevents reuse attacks.

### Schnorr
Used in Bitcoin Taproot (BIP-340). Sign: s = k + e×privkey where e = hash(R || pubkey || message). Verify: s×G == R + e×Q. Supports signature aggregation (MuSig, FROST).

### BLS
Boneh-Lynn-Shacham. Sign: σ = privkey × H(m). Verify: e(σ, g₂) == e(H(m), Q). Aggregate: σ_agg = Σσ_i. Verify aggregate: e(σ_agg, g₂) == Πe(H(m_i), Q_i). Requires pairing-friendly curve (BLS12-381, BN254).

## Key Derivation (BIP-32)

### Hierarchical Deterministic Wallets
Master key from seed (BIP-39 mnemonic). Child key derivation: CKDpriv(parent, index) uses HMAC-SHA512 with chain code. Hardened derivation (index ≥ 2³¹) requires parent private key. Non-hardened allows public key derivation. Standard path: m / purpose' / coin_type' / account' / change / address_index.
