---
name: blockchain-cryptography
description: >
  Use this skill when asked about cryptographic primitives in blockchain, elliptic curve cryptography, hash functions, Merkle trees, digital signatures, zero-knowledge proofs, key derivation, BIP standards, and blockchain-specific crypto implementations. Languages: C++, Rust, Go, Python. Covers secp256k1, BN254, BLS12-381, Ed25519, SHA-256, Keccak-256, BLAKE2, Poseidon, Merkle trees (binary, Patricia, sparse, Verkle), ECDSA, Schnorr, BLS, threshold signatures (FROST, GG20), zk-SNARKs/STARKs/Bulletproofs, HD wallets (BIP-32/39/44), PSBT (BIP-174), and signature aggregation. Do NOT use for: general blockchain protocols (use blockchain-core), smart contract development (use blockchain-application), or standard web security cryptography outside blockchain.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, cryptography, security, phase-blockchain]
---

# blockchain-cryptography

## Trigger
"blockchain cryptography", "elliptic curve", "secp256k1", "BN254", "BLS", "Ed25519", "hash function blockchain", "Keccak-256", "SHA-256 blockchain", "Poseidon hash", "Merkle tree", "Merkle Patricia Trie", "Sparse Merkle Tree", "Verkle Trie", "ECDSA", "Schnorr signature", "BLS signature", "threshold signature", "FROST", "multi-sig", "aggregate signature", "zero-knowledge", "zk-SNARK", "zk-STARK", "Bulletproof", "circom", "Halo2", "BIP-32", "BIP-39", "BIP-44", "BIP-340", "PSBT", "BIP-174", "HD wallet", "key derivation", "cryptographic primitive", "signature scheme"

## Rules
1. Use secp256k1 for Bitcoin/EVM-compatible chains, Ed25519 for Solana/Near, BLS for Ethereum 2.0 aggregation
2. Prefer Poseidon hash for ZK-circuits (prover-friendly), Keccak-256 for EVM compatibility, BLAKE2 for general-purpose
3. Use BLS signatures for signature aggregation and threshold signing; ECDSA and Schnorr for individual signing
4. Always specify the elliptic curve (e.g., "over BN254" or "over BLS12-381") when discussing pairing-based crypto
5. For key management: BIP-32 HD derivation, BIP-39 mnemonic encoding, BIP-44 coin-type separation
6. PSBT (BIP-174) is the standard for multi-party transaction construction
7. Use the references in `references/` for deep technical detail

## Response Format
1. **Cryptographic primitive**: curve/hash/scheme + security level + performance characteristics
2. **Blockchain usage**: where and how this primitive is used in real blockchain networks
3. **Implementation details**: algorithm specifics, edge cases, optimization techniques
4. **Security considerations**: known attacks, parameter choices, implementation pitfalls

## References
- references/elliptic-curve-crypto.md — secp256k1, BN254, BLS12-381, Ed25519 curves
- references/hash-functions.md — SHA-256, Keccak-256, BLAKE2, Poseidon hashes
- references/key-derivation-management.md — BIP-32/39/44 HD wallets and PSBT
- references/merkle-trees.md — Binary, Patricia, sparse, and Verkle trees
- references/signature-schemes.md — ECDSA, Schnorr, BLS, threshold signatures
- references/zero-knowledge-deep.md — ZK-SNARKs, STARKs, and Bulletproofs

## Phase
blockchain → blockchain-cryptography
