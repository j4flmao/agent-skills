# Compliance Automation Tools Reference

## Overview

This reference covers tools, platforms, and automation patterns for compliance operations. It includes automated compliance platforms, CSPM tools, policy-as-code frameworks, evidence collection automation, SIEM integration, and CI/CD compliance gates.

## Compliance Automation Platform Landscape

### Category Overview

| Category | Tools | Use Case |
|----------|-------|----------|
| Automated Compliance | Vanta, Drata, Secureframe, Thoropass | Evidence collection, control mapping, audit readiness |
| CSPM (Cloud Security) | Wiz, Prisma Cloud, CrowdStrike, Aqua | Cloud configuration compliance, threat detection |
| Policy-as-Code | OPA/Rego, Sentinel, cfn-guard, Checkov | Infrastructure compliance enforcement |
| IaC Scanning | Checkov, tfsec, Terrascan, Bridgecrew | Pre-deployment compliance checks |
| SIEM | Splunk, Elastic, Sumo Logic, Azure Sentinel | Log aggregation, monitoring, compliance reporting |
| Access Control | Okta, Azure AD, OneLogin | Access review automation, SSO compliance |
| GRC Platform | ServiceNow GRC, Archer, AuditBoard | Enterprise governance, risk, and compliance |

### Automated Compliance Platforms

Vanta:
- Continuous monitoring for SOC2, ISO 27001, HIPAA, GDPR
- Automated evidence collection (120+ integrations)
- Control mapping and test framework
- Vendor management and security questionnaires
- Auditor access portal
- Pricing: $500-$2000+/month depending on scope

Drata:
- SOC2, ISO 27001, HIPAA, GDPR, SOC1, SOC3
- Automated evidence collection (100+ integrations)
- Control tests with pass/fail status
- Employee onboarding/offboarding workflows
- Continuous control monitoring
- Auditor access

Secureframe:
- SOC2, ISO 27001, HIPAA, PCI, GDPR
- Evidence automation (120+ integrations)
- Risk management module
- Vendor risk management
- Policy generation
- Questionnaires and trust center

Selection criteria:
- Integration depth with your tech stack
- Framework coverage needed
- Evidence automation extent vs manual collection
- Auditor acceptance (will your auditor accept the platform?)
- Employee count (some platforms charge per user)
- Custom control support

### CSPM (Cloud Security Posture Management)

Wiz:
- Agentless cloud security across AWS, Azure, GCP, Kubernetes
- Compliance frameworks: SOC2, ISO 27001, CIS, NIST, PCI, HIPAA
- Vulnerability management, container scanning
- Graph-based analysis for attack path visualization
- Compliance dashboard with drill-down

Prisma Cloud (Palo Alto):
- CSPM + CWPP + CIEM + WAAS
- Compliance: SOC2, ISO 27001, PCI, HIPAA, NIST, FedRAMP
- Policy-as-code with custom rules
- CI/CD integration
- Host vulnerability scanning

CrowdStrike Falcon Cloud Security:
- CSPM + workload protection
- Compliance mapping to SOC2, ISO, PCI, HIPAA
- Runtime threat detection
- Integration with CrowdStrike EDR

Aqua Security:
- Container and Kubernetes security
- Compliance checking for containers
- Image scanning, runtime protection
- CIS benchmarks for Docker/Kubernetes

## Policy-as-Code Implementation

### Open Policy Agent (OPA) / Rego

OPA decouples policy from application code. Use for cloud resource compliance:

```rego
# terraform_deny_unencrypted_s3.rego
package terraform

# Deny S3 buckets without encryption
deny[msg] {
  resource := input.resource.aws_s3_bucket[_]
  not resource.server_side_encryption_configuration
  msg := sprintf("S3 bucket %v must have encryption enabled", [resource.name])
}

# Deny security groups with 0.0.0.0/0 to SSH
deny[msg] {
  resource := input.resource.aws_security_group[_]
  ingress := resource.ingress[_]
  ingress.from_port <= 22
  ingress.to_port >= 22
  ingress.cidr_blocks[_] == "0.0.0.0/0"
  msg := sprintf("Security group %v allows SSH from 0.0.0.0/0", [resource.name])
}
```

### Checkov (Bridgecrew)

Open-source IaC scanning tool with 1000+ built-in policies:

```yaml
# .checkov.yml
compact: true
directory:
  - terraform/
  - cloudformation/
check:
  - CKV_AWS_1    # IAM policies should not allow full *:* privileges
  - CKV_AWS_2    # EBS volumes should be encrypted
  - CKV_AWS_3    # EBS snapshots should be encrypted
  - CKV_AWS_4    # Ensure all data stored in the S3 bucket is securely locked
skip_check:
  - CKV_AWS_72   # Skip SQS queue encryption check
```

