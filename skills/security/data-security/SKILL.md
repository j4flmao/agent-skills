---
name: security-data-security
description: >
  Use this skill when implementing data security: encryption at rest/transit, key management (KMS, HSM), data masking (static, dynamic), column-level security, data privacy (GDPR, CCPA), data classification, data anonymization, tokenization.
  This skill enforces: encryption strategy selection, key management architecture, masking rules, column-level access controls, anonymization technique, compliance controls.
  Do NOT use for: network security (firewalls, VPCs), identity and access management (IAM), application security scanning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, data, privacy, phase-11]
---

# Data Security Agent

## Purpose
Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance.

## Agent Protocol

### Trigger
User request includes: data security, data encryption, data masking, column-level security, data privacy, GDPR, CCPA, data classification, data anonymization, tokenization, key management, KMS, HSM.

### Protocol
1. Classify data by sensitivity level.
2. Design encryption strategy (at rest, in transit, in use).
3. Select key management approach (KMS, HSM, BYOK).
4. Implement data masking where applicable.
5. Configure column-level security.
6. Apply anonymization techniques for analytics.
7. Document compliance controls.

## Output
Data security framework with encryption strategy, key management, masking rules, compliance controls.

### Response Format
```
## Data Security Framework
### Classification
Levels: [{public, internal, confidential, restricted}]
Coverage: [{data asset: classification level}]

### Encryption
At Rest: {AES-256 / envelope encryption}
In Transit: {TLS 1.2+ / mTLS}
Key Management: {KMS / HSM / BYOK}
Key Rotation: {every N days / automatic}

### Data Masking
Static Masking: {target datasets, masking rules}
Dynamic Masking: {role-based, query-time}
Tokenization: {format-preserving / random / vault-based}

### Column-Level Security
Database: {PostgreSQL / BigQuery / Snowflake}
Method: {row-level security / column ACL / dynamic masking}
Roles: [{role: accessible columns}]

### Anonymization
Technique: {k-anonymity / l-diversity / differential privacy}
Parameters: {k=N / epsilon=N}
GDPR/CCPA: {right to deletion / portability / access}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Data classification levels defined and applied to all data assets.
- [ ] Encryption strategy covers at rest, in transit, and key management.
- [ ] Key management architecture with rotation schedule.
- [ ] Data masking rules applied to non-production and sensitive columns.
- [ ] Column-level security configured per role.
- [ ] Anonymization technique selected and validated.
- [ ] GDPR/CCPA compliance controls documented.

## Workflow

### Step 1: Data Classification
Define classification levels: Public (no impact), Internal (minor), Confidential (moderate), Restricted (severe). Classify all data assets: databases, files, streams, backups. Tag classified data in catalog.

### Step 2: Encryption Strategy
- **At rest**: AES-256 with envelope encryption. Use KMS for key hierarchy. Encrypt databases, S3 buckets, EBS volumes, backups.
- **In transit**: TLS 1.2 minimum, prefer TLS 1.3. mTLS for service-to-service. Enforce on all connections.
- **In use**: Confidential computing (Intel SGX, AMD SEV) for sensitive workloads.

### Step 3: Key Management
- **KMS**: Managed service (AWS KMS, GCP Cloud KMS, Azure Key Vault). Automatic key rotation. Access control via IAM.
- **HSM**: Hardware security module (AWS CloudHSM, Azure Dedicated HSM). FIPS 140-2 Level 3. For regulatory requirements.
- **BYOK**: Import your own key to KMS. Control key material. Rotation rotates within KMS.

### Step 4: Data Masking
- **Static masking**: Create de-identified copies of production data for dev/test. Permanent transformation.
- **Dynamic masking**: Mask at query time based on role. No data modification. Use PostgreSQL `col_a > masking_column`.
- **Tokenization**: Replace sensitive data with tokens. Vault-based (lookup table) or format-preserving (algorithmic).

### Step 5: Column-Level Security
PostgreSQL: Row-Level Security (RLS) policies per table. BigQuery: column ACL on authorized views. Snowflake: dynamic data masking with masking policies. Grant access based on data classification and role.

### Step 6: Anonymization
- **k-anonymity**: Each record indistinguishable from k-1 others. Generalize or suppress quasi-identifiers.
- **l-diversity**: Each equivalence class has l distinct sensitive values. Prevents homogeneity attacks.
- **Differential privacy**: Add calibrated noise. Epsilon parameter controls privacy/utility trade-off.

### Step 7: Compliance
GDPR: right to access (data portability), right to deletion (erase records), right to rectification. CCPA: right to know, right to delete, right to opt-out. Document data processing activities. Maintain data flow maps.

## Rules
- Encryption at rest is mandatory for all data containing PII.
- TLS 1.0 and 1.1 are prohibited — enforce TLS 1.2 minimum.
- Keys must be rotated at least annually.
- Production data must never be used in non-production unmasked.
- Column-level access must be enforced at database level — not just application.
- Data classification must be applied before any security control.
- Anonymization must be validated against re-identification risk.

## References
- `references/encryption-key-mgmt.md` — Encryption at rest/transit, envelope encryption, KMS vs HSM, key rotation, TLS
- `references/data-masking-classification.md` — Static/dynamic masking, tokenization, column-level access, k-anonymity, differential privacy, GDPR/CCPA

## Handoff
For infrastructure security controls, hand off to `devops-cloud-cost-optimization`. For data quality and governance, hand off to `data-quality`.
