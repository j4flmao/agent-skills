---
name: cspm
description: >
  Cloud Security Posture Management (CSPM) — detect and remediate cloud
  misconfigurations, enforce compliance frameworks, manage cloud entitlements, and automate
  security responses. Use when the user asks about CSPM, cloud security posture, Wiz, Prisma Cloud,
  CIS benchmarks, compliance automation, CIEM, or cloud remediation.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, cspm, cloud-security, phase-8]
---

# Cloud Security Posture Management

## Purpose
Implement CSPM to continuously monitor cloud environments for misconfigurations, enforce compliance frameworks (CIS, SOC 2, PCI DSS, HIPAA), automate remediation of security findings, and manage cloud identity entitlements. CSPM provides visibility, compliance automation, and risk reduction across multi-cloud infrastructure.

## Agent Protocol

### Trigger
- "CSPM", "cloud security posture", "cloud misconfiguration", "Wiz", "Prisma Cloud"
- "CIS benchmark", "AWS Security Hub", "Azure Security Center", "GCP Security Command Center"
- "compliance automation", "cloud compliance", "SOC 2 cloud", "PCI DSS cloud"
- "auto-remediation", "AWS Config", "Azure Policy", "GCP Org Policy"
- "CIEM", "cloud entitlement", "permission analysis", "unused permissions", "Orca", "Lacework"

### Input Context
- Cloud providers and accounts/subscriptions/project structure with hierarchy
- Compliance frameworks required (CIS, SOC 2, PCI DSS, HIPAA, NIST, FedRAMP)
- Current monitoring tools and SIEM/SOAR integration points
- Incident response and ticketing workflow (Jira, ServiceNow, PagerDuty)
- IaC tooling (Terraform, CloudFormation, Pulumi) for fix-as-code

### Output Artifact
CSPM deployment plan, compliance mapping matrices, automated remediation runbooks, CIEM analysis reports, IaC policy templates.

### Response Format
```
## CSPM Architecture
{Platform selection, multi-account topology, data collection, agent vs agentless}

## Compliance Mapping
{Control-to-framework mappings, evidence collection automation, reporting}

## Remediation Strategy
{Auto-remediation rules, approval workflows, event-driven responses, fix-as-code}
```

### Completion Criteria
- [ ] CSPM platform deployed across all cloud accounts/subscriptions with agentless scanning
- [ ] Compliance frameworks mapped with automated evidence collection
- [ ] Auto-remediation rules deployed for critical misconfigurations
- [ ] CIEM analysis completed with unused permissions identified and remediated
- [ ] SIEM/SOAR integration configured for alert enrichment and response
- [ ] Dashboard and reporting set up for stakeholder review
- [ ] IaC scanning integrated into CI/CD pipeline (shift-left)

## Architecture / Decision Trees

### CSPM Platform Selection Decision Tree

```
What is the primary cloud provider?
├── AWS-only
│   ├── Need deep AWS integration → AWS Security Hub + AWS Config
│   ├── Need multi-cloud → Wiz, Prisma Cloud, Orca, Lacework
│   └── Need agentless scanning → Wiz, Orca (best agentless)
├── Azure-only
│   ├── Deep Azure integration → Microsoft Defender for Cloud
│   └── Multi-cloud → Prisma Cloud, Wiz, Orca
├── GCP-only
│   └── Security Command Center + Prisma Cloud or Wiz
└── Multi-cloud (2+ providers)
    ├── Agentless, developer-friendly → Wiz
    ├── Compliance-heavy, GRC integration → Prisma Cloud
    ├── DSPM + CSPM combined → Orca
    └── Budget-conscious, open-source → Prowler + Security Hub + custom

What is the primary driver?
├── Compliance automation (CIS, SOC 2, PCI DSS)
│   ├── AWS → Security Hub + Config + Prowler
│   ├── Multi-cloud → Prisma Cloud (best compliance reporting)
│   └── Open-source → Prowler (free, 500+ checks)
├── Vulnerability management
│   └── Wiz (best vulnerability context, internet exposure graph)
├── CIEM (Cloud Infrastructure Entitlement Management)
│   └── Prisma Cloud CIEM or Ermetic/Tenable CIEM
└── Data security posture management (DSPM)
    └── Orca (DSPM built-in), Wiz (code-to-cloud data lineage)
```

### Remediation Strategy Decision Tree