### Sentinel (HashiCorp)

Policy-as-code for Terraform Cloud and Enterprise:

```hcl
# require_tls_policy.sentinel
import "tfplan/v2" as tfplan

# Require TLS 1.2+ for CloudFront distributions
main = rule {
  all tfplan.resource_changes as _, change {
    change.mode != "managed" or change.type != "aws_cloudfront_distribution" or
    change.after.viewer_certificate.minimum_protocol_version matches "TLSv1.2_*"
  }
}

# Require encryption for all RDS instances
require_encryption = rule {
  all tfplan.resource_changes as _, change {
    change.type != "aws_db_instance" or
    (change.after.storage_encrypted is true)
  }
}
```

## Evidence Collection Automation

### Automated Evidence Pipeline

Design a pipeline that continuously collects and validates evidence:

```yaml
pipeline: compliance-evidence-collection
triggers:
  - schedule: "0 */6 * * *"  # every 6 hours
  - event: cloud_config_change (via EventBridge)

stages:
  - name: collect_config
    action: Run config compliance scans
    tools: [AWS Config, Azure Policy, GCP Asset Inventory]

  - name: collect_logs
    action: Export recent audit logs
    tools: [CloudTrail, Azure Monitor, GCP Audit Logs]

  - name: validate_controls
    action: Run automated control tests
    tools: [Custom Python scripts, Compliance platform API]

  - name: package_evidence
    action: Hash and archive evidence artifacts
    storage: S3 -> Glacier with retention tagging

  - name: update_dashboard
    action: Push results to compliance dashboard
    tools: [Grafana, Compliance platform API]

  - name: alert_on_failure
    action: Send alert if any control fails
    channels: [Slack, Email, PagerDuty]
```

### Evidence Collection Script Library

AWS IAM Access Key Age:

```python
import boto3
from datetime import datetime, timedelta

def check_access_key_age():
    """Identify access keys older than 90 days for compliance reporting."""
    iam = boto3.client('iam')
    old_keys = []
    cutoff = datetime.utcnow() - timedelta(days=90)

    paginator = iam.get_paginator('list_users')
    for page in paginator.paginate():
        for user in page['Users']:
            keys = iam.list_access_keys(UserName=user['UserName'])
            for key in keys['AccessKeyMetadata']:
                if key['Status'] == 'Active' and key['CreateDate'] < cutoff:
                    old_keys.append({
                        'user': user['UserName'],
                        'key_id': key['AccessKeyId'],
                        'created': key['CreateDate'].isoformat(),
                        'age_days': (datetime.utcnow() - key['CreateDate']).days
                    })
    return old_keys
```

Kubernetes Compliance Scanner:

```python
from kubernetes import client, config

def check_pod_security_context():
    """Verify pods are not running as root for compliance."""
    config.load_incluster_config()
    v1 = client.CoreV1Api()
    violations = []

    pods = v1.list_pod_for_all_namespaces(watch=False)
    for pod in pods.items:
        for container in pod.spec.containers:
            sc = container.security_context
            if sc is None or sc.run_as_non_root is not True:
                violations.append({
                    'namespace': pod.metadata.namespace,
                    'pod': pod.metadata.name,
                    'container': container.name,
                    'issue': 'run_as_non_root not set to True'
                })
    return violations
```

### Evidence Hashing and Immutability

Every evidence artifact should be hashed and stored immutably:

```python
import hashlib
import json

def hash_evidence(data):
    """Create SHA-256 hash of evidence data for audit trail."""
    if isinstance(data, str):
        data = data.encode('utf-8')
    elif isinstance(data, dict):
        data = json.dumps(data, sort_keys=True, default=str).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def store_evidence_s3(evidence_id, data, bucket):
    """Store evidence with hash and timestamp in immutable storage."""
    s3 = boto3.client('s3')
    hash_val = hash_evidence(data)
    timestamp = datetime.utcnow().isoformat()
    key = f"evidence/{evidence_id}/{timestamp}_{hash_val[:8]}.json"

    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps({
            'evidence_id': evidence_id,
            'timestamp': timestamp,
            'hash': hash_val,
            'data': data
        }),
        ObjectLockMode='COMPLIANCE',
        ObjectLockRetainUntilDate=datetime.utcnow() + timedelta(days=365*7)
    )
    return key, hash_val
```

## SIEM Integration for Compliance

### SIEM Compliance Use Cases

