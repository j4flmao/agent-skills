---
name: blockchain-cryptography
description: >
  Use this skill when asked about cryptographic primitives in blockchain, elliptic curve cryptography, hash functions, Merkle trees, digital signatures, zero-knowledge proofs, key derivation, BIP standards, and blockchain-specific crypto implementations. Languages: C++, Rust, Go, Python. Covers secp256k1, BN254, BLS12-381, Ed25519, SHA-256, Keccak-256, BLAKE2, Poseidon, Merkle trees (binary, Patricia, sparse, Verkle), ECDSA, Schnorr, BLS, threshold signatures (FROST, GG20), zk-SNARKs/STARKs/Bulletproofs, HD wallets (BIP-32/39/44), PSBT (BIP-174), and signature aggregation. Do NOT use for: general blockchain protocols (use blockchain-core), smart contract development (use blockchain-application), or standard web security cryptography outside blockchain.
version: "1.2.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [blockchain, cryptography, security, phase-blockchain]
---

# Blockchain Cryptography

## Purpose
Guide the selection, implementation, and optimization of cryptographic primitives specific to blockchain systems. This skill enforces correct curve selection, signature scheme choice, and key management practices across all major blockchain protocols.

## Agent Protocol

### Trigger
"blockchain cryptography", "elliptic curve", "secp256k1", "BN254", "BLS", "Ed25519", "hash function blockchain", "Keccak-256", "SHA-256 blockchain", "Poseidon hash", "Merkle tree", "Merkle Patricia Trie", "Sparse Merkle Tree", "Verkle Trie", "ECDSA", "Schnorr signature", "BLS signature", "threshold signature", "FROST", "multi-sig", "aggregate signature", "zero-knowledge", "zk-SNARK", "zk-STARK", "Bulletproof", "circom", "Halo2", "BIP-32", "BIP-39", "BIP-44", "BIP-340", "PSBT", "BIP-174", "HD wallet", "key derivation", "cryptographic primitive", "signature scheme", "pairing-based cryptography", "post-quantum", "ecrecover", "EIP-712", "EIP-191", "RFC 6979", "KAT", "known-answer test", "nonce reuse", "signature malleability", "MuSig2", "threshold signing", "DKLs", "CGGMP", "aggregate signature", "hash-to-curve", "ICP", "Internet Computer"

### Input Context
- Cryptographic operation (signing, verification, hashing, proof generation)
- Blockchain platform (Ethereum/Bitcoin/Solana/Cosmos)
- Security level requirement (128-bit / 192-bit / 256-bit)
- Performance constraints (verification throughput, gas budget)
- Key management model (single key, HD wallet, multi-sig, threshold)
- Threat model (passive/active, quantum-resistant needed?)

### Output Artifact
Cryptographic architecture specification including:
- Selected primitives with curve/parameter justifications
- Implementation approach with library recommendations
- Security analysis with known attack vectors and mitigations
- Performance benchmarks and optimization strategies

### Response Format
1. **Cryptographic primitive**: curve/hash/scheme + security level + performance characteristics
2. **Blockchain usage**: where and how this primitive is used in real blockchain networks
3. **Implementation details**: algorithm specifics, edge cases, optimization techniques
4. **Security considerations**: known attacks, parameter choices, implementation pitfalls

### Completion Criteria
- Cryptographic primitive selection includes security level justification with NIST/BSI references
- Implementation plan specifies library, language, and optimization targets for on-chain or off-chain use
- Security analysis identifies known attack vectors (rogue key, small subgroup, timing side-channel)
- Performance benchmarks include verification latency and signature size comparison
- Key management design covers derivation path, backup, and recovery for the specific scheme

### Max Response Length
4000 tokens

## Workflow

### Phase 1: Primitive Selection
1. Identify required cryptographic operations (signing, hashing, commitment, proof generation)
2. Select elliptic curve based on blockchain platform and security requirements
3. Choose signature scheme (ECDSA for EVM, EdDSA for Solana/Near, BLS for aggregation)
4. Select hash functions (Keccak-256 for EVM, SHA-256 for Bitcoin, BLAKE2 for Zcash)
5. Determine if pairing-based crypto is needed (BLS aggregation, zk-SNARK verification)

