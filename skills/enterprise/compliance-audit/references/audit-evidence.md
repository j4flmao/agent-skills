# Audit Evidence Collection and Preservation

## Evidence Types

### Configuration Evidence
- Infrastructure-as-Code repository snapshots
- Kubernetes manifest files with timestamps
- Network security group rule exports
- IAM policy documents and role definitions
- Encryption configuration (TLS versions, cipher suites)

### Operational Evidence
- System access logs (successful and failed)
- Admin action audit trails
- Change request tickets with approvals
- Code review records and merge approvals
- Deployment logs with environment promotion

### Monitoring Evidence
- Intrusion detection alerts and responses
- Vulnerability scan results and remediation
- Penetration test reports
- Incident response documents
- Uptime and availability dashboards

### Governance Evidence
- Security policy documents and version history
- Employee security training records
- Access review completion certificates
- Vendor risk assessment reports
- BCP/DR test results and debriefs

## Evidence Collection Automation

### Log Collection Pipeline
```
Application → Filebeat/Vector → Kafka → Logstash → Elasticsearch → S3 Archive
```

### Critical Log Sources
- CloudTrail / Azure Monitor / GCP Audit Log
- Kubernetes API server audit log
- Database audit logs (RDS, Cloud SQL)
- Application structured logs (JSON format)
- WAF and API gateway logs

### Evidence Preservation
- Logs must be immutable (write-once storage)
- Cryptographic hash of log batches for integrity
- 90-day hot retention, 365-day warm, 7-year cold for GDPR
- Evidence index with control-to-log mapping

## Audit Evidence Package Structure

```
evidence-package/
  control-mapping.csv
  soc2-cc6/
    access-control-policy.pdf
    access-review-q1-2026.pdf
    iam-role-snapshots/
  soc2-cc7/
    incident-response-policy.pdf
    monitoring-dashboard-screenshots/
  soc2-cc8/
    change-management-policy.pdf
    deployment-audit-trail.csv
  gdpr/
    ropa-document.pdf
    dpa-signatures/
```

## Pre-Audit Checklist

- Evidence package completeness verified against control matrix
- Timestamps consistent across all evidence sources
- Evidence collector access credentials rotated
- Auditor environment provisioned with read-only access
- Interview schedules confirmed with control owners
- System description document finalized
