# Cryptography Foundations for Blockchain

> **Deep cryptography references → `blockchain-cryptography/`**

## Role of Cryptography in Blockchains

- **Hash functions**: Block linking (SHA-256 in Bitcoin, Keccak-256 in Ethereum), transaction merkleization, address derivation
- **Digital signatures**: Authentication of transactions (ECDSA secp256k1 for BTC/ETH, Ed25519 for Solana/Cardano/Polkadot, BLS for Ethereum 2.0 aggregation)
- **Merkle proofs**: Efficient state verification without full data (light clients, SPV, rollup fraud proofs)
- **Zero-knowledge proofs**: Privacy (Zcash), scalability (ZK-rollups), identity verification
- **Key derivation**: HD wallets (BIP-32), mnemonic encoding (BIP-39)

## Hash Functions by Blockchain

| Hash | Chains | Use |
|------|--------|-----|
| SHA-256d | Bitcoin | Block hashing, txid, PoW (double SHA-256) |
| Keccak-256 | Ethereum | Account addresses, state/tx/receipt roots, event topics |
| BLAKE2b | Zcash, Decred, Cardano | Equihash PoW, address hashing |
| SHA-512 | Solana | PoH sequence generation, tick verification |

## Digital Signatures by Blockchain

| Scheme | Curve | Chains | Key Feature |
|--------|-------|--------|-------------|
| ECDSA | secp256k1 | Bitcoin, Ethereum, BSC | 70-72 byte sigs, random nonce |
| EdDSA | Ed25519 | Solana, Cardano, Polkadot, Stellar | Deterministic, 64 byte sigs, fast verify |
| BLS | BLS12-381 | Ethereum 2.0, Chia, Dfinity | Signature aggregation, 48 B pubkeys |

## Merkle Structures by Blockchain

| Structure | Chains | Purpose |
|-----------|--------|---------|
| Binary Merkle Tree | Bitcoin | Transaction inclusion proof |
| Merkle Patricia Trie | Ethereum | Full state storage (accounts, storage, receipts) |
| Merkle Mountain Range | Grin/MW | Append-only accumulator |
| Sparse Merkle Tree | Solana, Near | Account state proof |

## Protocol-Level Integration

- **Block header chain**: Previous hash links → chain immutability
- **Transaction signatures**: Verify sender before state transition
- **Merkle proofs in light clients**: SPV verification via branch inclusion
- **Multi-sig**: M-of-N ECDSA/EdDSA for governance and bridge security
- **Validator signatures**: BLS aggregation for consensus efficiency

## References

- Elliptic curve crypto → `blockchain-cryptography/references/elliptic-curve-crypto.md`
- Hash functions → `blockchain-cryptography/references/hash-functions.md`
- Zero-knowledge proofs → `blockchain-cryptography/references/zero-knowledge-deep.md`
- HD wallets → `blockchain-cryptography/references/key-derivation-management.md`
- Merkle trees → `blockchain-cryptography/references/merkle-trees.md`
- Signature schemes → `blockchain-cryptography/references/signature-schemes.md`