Log Retention:
- Verify all sources are sending logs to SIEM
- Validate retention duration meets framework requirements
- Alert on log source gaps (stopped sending)

Control Monitoring:
- Monitor for failed access attempts (access control)
- Detect configuration changes (change management)
- Alert on data egress anomalies (data protection)
- Track admin activity (logging and monitoring)
- Identify vulnerability scan results (vulnerability management)

Compliance Reporting:
- Generate automated compliance reports
- Map SIEM queries to control IDs
- Schedule evidence collection queries
- Export reports for auditor review

### Splunk Compliance Queries

Failed Authentication Monitoring:
```
index=access sourcetype=linux_secure "Failed password"
| stats count by src_ip, user, _time
| where count > 10
| eval severity = "High"
| table _time, src_ip, user, count
```

Admin Activity Audit:
```
index=cloudtrail eventSource="ec2.amazonaws.com"
| search eventName IN ("RunInstances", "TerminateInstances", "ModifyInstanceAttribute")
| stats count by userIdentity.arn, eventName, sourceIPAddress
| sort - count
```

Data Egress Anomaly:
```
index=network sourcetype=flow_logs bytes_out > 10000000
| stats sum(bytes_out) as total_bytes by src_ip, dst_ip, app
| where total_bytes > 100000000
| eval severity = if(total_bytes > 1000000000, "Critical", "High")
| table src_ip, dst_ip, app, total_bytes, severity
```

## CI/CD Compliance Gates

### Pre-Deployment Compliance Check

```yaml
# .github/workflows/compliance-check.yml
name: Compliance Check
on:
  pull_request:
    paths:
      - 'terraform/**'
      - 'cloudformation/**'

jobs:
  compliance-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: IaC Compliance Scan (Checkov)
        run: |
          checkov -d terraform/ --framework terraform
          --soft-fail-on CKV_AWS_79  # Allow specific checks to pass
          --hard-fail-on CKV_AWS_1   # Critical checks fail the pipeline
          --hard-fail-on CKV_AWS_2
          --hard-fail-on CKV_AWS_3
          --output report.json

      - name: Validate Terraform Compliance
        run: |
          opa eval --data policies/ --input plan.json "data.terraform.deny"

      - name: Check AWS Config Compliance
        run: |
          python scripts/check_config_compliance.py
          --region us-east-1
          --report compliance-result.json

      - name: Post Results
        if: always()
        run: |
          python scripts/post_compliance_comment.py
          --report compliance-result.json
          --pr ${{ github.event.number }}
```

### Compliance as a Service in CI/CD

```python
# ci_compliance.py - run compliance checks in CI/CD
import os
import json
import subprocess
import requests

def run_compliance_pipeline(environment, terraform_dir):
    results = {
        "environment": environment,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": []
    }

    # 1. IaC scanning
    checkov_result = subprocess.run(
        ["checkov", "-d", terraform_dir, "-o", "json"],
        capture_output=True, text=True
    )
    checkov_data = json.loads(checkov_result.stdout)
    for failed_check in checkov_data.get("results", {}).get("failed_checks", []):
        results["checks"].append({
            "source": "checkov",
            "control": failed_check.get("check_id"),
            "resource": failed_check.get("resource"),
            "severity": failed_check.get("severity", "Medium"),
            "status": "FAILED"
        })

    # 2. OPA policy check
    opa_result = subprocess.run(
        ["opa", "eval", "-d", "policies/", "-i", f"{terraform_dir}/plan.json",
         "--format", "json", "data.terraform.deny"],
        capture_output=True, text=True
    )
    opa_data = json.loads(opa_result.stdout)
    for violation in opa_data.get("result", []):
        for msg in violation.get("expressions", [{}])[0].get("value", []):
            results["checks"].append({
                "source": "opa",
                "control": msg,
                "severity": "High",
                "status": "FAILED"
            })

    # 3. Post to compliance dashboard API
    response = requests.post(
        os.environ["COMPLIANCE_API_URL"],
        json=results,
        headers={"Authorization": f"Bearer {os.environ['COMPLIANCE_API_KEY']}"}
    )

    # 4. Block deployment if critical checks failed
    critical_failures = [c for c in results["checks"]
                        if c["severity"] in ["Critical", "High"] and c["status"] == "FAILED"]
    if critical_failures:
        raise Exception(f"Compliance check failed: {len(critical_failures)} critical/high issues found")

    return results
```

## Access Review Automation

### Automated Access Review Workflow

