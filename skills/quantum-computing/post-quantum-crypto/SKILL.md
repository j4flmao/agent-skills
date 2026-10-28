---
name: post-quantum-crypto
description: >
  Use this skill when the user says 'post-quantum cryptography', 'PQC migration', 'quantum-safe', 'ML-KEM', 'ML-DSA', 'SLH-DSA', 'Kyber/Dilithium', 'harvest now decrypt later', 'crypto inventory', 'crypto agility', 'CNSA 2.0', 'Q-Day'. Plans the move to post-quantum cryptography: threat timing (Mosca), NIST standards and parameter choices, hybrid deployment, cryptographic inventory, prioritization, and crypto-agility. Do NOT use for: hands-on TLS/liboqs experiments (rnd/security/post-quantum-crypto-poc), how Shor's algorithm works (quantum-computing/shors-algorithm), or general crypto rules (.claude/rules/crypto-deprecation.md).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quantum-computing, post-quantum-crypto, pqc, ml-kem, ml-dsa, migration, crypto-agility]
---

# Post-Quantum Cryptography (PQC) Migration

## Purpose
A cryptographically relevant quantum computer (CRQC) running Shor's algorithm would break RSA, finite-field Diffie-Hellman, and elliptic-curve cryptography (ECDH, ECDSA, EdDSA). Nobody knows when one will exist, but data encrypted today can be recorded and decrypted later, and large systems take a decade to migrate. This skill turns that into a plan: what to replace, with which standardized algorithms, in what order, and how to stay agile.

## Agent Protocol

### Trigger
"post-quantum", "PQC", "quantum-safe", "ML-KEM", "ML-DSA", "SLH-DSA", "FN-DSA", "Kyber", "Dilithium", "harvest now decrypt later", "crypto inventory", "CNSA 2.0", "Q-Day".

### Input Context
- Systems and protocols in use (TLS, SSH, VPN/IPsec, code signing, PKI, tokens/JWT, data-at-rest encryption, HSMs).
- Data confidentiality lifetimes; regulatory regime (US federal/NSS, EU, financial).
- Vendor/library versions and upgrade cadence.

### Output Artifact
Risk-ranked inventory, target algorithms per use, hybrid/transition strategy, milestone plan, and agility requirements.

### Response Format
```
Asset: {system/protocol}  Primitive: {RSA-2048 key exchange|ECDSA P-256 sig|...}
Exposure: {HNDL confidentiality|signature forgery after CRQC}  Data lifetime: {years}
Mosca: x + y > z ? {yes/no}
Target: {X25519MLKEM768 | ML-DSA-65 | SLH-DSA | AES-256}  Mode: {hybrid|pure}
Dependency: {library/HSM/vendor version}  Milestone: {date}
```

### Completion Criteria
- [ ] Inventory covers protocols, libraries, certificates, HSMs, and third parties.
- [ ] Key exchange for long-lived confidential data prioritized (harvest-now-decrypt-later).
- [ ] Algorithms and parameter sets come from finalized standards.
- [ ] Hybrid strategy and fallback defined; crypto-agility built in.

## What Breaks and What Doesn't
| Primitive | Quantum impact | Action |
|---|---|---|
| RSA, DH, ECDH, ECDSA, EdDSA | Broken by Shor (polynomial time on a CRQC) | Replace with ML-KEM / ML-DSA / SLH-DSA (hybrid during transition) |
| AES, ChaCha20 | Grover gives at most a quadratic speedup on key search, hard to parallelize | AES-128 still acceptable per NIST; prefer AES-256 for long-lived/high-assurance data (CNSA 2.0 requires it) |
| SHA-2, SHA-3 | Quadratic-type speedups at most | SHA-256+ fine; SHA-384/512 for high assurance |
| HMAC, KDFs | Symmetric; same as above | Keep, use 256-bit keys |

