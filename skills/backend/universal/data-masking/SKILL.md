---
name: backend-data-masking
description: >
  Use this skill when the user says 'data masking', 'PII', 'personally identifiable information', 'encryption', 'anonymization', 'GDPR', 'CCPA', 'data privacy', 'field-level encryption', 'tokenization', 'redaction', 'data classification'. This skill masks, encrypts, and anonymizes sensitive data (PII) for GDPR/CCPA compliance. Applies to any backend stack. Do NOT use for: network-level encryption (TLS), firewall rules, or access control policies.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, data-masking, pii, encryption, gdpr, compliance]
---

# Backend Data Masking

## Purpose
Protect personally identifiable information (PII) using masking, encryption, tokenization, and anonymization techniques for GDPR/CCPA compliance.

## Agent Protocol

### Trigger
Exact user phrases: "data masking", "PII", "personally identifiable information", "encryption", "anonymization", "GDPR", "CCPA", "data privacy", "field-level encryption", "tokenization", "redaction", "data classification", "mask sensitive data".

### Input Context
- Data model — which fields contain sensitive data.
- Classification of each field (PII, PCI, PHI, internal).
- Regulatory requirements (GDPR, CCPA, HIPAA, PCI-DSS).

### Output Artifact
Data masking configuration or implementation code. No file unless requested.

### Response Format
```
Field: {field name}
Classification: {PII|PCI|PHI|Internal}
Protection: {mask|encrypt|tokenize|anonymize|redact}
```

### Completion Criteria
- [ ] All sensitive fields identified and classified.
- [ ] Protection strategy chosen per classification.
- [ ] Masking/encryption implemented at the application or database layer.
- [ ] Audit log of data access recorded.
- [ ] Right-to-deletion workflow for GDPR Article 17.

### Max Response Length
3 lines per field. 15 lines for full plan.

## Architecture Decision Tree

### Which Protection Strategy?

```
Is the data needed for business operations?
  ├── Yes → Does the business need the original value?
  │         ├── Yes → Encrypt (symmetric or asymmetric)
  │         └── No → Tokenize (map to surrogate value)
  ├── No → Is the data needed for display/UI?
  │         ├── Yes → Mask on read (partial display)
  │         └── No → Is the data needed for analytics?
  │                  ├── Yes → Anonymize (statistically useful, not reversible)
  │                  └── No → Redact (remove entirely)
```

### Where to Apply Protection?

```
Is the data at rest in a database?
  ├── Yes → Field-level encryption OR tokenization at write time
  ├── No → Is the data in transit in an API response?
  │         ├── Yes → Mask or redact at the presentation layer
  │         └── No → Is the data in logs?
  │                  ├── Yes → Redact entirely — never log PII
  │                  └── No → Is the data in a backup/export?
  │                           ├── Yes → Anonymize or encrypt
  │                           └── No → Apply at the closest boundary
```

## Workflow

### Step 1: Classify Data Fields
| Field | Classification | Protection |
|-------|---------------|------------|
| email | PII | Mask: j***@example.com |
| phone | PII | Mask: +1 (***) ***-1234 |
| credit_card | PCI | Tokenize |
| ssn | PII/Sensitive | Encrypt at rest + mask |
| diagnosis | PHI | Encrypt at rest |
| name | PII | Mask on UI, encrypt at rest |

### Step 2: Implement Masking
```javascript
function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(Math.max(local.length - 2, 0))}${local[local.length - 1]}@${domain}`;
}
// j@example.com  -> j******n@example.com
```

```python
def mask_email(email: str) -> str:
    local, domain = email.split('@')
    return f"{local[0]}{'*' * max(len(local) - 2, 0)}{local[-1]}@{domain}"

def mask_phone(phone: str) -> str:
    # +1234567890 -> +1******890
    return phone[:2] + '*' * (len(phone) - 5) + phone[-3:]
```

### Step 3: Implement Field-Level Encryption
```javascript
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.DATA_KEY, 'salt', 32);