```
What is the finding severity?
├── CRITICAL (public S3 bucket, open security group, IAM key exposed)
│   └── Auto-remediate immediately → Notify team
├── HIGH (unencrypted data, logging disabled)  
│   └── Auto-remediate within 1 hour → Create ticket
├── MEDIUM (non-compliant tagging, minor misconfig)
│   └── Create ticket → Fix in sprint
└── LOW (recommendation, best practice)
    └── Log for quarterly review → Remediate if resources permit

Can the remediation be automated safely?
├── YES (adding encryption, enabling logging, removing open rule)
│   └── Auto-remediate with IaC (Terraform/CloudFormation)
└── NO (requires application change, high blast radius)
    └── Manual remediation with documented runbook and approval
```

## Workflow

### Step 1: Cloud Inventory and Discovery

Map all cloud resources across accounts/regions:

```bash
# AWS - List all accounts in organization
aws organizations list-accounts --query 'Accounts[*].[Id,Name,Status]' --output table

# Azure - List all subscriptions
az account list --query '[].{name:name, id:id}' --output table

# GCP - List all projects
gcloud projects list --format='table(projectId, name, lifecycleState)'
```

**Multi-account/Subscription/Project Strategy:**
```
Root Organization
├── Security Account (CSPM deployment, centralized logging, SIEM)
├── Infrastructure Account (shared services, VPC, DNS)
├── Log Archive Account (immutable log storage)
├── Network Account (transit gateway, firewall)
├── Dev OU
│   ├── Dev Account A
│   ├── Dev Account B
│   └── Dev Account C
├── Staging OU
│   └── Staging Account
└── Prod OU
    ├── Prod Account A
    ├── Prod Account B
    └── Prod Account C
```

**CSPM scanning scope:** All accounts, all regions, all resource types. Agentless scanning preferred (Wiz, Orca) — no agents to maintain, no performance impact. Agent-based scanning for specific compliance where process-level visibility is needed.

### Step 2: Compliance Framework Mapping

**CIS Benchmarks Coverage:**

| CIS Benchmark | Controls | AWS | Azure | GCP |
|--------------|----------|-----|-------|-----|
| CIS 1.0 Identity and Access Management | 20 | IAM key rotation, password policy | RBAC, conditional access | IAM, service accounts |
| CIS 2.0 Storage | 15 | S3 bucket public access, encryption | Blob storage, firewall | Cloud Storage, uniform ACL |
| CIS 3.0 Logging and Monitoring | 25 | CloudTrail, Config, GuardDuty | Azure Monitor, Activity Log | Cloud Audit Logs, Logging |
| CIS 4.0 Networking | 20 | Security groups, VPC flow logs | NSG, NSG flow logs | VPC, firewall rules |
| CIS 5.0 Database | 15 | RDS encryption, public access | SQL auditing, TDE | Cloud SQL, IAM auth |
| CIS 6.0 Compute | 15 | EC2 IMDSv2, AMI scanning | VM managed disks, backup | GCE shielded VM, OS patch |

**CIS Control Example (AWS):**
```yaml
cis_aws_foundations_1_1:
  control_id: "1.1"
  description: "Maintain current contact details"
  severity: "LOW"
  resource_type: "aws_account"
  remediation: |
    AWS Account → Alternate Contacts → Update billing/operations/security contacts
    Terraform:
      resource "aws_account_alternate_contact" "security" {
        alternate_contact_type = "SECURITY"
        name                   = "Security Team"
        title                  = "Security Lead"
        email_address          = "security@company.com"
        phone_number           = "+1-555-000-0000"
      }

cis_aws_foundations_1_3:
  control_id: "1.3"
  description: "Ensure no root user access keys exist"
  severity: "CRITICAL"
  resource_type: "iam_user_root"
  remediation: |
    Delete root access keys via AWS Console: IAM → Security Credentials
    CIS benchmark: alert on root key creation with CloudTrail + EventBridge
    EventBridge rule:
      event_pattern:
        source: ["aws.iam"]
        detail-type: ["AWS API Call via CloudTrail"]
        detail:
          eventSource: ["iam.amazonaws.com"]
          eventName: ["CreateAccessKey"]
          userIdentity:
            type: ["Root"]
      target: sns_topic
```

### Step 3: Automated Remediation