## Standards (NIST)
| Standard | Algorithm | Type | Notes |
|---|---|---|---|
| FIPS 203 (Aug 2024) | ML-KEM-512/768/1024 (from CRYSTALS-Kyber) | KEM | ML-KEM-768 is the common default |
| FIPS 204 (Aug 2024) | ML-DSA-44/65/87 (from CRYSTALS-Dilithium) | Signature | General-purpose default |
| FIPS 205 (Aug 2024) | SLH-DSA (from SPHINCS+) | Hash-based signature | Conservative security assumption; large/slow signatures |
| FIPS 206 (forthcoming) | FN-DSA (from Falcon) | Signature | Small signatures; tricky floating-point implementation |
| SP 800-208 | LMS, XMSS | Stateful hash-based signatures | Firmware/code signing; state management is critical |
| Selected 2025 | HQC | KEM | Code-based backup to ML-KEM; standard in progress |

Size reality (bytes): ML-KEM-768 public key 1,184 / ciphertext 1,088 (X25519: 32/32). ML-DSA-65 public key 1,952 / signature 3,309 (Ed25519: 32/64). Protocols, certificate chains, and constrained devices must absorb this.

## Timing: Mosca's Inequality
If **x** (years data must stay secret) + **y** (years to migrate) > **z** (years until a CRQC), you are already late for that data. Since z is uncertain and recorded traffic is decryptable later, key exchange protecting long-lived secrets is the first priority; signatures matter for anything whose authenticity must hold after a CRQC exists (firmware roots of trust, long-lived certificates, legal documents).

Policy signals: NSA CNSA 2.0 sets PQ transition milestones for US national security systems through the early 2030s; NIST IR 8547 (draft, 2024) proposes deprecating quantum-vulnerable public-key algorithms after 2030 and disallowing them after 2035. Track the final versions applicable to you.

## Hybrid Deployment
- **Key exchange**: combine a classical and a PQ KEM so security holds if either is unbroken. In TLS 1.3 the deployed hybrid group is `X25519MLKEM768`, on by default in current major browsers, Cloudflare, OpenSSL 3.5+, and Go 1.24+.
- **Signatures**: WebPKI PQ certificates are not broadly deployed yet; internal PKI, code signing, and firmware can adopt ML-DSA/SLH-DSA or composite (dual) signatures sooner where you control verifiers.
- **SSH**: OpenSSH offers hybrid key exchange (`sntrup761x25519-sha512`, and `mlkem768x25519-sha256` in recent releases; the latter became the default in OpenSSH 10.0).

## Migration Program
1. **Inventory**: scan code, configs, certificates, TLS endpoints, SSH, VPNs, HSM/KMS key types, third-party SDKs; produce a cryptographic bill of materials (CBOM).
2. **Classify**: data lifetime, exposure (HNDL vs forgery), system lifetime (devices deployed for 15 years need PQ-capable roots now).
3. **Prioritize**: external key exchange for long-lived secrets → internal service mesh/VPN → long-lived signing roots → everything else.
4. **Upgrade dependencies**: TLS libraries, HSM firmware, cloud KMS features, PKI tooling.
5. **Deploy hybrid**, measure handshake size/latency and middlebox breakage (see the PoC skill).
6. **Crypto-agility**: algorithm identifiers in protocols and data formats, configurable algorithm choice, key rotation paths, no hardcoded key sizes.
7. **Verify**: CI checks for banned algorithms, monitoring of negotiated groups.

## Anti-Patterns
- Waiting for a "Q-Day" announcement.
- Rolling your own lattice crypto or KEM combiners.
- Pure PQ replacements of classical key exchange in production without hybrid during the transition.
- Ignoring third-party/vendor crypto in the inventory.
- Treating symmetric crypto as needing replacement.

## Checklist
- [ ] CBOM covering protocols, libraries, keys, certificates, vendors.
- [ ] Mosca assessment per data class.
- [ ] Hybrid key exchange enabled on external endpoints.
- [ ] PQ signature plan for long-lived roots and firmware.
- [ ] Library/HSM upgrade roadmap with owners.
- [ ] Crypto-agility requirements in architecture standards.

## References
- NIST FIPS 203, FIPS 204, FIPS 205; NIST SP 800-208; NIST IR 8547 (draft).
- NSA, "Commercial National Security Algorithm Suite 2.0" (CNSA 2.0).
- Mosca, "Cybersecurity in an era with quantum computers: will we be ready?" (IEEE S&P, 2018).
- Hands-on: `rnd/security/post-quantum-crypto-poc` skill.
