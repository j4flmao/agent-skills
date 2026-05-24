# Signature Schemes in Blockchain

## Overview

| Scheme | Curve | Sig Size | Aggregation | Threshold | Blockchain Use |
|--------|-------|----------|-------------|-----------|----------------|
| ECDSA | secp256k1 | 64-65 bytes | No (naive) | No | Bitcoin, Ethereum |
| Schnorr (BIP-340) | secp256k1 | 64 bytes | Yes (MuSig2) | Yes | Bitcoin Taproot |
| BLS | BLS12-381 | 48-96 bytes | Yes (native) | Yes | Eth2, Filecoin |
| Ed25519 | Curve25519 | 64 bytes | No (Ristretto) | Yes (FROST) | Solana, Cardano |

## ECDSA (secp256k1)

Signature: (r, s) where r = (k·G)ₓ, s = k⁻¹(e + r·d) mod n.

### RFC-6979 Deterministic Nonces

```rust
use secp256k1::{SecretKey, Message, ecdsa::Signature};
use hmac::{Hmac, Mac};
use sha2::Sha256;

fn deterministic_nonce(privkey: &SecretKey, msg: &Message) -> SecretKey {
    // RFC-6979: k = HMAC-SHA256(privkey || msg)
    let x = privkey.secret_bytes();
    let h = msg.as_ref();
    let mut hmac = Hmac::<Sha256>::new_from_slice(b"RFC6979-NONCE").unwrap();
    hmac.update(&x);
    hmac.update(h);
    let k = hmac.finalize().into_bytes();
    SecretKey::from_slice(&k).unwrap()
}

fn ecdsa_sign_deterministic(secp: &Secp256k1<All>, sk: &SecretKey, msg: &Message) -> Signature {
    let nonce = deterministic_nonce(sk, msg);
    secp.sign_ecdsa_with_nonce(msg, sk, &nonce)
}
```

### ECDSA Malleability

Classic ECDSA: (r, s) and (r, n-s) are both valid. Bitcoin BIP-146 and Ethereum EIP-2 enforce low-s (s ≤ n/2) to prevent malleability.

### ECDSA in Solidity (ecrecover)

```solidity
function ecverify(bytes32 hash, bytes memory sig, address signer) internal returns (bool) {
    require(sig.length == 65, "invalid sig length");
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
        r := mload(add(sig, 32))
        s := mload(add(sig, 64))
        v := byte(0, mload(add(sig, 96)))  // 27 or 28 for recovery id
    }
    if (v < 27) v += 27;
    address recovered = ecrecover(hash, v, r, s);
    return recovered == signer;
}
```

## Schnorr (BIP-340)

Bitcoin Taproot (BIP-340/341/342). Signature: (r, s) where s = k + e·d, e = H(r || P || m).

### Batch Verification

```rust
fn schnorr_batch_verify(messages: &[Message], sigs: &[SchnorrSignature], pubs: &[XOnlyPublicKey]) -> bool {
    let secp = Secp256k1::new();
    // BIP-340 batch verification:
    // sigma(s_i * G) = sigma(R_i + e_i * P_i)
    // Uses random coefficients a_i to prevent cancellation attacks
    let mut rng = thread_rng();
    let total_s = sigs.iter()
        .zip(pubs.iter())
        .zip(messages.iter())
        .map(|((sig, pk), msg)| {
            let a = Scalar::random(&mut rng);  // random coefficient
            a * sig.s * G == a * sig.R + a * challenge_hash(pk, sig.R, msg) * pk
        })
        .all(|x| x);
    total_s
}
```

### MuSig2 Key Aggregation

```rust
fn musig2_aggregate(pks: &[PublicKey]) -> PublicKey {
    // MuSig2: P_agg = sum( a_i * P_i ) where a_i = H_agg(P_i, {P_1..P_n})
    let l = pks.iter().map(|pk| {
        let mut hasher = sha256::Hash::new();
        hasher.update(pk.serialize());
        for other in pks { hasher.update(other.serialize()); }
        Scalar::from_be_bytes(hasher.finalize())
    }).collect::<Vec<_>>();
    PublicKey::combine(pks.iter().zip(&l).map(|(pk, a)| pk.mul(*a)))
}
```

## BLS Signatures

Signature: σ = H(m)ˢᵏ ∈ G1. Verify: e(σ, g₂) = e(H(m), pk).

### Domain separation (EIP-2333)

```rust
fn bls_sign(sk: &SecretKey, msg: &[u8], dst: &[u8]) -> Signature {
    // Hash-to-G1 using expand_message_xmd (SHA-256)
    let point = G1Projective::hash_to_curve(msg, dst, &[]);
    let sig = point * sk;
    Signature::from(sig.to_affine())
}

fn bls_verify(pk: &PublicKey, msg: &[u8], sig: &Signature, dst: &[u8]) -> bool {
    let q = G1Projective::hash_to_curve(msg, dst, &[]);
    // e(H(m), pk) == e(sig, G2)
    let lhs = multi_miller_loop(&[(&q.to_affine(), &pk.to_affine())]);
    let rhs = multi_miller_loop(&[(&sig.to_affine(), &G2Affine::generator())]);
    lhs == rhs
}
```

