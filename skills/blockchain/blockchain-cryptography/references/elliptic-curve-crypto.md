# Elliptic Curve Cryptography for Blockchain

## Curve Overview

| Curve | Equation | Field Size | Order (bits) | Cofactor | Security (bits) | Primary Chains |
|-------|----------|-----------|-------------|----------|----------------|----------------|
| secp256k1 | y² = x³ + 7 | 256-bit prime | ~256 | 1 | 128 | Bitcoin, Ethereum, EVM chains |
| BN254 | y² = x³ + 3 | 254-bit prime | ~254 | 1 | 100-128 | Ethereum precompiles, ZCash |
| BLS12-381 | y² = x³ + 4 | 381-bit prime | ~381 (G1) | 1 (G1), ~2.5e-4 (G2) | 128 | Eth2, Filecoin, Chia |
| Ed25519 | -x² + y² = 1 + dx²y² | 255-bit prime | ~253 | 8 | 128 | Solana, Cardano, Near |

## secp256k1

Equation: y² = x³ + 7 (mod p), p = 2²⁵⁶ − 2³² − 2⁹ − 2⁸ − 2⁷ − 2⁶ − 2⁴ − 1

Generator G:
```
Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
```
Order n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

### Point Validation
- Verify y² ≡ x³ + 7 (mod p)
- Verify point ≠ identity element
- Verify [n]P = O (subgroup check — critical!)
- For secp256k1, cofactor = 1 so subgroup check reduces to non-infinity + on-curve

### ECDSA on secp256k1 (Go)

```go
import (
    "crypto/ecdsa"
    "crypto/elliptic"
    "crypto/rand"
    "crypto/sha256"
    "math/big"
)

func generateKey() (*ecdsa.PrivateKey, error) {
    return ecdsa.GenerateKey(elliptic.P256(), rand.Reader) // NOT secp256k1!
    // Use github.com/ethereum/go-ethereum/crypto/secp256k1 for actual secp256k1
}

func sign(priv *ecdsa.PrivateKey, msg []byte) (r, s *big.Int, err error) {
    hash := sha256.Sum256(msg)
    return ecdsa.Sign(rand.Reader, priv, hash[:])
}

func verify(pub *ecdsa.PublicKey, msg []byte, r, s *big.Int) bool {
    hash := sha256.Sum256(msg)
    return ecdsa.Verify(pub, hash[:], r, s)
}
```

### Schnorr (BIP-340) on secp256k1

BIP-340 modifies standard Schnorr: uses x-only public keys (lift_x), implicit y-parity, tagged hashes.

```rust
use secp256k1::{KeyPair, Message, Secp256k1, SchnorrSignature};
use sha2::{Sha256, Digest};

fn schnorr_sign(msg: &[u8], keypair: &KeyPair) -> SchnorrSignature {
    let secp = Secp256k1::new();
    // BIP-340 uses tagged hash: tagged_hash("BIP0340/challenge", ...)
    let message = Message::from_hashed_data::<sha256::Hash>(msg);
    secp.sign_schnorr(&message, keypair)
}

fn schnorr_verify(msg: &[u8], sig: &SchnorrSignature, pk: &XOnlyPublicKey) -> bool {
    let secp = Secp256k1::new();
    let message = Message::from_hashed_data::<sha256::Hash>(msg);
    secp.verify_schnorr(&sig, &message, &pk).is_ok()
}
```

Key aggregation for Schnorr (MuSig2): each signer contributes a nonce commitment, then a single combined signature `s = sum(s_i)` validates against combined key `P = sum(P_i)`.

## BN254 (aka BN256, alt_bn128)

Pairing-friendly Barreto-Naehrig curve. Embedded curve used in EVM precompiles at addresses 0x06, 0x07, 0x08.

- e: G1 × G2 → GT
- G1 over Fp (254-bit), G2 over Fp²
- Optimal ate pairing, Miller loop
- EVM precompile gas: ~35k for pairing check (0x08)
- Security: ~100-bit (estimated, reduced from 128 due to recent attacks on BN curves at 254-bit)