function encryptField(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptField(ciphertext) {
  const [iv, authTag, encrypted] = ciphertext.split(':').map(s => Buffer.from(s, 'hex'));
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

### Step 4: Implement Tokenization
```javascript
async function tokenizeField(plaintext) {
  const token = crypto.randomUUID();
  await vaultStore.set(token, plaintext, { ttl: 86400 });
  return token;
}

async function detokenizeField(token) {
  return vaultStore.get(token);
}
```

### Step 5: Handle GDPR Deletion
```sql
-- Right to be forgotten — anonymize, do not delete
UPDATE users SET
  email = NULL,
  name = 'ANONYMIZED',
  phone = NULL,
  anonymized_at = NOW(),
  deletion_requested_at = NOW()
WHERE id = $1;
```

## Masking Techniques

### Character Masking
```javascript
// Show first/last characters, mask middle
function maskString(value, showFirst = 1, showLast = 1, maskChar = '*') {
  if (value.length <= showFirst + showLast) return value;
  return value.slice(0, showFirst) + 
         maskChar.repeat(value.length - showFirst - showLast) + 
         value.slice(-showLast);
}
// maskString('alice@example.com', 1, 1) -> 'a**************m'
```

### Format-Preserving Masking
Preserve the format while changing the value:
```javascript
function maskPreservingFormat(value) {
  return value.replace(/[a-zA-Z]/g, 'X').replace(/[0-9]/g, '9');
}
// 'john.doe@email.com' → 'XXXX.XXX@XXXXX.XXX'
```

### Conditional Masking
Mask based on user role or context:
```typescript
function maskByRole(user: User, viewer: Viewer): Partial<User> {
  const result = { ...user };
  if (viewer.role !== 'admin' && viewer.role !== 'support') {
    result.email = maskEmail(user.email);
    result.phone = maskPhone(user.phone);
    if (viewer.role === 'basic') {
      result.name = user.name.split(' ').map(n => n[0] + '***').join(' ');
    }
  }
  return result;
}
```

## Encryption Strategies

### Field-Level Encryption
| Aspect | AES-256-GCM | AES-256-CBC |
|--------|-------------|-------------|
| Authentication | Built-in (GCM) | Separate HMAC needed |
| IV size | 12 bytes | 16 bytes |
| Parallelizable | No | No |
| Recommended | Yes | Legacy only |

### Key Management
- Never store encryption keys in the codebase or environment variables
- Use a KMS (AWS KMS, HashiCorp Vault, Azure Key Vault)
- Rotate keys on a schedule (90 days recommended)
- Support key versioning for dual-write during rotation

```typescript
class KeyManager {
  async encrypt(plaintext: string): Promise<string> {
    const currentKey = await this.kms.getCurrentKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', currentKey.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Include key version for decryption routing
    return `${currentKey.version}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  async decrypt(ciphertext: string): Promise<string> {
    const [version, ivHex, tagHex, dataHex] = ciphertext.split(':');
    const key = await this.kms.getKeyByVersion(version);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
  }
}
```

## Production Considerations

### Performance Impact
| Operation | Latency Impact | Notes |
|-----------|---------------|-------|
| AES-256-GCM encrypt | ~50μs per field | Negligible for most apps |
| AES-256-GCM decrypt | ~50μs per field | Negligible for most apps |
| Tokenization | ~1-5ms (network calls) | Depends on vault latency |
| Masking | <1μs | No performance concern |
| KMS key retrieval | ~10-50ms | Cache keys with TTL |

### Cache Strategy
Cache encryption keys locally with a TTL to avoid KMS calls on every operation:
```typescript
class CachedKeyManager {
  private keyCache = new Map<string, { key: Buffer; expiresAt: number }>();

  async getKey(version: string): Promise<Buffer> {
    const cached = this.keyCache.get(version);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }
    const key = await this.kms.getKeyByVersion(version);
    this.keyCache.set(version, { key, expiresAt: Date.now() + 3600000 }); // 1 hour TTL
    return key;
  }
}
```

### Search on Encrypted Data
Searching encrypted fields requires special handling:
- **Deterministic encryption**: Same plaintext → same ciphertext (enables exact match but weaker security)
- **Searchable encryption**: Maintain a separate index of hashed values
- **Client-side decryption**: Search on the plaintext before encryption
- **Blind indexing**: Store a hash of the plaintext alongside the ciphertext

```typescript
// Blind index for email search
async function storeEmail(userId: string, email: string): Promise<void> {
  const encrypted = await encryptField(email);
  const blindIndex = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
  await db.query(
    'INSERT INTO users (id, email, email_blind_index) VALUES ($1, $2, $3)',
    [userId, encrypted, blindIndex]
  );
}