```python
def run_access_review():
    """Automated quarterly access review with certification."""
    # 1. Gather all users and their roles/groups
    idp_users = get_all_users_from_idp()
    cloud_roles = get_all_iam_roles()
    github_teams = get_all_github_teams()
    db_users = get_all_database_users()

    # 2. Check for inactive users (90+ days no login)
    inactive_users = []
    for user in idp_users:
        if user.last_login < datetime.utcnow() - timedelta(days=90):
            inactive_users.append(user.email)

    # 3. Check for over-privileged accounts
    admin_users = []
    for user in idp_users:
        if user.is_admin and not user.requires_admin_access:
            admin_users.append(user.email)

    # 4. Send review request to managers
    for manager, direct_reports in get_org_hierarchy().items():
        review = {
            "manager": manager,
            "due_date": datetime.utcnow() + timedelta(days=14),
            "team_members": [
                {"email": u.email, "roles": u.roles, "last_login": u.last_login,
                 "access_required": u.access_required}
                for u in direct_reports
            ]
        }
        send_review_request(manager, review)

    # 5. Generate report
    report = {
        "review_date": datetime.utcnow().isoformat(),
        "total_users": len(idp_users),
        "inactive_users": inactive_users,
        "admin_users_flagged": admin_users,
        "review_requests_sent": len(get_org_hierarchy())
    }
    return report
```

### Access Review Evidence Template

```
Access Review Report: Q1 2025
Reviewed by: Engineering Managers
Review Period: January 1 - March 31, 2025

Summary:
  Total Users Reviewed: 342
  Access Certifications: 328 (96%)
  Awaiting Response: 14 (4%)

Access Changes:
  Access Removed (terminated): 12
  Role Changes: 8
  Permission Additions (approved): 5
  Inactive Accounts Disabled: 7
  Admin Access Removed: 3

Compliance:
  This review satisfies:
  - SOC2 CC6.1 (Access provisioning and de-provisioning)
  - ISO 27001 A.9.2.1 (User registration and de-registration)
  - HIPAA 164.312(a)(1) (Access controls)
```

## Policy Management Automation

### Policy Version Control

Store policies in version control alongside code:

```
policies/
  access-control/
    policy-v2.1.md (approved policy document)
    implementation-guide.md (how to implement)
  change-management/
    change-management-policy-v3.0.md
    standard-change-models.md
  incident-response/
    incident-response-policy-v2.0.md
    severity-matrix.md
  data-protection/
    data-classification-policy-v1.2.md
    retention-schedule.md
```

Policy as code for automated enforcement:
```
policies-as-code/
  sentinel/
    require-encryption.sentinel
    restrict-admin-access.sentinel
  opa/
    deny-public-s3.rego
    deny-open-security-groups.rego
  checkov/
    .checkov.yml
    custom-policies/
```

### Policy Acceptance Workflow

```
1. Author creates/updates policy (PR in git)
2. Policy review by security/compliance team
3. Legal review (for regulatory impact)
4. Executive approval (for significant changes)
5. Policy published to compliance platform
6. Automated notification to all employees
7. Training completion tracked (if required)
8. Policy acceptance recorded
```

## Tool Integration Patterns

### Compliance Hub Integration

Central integration point connecting all compliance tools:

```
Compliance Hub (Vanta/Drata/Secureframe)
  |-- Connectors to cloud providers (AWS, Azure, GCP)
  |-- Connectors to SaaS tools (GitHub, Okta, Slack, Jira)
  |-- Automated evidence collection (scheduled + event-driven)
  |-- Control mapping and testing
  |-- Compliance scorecards
  |-- Auditor access portal
  |-- API integrations for:
       |-- SIEM (Splunk, Elastic)
       |-- CSPM (Wiz, Prisma Cloud)
       |-- IaC scanning (Checkov, tfsec)
       |-- Policy-as-code (OPA, Sentinel)
       |-- Ticketing (Jira, ServiceNow)
```

### Automation ROI Modeling

| Automation | Manual Hours/Month | Automated Hours/Month | Savings | Implementation Cost |
|------------|-------------------|----------------------|---------|-------------------|
| Evidence collection | 40 | 4 | 90% | 80 hours (setup) |
| Access reviews | 24 | 8 | 67% | 60 hours (integration) |
| Compliance reporting | 16 | 2 | 88% | 40 hours (dashboard) |
| IaC scanning | 20 | 0 | 100% | 20 hours (pipeline) |
| Policy management | 12 | 4 | 67% | 30 hours (template) |

Total monthly savings: 94 hours (~$15K/month at $160/hr blended rate)
Total implementation: 230 hours (~$37K one-time)
Payback period: 2.5 months
