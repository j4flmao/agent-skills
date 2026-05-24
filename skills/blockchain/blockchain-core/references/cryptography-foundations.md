# Cryptography Foundations for Blockchain

## Hash Functions

### SHA-256 (Bitcoin)

```
Input ──> SHA-256 ──> 256-bit digest
Properties: preimage resistant, second preimage resistant, collision resistant
```

```cpp
// C++ — Bitcoin Core style SHA-256
#include <openssl/sha.h>
std::string DoubleSHA256(const std::string& data) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(data.data()),
           data.size(), hash);
    SHA256(hash, SHA256_DIGEST_LENGTH, hash);
    return BytesToHex(hash, SHA256_DIGEST_LENGTH);
}
```

### Keccak-256 (Ethereum)

```go
// Go — go-ethereum style
import "golang.org/x/crypto/sha3"

func Keccak256(data []byte) common.Hash {
    hash := sha3.NewLegacyKeccak256()
    hash.Write(data)
    return common.BytesToHash(hash.Sum(nil))
}
```

### BLAKE2 (Zcash, Decred, Cardano)

```rust
use blake2::{Blake2b512, Digest};
let mut hasher = Blake2b512::new();
hasher.update(data);
let result = hasher.finalize();
```

## Digital Signatures

### ECDSA (Bitcoin, Ethereum)

- **Curve**: secp256k1
- **Key size**: 32 bytes private, 33/65 bytes public (compressed/uncompressed)
- **Signature**: 70-72 bytes (r, s, v)

```go
// Go — elliptic curve signing
import "github.com/ethereum/go-ethereum/crypto"

func SignMessage(privateKey *ecdsa.PrivateKey, hash []byte) ([]byte, error) {
    return crypto.Sign(hash, privateKey)
}

func VerifySignature(publicKey *ecdsa.PublicKey, hash []byte, signature []byte) bool {
    return crypto.VerifySignature(
        crypto.FromECDSAPub(publicKey),
        hash,
        signature[:len(signature)-1], // remove recovery ID
    )
}
```

### EdDSA / Ed25519 (Solana, Cardano, Stellar, Polkadot)

- **Curve**: Curve25519
- **Key size**: 32 bytes
- **Signature**: 64 bytes
- **Key feature**: Deterministic, no random nonce (unlike ECDSA)

```rust
// Rust — Solana/ed25519-dalek
use ed25519_dalek::{Keypair, Signer, Verifier};

fn sign_tx(keypair: &Keypair, message: &[u8]) -> Vec<u8> {
    keypair.sign(message).to_bytes().to_vec()
}

fn verify_tx(public: &PublicKey, message: &[u8], signature: &[u8]) -> bool {
    public.verify(message, &Signature::from_bytes(signature).unwrap()).is_ok()
}
```

### BLS Signatures (Ethereum 2.0, Chia, Dfinity)

- **Property**: Signature aggregation — combine n signatures into one
- **Curve**: BLS12-381
- **Key feature**: Aggregation without revealing individual messages

```
σ_agg = σ_1 + σ_2 + ... + σ_n  (signature aggregation)
       │
       ▼
  Valid if e(g, σ_agg) = e(pk_1, H(m_1)) * ... * e(pk_n, H(m_n))
```

## Merkle Trees

### Binary Merkle Tree (Bitcoin)

```
         Root
       /       \
     H12       H34
    /   \     /   \
  H1    H2  H3    H4
  │     │   │     │
  Tx1   Tx2 Tx3   Tx4
```

```cpp
// C++ — Merkle proof verification
std::vector<uint8_t> ComputeMerkleRoot(const std::vector<Transaction>& txs) {
    std::vector<std::vector<uint8_t>> layer;
    for (const auto& tx : txs)
        layer.push_back(Hash256(tx.Serialize()));

    while (layer.size() > 1) {
        std::vector<std::vector<uint8_t>> nextLayer;
        for (size_t i = 0; i < layer.size(); i += 2) {
            if (i + 1 < layer.size())
                nextLayer.push_back(Hash256(layer[i] + layer[i + 1]));
            else
                nextLayer.push_back(layer[i]); // duplicate last element
        }
        layer = nextLayer;
    }
    return layer[0];
}
```

### Merkle Patricia Trie (Ethereum)

- **Structure**: Radix trie with Merkle hashing at each node
- **Node types**: Extension, Branch, Leaf
- **Purpose**: State storage (account balances, contract storage, transaction receipts)

```go
// Go — go-ethereum trie
type Trie struct {
    root  node
    db    Database
    cache *NodeCache
}

func (t *Trie) Get(key []byte) ([]byte, error) {
    path := keyToPath(key)
    n, err := t.get(t.root, path)
    if err != nil { return nil, err }
    if n == nil { return nil, nil }
    return n.(*leafNode).value, nil
}
```

## Zero-Knowledge Proofs

### zk-SNARKs (Zcash, zkSync)

- **Setup**: Requires trusted setup (ceremony)
- **Proof size**: Few hundred bytes
- **Verification time**: Milliseconds, constant
- **Uses**: Private transactions, scaling (zk-rollups)

### zk-STARKs (StarkNet, dYdX)

- **Setup**: Transparent (no trusted setup)
- **Proof size**: Tens to hundreds of kilobytes
- **Verification time**: Milliseconds
- **Uses**: Scalability, transparency

### Bulletproofs (Monero, Grin)

- **Setup**: Transparent
- **Proof size**: Logarithmic (~1.5 KB)
- **Uses**: Range proofs for confidential transactions

## Key Derivation (BIP-32 / BIP-39)

### HD Wallet Path

```
m / purpose' / coin_type' / account' / change / index
44' / 60' / 0' / 0 / 0  (Ethereum account 0)
44' / 501' / 0' / 0 / 0 (Solana account 0)
```

```rust
// Rust — HD key derivation (Solana / bip32)
use bip32::{XPrv, DerivationPath};

fn derive_wallet(seed: &[u8], path: &str) -> Result<Keypair, Error> {
    let derivation = DerivationPath::from_str(path)?;
    let child = XPrv::new(seed)?.derive_path(&derivation)?;
    Ok(Keypair::from_bytes(&child.private_key().to_bytes())?)
}
```

## ECC Curve Comparison

| Curve | Key Size | Signature | Security Level | Use Case |
|-------|----------|-----------|---------------|----------|
| secp256k1 | 32 B | 70-72 B | 128-bit | Bitcoin, Ethereum |
| secp256r1 (P-256) | 32 B | 64-72 B | 128-bit | WebAuthn, Apple/Google |
| Ed25519 | 32 B | 64 B | 128-bit | Solana, Cardano, Polkadot |
| BLS12-381 | 48 B | 96 B | 128-bit | Eth2, Chia |
| BP256 (BN254) | 32 B | varies | 100-bit | ZK circuits (Ethereum) |
