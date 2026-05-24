# Compliance Frameworks for CSPM

## Overview

CSPM platforms automate compliance monitoring by mapping cloud resource configurations to control frameworks. This reference covers the major compliance frameworks, control mapping strategies, and automated evidence collection.

## CIS Benchmarks

### CIS AWS Foundations Benchmark v2.0
**Scope:** 61 controls across 7 sections

| Section | Key Controls | CSPM Mapping |
|---------|-------------|--------------|
| Identity and Access Management | 1.1-1.26 | IAM policies, password policies, root account MFA |
| Storage | 2.1-2.2 | S3 bucket public access, encryption |
| Logging | 3.1-3.14 | CloudTrail, Config, VPC Flow Logs |
| Monitoring | 4.1-4.17 | CloudWatch alerts for IAM, S3, network changes |
| Networking | 5.1-5.5 | VPC default SG, restricted ports, NACL |
| Compute | 6.1-6.8 | EBS encryption, IMDS, AMI scanning |
| Database | 7.1-7.5 | RDS encryption, automated backups, public access |

**Example Control Mapping (CIS 1.3):**
```json
{
  "control": "1.3 Ensure MFA is enabled for root account",
  "framework": "CIS AWS Foundations v2.0",
  "severity": "CRITICAL",
  "automated": true,
  "remediation": {
    "manual": "Login to AWS root account, enable MFA device",
    "detective": "aws iam get-account-summary --query 'AccountMFAEnabled'"
  },
  "cspm_rule": {
    "platform": "aws_security_hub",
    "standard_arn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0",
    "rule_id": "CIS.1.3"
  }
}
```

### CIS Azure Foundations Benchmark v2.0
**Key controls:**
- Azure AD security defaults, conditional access
- Role-based access control (RBAC)
- Network security groups, NSG flow logs
- Disk and SQL encryption
- Key Vault firewall and soft-delete
- Logging and monitoring with Azure Monitor

### CIS GCP Foundations Benchmark v2.0
**Key controls:**
- IAM policies, primitive roles, service accounts
- VPC firewall rules, Cloud NAT
- Cloud SQL encryption, backups
- GCS bucket uniform access
- Cloud Audit Logs, Logging sinks
- KMS key rotation, separation of duties

## SOC 2

**Trust Services Criteria:**
| Category | Description | Cloud-Relevant Evidence |
|----------|-------------|----------------------|
| Security | Protection against unauthorized access | IAM policies, network security, logging |
| Availability | System available for operation | Auto-scaling, redundancy, backup |
| Processing Integrity | Processing is complete and accurate | Data validation, pipeline monitoring |
| Confidentiality | Information designated as confidential | Encryption at rest/transit, access controls |
| Privacy | Personal information collected/used | Data classification, retention policies |

**SOC 2 Type II Evidence Collection:**
```yaml
evidence_collection:
  access_controls:
    - MFA enforcement logs (IdP)
    - Access review reports (quarterly)
    - IAM policy changes (CloudTrail)
    - Privileged access sessions (PAM)

  change_management:
    - IaC deployment logs (Terraform/Git)
    - Change approval records (Jira)
    - Code review history (GitHub PRs)
    - Pipeline audit logs (CI/CD)

  monitoring:
    - SIEM alert response logs
    - Incident investigation reports
    - Vulnerability scan results
    - Penetration test reports (annual)

  data_integrity:
    - Backup verification logs
    - DR test results (annual)
    - Database audit logs
    - Encryption key rotation records
```

## PCI DSS v4.0

**Applicable Requirements:**
| Requirement | Cloud Control | CSPM Validation |
|-------------|--------------|-----------------|
| 1.2 — Network segmentation | Security groups, firewalls | Verify default-deny rules |
| 2.2 — Configuration standards | CIS benchmarks, hardening | Scan for CIS violations |
| 3.4 — PAN at rest encryption | KMS, Cloud HSM, S3 encryption | Verify encryption at rest |
| 4.1 — PAN in transit encryption | TLS 1.2+, mTLS | Verify TLS minimum version |
| 7.2 — Access control | IAM roles, least privilege | CIEM analysis |
| 8.3 — MFA | IdP MFA enforcement | Verify MFA on all admin accounts |
| 10.2 — Audit trails | CloudTrail, audit logs | Verify logging enabled everywhere |
| 11.3 — Vulnerability scanning | ECR/ACR scanning, Inspector | Weekly scan verification |