async function findByEmail(email: string): Promise<User | null> {
  const blindIndex = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
  const row = await db.query('SELECT * FROM users WHERE email_blind_index = $1', [blindIndex]);
  if (!row) return null;
  return { ...row, email: await decryptField(row.email) };
}
```

## Security

### Data Classification
| Classification | Examples | Protection Required |
|---|---|---|
| Public | Product names, prices | None |
| Internal | Employee emails, team names | Mask on external display |
| Confidential | Customer names, phone numbers | Encrypt at rest |
| Restricted | SSN, passport numbers, medical records | Encrypt + mask + audit |
| Regulated | Credit card numbers, health info | Tokenize + PCI/HIPAA controls |

### Audit Requirements
Log every access to classified data:
```typescript
async function readWithAudit(userId: string, fieldName: string): Promise<string> {
  const value = await getEncryptedField(userId, fieldName);
  await auditLog.write({
    action: 'READ_SENSITIVE_FIELD',
    userId,
    fieldName,
    timestamp: new Date(),
    reason: 'business_operation',
  });
  return value;
}
```

## Anti-Patterns

1. **Logging PII**: Never log raw PII. Use structured logging with PII automatically stripped.
2. **Shadow databases**: Unencrypted copies of production data in dev/test environments.
3. **Key in codebase**: Storing encryption keys in source control or environment variables.
4. **Inconsistent masking**: Masking in one API response but not another.
5. **Only masking at UI layer**: Masking on the frontend only — data is still exposed in API.
6. **Ignoring backups**: Backups contain sensitive data and must be encrypted.
7. **No key rotation**: Using the same encryption key forever.
8. **Cascading deletes**: Deleting related data when user requests deletion — anonymize instead.

## Rules
- Never log PII — ever. No exceptions.
- Use field-level encryption for highly sensitive data (SSN, diagnosis, financial).
- Mask data in API responses unless the caller has explicit need-to-know.
- Tokenization is preferred for PCI-DSS compliance.
- Encryption keys must be stored in a KMS, never in the codebase.
- Support the right to be forgotten: anonymize, do not cascade delete.
- Classify data at the schema level with database comments or tags.
- Audit every read of sensitive data.
- Encrypt backups and have key escrow for disaster recovery.
- Test masking/encryption with automated integration tests.

## References
  - references/data-classification.md — Data Classification
  - references/data-masking-audit.md — Data Masking Audit
  - references/data-masking-advanced.md — Data Masking Advanced Patterns
  - references/data-masking-compliance.md — Data Masking Compliance
  - references/data-masking-fundamentals.md — Data Masking Fundamentals
  - references/data-masking-performance.md — Data Masking Performance
  - references/data-masking-techniques.md — Data Masking Techniques
  - references/encryption-strategies.md — Encryption Strategies
  - references/masking-patterns.md — Data Masking Patterns
  - references/pii-classification-deep.md — PII Classification Deep Dive
  - references/pii-detection.md — PII Detection
## Handoff
No artifact produced unless requested.
Next skill: audit-logging — log all access to sensitive data for compliance.
Carry forward: data classification map, encryption strategy, tokenization approach.

## Implementation Patterns

### Data Masker Engine

```python
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
import re
import hashlib

class MaskingStrategy(Enum):
    REDACT = "redact"
    MASK = "mask"
    TOKENIZE = "tokenize"
    HASH = "hash"
    SHOW_LAST_4 = "show_last_4"
    EMAIL_MASK = "email_mask"
    DYNAMIC = "dynamic"

class DataMasker:
    def __init__(self):
        self.rules: Dict[str, Dict] = {}

    def add_rule(self, field_path: str, strategy: MaskingStrategy, params: Optional[Dict] = None):
        self.rules[field_path] = {
            "strategy": strategy,
            "params": params or {},
        }

    def mask(self, data: Dict) -> Dict:
        return self._mask_recursive(data, "")

    def _mask_recursive(self, data: Any, path: str) -> Any:
        if isinstance(data, dict):
            return {k: self._mask_recursive(v, f"{path}.{k}" if path else k) for k, v in data.items()}
        if isinstance(data, list):
            return [self._mask_recursive(item, path) for item in data]
        return self._apply_rule(path, data)

    def _apply_rule(self, path: str, value: Any) -> Any:
        if path not in self.rules:
            return value
        rule = self.rules[path]
        strategy = rule["strategy"]
        params = rule["params"]

        if strategy == MaskingStrategy.REDACT:
            return "[REDACTED]"
        elif strategy == MaskingStrategy.MASK:
            return self._mask_value(value, params.get("char", "*"), params.get("show_start", 0), params.get("show_end", 0))
        elif strategy == MaskingStrategy.TOKENIZE:
            return self._tokenize(value)
        elif strategy == MaskingStrategy.HASH:
            return self._hash_value(value)
        elif strategy == MaskingStrategy.SHOW_LAST_4:
            return self._show_last_4(value)
        elif strategy == MaskingStrategy.EMAIL_MASK:
            return self._mask_email(value)
        elif strategy == MaskingStrategy.DYNAMIC:
            func = params.get("function")
            if func and callable(func):
                return func(value)
            return value
        return value

    def _mask_value(self, value: str, char: str = "*", show_start: int = 0, show_end: int = 0) -> str:
        s = str(value)
        if len(s) <= show_start + show_end:
            return s
        visible = s[:show_start] + char * (len(s) - show_start - show_end) + (s[-show_end:] if show_end > 0 else "")
        return visible

    def _tokenize(self, value: str) -> str:
        import uuid
        return f"tok_{hashlib.sha256(value.encode()).hexdigest()[:16]}"

    def _hash_value(self, value: str) -> str:
        return hashlib.sha256(str(value).encode()).hexdigest()

    def _show_last_4(self, value: str) -> str:
        s = str(value)
        if len(s) <= 4:
            return s
        return "*" * (len(s) - 4) + s[-4:]

    def _mask_email(self, value: str) -> str:
        parts = str(value).split("@")
        if len(parts) != 2:
            return self._mask_value(value)
        name = parts[0]
        if len(name) <= 2:
            masked_name = name[0] + "*" * 3
        else:
            masked_name = name[:2] + "*" * 3
        return f"{masked_name}@{parts[1]}"
