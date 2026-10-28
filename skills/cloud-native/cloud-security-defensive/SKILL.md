---
name: cloud-native-security-defensive
description: >
  Use this skill when the user says 'harden aws account', 'detect cloud intrusion', 'cloudtrail detection', 'service control policy', 'scp guardrails', 'secure azure tenant', 'cloud posture', 'guardduty', 'imdsv2 enforcement', 'least privilege iam'. Hardens AWS/Azure/GCP organizations with preventive guardrails, detective telemetry, and least-privilege IAM, and writes concrete detections and policy code. Do NOT use for: attack-path explanation (cloud-native-security-offensive), CSPM product selection (security-cspm), secret storage design (vault).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, security, aws, azure, gcp, iam, scp, cloudtrail, detection]
---

# Cloud Security — Defensive Engineering

## Purpose
Turn a cloud estate into one where dangerous actions are prevented by organization-level guardrails, everything else is logged centrally and immutably, and anomalous identity activity is detected quickly. Identity is the perimeter in cloud, so most controls are IAM controls.

## Agent Protocol

### Trigger
"harden aws account", "detect cloud intrusion", "cloudtrail", "SCP", "guardrails", "secure azure tenant", "cloud posture", "guardduty", "IMDSv2", "least privilege".

### Input Context
- Cloud(s) and org structure (AWS Organizations OUs, Azure management groups, GCP folders).
- Existing logging destinations (SIEM, log archive account).
- Compliance targets (CIS Benchmarks, SOC 2, ISO 27001).

### Output Artifact
Policy-as-code (SCP/Azure Policy/Org Policy JSON or Terraform) and detection queries. No file unless requested.

### Response Format
```
Layer: {preventive|detective|responsive}
Control: {name}
Scope: {org/OU/account/subscription/project}
Code: {policy or query}
Break-glass impact: {who is exempt and how}
```

### Completion Criteria
- [ ] Preventive guardrails applied at org/OU level with a documented break-glass exemption.
- [ ] Org-wide audit logging to a separate, write-protected account/project.
- [ ] Detections mapped to concrete log events.

## Control Layers

| Layer | AWS | Azure | GCP |
|---|---|---|---|
| Org guardrails | Service Control Policies, Resource Control Policies, declarative policies | Azure Policy (deny), management-group RBAC | Organization Policy constraints |
| Audit log | CloudTrail organization trail (+ data events where needed) | Activity Log + Microsoft Entra sign-in/audit logs via diagnostic settings | Cloud Audit Logs (Admin Activity always on; Data Access opt-in) |
| Threat detection | GuardDuty, Security Hub | Microsoft Defender for Cloud, Sentinel | Security Command Center |
| Unused access | IAM Access Analyzer (unused access findings) | Entra access reviews | IAM Recommender |

## Preventive Guardrails (AWS SCP)
SCPs do not grant permissions; they cap what principals in member accounts can do. They never affect the management account.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProtectAuditTrail",
      "Effect": "Deny",
      "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail", "cloudtrail:UpdateTrail",
                 "guardduty:DeleteDetector", "guardduty:DisassociateFromMasterAccount",
                 "config:StopConfigurationRecorder", "config:DeleteConfigurationRecorder"],
      "Resource": "*",
      "Condition": { "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/BreakGlassAdmin" } }
    },
    {
      "Sid": "RegionAllowList",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "sts:*", "support:*", "cloudfront:*", "route53:*"],
      "Resource": "*",
      "Condition": { "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] } }
    },
    {
      "Sid": "RequireIMDSv2",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": { "StringNotEquals": { "ec2:MetadataHttpTokens": "required" } }
    }
  ]
}
```
Global services (IAM, Organizations, STS global endpoint, CloudFront, Route 53) must be excluded from region deny lists or they break.

Also enable at account level: S3 Block Public Access (account-wide), EBS encryption by default, and the EC2 account default `HttpTokens=required` for new instances.

## Detective Controls — High-Signal Events
| Signal | Log event | Why |
|---|---|---|
| Root user activity | CloudTrail `userIdentity.type = "Root"` | Root should be unused after setup |
| Console login without MFA | `ConsoleLogin` with `additionalEventData.MFAUsed = "No"` | Credential theft |
| Logging tampering | `StopLogging`, `DeleteTrail`, `PutEventSelectors` | Defense evasion |
| Persistence via IAM | `CreateAccessKey`, `CreateLoginProfile`, `AttachUserPolicy`, `PutRolePolicy`, `UpdateAssumeRolePolicy` | Backdoor creation |
| Enumeration burst | Many `List*`/`Describe*`/`Get*` from one principal in minutes, especially `AccessDenied` | Recon tooling (e.g. Pacu, ScoutSuite run by an attacker) |
| Credential exfil | GuardDuty `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` | Stolen instance role creds used elsewhere |

Example (CloudTrail Lake / Athena SQL):
```sql
SELECT eventTime, userIdentity.arn, sourceIPAddress, eventName
FROM cloudtrail_logs
WHERE eventName IN ('CreateAccessKey','CreateLoginProfile','AttachUserPolicy','PutUserPolicy')
  AND eventTime > now() - interval '1' day
ORDER BY eventTime DESC;
```

## Least Privilege Workflow
1. Start from AWS managed job-function policies only for humans; workloads get custom policies.
2. Generate a policy from CloudTrail activity (IAM Access Analyzer policy generation) after a soak period.
3. Remove unused roles, keys, and permissions using Access Analyzer unused-access findings.
4. Replace IAM users + access keys with SSO (IAM Identity Center) for humans and roles/OIDC federation for CI.
5. Add permission boundaries for delegated role creation.

## Anti-Patterns
- `"Action": "*"` / `"Resource": "*"` on workload roles.
- Logs stored in the same account an attacker can administer.
- Long-lived access keys in CI systems (use GitHub/GitLab OIDC → `AssumeRoleWithWebIdentity`).
- Alerting on everything from CSPM with no owner routing → alert fatigue, real findings ignored.
- SCP deny without a break-glass path → locked out during an incident.

## Checklist
- [ ] Org trail + log archive account with S3 Object Lock or bucket policy denying deletes.
- [ ] SCPs: protect logging/security services, region allow-list, IMDSv2, deny leaving org.
- [ ] GuardDuty/Defender/SCC enabled org-wide with delegated admin.
- [ ] Detections above routed to on-call with runbooks.
- [ ] CIS Benchmark scan scheduled; drift in IaC detected (`terraform plan` in CI).

## References
- Related skills: `skills/cloud-native/cloud-security-offensive/SKILL.md`, `skills/devops/vault/SKILL.md`, `skills/devops/policy-as-code/SKILL.md`.
