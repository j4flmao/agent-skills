---
description: "j4flmao/rules — Mandatory cryptographic security standards (Deprecation & Post-Quantum awareness)"
glob: "*"
---

# Cryptographic Deprecation & Safety

Cursor/AI MUST follow these rules when writing code that involves hashing, encryption, signatures, or secrets.

## 1. Forbidden Hash Functions (Security Contexts)
- **Rule**: NEVER use `MD5` or `SHA-1` for anything security-relevant: signatures, certificates, integrity against an attacker, tokens, key derivation, or passwords. Both have practical collision attacks (SHA-1: SHAttered 2017, chosen-prefix 2020).
- **Exception**: Non-security interop only (legacy checksums, cache keys, Git object IDs). Mark it explicitly, e.g. Python `hashlib.md5(data, usedforsecurity=False)`.
- **Action**: Default to `SHA-256`, `SHA-384`, `SHA-512/256`, `SHA-3`, or `BLAKE2`/`BLAKE3`. For keyed integrity use `HMAC-SHA-256`, never `hash(secret + data)` (length-extension).

## 2. Asymmetric Cryptography
- **Rule**: NEVER generate RSA keys below 2048 bits. RSA-1024 has been disallowed by NIST (SP 800-131A) since 2013; it is not publicly factored yet, but is within reach of well-resourced attackers. Use ≥ 3072 bits for keys that must stay secure past 2030.
- **Rule**: Never use raw/textbook RSA or PKCS#1 v1.5 encryption. Use `OAEP` (SHA-256) for encryption and `PSS` for signatures.
- **Action**: Prefer `Ed25519` (signatures) and `X25519` (key agreement) for new designs. Where long-term confidentiality against "harvest now, decrypt later" matters, use hybrid post-quantum key exchange (e.g. `X25519MLKEM768`, ML-KEM per FIPS 203); PQ signatures are ML-DSA (FIPS 204) / SLH-DSA (FIPS 205).

## 3. Symmetric Encryption
- **Rule**: Use an AEAD only: `AES-256-GCM` or `ChaCha20-Poly1305`. Never ECB; never CBC/CTR without a separate MAC.
- **Rule**: GCM nonces (96-bit) MUST never repeat under the same key. With random nonces, rotate the key well before 2^32 messages.
- **Why AES-256**: Grover's algorithm gives a quadratic speedup on key search, so AES-256 keeps ~128-bit post-quantum security. AES-128 remains acceptable today; default to AES-256 for long-lived sensitive data.

## 4. Password Hashing
- **Rule**: NEVER store passwords with a fast hash (SHA-256, SHA-512, even salted).
- **Action**: Use `Argon2id` (first choice; OWASP minimum m=19 MiB, t=2, p=1), `scrypt`, or `bcrypt` (cost ≥ 10; inputs are truncated at 72 bytes). If FIPS compliance is required, use `PBKDF2-HMAC-SHA256` with ≥ 600,000 iterations. Use the library's encoded hash format so salt and parameters are stored with the hash.

## 5. Randomness, Comparison, Keys
- **Rule**: Generate keys, tokens, and nonces only with a CSPRNG (`secrets` in Python, `crypto.randomBytes`/`crypto.getRandomValues` in JS, `crypto/rand` in Go). Never `Math.random()` / `random`.
- **Rule**: Compare MACs and tokens in constant time (`hmac.compare_digest`, `crypto.timingSafeEqual`, `subtle.ConstantTimeCompare`).
- **Rule**: Never implement primitives yourself. Use vetted libraries (libsodium, Go `crypto`, `cryptography` for Python, Web Crypto, Tink). Never hardcode keys; load them from a KMS/secret manager.
