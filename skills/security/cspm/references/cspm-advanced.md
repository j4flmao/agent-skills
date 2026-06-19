# CSPM Advanced Topics

## Introduction
Advanced CSPM covers CIEM (Cloud Infrastructure Entitlement Management), IaC security scanning in CI/CD pipelines, cloud threat detection integration (GuardDuty, Security Hub), CSPM at multi-cloud scale, and compliance evidence automation.

## CIEM — Cloud Infrastructure Entitlement Management
CIEM focuses on cloud IAM permissions, finding overly permissive roles, unused permissions, and privilege escalation paths:
- Identify roles with wildcard actions (`*:*`) — high risk
- Find unused IAM roles and service accounts (> 90 days unused)
- Detect privilege escalation paths (e.g., iam:PassRole + ec2:RunInstances)
- Monitor cross-account access — which external entities can access your resources
- Right-size permissions — remove unused actions from IAM policies

## IaC Scanning in CI/CD
```yaml
# Checkov Terraform scanning in CI
name: IaC Security Scan
on: [pull_request]
jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          soft_fail: false  # Fail PR on critical/high findings
```

## Compliance Evidence Automation
```python
# Automated evidence collection for SOC 2
def collect_soc2_evidence():
    """Collect compliance evidence from cloud APIs."""
    evidence = {
        "access_reviews": get_iam_access_analyser_results(),
        "encryption_status": get_kms_key_usage(),
        "logging_config": get_cloudtrail_status(),
        "backup_status": get_backup_policies(),
        "network_segmentation": get_security_group_analysis(),
        "patch_level": get_ec2_patch_compliance(),
    }
    generate_compliance_report(evidence, "SOC_2_Type_II")
```

## CSPM Operations at Scale
- Tag resources by environment (prod, staging, dev) for targeted scanning
- Use resource hierarchies (AWS Organizations, GCP folders) for policy inheritance
- Automate new account onboarding via Infrastructure as Code
- Set up CSPM as code — define policies in YAML, version-controlled
- Regular CSPM tool health checks — is it still scanning all resources?

## Key Points
- CIEM manages cloud IAM permissions at scale (right-size roles, remove unused)
- Scan IaC templates pre-deployment (Checkov, tfsec, Terrascan)
- Automate compliance evidence collection for audits
- Scale CSPM with tagging, resource hierarchies, and automated onboarding
- Integrate CSPM with SIEM for correlated threat detection
- Use CSPM as code — version-controlled policy definitions
- Regular CSPM coverage audits — ensure new resources are monitored
