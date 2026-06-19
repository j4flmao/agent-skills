# Encryption Key Management

## KMS Services
| Provider | Service | Key Types | HSM Support | Auto-rotation | Pricing |
|----------|---------|-----------|-------------|---------------|---------|
| AWS | KMS + CloudHSM | Symmetric, asymmetric, FIPS | CloudHSM | Annual | Per key + per request |
| Azure | Key Vault + Managed HSM | RSA, EC, AES, symmetric | Managed HSM | Per key config | Per key + per operation |
| GCP | Cloud KMS + EKM | Symmetric, asymmetric, HSM | Cloud HSM | Per key config | Per key version + per operation |
| HashiCorp | Vault Enterprise | Transit key, symmetric, asymmetric | Vault HSM | Vault policy | Per license |

## Key Hierarchy
```
Master Key (KMS CMK) — rarely used, HSM-protected
    ↓
Key Encryption Key (KEK) — encrypts data keys
    ↓
Data Encryption Key (DEK) — encrypts actual data
```

## Key Rotation Strategy
- Rotate master keys annually (or per compliance requirement)
- Rotate data keys with every write (envelope encryption)
- Automated rotation via KMS auto-rotation
- Maintain key versions for decryption of old data
- Test key rotation process — ensure old data remains accessible

## Key Points
- Use cloud KMS — never manage encryption keys in application code
- Implement key hierarchy: master key → KEK → DEK
- Rotate master keys annually, data keys per write
- Use HSM for high-security environments (FIPS 140-2 Level 3)
- Log all key usage for audit
- Test key rotation and disaster recovery procedures
- Backup keys with secure key escrow
