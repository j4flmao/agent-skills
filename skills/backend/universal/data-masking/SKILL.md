---
name: backend-data-masking
description: >
  Use this skill when the user says 'data masking', 'PII', 'personally identifiable information', 'encryption', 'anonymization', 'GDPR', 'CCPA', 'data privacy', 'field-level encryption', 'tokenization', 'redaction', 'data classification'. This skill masks, encrypts, and anonymizes sensitive data (PII) for GDPR/CCPA compliance. Applies to any backend stack. Do NOT use for: network-level encryption (TLS), firewall rules, or access control policies.
version: "1.0.0"
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
```

### Step 5: Handle GDPR Deletion
```sql
UPDATE users SET email = NULL, name = NULL, anonymized_at = NOW() WHERE id = $1;
```

## Rules
- Never log PII — ever. No exceptions.
- Use field-level encryption for highly sensitive data (SSN, diagnosis, financial).
- Mask data in API responses unless the caller has explicit need-to-know.
- Tokenization is preferred for PCI-DSS compliance.
- Encryption keys must be stored in a KMS (AWS KMS, HashiCorp Vault), never in the codebase.
- Support the right to be forgotten: anonymize, do not cascade delete.
- Classify data at the schema level with database comments or tags.

## References
- `references/masking-patterns.md` — Data masking implementation patterns
- `references/encryption-strategies.md` — Encryption and key management strategies

## Handoff
No artifact produced unless requested.
Next skill: audit-logging — log all access to sensitive data for compliance.
Carry forward: data classification map, encryption strategy, tokenization approach.
