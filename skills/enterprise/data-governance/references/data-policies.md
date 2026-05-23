# Data Policies Framework

## Policy Categories

| Policy | Purpose | Scope | Enforcement |
|--------|---------|-------|-------------|
| Data Classification | Label data sensitivity | All data at rest | Automated scanner |
| Access Control | Who can read/write what | All data stores | RBAC + IAM |
| Retention | How long data is kept | Regulated data | Automated lifecycle |
| Encryption | Protect data at rest/transit | PII, financial | Mandatory |
| Data Sharing | Rules for external sharing | All outbound | DLP monitoring |
| Quality | Accuracy and completeness | Critical data | Automated checks |

## Data Classification Policy

### Classification Levels
```
Public: No restrictions. Product names, marketing content.
Internal: Company confidential. Internal docs, org charts.
Confidential: Business sensitive. Financial data, source code.
Restricted: Regulatory protected. PII, PHI, PCI.
```

### Handling Rules per Level
| Level | Encryption | Access Review | Retention | Sharing |
|-------|------------|---------------|-----------|---------|
| Public | Optional | None | As needed | Unlimited |
| Internal | At rest | Annual | 3 years | NDA required |
| Confidential | At rest + transit | Quarterly | 7 years | Approval required |
| Restricted | At rest + transit + field-level | Quarterly | Per regulation | Prohibited |

## Data Retention Policy

### Retention Schedule
```yaml
retention_rules:
  - data_type: "user_pii"
    retention: "7 years after account closure"
    action: "delete"
    exception: "legal hold"
  - data_type: "transaction_logs"
    retention: "3 years"
    action: "anonymize"
  - data_type: "backup"
    retention: "30 days"
    action: "rotate"
  - data_type: "audit_logs"
    retention: "7 years"
    action: "archive"
  - data_type: "marketing_data"
    retention: "2 years after last interaction"
    action: "anonymize"
```

### Disposal Methods
```
Digital: Secure deletion (overwrite + verify)
Physical: Cross-cut shredding or incineration
Archival: Encrypted cold storage with access audit
Anonymization: Remove all direct and quasi-identifiers
```

## Data Quality Policy

### Quality Dimensions
```
Accuracy: Data reflects real-world values. Target: >99%
Completeness: Required fields populated. Target: >95%
Consistency: Same values across systems. Target: >98%
Timeliness: Data updated within SLA. Target: >99%
Uniqueness: No duplicate records. Target: <1% dup rate
Validity: Data conforms to schema. Target: >99%
```

### Monitoring
```python
quality_checks = {
    "null_rate": "SELECT COUNT(*) / total FROM table WHERE column IS NULL",
    "uniqueness": "SELECT COUNT(DISTINCT id) / COUNT(*) FROM table",
    "freshness": "SELECT MAX(updated_at) FROM table",
    "schema_conformance": "validate_schema(table, expected_schema)",
}
```

## Data Access Policy

### Access Principles
- Least privilege: minimum access to perform job
- Need-to-know: access only to data required for role
- Time-bound: temporary access with expiration
- Audited: all access logged and reviewable

### Access Request Workflow
```
1. Request: User submits request with justification
2. Approval: Data owner reviews and approves
3. Provision: IAM team grants access (auto-expire)
4. Review: Quarterly access review by data owner
5. Revoke: Access removed when no longer needed
```

## Policy Exceptions

### Exception Process
```
Request: Document business need, duration, compensating controls
Review: Data governance committee evaluates risk
Approval: VP or CISO signs (depending on risk level)
Tracking: Exception logged with expiration date
Remediation: Plan to close exception before expiry
Renewal: Requires re-approval if not resolved
```
