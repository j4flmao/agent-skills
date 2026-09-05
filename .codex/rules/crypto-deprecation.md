---
description: "j4flmao/rules — Mandatory cryptographic security standards (Deprecation & Post-Quantum awareness)"
glob: "*"
---

# Cryptographic Deprecation & Safety

Cursor/AI MUST follow these rules when writing code that involves hashing, encryption, or digital signatures.

## 1. Strictly Forbidden Hash Functions
- **Rule**: NEVER generate code using `MD5` or `SHA-1`. They are cryptographically broken and vulnerable to collision attacks.
- **Action**: Default to `SHA-256`, `SHA-384`, or `SHA-3`.

## 2. Forbidden Asymmetric Encryption
- **Rule**: NEVER generate `RSA-1024` keys. They are trivially crackable. 
- **Rule**: Avoid generating raw RSA without padding. Always enforce `OAEP` padding for RSA encryption and `PSS` padding for signatures.
- **Action**: Prefer Elliptic Curve Cryptography (`Ed25519`, `X25519`) over RSA for new implementations due to better performance and security, UNLESS Post-Quantum algorithms are explicitly requested.

## 3. Post-Quantum Awareness (AES-256)
- **Rule**: When implementing symmetric encryption for highly sensitive data, default to `AES-256-GCM` rather than `AES-128`. Grover's algorithm halves the effective security bit-strength of symmetric ciphers. `AES-256` retains 128 bits of post-quantum security.

## 4. Password Hashing
- **Rule**: NEVER use standard cryptographic hashes (SHA-256) for passwords.
- **Action**: You MUST use computationally expensive key derivation functions: `Argon2id` (Primary choice), `scrypt`, or `bcrypt`.