### Phase 2: Security Parameter Validation
6. Verify security level meets minimum requirements (128-bit for standard, 192-bit for high security)
7. Validate subgroup membership for all curve operations
8. Confirm constant-time implementation for secret-dependent operations
9. Review against known attacks (invalid curve, small subgroup, timing, fault injection)
10. Check compliance with applicable standards (FIPS 186-5, BIP, NIST PQC)

### Phase 3: Implementation
11. Select library: libsecp256k1 (ECDSA), blst (BLS), ed25519-dalek (EdDSA), circom (ZK)
12. Implement key generation with proper entropy source and domain separation
13. Implement signing with deterministic nonce generation (RFC 6979 for ECDSA)
14. Implement verification with all validation checks (curve, subgroup, signature bounds)
15. Implement key management with BIP-32/39/44 derivation path standard

### Phase 4: Integration and Testing
16. Integrate with the target blockchain protocol or smart contract
17. Test with known-answer tests (KATs) from standards documents
18. Implement fuzz testing for edge cases (zero scalars, identity, large nonces)
19. Cross-verify with independent implementations
20. Benchmark verification throughput and gas costs

## Architecture / Decision Trees

### Curve Selection

| Curve | Field Size | Security Level | Blockchain Usage | Key Type |
|---|---|---|---|---|
| secp256k1 | 256-bit | ~128-bit | Bitcoin, Ethereum (EOA), EVM chains | ECDSA |
| Ed25519 | 255-bit | ~128-bit | Solana, Near, Cardano | EdDSA |
| BLS12-381 | 381-bit | ~128-bit | Ethereum 2.0, Chia, Filecoin | BLS |
| BN254 | 254-bit | ~100-bit | EVM zk precompile, Zcash sprout | Pairing |
| P-256 (secp256r1) | 256-bit | ~128-bit | WebAuthn, Apple/Google passes | ECDSA |
| Curve25519 | 255-bit | ~128-bit | X25519 key exchange, Signal protocol | Diffie-Hellman |
| secq256k1 | 256-bit | ~125-bit | ZK-friendly secp256k1 (EVM proofs) | ECDSA/SNARK |
| Pallas/Vesta | 255-bit | ~128-bit | Mina, halo2 (Pasta curves) | PLONKish |
| BLS48 | 576-bit | ~256-bit | High-security BLS (rare) | BLS |

### Signature Scheme Decision Tree

```
Decide: Signature Scheme for Blockchain Protocol
├── Need EVM compatibility?
│   ├── YES → ECDSA over secp256k1
│   │   ├── Individual signing only
│   │   ├── Library: libsecp256k1 (Bitcoin Core)
│   │   ├── Gas cost: 21,000 base + ~2,000 per ecrecover
│   │   └── Nonce: RFC 6979 deterministic (prevents reuse)
│   └── YES + aggregation → BLS over BN254 (precompile)
│       └── Gas cost: ~25,000 per pairing check
├── Need high throughput + small keys?
│   ├── YES → Ed25519
│   │   ├── Multiple signatures per block
│   │   ├── Verification: ~0.05ms per signature
│   │   └── Library: ed25519-dalek (Rust), libsodium (C)
│   └── NO → Evaluate aggregation requirements
├── Need signature aggregation?
│   ├── Single-message → BLS over BLS12-381
│   │   ├── Use: Consensus signing, validator attestation
│   │   ├── Library: blst (C/Rust), herumi BLS
│   │   └── Rogue key protection: Proof of Possession
│   ├── Multi-message → BLS with PoP or Schnorr threshold
│   │   └── Use: Cross-chain IBC, bridge validation
│   └── Threshold only → FROST over Ed25519 or BLS
│       └── Library: frost-lib (Rust)
└── Need zero-knowledge compatibility?
    ├── Groth16/Bulletproofs → BN254 (EVM precompile)
    └── PLONK → BLS12-381 (more efficient PLONK arithmetization)
```

### Hash Function Decision Tree