**AWS Config Auto-Remediation:**
```yaml
# AWS Config rule with auto-remediation
ConfigRule:
  Type: AWS::Config::ConfigRule
  Properties:
    Source:
      Owner: AWS
      SourceIdentifier: S3_BUCKET_PUBLIC_READ_PROHIBITED
    
RemediationConfiguration:
  Type: AWS::Config::RemediationConfiguration
  Properties:
    ConfigRuleName: !Ref ConfigRule
    TargetId: "AWS-DisableS3BucketPublicReadWrite"  # SSM automation doc
    TargetType: "SSM_DOCUMENT"
    Parameters:
      AutomationAssumeRole:
        StaticValue:
          Values: ["arn:aws:iam::*:role/ConfigRemediationRole"]
      BucketName:
        ResourceValue:
          Value: "RESOURCE_ID"
    Automatic: true
    MaximumAutomaticAttempts: 5
    RetryAttemptSeconds: 60
```

**Azure Policy Auto-Remediation:**
```json
{
  "policyRule": {
    "if": {
      "field": "type",
      "equals": "Microsoft.Storage/storageAccounts"
    },
    "then": {
      "effect": "DeployIfNotExists",
      "details": {
        "type": "Microsoft.Storage/storageAccounts/blobServices/containers/providers/deployments",
        "roleDefinitionIds": ["/providers/Microsoft.Authorization/roleDefinitions/..."]
      }
    }
  }
}
```

**GCP Org Policy:**
```yaml
# Restrict public access on Cloud Storage
constraint: "constraints/storage.publicAccessPrevention"
apply_to:
  - organization_id: "123456789"
enforcement: true

# Require CMEK for all GCE disks
constraint: "constraints/compute.requireCmek"
apply_to:
  - project_id: "my-project"
enforcement: true
```

### Step 4: CIEM (Cloud Infrastructure Entitlement Management)

**Permission Analysis:**
```python
# Analyze IAM for unused permissions
iam_analysis = {
    "users": [
        {
            "user_name": "deploy-bot",
            "attached_policies": ["AdministratorAccess"],
            "last_used_services": ["S3", "EC2", "CodeDeploy"],
            "unused_permissions": ["IAM:*", "RDS:*", "Lambda:*", "KMS:*"],
            "risk_score": 85,
            "recommended_policy": "arn:aws:iam::aws:policy/AmazonS3FullAccess\narn:aws:iam::aws:policy/AmazonEC2FullAccess",
            "action": "Replace inline with custom managed policy scoped to S3+EC2+CodeDeploy"
        }
    ],
    "roles": [
        {
            "role_name": "s3-access-role",
            "attached_policies": ["AmazonS3FullAccess"],
            "last_used_actions": ["s3:GetObject", "s3:ListBucket"],
            "unused_permissions": ["s3:PutObject", "s3:DeleteObject", "s3:PutBucketPolicy"],
            "risk_score": 30,
            "recommended_policy": "Custom policy with s3:GetObject + s3:ListBucket only",
            "action": "Create scoped inline policy, detach S3FullAccess"
        }
    ],
    "service_accounts": [
        {
            "account_name": "terraform-state-manager",
            "attached_policies": ["AmazonS3FullAccess", "AmazonDynamoDBFullAccess"],
            "last_used_services": ["S3", "DynamoDB"],
            "unused_services": [],
            "risk_score": 40,
            "recommended": "Create custom managed policy scoped to specific buckets and tables"
        }
    ]
}
```

**CIEM Remediation Priority:**

| Risk Score | Recommendation | Timeline |
|-----------|----------------|----------|
| 80-100 | Immediate: Remove administrative access, create scoped policy | 24 hours |
| 60-79 | High: Create least privilege policy, attach, monitor for 14 days | 7 days |
| 40-59 | Medium: Review unused services, remove unused service permissions | 30 days |
| 0-39 | Low: Reduce permissions during next quarterly review | 90 days |

### Step 5: IaC Scanning (Shift-Left)

**Terraform Policy as Code:**
```hcl
# sentinel.hcl - HashiCorp Sentinel policy for Terraform Cloud/Enterprise
policy "restrict-public-s3" {
  source            = "./restrict-public-s3.sentinel"
  enforcement_level = "hard-mandatory"
}

policy "require-encryption" {
  source            = "./require-encryption.sentinel"
  enforcement_level = "soft-mandatory"
}
```

