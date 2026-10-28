# Threshold Signatures and MPC Wallets

Threshold signature schemes (TSS) let `t` of `n` parties jointly produce a signature without any party ever holding the full private key. The result is a normal signature, indistinguishable on-chain from a single-key one. This reference compares TSS with on-chain multisig, explains the main protocols (FROST, MuSig2, threshold ECDSA), and lists operational and security requirements.

## Multisig vs Threshold Signatures

| Aspect | On-chain multisig (Bitcoin script, Safe) | Threshold signatures (MPC/TSS) |
|--------|------------------------------------------|--------------------------------|
| Policy enforcement | By the chain (script or contract) | Off-chain, by the protocol and participants |
| On-chain footprint | Multiple signatures/keys visible (except Taproot script tricks) | One public key, one signature |
| Fees | Higher (more data) | Same as single-sig |
| Chain support | Chain-specific | Any chain using the same signature scheme |
| Signer rotation | Changes address (Bitcoin) or contract state (Safe) | Key refresh/reshare keeps the same public key |
| Auditability | Public | Requires off-chain logs |
| Implementation risk | Mature, simple | Complex protocols; several published implementation vulnerabilities |

Smart-contract wallets (Safe, ERC-4337 accounts) enforce policy transparently on EVM chains; TSS is attractive for cross-chain custody and for chains without programmable multisig.

## Shamir Secret Sharing Is Not TSS

Shamir's scheme splits a secret into `n` shares with threshold `t` using a degree `t-1` polynomial. Reconstructing the key to sign brings the whole key into one place, creating a single point of compromise. It is suitable for backup of a seed (for example SLIP-39), not for signing. TSS never reconstructs the key.

## Schnorr Threshold Protocols

### MuSig2 (BIP-327): n-of-n

- Aggregates `n` public keys into one key `X = sum(a_i * X_i)` with coefficients `a_i` that prevent rogue-key attacks.
- Two rounds: nonce exchange (can be preprocessed), then partial signatures.
- Produces a BIP-340 Schnorr signature usable for Taproot key-path spends.
- n-of-n only; combine with Taproot script paths for fallback policies.

### FROST (RFC 9591): t-of-n

- Flexible Round-Optimized Schnorr Threshold signatures; two signing rounds (first can be preprocessed).
- Key generation via a trusted dealer or a distributed key generation (DKG) protocol such as Pedersen DKG with proofs of knowledge.
- RFC 9591 defines ciphersuites for Ed25519, Ed448, ristretto255, P-256 and secp256k1; Bitcoin Taproot needs a BIP-340 compatible variant (x-only keys, even-y handling), which is specified separately.
- Signing aborts are identifiable: a misbehaving participant's share can be detected and excluded.

## Threshold ECDSA

ECDSA's nonce inversion (`k^-1`) is not linear, so threshold ECDSA needs heavier machinery: Paillier homomorphic encryption or oblivious transfer for multiplicative-to-additive conversion, plus zero-knowledge proofs.

| Protocol family | Notes |
|-----------------|-------|
| GG18 / GG20 (Gennaro-Goldfeder) | Widely deployed; several implementation attacks found (missing range proofs, Paillier key validation) |
| CGGMP21 (Canetti et al.) | Identifiable aborts, proactive security, UC-proven; successor in many libraries |
| DKLs (Doerner-Kondi-Lee-shelat) | OT-based, fast signing, used in several wallets |

Published issues (for example the 2023 "BitForge" disclosures and TSSHOCK) exploited missing zero-knowledge proof checks to extract keys from GG18/GG20 deployments. Requirements:
- Use maintained libraries that implement every specified proof (Paillier modulus proofs, range proofs, no small factors).
- Track advisories and upgrade; prefer protocols with security proofs and audits for the exact implementation.

## Key Lifecycle

| Phase | Requirement |
|-------|-------------|
| DKG | Each party verifies commitments and proofs; abort on any failure; authenticate channels |
| Storage | Shares in HSMs, secure enclaves, or encrypted with hardware-backed keys; different administrative domains per share |
| Signing | Authenticated, encrypted channels between parties; policy engine approves each request before parties participate |
| Refresh (proactive) | Periodically re-randomize shares without changing the public key, invalidating stolen old shares |
| Reshare | Change `t` or `n`, add or remove parties; old shares must be destroyed |
| Backup | Encrypted share backups under separate control; tested recovery |

## Policy and Governance

TSS moves policy off-chain, so the policy engine becomes critical:

- Each signer independently validates the transaction (destination allowlists, amount limits, velocity limits) before signing; do not let a single coordinator decide.
- Signers parse the raw transaction themselves rather than trusting a summary supplied by the requester.
- Log every signing request, approval and partial signature contribution to tamper-evident storage.
- Separate operational control: no single team or cloud account controls `t` shares.

## Nonce Handling

Threshold Schnorr protocols require fresh, single-use nonces. Rules:
- Generate nonces with a CSPRNG; never derive them deterministically from the message alone in multi-party settings.
- Bind preprocessed nonces to a session and delete them after use or on abort.
- Do not restore a signer from a backup that contains used nonce state.

## Testing

- Run the protocol's test vectors (RFC 9591 appendix, BIP-327 vectors).
- Fuzz message parsing between parties; malformed messages must abort, never fall back to weaker checks.
- Simulate malicious participants: wrong proofs, equivocation, replayed messages.
- Verify that produced signatures validate with standard single-key verifiers for the target chain.

## Choosing an Approach

| Situation | Recommended |
|-----------|-------------|
| EVM treasury with transparent policy | Smart-contract multisig (Safe) or account abstraction |
| Bitcoin cold storage with simple policy | Script multisig or Taproot with MuSig2 key path + script fallback |
| Multi-chain custody, same key scheme across chains | TSS (FROST for Schnorr/EdDSA chains, maintained threshold ECDSA for ECDSA chains) |
| Seed backup only | Shamir / SLIP-39, not TSS |

## Checklist

- [ ] Protocol has a security proof and the implementation an audit
- [ ] All zero-knowledge proofs and parameter validations enforced
- [ ] Shares stored in separate trust domains with hardware protection
- [ ] Independent transaction validation by each signer
- [ ] Proactive share refresh scheduled
- [ ] Nonces fresh, single use, deleted after use
- [ ] Advisories for the chosen library monitored