```
Decide: Hash Function
├── EVM chain?
│   ├── Standard hashing → Keccak-256
│   ├── Contract storage → Keccak-256 (32-byte slots)
│   └── Merkle tree → Keccak-256 or SHA-256 (for L2)
├── Bitcoin-based?
│   ├── Transaction hashing → SHA-256d (double SHA-256)
│   ├── Address hashing → RIPEMD-160(SHA-256(pubkey))
│   └── Script hashing → SHA-256
├── ZK-circuits?
│   ├── Prover-friendly → Poseidon (low constraint count)
│   ├── Standard → SHA-256 (expensive in circuits)
│   └── Commitment → Pedersen hash
└── General purpose?
    ├── Fast hashing → BLAKE2b/BLAKE2s
    ├── Standard security → SHA-256
    └── Password hashing → Argon2 (not for on-chain)
```

### EVM Cryptographic Precompile Reference

| Address | Precompile | Gas Cost | Purpose |
|---|---|---|---|
| 0x01 | ecrecover | 3,000 | ECDSA public key recovery |
| 0x02 | SHA-256 | 60 + 12/word | SHA-256 hash |
| 0x03 | RIPEMD-160 | 600 + 120/word | RIPEMD-160 hash |
| 0x04 | identity | 15 + 3/word | Data copy |
| 0x05 | modexp | Variable (200-50,000+) | Modular exponentiation |
| 0x06 | ecadd (BN254) | 150 | BN254 point addition |
| 0x07 | ecmul (BN254) | 6,000 | BN254 scalar multiplication |
| 0x08 | ecpairing (BN254) | 45,000 base + 34,000/pair | BN254 pairing check |
| 0x09 | BLAKE2f | Variable | BLAKE2 compression |
| 0x0a | Point evaluation (EIP-4844) | 50,000 | KZG proof verification |
| 0x0b | P256VERIFY (P-256) | ~3,450 | secp256r1 signature verification |

## Common Pitfalls

1. **Non-deterministic ECDSA nonce reuse**: Reusing a nonce (k-value) across two ECDSA signatures reveals the private key. Always use RFC 6979 deterministic nonce generation.
2. **Missing subgroup checks**: Accepting points not in the correct subgroup of the elliptic curve enables small-subgroup attacks that leak secret key bits.
3. **Incorrect hash-to-curve domain separation**: Using the same domain separation tag across protocols enables cross-protocol signature replay attacks.
4. **Rogue key attacks in BLS without PoP**: Aggregating BLS signatures without proof of possession allows key cancellation and signature forgery.
5. **Timing side-channels in scalar multiplication**: Secret-dependent execution time in point multiplication leaks the private key through network timing.
6. **Weak entropy in key generation**: Insufficient entropy in the seed for BIP-39 or key generation allows brute-force of the key space.
7. **Using SHA-256 in zk-circuits**: SHA-256 is extremely expensive in ZK circuits (~30k constraints per invocation). Use Poseidon or Pedersen for ZK-friendly hashing.
8. **Integer overflow in scalar arithmetic**: Overflow in curve order arithmetic can cause signature malleability or key recovery (especially in EVM precompiles).
9. **Invalid curve point attacks**: Accepting points from an attacker that lie on a curve with different order (weaker security) than the intended curve.
10. **Ignoring post-quantum threat**: Deploying long-lived contracts or validators without planning for post-quantum migration creates existential risk.
11. **ECDSA signature malleability**: ECDSA signatures can be malleated (r, s) → (r, n-s) to produce a different valid signature for the same message. Use lower-s form (BIP-62/BIP-146).
12. **EIP-712 domain separator collision**: Using the same domain separator across different contracts allows cross-contract replay of typed signatures.
13. **Incorrect EIP-191 version byte**: Using wrong version byte (0x00 vs 0x01 vs 0x45) makes signed messages validate against different intended formats.
14. **Hash-to-curve using cofactor clearing incorrectly**: Improper cofactor clearing in hash-to-curve can produce points in small subgroups or invalid points.
15. **PSBT non-witness UTXO omission**: Not including full non-witness UTXO in PSBT for legacy inputs prevents hardware wallet from verifying the input.
16. **BIP-32 hardened derivation in non-hardened code**: Hardened derivation requires the private key, but some code tries to derive hardened paths from public key alone.
17. **Pairing target field mismatch**: Using G1×G2 pairings when G2×G1 is expected (or vice versa) produces incorrect verification.
18. **KRACK-like attacks in threshold signing**: Some threshold protocols (GG20) have known attacks where a compromised party can extract other parties' secret shares during signing.