```python
# restrict-public-s3.sentinel
import "tfplan"

# Check all aws_s3_bucket resources for public access blocks
s3_buckets = tfplan.resource_changes["aws_s3_bucket_public_access_block"]

violations = []
for _, bucket in s3_buckets.items():
    if bucket.applied.block_public_acls != true:
        violations.append(bucket)
    if bucket.applied.block_public_policy != true:
        violations.append(bucket)
    if bucket.applied.ignore_public_acls != true:
        violations.append(bucket)
    if bucket.applied.restrict_public_buckets != true:
        violations.append(bucket)

violations_count = length(violations)
main = rule {
    violations_count == 0
}
```

**Checkov (Open Source IaC Scanner):**
```yaml
# .checkov.yaml
compact: true
quiet: true
skip-check:
  - CKV_AWS_23  # Skip S3 bucket level public block (we enforce at account level)
  - CKV_AWS_115 # Skip Lambda function-level concurrent execution limit
framework:
  - terraform
  - cloudformation
  - kubernetes
output: cli
soft-fail: false  # Fail CI pipeline on any violation
```

**Pre-commit IaC Security Scan:**
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/bridgecrewio/checkov
    rev: "v3.0.0"
    hooks:
      - id: checkov
        args: ["--directory", ".", "--compact"]
  - repo: https://github.com/aquasecurity/tfsec
    rev: "v1.28.0"
    hooks:
      - id: tfsec
        args: ["--soft-fail"]
```

### Step 6: CSPM Integration with SIEM/SOAR

**Event Flow:**
```
CSPM Finding (Wiz/Prisma) → EventBridge/SNS → SIEM (correlation) → SOAR (playbook)
```

**AWS Security Hub → SIEM Integration:**
```python
import boto3
import json
from datetime import datetime, timedelta

def forward_security_hub_findings(siem_endpoint: str):
    """Forward Security Hub findings to SIEM."""
    securityhub = boto3.client('securityhub')
    findings_response = securityhub.get_findings(
        Filters={
            'WorkflowStatus': [{'Value': 'NEW', 'Comparison': 'EQUALS'}],
            'SeverityLabel': [{'Value': 'CRITICAL', 'Comparison': 'EQUALS'}],
            'UpdatedAt': [
                {'Start': (datetime.utcnow() - timedelta(hours=1)).isoformat() + 'Z',
                 'End': datetime.utcnow().isoformat() + 'Z'}
            ]
        },
        MaxResults=100
    )

    for finding in findings_response['Findings']:
        # Transform to SIEM format
        siem_event = {
            "event_type": "cspm_finding",
            "severity": finding['Severity']['Label'],
            "title": finding['Title'],
            "description": finding['Description'],
            "resource_type": finding['Resources'][0]['Type'],
            "resource_id": finding['Resources'][0]['Id'],
            "account_id": finding['AwsAccountId'],
            "region": finding['Region'],
            "remediation": finding.get('Remediation', {}).get('Recommendation', {}).get('Text', ''),
            "compliance": finding.get('Compliance', {}).get('RelatedRequirements', []),
            "timestamp": finding['UpdatedAt']
        }
        # POST to SIEM endpoint
        requests.post(siem_endpoint, json=siem_event)