### Code: BN254 pairing check (EVM)

```solidity
// Calls ecpairing precompile 0x08
function pairingCheck(
    uint256[2] memory p1_x, uint256[2] memory p1_y,
    uint256[2] memory p2_x, uint256[4] memory p2_y
) internal returns (bool) {
    uint256[12] memory input;
    // encode G1 point (x, y)
    // encode G2 point (x_im, x_re, y_im, y_re)
    (bool success, bytes memory result) = address(0x08).staticcall(abi.encodePacked(input));
    return success && result.length == 32 && abi.decode(result, (uint256)) == 1;
}
```

## BLS12-381

Pairing-friendly curve family. 381-bit field. Target 128-bit security.

| Group | Element Size | Operations |
|-------|-------------|------------|
| G1 | 48 bytes (compressed) | Fast — used for signatures |
| G2 | 96 bytes (compressed) | Slow — used for public keys |
| GT | 576 bytes | Pairing output |

### BLS signature aggregation (Rust)

```rust
use bls_signatures::{PrivateKey, PublicKey, Signature, Serialize};

fn aggregate_signatures(sigs: &[Signature]) -> Signature {
    Signature::aggregate(sigs) // simple sum of G1 points
}

fn aggregate_public_keys(pks: &[PublicKey]) -> PublicKey {
    PublicKey::aggregate(pks) // sum of G2 points
}

fn verify_aggregate(agg_sig: &Signature, agg_pk: &PublicKey, msgs: &[&[u8]]) -> bool {
    // For distinct messages: proofs-of-possession must have been verified
    agg_sig.verify(agg_pk, msgs)
}
```

### Domain Separation Tags (DST)
BLS signatures MUST use domain separation:

```
# Ethereum 2.0 DSTs
DST_SIG = b"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_"
DST_POP = b"BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_"
```

## Ed25519

Edwards curve: −x² + y² = 1 + 486662x²y² (mod 2²⁵⁵ − 19)

- b = 256 bits, H = SHA-512
- Secret key: 32 bytes seed → SHA-512 → (clamp scalar, nonce prefix)
- Public key: 32 bytes (y-coordinate with sign bit)
- Deterministic: no RNG needed (unlike ECDSA)
- Cofactor 8 verification: `[8]sB = [8]R + [8]H(R,A,m)A`

### Ed25519 key generation + signing (Go)

```go
import "golang.org/x/crypto/ed25519"

func ed25519Example() {
    pub, priv, _ := ed25519.GenerateKey(nil)
    msg := []byte("blockchain txn")
    sig := ed25519.Sign(priv, msg)
    valid := ed25519.Verify(pub, msg, sig)
}
```

### Implementation Pitfalls

1. **Scalar clamping failure**: Ed25519 must clamp the scalar (clear low 3 bits, set high 2 bits) — unclamped scalars leak key material.
2. **Small subgroup attack**: Ed25519 cofactor 8 means low-order points exist. Multiply cofactor into verification to defend. Ed25519 does this by design (batch verification uses cofactor multiplication).
3. **Nonce reuse in ECDSA**: Two signatures with same nonce k leak the private key. Always use RFC-6979 deterministic nonce or CSPRNG.
4. **Point validation on untrusted input**: Check `on_curve()` before any scalar multiplication. Missing this enables twist attacks.
5. **BN254 security erosion**: BN curves with 254-bit field provide < 128-bit security. Use BLS12-381 for new systems.
6. **BLS rogue key attacks**: Without proof-of-possession (POP), an attacker can choose public key as a function of honest keys. Always verify POP before aggregating.

## Performance Comparison

| Operation | secp256k1 | BLS12-381 (G1) | Ed25519 |
|-----------|-----------|----------------|---------|
| KeyGen | ~50µs | ~80µs | ~30µs |
| Sign | ~50µs | ~150µs (msg expand) | ~30µs |
| Verify | ~3ms (single) | ~1.5ms (pairing) | ~80µs |
| Aggregate verify (100 sigs) | N/A | ~4ms (1 pairing + 1 exp) | ~1ms (batch) |