## Best Practices

### Key Management
- Always use BIP-32 hierarchical deterministic derivation for wallet key management
- BIP-39 mnemonic seeds must use 12+ words (128+ bits of entropy) and standard wordlist
- BIP-44 path structure: `m/44'/coin'/account'/change/index`
- For Taproot: use BIP-86 path: `m/86'/coin'/account'/change/index`
- For validator keys (Ethereum 2.0): use EIP-2333 (BLS key derivation with `withdraw` prefix)
- Hardware wallet signing for all high-value key operations
- Regular key rotation schedule for validator and operator keys
- Sharded key storage with geographic distribution for critical keys
- Use SLIP-0010 for Ed25519 HD derivation (not BIP-32 which doesn't support Ed25519)

### Signature Verification
- Always validate signature bounds (r, s < curve order; s is low-s for ECDSA)
- Validate public key is on curve and in correct subgroup
- Use batched verification when verifying multiple signatures
- For EVM: prefer `ecrecover` precompile over custom Solidity ECDSA
- Constant-time comparison for signature validation to prevent timing attacks
- Use EIP-712 typed structured data for smart contract signatures (not raw `eth_sign`)
- Verify domain separator matches the verifying contract's chain ID and address

### Zero-Knowledge Implementation
- Use Groth16 for fixed-circuit proofs (most gas-efficient on EVM)
- Use PLONK for variable-circuit proofs (larger proof size, no trusted setup per circuit)
- Use Bulletproofs for range proofs and confidential transactions
- Always verify proof public inputs match the expected computation
- Reference audited implementations (circom, halo2, bellman)
- Use recursive proofs for batched verification (reduce on-chain cost)

### Elliptic Curve Operations
- Always validate point-on-curve before any scalar multiplication
- Use Montgomery ladder or window method for constant-time operations
- Precompute multiples for fixed-point multiplication (GLV method for secp256k1)
- Use Shamir's trick for multi-scalar multiplication (faster than separate)
- Validate infinity point as valid (not a failure condition)

### Cryptographic Audit Checklist
- [ ] Known-Answer Tests (KATs) pass against NIST/BSI/standard test vectors
- [ ] No secret-dependent branching (constant-time) in any operation using private key data
- [ ] ECDSA nonces generated deterministically per RFC 6979
- [ ] All points validated on-curve and in-correct-subgroup before operations
- [ ] BLS proof of possession verified before including public key in aggregation
- [ ] Domain separation tags are unique per protocol context
- [ ] Hash-to-curve uses approved method (IETF hash-to-curve v16+)
- [ ] BIP-32/BIP-39 implementation verified against standard test vectors
- [ ] ECDSA signatures use lower-s form (canonical encoding)
- [ ] EIP-712 domain separators include chain ID to prevent cross-chain replay
- [ ] Post-quantum awareness documented (with migration path)

### Implementation Security Patterns
- Use libsecp256k1 for secp256k1 (the reference implementation, constantly audited)
- Use blst for BLS12-381 (Supranational, audited, constant-time)
- For Ed25519 batch verification, use ed25519-dalek's `verify_batch` (batched scalar multiplication)
- For threshold ECDSA: prefer CMP protocol (CGGMP21) over GG20 (GG20 has known flaws)
- For threshold EdDSA: FROST (Flexible Round-Optimized Schnorr Threshold) is the standard
- For BLS threshold: use the BLS IETF draft specification with PoP
- Never implement custom pairing operations—always use audited libraries (bn256, blst, mcl)

## Compared With

| Aspect | Classical (ECDSA/EdDSA) | Pairing-Based (BLS) | Post-Quantum (Dilithium) |
|---|---|---|---|
| Signature size | ~64-71 bytes | ~48-96 bytes | ~4,592 bytes |
| Verification speed | ~0.05ms | ~2ms | ~0.2ms |
| Aggregation | Not supported | Native bilinear | Complex (KKW) |
| Key size | ~32-33 bytes | ~48-96 bytes | ~1,952 bytes |
| Quantum secure | No (Shor breaks) | No (Shor breaks) | Yes (lattice) |
| Maturity | Production (20+ years) | Production (10+ years) | Standardization (2024+) |
| Side-channel risk | Low (constant-time) | Medium (pairing complex) | High (lattice ops) |

## Signature Aggregation Schemes Compared

| Scheme | Rounds | Signers | Aggregation Type | Trust Model |
|---|---|---|---|---|
| BLS | 1 round | Unlimited | Signature + public key | PoP required |
| MuSig2 | 2 rounds | ~100 practical | Public key only | Key aggregation (no PoP) |
| FROST | 2-3 rounds | ~50 practical | Threshold | t-of-n, identifiable abort |
| ROAST | Round-optimized | Unlimited | Wraps any threshold scheme | Robust (handles faulty signers) |
| Bellare-Neven | 3 rounds | Unlimited | Public key only | No PoP, provably secure |

## Hash Function Comparison for ZK Circuits

| Hash | Constraints (per 256-bit) | Prover Time | Best For |
|---|---|---|---|
| Poseidon | ~10 | ~0.1ms | ZK-optimized, general purpose |
| Rescue | ~12 | ~0.15ms | ZK-optimized (Plonky2) |
| MiMC | ~5 | ~0.05ms | Smallest constraints (weak security at low rounds) |
| SHA-256 | ~30,000 | ~10ms | Compatibility with Bitcoin/Ethereum |
| Keccak-256 | ~25,000 | ~8ms | EVM compatibility |
| Blake2s | ~15,000 | ~5ms | General purpose, EVM precompile |
| Pedersen | ~2 | ~0.02ms | Only for commitments (not collision-resistant) |

## Merkle Tree Variants

| Type | Depth | Proof Size | Use Case |
|---|---|---|---|
| Binary Merkle | log2(n) | 32*log2(n) bytes | General proof of inclusion |
| Merkle Patricia Trie | Variable | O(log n) | Ethereum state storage |
| Sparse Merkle Tree | 256 | 256*32=8KB (can prune) | Identity, state commitments |
| Verkle Trie (IPA) | 8 (k=256) | ~1KB for 2^24 entries | Ethereum state (future) |
| Sparse Compact SMT | 256 | O(log n) with pruning | Celestia, rollup state |

## Performance Considerations

- **EVM ecrecover**: ~2,000-3,000 gas per signature recovery on mainnet
- **BN254 pairing**: ~25,000 gas per pairing check (precompile at 0x08)
- **BLS12-381 verification**: No native precompile; ~500,000+ gas via Solidity implementation
- **Ed25519 batch verification**: 1.5x faster than individual on modern CPUs with SIMD
- **Poseidon hash in zk-SNARKs**: ~10 constraints per hash vs. ~30,000 for SHA-256
- **Merkle proof verification**: O(log n) hashes; 256-bit hash = 32 bytes per level
- **HD wallet derivation**: BIP-32 hardened key derivation ~10x slower than non-hardened
- **Key generation**: Ed25519 fastest (~0.1ms), BLS12-381 slowest (~10ms with pairings)
- **BLS signature aggregation**: O(n) for n signatures, batch verification O(n) but 10x faster than individual
- **MuSig2 key aggregation**: O(n) for key setup, then single verification
- **EIP-712 signing**: ~0.5ms off-chain, ~20k gas on-chain for `ecrecover` + `ecrecover` match

## Operations & Maintenance

### Key Rotation
- Validator consensus keys: Rotate monthly or immediately if compromise suspected
- Governance multi-sig keys: Rotate quarterly with hardware wallet ceremony
- Hot wallet (operational) keys: Rotate weekly or use threshold signing with M-of-N
- Cold/treasury keys: Rotate annually with GPS-located ceremony recording
- BLS validator withdrawal keys: Must not rotate without exit + re-deposit (stake linked)

### Monitoring
- **Signature failure rate**: Spike may indicate network attack or implementation bug
- **Verification latency**: Degradation may indicate DoS or resource exhaustion
- **Key registration events**: Monitor for unauthorized key changes
- **Nonce reuse detection**: Scan blockchain for ECDSA signatures with identical `r` values
- **Pairing computation time**: Track on validators for resource planning
- **PSBT signing failures**: Cluster by signer to identify faulty hardware wallets

### Cryptographic Testing
- Run KATs on every deployment to verify implementation correctness
- Fuzz test with: zero scalars, infinity points, out-of-order field elements, large nonces
- Cross-verify: compare against independent library output (e.g., btcd vs libsecp256k1)
- Property-based tests: (sign → recover → verify) roundtrip must always pass

## Rules

1. Always use deterministic nonces for ECDSA signing (RFC 6979) to prevent private key leakage from nonce reuse
2. Validate point-on-curve and subgroup membership for all incoming ECC operations
3. Use BLS with Proof of Possession (PoP) to prevent rogue key aggregation attacks
4. Never implement custom cryptographic primitives—use audited, standardized libraries
5. Use domain separation tags (DST) that are unique to each protocol for hash-to-curve operations
6. Prefer Keccak-256 for EVM, SHA-256 for Bitcoin, BLAKE2 for general, Poseidon for ZK
7. All cryptographic comparisons must use constant-time equality checks
8. Key derivation must follow BIP-32/39/44/86 hierarchical deterministic path standards
9. Pairing-friendly curves: BN254 for EVM precompile, BLS12-381 for new consensus systems
10. Post-quantum signatures: use CRYSTALS-Dilithium for balanced, FALCON for compact
11. zk-proofs: Groth16 for fixed circuits (gas-efficient), PLONK for variable circuits (flexible)
12. Every implementation must pass Known-Answer Tests (KATs) from the relevant standard
13. Hash functions used in Merkle trees must have fixed output length for the entire tree
14. Threshold signatures: prefer FROST over GG20 for newer implementations (simpler, audited)
15. ECDSA signature malleability: use lower-s form as standardized in BIP-62/BIP-146
16. Never truncate hash outputs below 160 bits for blockchain address derivation
17. EIP-712 typed data signatures must include chain ID in domain separator
18. Hardware wallet signing must verify the displayed message against the raw bytes being signed
19. BLS signature aggregation must verify PoP before including any public key in the aggregate set
20. Use SLIP-0010 for Ed25519 HD derivation (BIP-32 does not support Ed25519 natively)
21. MuSig2 requires key aggregation with tweak support for Taproot output key construction
22. PSBT (BIP-174) must include full non-witness UTXO for legacy transaction inputs
23. Hash-to-curve implementations must follow IETF draft-irtf-cfrg-hash-to-curve v16
24. Cross-chain signature verification must prevent chain ID replay using domain separation
25. ZK proof verification on-chain must check all public inputs against contract state

## Implementation Examples

### ECDSA Signing (Rust — libsecp256k1)
```rust
use secp256k1::{Secp256k1, Message, SecretKey, PublicKey, Signature};
use sha3::{Keccak256, Digest};

fn sign_message(secret_key_bytes: &[u8; 32], message_bytes: &[u8]) -> Result<Vec<u8>, Error> {
    let secp = Secp256k1::new();
    let secret_key = SecretKey::from_slice(secret_key_bytes)?;
    let message = Message::from_slice(&Keccak256::digest(message_bytes))?;

    // Deterministic nonce per RFC 6979 (handled by libsecp256k1)
    let signature: Signature = secp.sign_ecdsa(&message, &secret_key);

    // Serialize as 65-byte [r || s || v] (Ethereum format)
    let mut serialized = signature.serialize_compact().to_vec();
    let rec_id = signature.serialize_der(); // recoverable signature
    serialized.push(rec_id[0]); // v = 27/28 or 35+chain_id*2

    Ok(serialized)
}

fn verify_signature(
    public_key_bytes: &[u8; 64], // uncompressed x || y
    message_bytes: &[u8],
    signature_bytes: &[u8; 65],  // r || s || v
) -> Result<bool, Error> {
    let secp = Secp256k1::new();
    let public_key = PublicKey::from_slice(&[0x04; public_key_bytes].concat())?;
    let message = Message::from_slice(&Keccak256::digest(message_bytes))?;
    let signature = Signature::from_compact(&signature_bytes[..64])?;

    // Additionally: verify low-s form (BIP-62/BIP-146)
    // Verify s <= n/2 (curve order / 2)
    let s = signature.serialize_compact()[32..64].to_vec();
    let n = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141";

    Ok(secp.verify_ecdsa(&message, &signature, &public_key).is_ok())
}
```

### BLS Signature Aggregation (Rust — blst)
```rust
use blst::min_pk::*;

fn aggregate_and_verify(
    public_keys: &[PublicKey],
    message: &[u8],
    signatures: &[Signature],
) -> bool {
    // Step 1: Verify proof of possession for each public key
    for pk in public_keys {
        let pop = pk.sign_pop(); // PoP is required for rogue-key defense
        if !pk.verify_pop(&pop) {
            return false;
        }
    }

    // Step 2: Aggregate public keys and signatures
    let aggregated_pk: AggregatePublicKey = AggregatePublicKey::aggregate(public_keys, false);
    let aggregated_sig: AggregateSignature = AggregateSignature::aggregate(signatures, false);

    // Step 3: Fast aggregate verification
    // This is ~10x faster than verifying N signatures individually
    aggregated_sig.verify(true, message, &[], &aggregated_pk.to_public_key(), false)
}
```

### Merkle Proof Verification (Solidity)
```solidity
contract MerkleVerifier {
    // Verify a Merkle inclusion proof
    // leaf: hash of leaf data
    // merkleRoot: expected root
    // proof: sibling hashes from leaf to root
    // flags: bitmask indicating left (0) or right (1) position per level
    function verify(
        bytes32 leaf,
        bytes32 merkleRoot,
        bytes32[] calldata proof,
        uint256 flags
    ) external pure returns (bool) {
        bytes32 computed = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            if ((flags >> i) & 1 == 0) {
                // Sibling is on the right: hash(left || right)
                computed = keccak256(abi.encodePacked(computed, proof[i]));
            } else {
                // Sibling is on the left: hash(sibling || computed)
                computed = keccak256(abi.encodePacked(proof[i], computed));
            }
        }

        return computed == merkleRoot;
    }
}
```

### EIP-712 Typed Data Signing (TypeScript + Solidity)
```typescript
// Off-chain signing (TypeScript — viem + ethers)
const domain = {
  name: "MyProtocol",
  version: "1",
  chainId: 1,
  verifyingContract: "0x1234..." as const,
};

const types = {
  Transfer: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

const message = {
  to: "0x5678...",
  amount: 100n,
  nonce: 0n,
  deadline: 1700000000n,
};

// Sign with wallet
const signature = await wallet.signTypedData(domain, types, message);
```

```solidity
// On-chain verification (Solidity)
contract EIP712Verifier is EIP712 {
    bytes32 private constant TRANSFER_TYPEHASH = keccak256(
        "Transfer(address to,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    mapping(address => mapping(uint256 => bool)) public usedNonces;

    function executeTransfer(
        address to,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Signature expired");
        require(!usedNonces[msg.sender][nonce], "Nonce used");

        bytes32 structHash = keccak256(
            abi.encode(TRANSFER_TYPEHASH, to, amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(digest, signature);
        require(signer == msg.sender, "Invalid signer");

        usedNonces[msg.sender][nonce] = true;
        // Execute transfer...
    }
}
```

### Hash-to-Curve (BLS12-381 — Rust)
```rust
use blst::*;
use sha2::{Sha256, Digest};

fn hash_to_curve(message: &[u8], dst: &[u8]) -> Result<Vec<u8>, String> {
    // IETF hash-to-curve (draft-irtf-cfrg-hash-to-curve v16)
    // Domain separation tag MUST be unique per protocol context
    let point = blst_p1_hash_to::hash_to(message, dst, &[]);

    // Compressed form: 48 bytes for BLS12-381 G1
    let mut compressed = [0u8; 48];
    point.compress(&mut compressed);
    Ok(compressed.to_vec())
}

// Example DST usage:
// Nonce signature DST: "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_"
// Proof of possession DST: "BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_"
```

### BIP-32 HD Wallet Derivation (TypeScript)
```typescript
import { secp256k1 } from '@noble/curves/secp256k1';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';

interface HDKey {
  privateKey?: Uint8Array;
  publicKey: Uint8Array;
  chainCode: Uint8Array;
  depth: number;
  index: number;
  parentFingerprint: number;
}

function ckdPriv(parent: HDKey, index: number): HDKey {
  const isHardened = index >= 0x80000000;

  // Hardened: serP(parent.publicKey) || ser32(index)
  // Non-hardened: serP(parent.publicKey) || ser32(index)
  const data = isHardened
    ? new Uint8Array([0x00, ...parent.privateKey!, ...toBytes32(index)])
    : new Uint8Array([...parent.publicKey, ...toBytes32(index)]);

  const I = hmac(sha512, parent.chainCode, data);
  const IL = I.slice(0, 32);
  const IR = I.slice(32, 64);

  // IL + parent private key (mod n)
  const childPriv = secp256k1.utils.addPrivateKeys(
    hexlify(parent.privateKey!),
    hexlify(IL)
  );

  return {
    privateKey: hexToBytes(childPriv),
    publicKey: secp256k1.getPublicKey(childPriv, true),
    chainCode: IR,
    depth: parent.depth + 1,
    index,
    parentFingerprint: fingerprint(parent.publicKey),
  };
}

// Derivation path: m/44'/60'/0'/0/0 (Ethereum account)
function derivePath(master: HDKey, path: string): HDKey {
  const parts = path.replace(/^m\//, '').split('/');
  let key = master;
  for (const part of parts) {
    const isHardened = part.endsWith("'");
    const index = parseInt(part) + (isHardened ? 0x80000000 : 0);
    key = ckdPriv(key, index);
  }
  return key;
}
```

### Post-Quantum Migration Path Strategy
```
Phase 1 (2024-2026): Hybrid signatures
  - Combine ECDSA + Dilithium in transaction authentication
  - Both signatures must validate for the transaction to be valid
  - Library: liboqs (C/Rust), pqcrypto-dilithium (Rust)

Phase 2 (2027-2032): NIST PQC standardization
  - CRYSTALS-Dilithium for general signatures (balanced size/speed)
  - FALCON for compact signatures (smaller proofs, slower verification)
  - SPHINCS+ for stateless hash-based (largest, but most trusted)

Phase 3 (2032+): Full quantum transition
  - Longer blocks (PQC signatures: 2-5KB vs 64-96 bytes classical)
  - Different UTXO/lock script models for quantum-safe addresses
  - Merkle-tree-based signature aggregation (reduce per-tx overhead)

Key concern: Harvest now, decrypt later attacks
  - Encrypting on-chain data that will be decrypted with quantum computers
  - High-value contracts (bridges, DAO treasuries) should use hybrid encryption
```

## References
- references/blockchain-cryptography-advanced.md — Blockchain Cryptography Advanced Topics
- references/blockchain-cryptography-fundamentals.md — Blockchain Cryptography Fundamentals
- references/elliptic-curve-crypto.md — Elliptic Curve Cryptography for Blockchain
- references/hash-functions.md — Hash Functions in Blockchain
- references/key-derivation-management.md — Key Derivation and Management
- references/merkle-trees.md — Merkle Trees in Blockchain
- references/pairing-based-cryptography.md — Pairing-Based Cryptography
- references/post-quantum-blockchain-crypto.md — Post-Quantum Blockchain Cryptography
- references/signature-schemes.md — Signature Schemes in Blockchain
- references/zero-knowledge-deep.md — Zero-Knowledge Proofs in Blockchain

## Handoff
blockchain-cryptography → blockchain-core (for protocol-level crypto integration)
blockchain-cryptography → blockchain-security (for cryptographic audit methodology)
blockchain-cryptography → blockchain-application (for zk-proof integration in contracts)