**PCI Cloud Evidence Automation:**
```python
# Automated PCI evidence collection
def collect_pci_evidence():
    evidence = {}
    
    # Requirement 2.2 — CIS benchmark compliance
    evidence["req_2.2"] = get_cis_compliance_report()
    
    # Requirement 3.4 — Encryption at rest
    evidence["req_3.4"] = {
        "ebs_encryption": check_all_ebs_encrypted(),
        "s3_encryption": check_all_s3_default_encrypt(),
        "rds_encryption": check_all_rds_encrypted(),
        "kms_key_rotation": check_kms_auto_rotation()
    }
    
    # Requirement 10.2 — Audit logging
    evidence["req_10.2"] = {
        "cloudtrail_multi_region": check_cloudtrail_multi_region(),
        "cloudtrail_log_file_validation": check_log_file_validation(),
        "s3_access_logging": check_s3_server_access_logging()
    }
    
    return evidence
```

## HIPAA

**HIPAA Security Rule Mapping:**
| Standard | Implementation Specification | Cloud Control |
|----------|------------------------------|---------------|
| 164.312(a)(1) — Access Control | Unique user ID, emergency access, auto-logoff | IAM roles, break glass, session timeout |
| 164.312(a)(2)(iv) — Encryption/Decryption | Encrypt ePHI at rest and transit | KMS, TLS 1.2+, S3 SSE |
| 164.312(b) — Audit Controls | Record and examine access | CloudTrail, GuardDuty, SIEM |
| 164.312(c)(1) — Integrity | Protect ePHI from unauthorized alteration | S3 versioning, IAM least privilege |
| 164.312(d) — Person/Auth | Unique user identification | IdP, MFA, SSO |
| 164.312(e)(1) — Transmission Security | Encrypt ePHI in transit | TLS, VPN, Direct Connect |

## NIST 800-53 Rev 5

**Applicable Control Families:**
```
AC — Access Control (AC-1 through AC-25)
AU — Audit and Accountability (AU-1 through AU-16)
CA — Assessment, Authorization, Monitoring (CA-1 through CA-9)
CM — Configuration Management (CM-1 through CM-14)
IA — Identification and Authentication (IA-1 through IA-12)
IR — Incident Response (IR-1 through IR-10)
RA — Risk Assessment (RA-1 through RA-7)
SC — System and Communications Protection (SC-1 through SC-50)
SI — System and Information Integrity (SI-1 through SI-22)
```

## Automated Evidence Collection

### Evidence Collector Framework
```python
class ComplianceEvidenceCollector:
    def __init__(self, providers):
        self.providers = providers
    
    def collect(self, framework, date_range):
        evidence = {}
        
        for provider in self.providers:
            evidence[provider] = {
                "iam": self._collect_iam_evidence(provider),
                "network": self._collect_network_evidence(provider),
                "logging": self._collect_logging_evidence(provider),
                "encryption": self._collect_encryption_evidence(provider),
            }
        
        return self._map_to_framework(evidence, framework)
    
    def _map_to_framework(self, evidence, framework):
        mappings = {
            "soc2": SOC2Mapper(),
            "pci": PCIMapper(),
            "hipaa": HIPAAMapper(),
            "nist": NISTMapper(),
            "cis": CISMapper()
        }
        return mappings[framework].map(evidence)
```

**Evidence Format for Audit:**
```json
{
  "framework": "SOC 2",
  "control": "CC6.1 — Logical and physical access controls",
  "period": "2026-Q1",
  "evidence": [
    {
      "provider": "AWS",
      "type": "IAM Analysis",
      "collected_at": "2026-03-31T23:59:59Z",
      "data": {
        "mfa_enabled_users": "98.7%",
        "unused_roles_removed": 12,
        "access_key_rotation_compliant": true,
        "root_mfa_enabled": true
      },
      "automated": true,
      "source": "AWS IAM Access Analyzer"
    }
  ]
}
```

### Compliance Automation Tools
- **Steampipe** — SQL-based cloud asset querying for compliance
- **CloudQuery** — Open-source cloud asset inventory with compliance checks
- **Prowler** — AWS security assessment tool with CIS benchmarks
- **ScoutSuite** — Multi-cloud security audit framework
- **Checkov** — IaC scanning for compliance violations
