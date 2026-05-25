# Audit Automation

## Automated Evidence Collection

| Control Domain | Evidence Type | Collection Method | Frequency |
|---------------|---------------|-------------------|-----------|
| Access control | IAM policy reviews | Cloud API scan | Daily |
| Change management | Deployment logs | CI/CD pipeline events | Per deploy |
| Encryption | TLS config scan | Network scanner | Weekly |
| Logging | Log retention check | Log storage audit | Daily |
| Incident response | Postmortem completion | Ticketing system API | Per incident |

### Evidence Collector
```python
class EvidenceCollector:
    def collect(self, control_id: str) -> dict:
        collectors = {
            "AC-1": self.collect_access_review,
            "CM-2": self.collect_change_log,
            "AU-3": self.collect_audit_logs,
            "SC-4": self.collect_encryption_config,
        }
        collector = collectors.get(control_id)
        if not collector:
            raise ValueError(f"No collector for {control_id}")

        evidence = collector()
        return {
            "control_id": control_id,
            "timestamp": datetime.utcnow().isoformat(),
            "hash": self.hash_evidence(evidence),
            "data": evidence,
        }

    def hash_evidence(self, data: dict) -> str:
        serialized = json.dumps(data, sort_keys=True).encode()
        return hashlib.sha256(serialized).hexdigest()
```

## Continuous Compliance Monitoring

| Monitor | Check | Alert | Remediation |
|---------|-------|-------|-------------|
| IAM drift | Unattached policies > 7d | Weekly report | Auto-cleanup |
| Certificate expiry | TLS certs < 30d to expire | Daily alert | Auto-renewal |
| Security group changes | New ingress rule | Real-time alert | Review + approve |
| Encryption compliance | Unencrypted resources | Daily scan | Auto-remediate |
| Log delivery | Missing logs > 1h | Real-time alert | Restart log agent |

## Compliance Dashboard

```python
class ComplianceDashboard:
    def __init__(self):
        self.controls = {}

    def register_control(self, control_id, framework, status):
        self.controls[control_id] = {
            "framework": framework,
            "status": status,  # compliant, non-compliant, not-applicable
            "last_checked": datetime.utcnow(),
            "evidence_count": 0,
        }

    def compliance_score(self, framework: str) -> float:
        relevant = [c for c in self.controls.values() if c["framework"] == framework]
        if not relevant:
            return 0.0
        compliant = sum(1 for c in relevant if c["status"] == "compliant")
        return round(compliant / len(relevant) * 100, 1)
```

## Audit Report Generation

| Section | Content | Source |
|---------|---------|--------|
| Executive summary | Compliance score, open gaps | Dashboard |
| Control mapping | Framework to system controls | Registry |
| Evidence package | Collected evidence per control | Evidence store |
| Gap analysis | Non-compliant controls with risk rating | Assessment |
| Remediation plan | Open items with owners, deadlines | Ticketing system |
| Continuous monitoring | Real-time compliance status | Dashboard |

## Automated Remediation

| Finding | Auto-Remediation | Verification |
|---------|-----------------|--------------|
| Unencrypted S3 bucket | Enable default encryption | Re-scan after 5 min |
| Open security group | Remove overly permissive rule | Re-scan after 1 min |
| IAM key rotation missed | Rotate key, notify owner | Check key age |
| Missing backup | Configure backup plan | Verify next backup run |
| Unpatched vulnerability | Deploy patch via automation | Re-scan after 1 hour |

## Compliance-as-Code Pipeline

```yaml
# compliance-pipeline.yml
stages:
  - scan: run compliance checks
    tools: [checkov, tfsec, trivy]
    on-failure: block deployment
  - evidence: collect and hash evidence
    storage: s3://compliance-evidence/{date}/
    retention: 7 years
  - report: generate compliance report
    format: html + pdf
    notify: [compliance-team, auditor]
  - dashboard: update compliance dashboard
    metrics: [score, open-findings, remediation-rate]
```

## Vendor Compliance Monitoring

| Vendor | Due Diligence | Monitoring Frequency | Review Cadence |
|--------|---------------|---------------------|----------------|
| Cloud provider | SOC2 Type II, ISO 27001 | Automated | Annual |
| SaaS tools | SOC2 report review | Manual | Annual |
| Sub-processors | Contractual obligations | Automated | Quarterly |
| Open source | License + vulnerability scan | Automated | Per dependency update |