### Signature Aggregation

```
Given sigs σ₁..σₙ from pubkeys pk₁..pkₙ on messages m₁..mₙ:
  Aggregated sig: σ_agg = Σ σ_i (G1 addition)
  Verification:   e(H(m₁), pk₁) · e(H(m₂), pk₂) · ... = e(σ_agg, g₂)
```

### Rogue key defense

Without POP: attacker publishes pk_attack = g₂ˣ · pk_honest⁻¹. Their "signature" combined with honest signature verifies for any message.

```rust
fn pop_prove(sk: &SecretKey, dst: &[u8]) -> ProofOfPossession {
    // POP = sk * H_pop(pk)
    let pk = sk.to_public_key();
    let point = G2Projective::hash_to_curve(&pk.to_compressed(), dst, &[]);
    ProofOfPossession { sigma: point * sk }
}

fn pop_verify(pk: &PublicKey, pop: &ProofOfPossession, dst: &[u8]) -> bool {
    let q = G2Projective::hash_to_curve(&pk.to_compressed(), dst, &[]);
    e(H_pop(pk), pk) == e(pop.sigma, G2)  // always verify POP before aggregating
}
```

## Threshold Signatures

| Scheme | Rounds | Setup | Signers | Output Size |
|--------|--------|-------|---------|-------------|
| FROST | 2-3 | DKG or trusted dealer | n ≥ t | 1 BLS/Schnorr sig |
| GG20 | 4 | Paillier-based DKG | n ≥ t | 1 ECDSA sig |
| CGGMP | 5 | Paillier + OT | n ≥ t | 1 ECDSA sig |

### FROST (Flexible Round-Optimized Schnorr Threshold)

```rust
struct FrostParticipant {
    id: u16,
    secret_share: Scalar,
    group_public_key: PublicKey,
    coefficient_commitments: Vec<PublicKey>,  // from DKG
}

// Round 1: each participant broadcasts nonce commitment
fn round1_commit(frost: &FrostParticipant) -> (Nonce, NonceCommitment) {
    let (hid, nonce) = Nonce::random();
    let commitment = NonceCommitment::from(&nonce);
    (nonce, commitment)
}

// Round 2: sign
fn round2_sign(
    frost: &FrostParticipant,
    nonce: &Nonce,
    other_commitments: &HashMap<u16, NonceCommitment>,
    msg: &[u8],
) -> SignatureShare {
    let binding = compute_binding_factor(frost.id, nonce, other_commitments, msg);
    let challenge = compute_challenge(&frost.group_public_key, &binding, msg);
    let s = frost.secret_share * challenge + binding;
    SignatureShare { id: frost.id, s }
}

fn aggregate(frost: &FrostParticipant, shares: &[SignatureShare]) -> Signature {
    // Lagrange interpolate at x=0
    let mut s = Scalar::ZERO;
    for share in shares {
        let lambda = lagrange_coefficient(share.id, &shares.iter().map(|s| s.id).collect());
        s += lambda * share.s;
    }
    Signature { r: compute_group_r(...), s }
}
```

## Multi-sig vs Threshold vs Aggregate

| Property | Multi-sig | Threshold | Aggregate |
|----------|-----------|-----------|-----------|
| Signers required | All n | Any t-of-n | n (independent) |
| On-chain size | n signatures | 1 signature | 1 signature |
| Setup | None | DKG or dealer | None |
| Key management | n separate keys | Shamir shares | Independent keys |
| Privacy | Reveals all signers | Hides signer set | Reveals all signers |

## Security Considerations

1. **Nonce reuse**: In ECDSA, reusing k reveals private key trivially. In Schnorr, reusing k across different messages with the same R leaks the private key. Always use RFC-6979 or fresh randomness.
2. **Rogue key attack (BLS/MuSig)**: Defend with POP (BLS) or key aggregation coefficients (MuSig2).
3. **Related-key attacks**: Ed25519's clamping prevents low-order component attacks. ECDSA does not have this protection natively.
4. **Signature malleability**: ECDSA (r, s → r, n-s). Schnorr signatures are unique (non-malleable by design). BLS has unique signatures if hash-to-curve is deterministic.
5. **Side channels**: Scalar multiplication timing → use constant-time implementations (e.g., `secp256k1` with `--enable-module-constanttime`).
6. **Rogue key in threshold FROST**: Use DKG with publicly verifiable commitments. Never use plain "aggregate public keys" contract.
