# Encryption & Key Management

## Encryption at Rest

### AES-256
Industry standard for data at rest. Used by cloud providers for storage encryption.

- **Server-side encryption (SSE)**: Cloud provider manages encryption. SSE-S3 for S3, EBS encryption, RDS encryption.
- **Client-side encryption**: Encrypt before upload. Full control over key material. Use AWS SDK or client libraries.
- **Envelope encryption**: Encrypt data with data encryption key (DEK), then encrypt DEK with key encryption key (KEK). Enables key rotation without re-encrypting data.

### Implementation

```python
# KMS envelope encryption
import boto3

kms = boto3.client('kms')

# Generate DEK
response = kms.generate_data_key(
    KeyId='alias/my-key',
    KeySpec='AES_256'
)
plaintext_key = response['Plaintext']
encrypted_key = response['CiphertextBlob']

# Encrypt data with plaintext_key, discard it
# Store encrypted_key alongside encrypted data

# Decrypt: use encrypted_key to get plaintext_key
response = kms.decrypt(CiphertextBlob=encrypted_key)
plaintext_key = response['Plaintext']
```

### Cloud Provider Encryption
- **S3**: SSE-S3 (auto), SSE-KMS (with key), SSE-C (customer key)
- **EBS**: Default encryption with KMS key
- **RDS**: Encryption at rest with KMS
- **Redshift**: HSM or KMS encryption
- **BigQuery**: Default encryption at rest (AES-256)
- **Snowflake**: Tri-Secret Secure (AES-256)

## Encryption in Transit

### TLS Configuration

```yaml
tls:
  minimum_version: TLS 1.2
  preferred_version: TLS 1.3
  ciphers:
    - TLS_AES_128_GCM_SHA256
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
  certificates: managed_by_cert_manager
```

### mTLS
Mutual TLS for service-to-service. Both parties present certificates. Use for microservice communication within mesh.

## Key Management

### KMS (Key Management Service)

| Feature | AWS KMS | GCP Cloud KMS | Azure Key Vault |
|---------|---------|---------------|-----------------|
| Automatic rotation | 1 year | 90 days | Configurable |
| HSM backing | Option (Custom Key Store) | Cloud HSM | Managed HSM |
| BYOK | Yes | Yes | Yes |
| Key policy | IAM + resource policy | IAM | RBAC |

### KMS vs HSM

| Aspect | KMS | HSM |
|--------|-----|-----|
| Management | Fully managed | Customer-managed (or managed) |
| FIPS 140-2 | Level 2 (Level 3 with Custom Key Store) | Level 3 |
| Performance | Shared (rate limited) | Dedicated |
| Use case | General encryption | Regulatory, high-security |
| Cost | Low per key + API calls | High (dedicated hardware) |

### Key Rotation

```bash
# AWS KMS auto rotation
aws kms enable-key-rotation --key-id alias/my-key
# Manual rotation
aws kms rotate-key --key-id alias/my-key
```

## Key Hierarchy

```
Root Key (HSM or KMS managed)
└── Key Encryption Keys (KEKs)
    └── Data Encryption Keys (DEKs) 
        └── Encrypted data
```

- Root key: never leaves HSM/KMS
- KEKs: stored in KMS, encrypted by root key
- DEKs: stored with data, encrypted by KEK

## Compliance

- PCI DSS: encryption of cardholder data at rest and in transit
- HIPAA: encryption of ePHI at rest and in transit
- GDPR: encryption as technical measure for data protection
- SOC 2: encryption controls for confidentiality

## Best Practices

- Enable encryption by default for all storage services
- Use KMS automatic key rotation
- Separate keys by environment (dev/staging/prod)
- Grant least privilege access to keys
- Enable CloudTrail / audit logs for key usage
- Document key hierarchy and rotation schedule
- Test key recovery process regularly
