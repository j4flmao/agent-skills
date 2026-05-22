# Data Classification Framework

## Classification Levels

### Level 1: Public
- Definition: No harm if disclosed externally
- Examples: Product names, press releases, blog content
- Controls: No special controls needed
- Retention: As needed for business

### Level 2: Internal
- Definition: Internal business use only
- Examples: Internal docs, org charts, project plans
- Controls: Authentication required, no external sharing
- Retention: 3 years after last use

### Level 3: Confidential
- Definition: Business sensitive, competitive value
- Examples: Financial reports, strategy docs, source code, customer lists
- Controls: Encryption at rest, access control list, quarterly access review
- Retention: 7 years (business records)

### Level 4: Restricted
- Definition: Regulatory protected, high sensitivity
- Examples: PII (names, emails, SSNs), PHI (health records), PCI (card data), credentials
- Controls: Encryption at rest and transit, MFA access, quarterly access review, data masking, audit logging, DLP monitoring
- Retention: Per regulation (GDPR: 6 years, HIPAA: 6 years, PCI: 12 months)

## Automated Classification

### PII Detection Patterns
```python
PII_PATTERNS = {
    "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    "phone": r"\+\d{1,3}\s?\d{3,14}",
    "ssn": r"\d{3}-\d{2}-\d{4}",
    "credit_card": r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}",
    "ip_address": r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
}
```

### Classification in CI/CD
```yaml
# .github/workflows/data-classification.yml
steps:
  - name: Scan for unclassified PII
    run: data-classifier scan --path ${{ github.workspace }}/migrations/
  - name: Enforce classification annotations
    run: data-classifier enforce --schema schema-registry:*
```

## Data Ownership Matrix

| Role | Responsibility |
|------|----------------|
| Business Owner | Defines data meaning, quality targets, access policy |
| Data Steward | Maintains catalog, enforces standards, resolves issues |
| Data Custodian | Technical implementation of controls, backups, retention |

## Field-Level Classification

```yaml
users:
  email:
    classification: restricted
    pii: true
    encryption: AES-256
    retention_days: 2190  # 6 years
  name:
    classification: confidential
    pii: true
    encryption: AES-256
    retention_days: 2190
  created_at:
    classification: internal
    pii: false
    retention_days: 7300  # 10 years
```