```

### PII Detection Pipeline

```python
from typing import Dict, List, Optional, Set
import re

class PIIDetector:
    def __init__(self):
        self.patterns = {
            "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            "phone_us": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
            "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
            "credit_card": r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b",
            "ip_address": r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
            "date_of_birth": r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
            "zip_code": r"\b\d{5}(?:-\d{4})?\b",
            "passport": r"\b[A-Z]{1,2}\d{6,9}\b",
            "driver_license": r"\b[A-Z]{1,2}\d{6,9}\b",
        }

    def detect(self, data: Dict, path: str = "") -> List[Dict]:
        findings = []
        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                findings.extend(self.detect(value, current_path))
        elif isinstance(data, list):
            for item in data:
                findings.extend(self.detect(item, path))
        elif isinstance(data, str):
            for pii_type, pattern in self.patterns.items():
                matches = re.findall(pattern, data)
                for match in matches:
                    findings.append({
                        "field_path": path,
                        "pii_type": pii_type,
                        "sample": self._sample(match),
                    })
        return findings

    def classify_field(self, field_name: str, field_value: str) -> Optional[str]:
        name_lower = field_name.lower()
        hints = {
            "email": ["email", "e-mail", "mail"],
            "phone": ["phone", "telephone", "mobile", "cell", "contact"],
            "ssn": ["ssn", "social", "social_security"],
            "credit_card": ["credit_card", "card_number", "cc", "card"],
            "password": ["password", "pass", "secret"],
            "name": ["name", "full_name", "first_name", "last_name"],
            "address": ["address", "street", "location"],
        }
        for pii_type, indicators in hints.items():
            if any(ind in name_lower for ind in indicators):
                return pii_type
        return None

    def _sample(self, value: str) -> str:
        if len(value) <= 8:
            return value[:3] + "..." + value[-3:]
        return value[:4] + "..." + value[-4:]
```

## Architecture Decision Trees

### Masking Strategy by Data Type

```
What type of sensitive data?
├── PII (personally identifiable)
│   ├── SSN, passport → Redact or show last 4
│   ├── Email → Mask local part, show domain
│   ├── Phone → Show last 4 digits
│   ├── Name → Full redaction or tokenization
│   └── Address → Tokenization for geocoding, redact for display
│
├── PHI (protected health information)
│   ├── Diagnosis codes → Redact or tokenize
│   ├── Medical record number → Hash with salt
│   └── Clinical notes → AI-based PII redaction
│
├── Financial data
│   ├── Credit card → Show last 4, tokenize for processing
│   ├── Bank account → Redact (never display)
│   └── Transaction amounts → Show with permissions
│
└── Authentication secrets
    ├── Passwords → Never log, never store in plaintext
    ├── API keys → Show first 4 chars only (for identification)
    └── Tokens → Full redaction in logs
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Masking before logging only | Data leaked in other channels | Mask at the source (API response, DB query) |
| Same masking for all roles | Over-redaction for authorized users | Role-based dynamic masking |
| No tokenization mapping loss | Can't reconstruct for legitimate use | Token vault with access audit |
| Masking but not encrypting backups | Data exposed at rest | Encrypt backups with KMS-managed keys |
| Manual field-by-field rules | Human error misses fields | Automated PII detection + rule engine |
| Storing masking config in code | Config access = data exposure | Store in config service with access control |

## Performance Optimization

- **Eager masking at query level**: Apply masking in SQL queries (PostgreSQL column-level encryption, views with masking). Avoids fetching and masking in application code.
- **Caching token mappings**: Use in-memory cache for frequently accessed token-to-value mappings. TTL-based expiration with proactive invalidation. Reduces token vault lookup latency by 90%.
- **Async PII detection pipeline**: Run PII detection asynchronously for new data ingestion. Use a work queue for large batch processing. Stream results back for masking rule generation.