```

### Step 7: CSPM Architecture Patterns

| Pattern | Description | Best For |
|---------|-------------|----------|
| Centralized | Single CSPM instance scanning all accounts | Single-region, single-cloud |
| Distributed | CSPM deployed per OU/region with central aggregation | Large enterprises, multi-region |
| Agentless | API-based scanning (no agents) | Wiz, Orca — minimal overhead |
| Agent-based | Lightweight agent on each workload | Prisma Cloud, Lacework — runtime visibility |
| Hybrid | Agentless for posture + agent for runtime | Defense-in-depth, regulated environments |

### Step 8: CSPM Maturity Model

| Level | Characteristics | Practices |
|-------|----------------|-----------|
| 1: Initial | Manual checks, reactive | No automated scanning, reactive to breaches |
| 2: Defined | Basic automated scanning | One CSPM tool, weekly scans, manual remediation |
| 3: Managed | Multi-account scanning, prioritized | Automated scanning across all accounts, severity-based remediation |
| 4: Measured | Auto-remediation, compliance automation | Auto-remediate CRITICAL/HIGH, compliance evidence automation, CIEM |
| 5: Optimized | Shift-left, predictive, full lifecycle | IaC scanning in CI/CD, no-drift enforcement, predictive risk scoring |

## Common Pitfalls

### Pitfall 1: Scanning Production Only
Scanning only production leaves dev/staging environments unmonitored. Misconfigurations in non-prod are learning opportunities and often contain production-like data. Scan all environments.

### Pitfall 2: Alert Fatigue Without Priority
CSPM tools generate thousands of findings. Without severity classification and risk-based prioritization, teams ignore all findings. Classify by: exploitability, internet exposure, data sensitivity, compliance requirement.

### Pitfall 3: Auto-Remediation Without Approval
Auto-remediating without testing breaks applications. Example: auto-revoking a security group rule that an application depends on. Use run-first mode or approval workflow for medium+ blast radius changes.

### Pitfall 4: No Fix-as-Code
Manual fixes in console don't prevent recurrence. Every remediation must update the IaC (Terraform, CloudFormation) to prevent configuration drift. Document fix-as-code alongside remediation.

### Pitfall 5: Ignoring CIEM
CSPM without CIEM misses the highest-risk attack path: over-privileged identities. IAM misconfigurations are the #1 cause of cloud breaches. Implement CIEM alongside CSPM.

### Pitfall 6: CSPM Coverage Gaps
Not all resources are scanned: Lambda@Edge, API Gateway custom domains, ECR repositories, etc. Verify CSPM tool covers all resource types in use. Custom rule engine for uncovered resources.

### Pitfall 7: No Compliance Evidence Automation
Manual evidence collection for audits is error-prone and time-consuming. CSPM tools can auto-generate compliance evidence. Configure automated evidence snapshots for each control.

### Pitfall 8: Configuration Drift
IaC-deployed resources manually modified create drift that future IaC runs revert. Use drift detection: AWS Config, Azure Policy, GCP Asset Inventory. Alert on drift. Require IaC-only changes.

## Best Practices

- Deploy CSPM across ALL cloud accounts and environments (dev, staging, prod)
- Use agentless scanning as primary — API-based, no performance impact, instant coverage
- Map CIS benchmarks for quick compliance wins, then add framework-specific controls
- Implement severity-based auto-remediation with IaC update (fix-as-code)
- Classify findings by: exploitability × exposure × data sensitivity × internet accessibility
- Integrate CSPM with CI/CD via IaC scanning (Checkov, tfsec, Sentinel) — block misconfigurations before deployment
- Implement CIEM for all IAM roles and users — quarterly least-privilege review
- Automate compliance evidence collection for audit frameworks
- Monitor CSPM health: scanning completion, agent connectivity, new resource coverage
- Use CSPM context in vulnerability management: prioritize CVEs on internet-exposed resources with sensitive data

## Performance Considerations

- Agentless CSPM scanning: 1-2 hours for 1000 AWS accounts. Most tools scan every 24h by default. Trigger on-demand for critical changes
- IaC scanning: Checkov completes in 30-90 seconds for typical Terraform project. Pre-commit hook adds < 5s
- CSPM platform throughput: Wiz scans 10M+ resources daily. Prisma Cloud supports 5000+ accounts
- Cost: CSPM tools priced per resource or per account. Average $0.50-2.00 per resource per month
- API rate limits: AWS Organizations (20 req/s), Azure Resource Graph (15 req/s), GCP Cloud Asset Inventory (2 req/s per project)

## Rules

- Every cloud resource must be scanned within 24 hours of creation
- CRITICAL and HIGH findings must have automated or manual remediation within SLA
- All permissions must be reviewed quarterly (CIEM cycle)
- Compliance evidence must be collected automatically, never manually
- Changes to IAM policies must trigger immediate permission analysis
- IaC changes must be scanned for security misconfigurations before merge
- CSPM findings must be forwarded to SIEM for correlation
- Auto-remediation must include IaC update (fix-as-code)
- CSPM coverage must be audited quarterly for resource type gaps
- Configuration drift must be detected and alerted with a maximum 24-hour delay

## References
  - references/automated-remediation.md — Automated Remediation for CSPM
  - references/ciem-permissions.md — CIEM — Cloud Infrastructure Entitlement Management
  - references/compliance-frameworks.md — Compliance Frameworks for CSPM
  - references/cspm-advanced.md — Cspm Advanced Topics
  - references/cspm-fundamentals.md — Cspm Fundamentals
  - references/cspm-integration.md — CSPM Integration
  - references/cspm-platforms.md — CSPM Platforms
## Handoff
CSPM outputs can be handed to devops for IaC policy enforcement, security-engineering for SIEM tuning, and compliance for audit evidence collection.
