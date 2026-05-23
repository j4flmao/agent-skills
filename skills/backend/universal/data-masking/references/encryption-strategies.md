# Encryption Strategies

## Field-Level Encryption

Encrypt sensitive fields in the database. The application encrypts/decrypts transparently.

```python
from cryptography.fernet import Fernet

cipher = Fernet(KEY)

def encrypt_ssn(ssn: str) -> bytes:
    return cipher.encrypt(ssn.encode())

def decrypt_ssn(token: bytes) -> str:
    return cipher.decrypt(token).decode()
```

**Advantages**: Granular control, encrypted at rest.  
**Trade-off**: Cannot index encrypted fields (use deterministic encryption for lookups).

## Deterministic vs Randomized Encryption

| Type | Property | Use |
|------|----------|-----|
| AES-SIV (deterministic) | Same input = same output | Lookup by encrypted field |
| AES-GCM (randomized) | Unique per encryption | Content fields |
| HMAC | One-way | Search tokens |

## Tokenization

Replace sensitive data with a non-sensitive token (surrogate). Store the mapping separately.

```python
tokens = {
    "tok_abc123": {"type": "ssn", "value": "123-45-6789"},
}

def tokenize(value: str, field_type: str) -> str:
    token = f"tok_{secrets.token_hex(8)}"
    vault.set(token, {"type": field_type, "value": value})
    return token
```

## Anonymization

Irreversible transformation. Suitable for analytics.

- **Hashing**: SHA-256 of identifier + salt (k-anonymity risk).
- **K-anonymity**: Generalize until each row is indistinguishable from k-1 others.
- **Differential privacy**: Add Laplacian noise to aggregates.

## Key Management

- Never hardcode keys. Use a KMS (AWS KMS, HashiCorp Vault).
- Key rotation: re-wrap data keys, re-encrypt fields incrementally.
- Envelope encryption: data encrypted with DEK, DEK encrypted with KEK.
