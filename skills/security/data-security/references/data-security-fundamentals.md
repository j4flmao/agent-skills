# Data Security Fundamentals

## Overview
Data security protects data throughout its lifecycle — at rest, in transit, and in use. It encompasses encryption, access controls, data classification, data loss prevention (DLP), tokenization, masking, and privacy compliance. Data security ensures confidentiality, integrity, and availability of data assets.

## Core Concepts

### Concept 1: Data Classification
Classify data by sensitivity to determine appropriate protection levels:
- **Public**: Information that can be freely shared (marketing materials, public documentation)
- **Internal**: Information that could cause minor harm if disclosed (internal policies, org charts)
- **Confidential**: Information that could cause significant harm (customer data, financial records)
- **Restricted**: Information that could cause severe harm (PII, payment card data, trade secrets)

### Concept 2: Encryption at Rest
Protect stored data against physical theft and unauthorized access:
- **Full disk encryption**: Encrypt entire storage volumes (LUKS, BitLocker)
- **Database encryption**: Transparent Data Encryption (TDE), column-level encryption
- **File-level encryption**: Encrypt individual files or objects (S3 SSE, Azure SSE)
- **Application-level encryption**: Encrypt data before storing in database
- **Key management**: Use KMS (AWS KMS, Azure Key Vault, GCP Cloud KMS) — never manage keys in application code

### Concept 3: Encryption in Transit
Protect data as it moves between systems:
- **TLS 1.2/1.3**: Required for all network communication — internal and external
- **mTLS**: Mutual TLS for service-to-service authentication and encryption
- **VPN/IPsec**: Encrypt all traffic between networks and remote users
- **SSH/SFTP**: Encrypted file transfers (no FTP, no Telnet)

### Concept 4: Data Loss Prevention (DLP)
Detect and prevent unauthorized data exfiltration:
- **Network DLP**: Monitor outbound traffic for sensitive data patterns
- **Endpoint DLP**: Monitor file operations, USB devices, clipboard, printing
- **Cloud DLP**: Monitor data in SaaS applications (DLP for Google Workspace, M365)
- **API DLP**: Monitor API responses for excessive data exposure

## Implementation Guide

### Step 1: Data Classification Framework
```yaml
data_classification:
  restricted:
    definition: "Severe harm if disclosed"
    examples: ["PII", "payment card data", "health records", "trade secrets"]
    controls:
      - "AES-256 encryption at rest"
      - "TLS 1.3 in transit"
      - "MFA required for access"
      - "Full audit logging"
      - "Data masking in non-production"
      - "Quarterly access reviews"
  confidential:
    definition: "Significant harm if disclosed"
    examples: ["customer records", "financial data", "employee data"]
    controls:
      - "AES-256 encryption at rest"
      - "TLS 1.2+ in transit"
      - "Access control with approval"
      - "Audit logging"
      - "Annual access reviews"
  internal:
    definition: "Minor harm if disclosed"
    examples: ["internal policies", "org charts", "project plans"]
    controls:
      - "Encryption at rest"
      - "TLS in transit"
      - "Basic access control"
  public:
    definition: "No harm if disclosed"
    examples: ["marketing materials", "public docs", "job postings"]
    controls:
      - "Integrity verification"
```

### Step 2: Encryption Implementation
```typescript
// Application-level encryption example
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { KMS } from '@aws-sdk/client-kms';

const kms = new KMS({ region: 'us-east-1' });

export class DataEncryption {
  async encrypt(data: string, kmsKeyId: string): Promise<string> {
    // Generate data key from KMS
    const { Plaintext, CiphertextBlob } = await kms.generateDataKey({
      KeyId: kmsKeyId,
      KeySpec: 'AES_256',
    });

    // Encrypt data with data key
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', Plaintext, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Return encrypted data key + IV + ciphertext + auth tag
    return JSON.stringify({
      encryptedKey: Buffer.from(CiphertextBlob).toString('base64'),
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: authTag.toString('base64'),
    });
  }

  async decrypt(encryptedPayload: string): Promise<string> {
    const { encryptedKey, iv, data, tag } = JSON.parse(encryptedPayload);

    // Decrypt data key with KMS
    const { Plaintext } = await kms.decrypt({
      CiphertextBlob: Buffer.from(encryptedKey, 'base64'),
    });

    // Decrypt data with data key
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Plaintext,
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
```

### Step 3: Data Masking for Non-Production
```python
# data_masking.py — Mask PII in non-production databases
import hashlib
import re

class DataMasker:
    """Mask sensitive data in non-production environments."""

    def mask_email(self, email: str) -> str:
        """Mask email: user@example.com → u***@example.com"""
        local, domain = email.split('@')
        return f"{local[0]}***@{domain}"

    def mask_phone(self, phone: str) -> str:
        """Mask phone: +1-555-123-4567 → +1-555-***-****"""
        return re.sub(r'\d{4}$', '****', phone)

    def mask_ssn(self, ssn: str) -> str:
        """Mask SSN: 123-45-6789 → ***-**-6789"""
        return re.sub(r'^\d{3}-\d{2}-', '***-**-', ssn)

    def mask_credit_card(self, card: str) -> str:
        """Mask card: 4111-1111-1111-1111 → ****-****-****-1111"""
        return re.sub(r'\d{4}-', '****-', card, count=3)

    def consistent_anonymize(self, value: str, salt: str = "") -> str:
        """Deterministic anonymization for referential integrity."""
        hash_input = f"{salt}:{value}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]
```

## Best Practices
- Classify all data at creation — apply appropriate controls based on classification
- Encrypt all data at rest with AES-256 and KMS-managed keys
- Require TLS 1.2+ for all data in transit — no unencrypted protocols
- Mask or anonymize sensitive data in non-production environments
- Implement DLP controls at network, endpoint, and cloud boundaries
- Use tokenization for payment card data (P2PE or vault-based)
- Regular key rotation — rotate KMS keys annually
- Monitor data access — log all access to sensitive data
- Implement data retention and deletion policies — don't keep data forever
- Back up encrypted data — ensure backup encryption keys are accessible

## Common Pitfalls
- No data classification — all data treated equally (over-protect public data, under-protect sensitive)
- Managing encryption keys in application code (use KMS, not hardcoded keys)
- TLS termination at load balancer with plaintext inside the network
- Unencrypted backups — backup tapes/disks stolen with plaintext data
- Data masking that can be reversed (consistent anonymization with same salt)
- No data retention policy — accumulating sensitive data indefinitely
- DLP rules too strict (blocks legitimate business) or too loose (misses real exfiltration)
- Encryption without key management — lost keys = lost data

## Key Points
- Classify data by sensitivity: public, internal, confidential, restricted
- Encrypt at rest (AES-256) and in transit (TLS 1.2+) — no exceptions
- Use KMS for key management — never manage keys in application code
- Mask sensitive data in non-production environments
- DLP protects against accidental and malicious data exfiltration
- Tokenize payment data to reduce PCI DSS scope
- Monitor and log all access to sensitive data
- Implement data lifecycle: classify → protect → retain → delete
