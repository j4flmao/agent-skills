# CSPM Fundamentals

## Overview
Cloud Security Posture Management (CSPM) continuously monitors cloud infrastructure for security misconfigurations, compliance violations, and drift from security baselines. CSPM tools assess cloud resources against benchmarks (CIS, NIST, SOC 2) and flag risks like publicly exposed storage, overly permissive IAM roles, and unencrypted data.

## Core Concepts

### Concept 1: Cloud Security Misconfigurations
The most common cloud security issues: public S3 buckets, overly permissive security groups, unencrypted data at rest, unused IAM credentials, logging disabled, default VPCs with broad network access, and Kubernetes RBAC misconfigurations.

### Concept 2: Compliance Benchmarks
CSPM evaluates against industry frameworks:
- **CIS Benchmarks**: Cloud provider-specific hardening guides (AWS, Azure, GCP, K8s)
- **NIST 800-53**: Security and privacy controls for US federal systems
- **SOC 2**: Trust services criteria for service organizations
- **PCI DSS**: Payment card industry data security standard
- **HIPAA**: Healthcare data privacy and security

### Concept 3: Automated Remediation
CSPM can auto-remediate certain misconfigurations: close public S3 buckets, rotate unused IAM keys, enable encryption, enable logging, remove unused security groups. Auto-remediation requires careful testing — automated changes can cause outages. Start with alert-only, then auto-remediate low-risk issues.

### Concept 4: Drift Detection
Cloud infrastructure drifts from its intended configuration over time — manual changes, auto-scaling events, and ad-hoc fixes create configuration drift. CSPM continuously compares actual configuration against the desired baseline and alerts on deviations. Integration with IaC (Terraform, CloudFormation) enables drift remediation.

## CSPM Platform Comparison

| Feature | Wiz | Prisma Cloud | Lacework | CrowdStrike Falcon Cloud | Check Point |
|---------|-----|-------------|----------|------------------------|-------------|
| Deployment | Agentless | Agent + Agentless | Agent + Agentless | Agent + Agentless | Agentless |
| Cloud providers | AWS, Azure, GCP, OCI | AWS, Azure, GCP | AWS, Azure, GCP | AWS, Azure, GCP | AWS, Azure, GCP |
| VM scanning | Yes | Yes | Yes | Yes | Yes |
| Container scanning | Yes | Yes | Yes | Yes | Yes |
| IaC scanning | Yes | Yes | Yes | Yes | Yes |
| CIEM | Built-in | Built-in | Built-in | Built-in | Separate module |
| Compliance frameworks | 20+ | 30+ | 20+ | 15+ | 20+ |
| Auto-remediation | Playbooks | Built-in | Playbooks | Playbooks | Playbooks |
| AI/ML threat detection | Yes | Yes | Yes | Yes | Yes |
| Pricing | Per resource | Per workload | Per workload | Per workload | Per resource |
| Best for | Enterprise, multi-cloud | Broad cloud security | Compliance-focused | Endpoint + cloud | Network security focus |

## Implementation Guide

### Step 1: CSPM Onboarding
```yaml
# AWS Organization — CSPM cross-account access
CSPMRequirements:
  - "AWS Organizations with all member accounts"
  - "Read-only IAM role for CSPM tool in management account"
  - "Enable AWS Config in all regions"
  - "Enable CloudTrail in all accounts and regions"
  - "Enable GuardDuty for threat detection"
  - "Enable Security Hub for centralized findings"

OnboardingSteps:
  1: "Create CSPM read-only role in AWS Organizations management account"
  2: "Grant cross-account access to CSPM tool via IAM role"
  3: "Configure CSPM to scan all member accounts"
  4: "Enable CIS Benchmark assessment"
  5: "Set up compliance frameworks (SOC 2, PCI DSS, HIPAA)"
  6: "Configure alert destinations (Slack, email, SIEM)"
  7: "Define auto-remediation rules for critical findings"
```

### Step 2: CIS Benchmark Assessment (AWS)
```yaml
critical_findings:
  - "S3 buckets with public read/write access"
  - "IAM users with unused credentials > 90 days"
  - "Security groups with 0.0.0.0/0 inbound on SSH (22) or RDP (3389)"
  - "EBS volumes without encryption"
  - "CloudTrail not enabled in any region"
  - "S3 bucket logging disabled"
  - "RDS instances publicly accessible"
  - "Root user access keys not rotated"
```

### Step 3: Automated Remediation Playbook
```python
# auto-remediation for public S3 buckets
import boto3

def remediate_public_bucket(bucket_name: str):
    """Remove public access from S3 bucket."""
    s3 = boto3.client('s3')
    s3.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True,
        }
    )
    print(f"Remediated: {bucket_name} — public access blocked")
```

### Step 4: Drift Detection with Terraform
```hcl
# terraform plan — detect drift
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CSPM drift alert: "S3 bucket {name} has public access block removed"
# Automated response: reapply terraform or trigger remediation playbook
```

## Best Practices
- Onboard all cloud accounts, regions, and services to CSPM
- Enable CIS benchmarks for your cloud provider(s) as baseline
- Set up compliance monitoring for relevant frameworks (SOC 2, PCI DSS, HIPAA)
- Prioritize critical/high findings — fix within 24/72 hours respectively
- Use auto-remediation for low-risk findings only (logging, encryption)
- Monitor CSPM coverage — ensure new resources are scanned automatically
- Integrate CSPM findings with SIEM for centralized alerting
- Conduct regular cloud security reviews (monthly at minimum)
- Use IaC scanning (Terraform plan, CloudFormation) to catch misconfigurations pre-deployment
- Implement CIEM (Cloud Infrastructure Entitlement Management) alongside CSPM

## Common Pitfalls
- Agentless CSPM missing runtime detection (complement with workload protection)
- Alert fatigue from too many low-severity findings (tune severity thresholds)
- Auto-remediation causing outages (test remediation playbooks in staging)
- No drift detection — CSPM snapshots miss configuration changes between scans
- Ignoring container/Kubernetes posture (CSPM must cover container workloads)
- Duplicate findings across multiple CSPM tools (consolidate to one primary tool)
- No integration with remediation workflow (findings that are never actioned)
- Coverage gaps — new accounts/regions not automatically onboarded

## Key Points
- CSPM continuously monitors cloud for security misconfigurations
- Evaluates against CIS, NIST, SOC 2, PCI DSS, HIPAA benchmarks
- Prioritize critical findings (fix within 24 hours), use auto-remediation for low-risk
- Detect drift from IaC-defined baselines
- Complement with CIEM for permission management and workload protection for runtime
- Scan IaC templates pre-deployment to catch issues before they reach production
- Integrate findings with SIEM and ticketing for remediation workflow
