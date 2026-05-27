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

## Data Classification Automation

### Classification Levels and Criteria

```yaml
classification_levels:
  public:
    description: "Data that can be freely shared with anyone"
    examples: ["Marketing content", "Published research", "Product documentation"]
    controls: ["No special controls beyond integrity"]
    access: "Unrestricted"
    
  internal:
    description: "Data that should not be publicly exposed but has limited impact if leaked"
    examples: ["Organizational charts", "Internal wikis", "Non-sensitive logs"]
    controls: ["Access control", "Basic encryption at rest"]
    access: "All employees by default"
    
  confidential:
    description: "Data that would cause moderate harm if exposed"
    examples: ["Customer PII", "Financial records", "Source code", "Business plans"]
    controls: ["Encryption at rest and transit", "Access logging", "Least privilege access", "Data masking in non-prod"]
    access: "Role-based, need-to-know basis"
    
  restricted:
    description: "Data that would cause severe harm if exposed"
    examples: ["Passwords", "Payment card numbers", "Health records", "Trade secrets"]
    controls: ["All confidential controls plus:", "Field-level encryption", "Strict access logging with alerting", "Quarterly access review", "HSM key management"]
    access: "Explicitly approved individuals, JIT access"
```

### Automated Classification Pipeline

```yaml
automated_classification:
  discovery:
    tools: ["Apache Atlas", "AWS Macie", "Microsoft Purview", "BigQuery Data Catalog"]
    scanning:
      - "Scan all data stores for sensitive data patterns (regex, ML classifiers)"
      - "Credit card numbers, SSN, email, phone, addresses, passport numbers"
      - "Custom patterns for business-specific sensitive data"
    output: "Data inventory with detected sensitivity labels"
    
  tagging:
    automated:
      - "Auto-tag databases, tables, columns based on scan results"
      - "Tag files and objects in object storage based on content scan"
      - "Tag streaming data at ingestion point based on schema analysis"
    manual:
      - "Data owners can override or refine automated classifications"
      - "Tagged data requires re-certification every 90 days"
      
  enforcement:
    preventive:
      - "Block writes of classified data to unapproved locations"
      - "Prevent export of confidential data to personal devices"
      - "Require approval for bulk access to restricted data"
    detective:
      - "Alert on unauthorized access attempts to classified data"
      - "Monitor data egress patterns for anomaly detection"
      - "Audit all access to restricted data with immutable logs"
```

### Privacy-by-Design Engineering Checklist

```yaml
privacy_by_design:
  system_design:
    - "Data minimization: only collect data needed for stated purpose"
    - "Purpose limitation: data collected for one purpose not reused without consent"
    - "Storage limitation: automated data deletion after retention period"
    - "Privacy impact assessment completed before implementation"
    
  user_rights:
    - "Right to access: API to retrieve all user data in portable format"
    - "Right to deletion: cascading delete across all systems and backups"
    - "Right to rectification: update user data across all stores"
    - "Right to portability: export data in machine-readable format"
    - "Right to object: opt-out mechanism for non-essential processing"
    
  consent_management:
    - "Consent captured at time of data collection — not blanket consent"
    - "Granular consent per purpose — separate toggles for different uses"
    - "Consent records stored with timestamp and version"
    - "Withdrawal mechanism equally accessible as giving consent"
    - "Consent refresh required if purpose changes"
    
  data_protection_impact_assessment_dpia:
    triggers: ["Processing sensitive data", "Large-scale monitoring", "Systematic profiling", "New technology deployment"]
    sections:
      - "System description and purpose"
      - "Data flow mapping"
      - "Privacy risk assessment"
      - "Mitigation measures"
      - "Compliance review sign-off"
```

### De-Identification Techniques Comparison

```yaml
de_identification:
  anonymization:
    k_anonymity:
      description: "Each record indistinguishable from k-1 others"
      example: "Generalize age to ranges (30-40) instead of exact age"
      strength: "Moderate — vulnerable to homogeneity attack"
      use_case: "Published datasets, analytics exports"
    l_diversity:
      description: "Each equivalence class has at least l distinct values for sensitive attribute"
      example: "Blood type distribution within each age-range group has at least 3 distinct values"
      strength: "Strong — prevents attribute disclosure"
      use_case: "Medical research data"
    differential_privacy:
      description: "Add calibrated noise to query results"
      example: "Add Laplace noise to query result: 'count of users > 30 = 1450 + noise'"
      strength: "Very strong — mathematical privacy guarantee"
      epsilon: "Lower ε = more privacy, less accuracy. ε=1: strong privacy, ε=10: weak privacy"
      use_case: "Statistical queries, aggregate analytics"
      
  pseudonymization:
    tokenization:
      description: "Replace identifier with token, mapping stored in secure vault"
      reversibility: "Reversible with vault access"
      format_preserving: "Token looks like original (same format, check digit)"
      use_case: "PCI data, test data generation"
    hashing:
      description: "One-way hash of identifier"
      reversibility: "Irreversible (assuming no rainbow table)"
      salting: "Add unique salt per column to prevent rainbow table attacks"
      use_case: "Event tracking, analytics without PII"
    encryption:
      description: "Encrypt identifier, decrypt only when needed"
      reversibility: "Reversible with key access"
      key_management: "Separate encryption key per data classification level"
      use_case: "Data that needs to be re-identified for legitimate business purpose"
```

## Rules
- Encryption at rest is mandatory for all data containing PII.
- TLS 1.0 and 1.1 are prohibited — enforce TLS 1.2 minimum.
- Keys must be rotated at least annually.
- Production data must never be used in non-production unmasked.
- Column-level access must be enforced at database level — not just application.
- Data classification must be applied before any security control.
- Anonymization must be validated against re-identification risk.
- Automate data classification discovery — manual classification doesn't scale.
- Privacy-by-design must be integrated from system design phase, not retrofitted.

## References
  - references/data-loss-prevention.md — Data Loss Prevention (DLP)
  - references/data-masking-classification.md — Data Masking, Classification & Compliance
  - references/data-privacy-compliance.md — Data Privacy Compliance
  - references/data-security-advanced.md — Data Security Advanced Topics
  - references/data-security-fundamentals.md — Data Security Fundamentals
  - references/encryption-key-mgmt.md — Encryption & Key Management
## Handoff
For infrastructure security controls, hand off to `devops-cloud-cost-optimization`. For data quality and governance, hand off to `data-quality`.
