---
name: cloud-native-security-offensive
description: >
  Use this skill when the user says 'aws privilege escalation paths', 'cloud attack path', 'imds ssrf', 'iam passrole abuse', 'azure managed identity abuse', 'cloud threat model', 'cloud red team review', 'how could an attacker escalate in our aws'. Explains cloud attack paths mechanically for authorized assessment and threat modeling, and always pairs each path with detection and remediation. Do NOT use for: implementing guardrails and detections in depth (cloud-native-security-defensive), general penetration-testing methodology (security/penetration-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, security, threat-modeling, iam, privilege-escalation, imds]
---

# Cloud Attack Paths (Defensive Threat Modeling)

## Purpose
Help defenders and authorized assessors understand how cloud misconfigurations chain into account compromise, so they can find and close those paths first. Scope is explanation, attack-path review of the user's own environment, and remediation — not weaponized tooling against third parties.

## Agent Protocol

### Trigger
"privilege escalation paths", "cloud attack path", "IMDS SSRF", "iam:PassRole", "managed identity abuse", "cloud threat model", "red team review of our cloud".

### Input Context
- Confirmation the environment is the user's own or in an authorized engagement scope.
- IAM policies/role graph, compute types (EC2, Lambda, AKS/EKS/GKE), exposed apps.

### Output Artifact
Attack-path table with detection and fix for each edge. No file unless requested.

### Response Format
```
Path: {start principal} -> {permission/misconfig} -> {gained privilege}
Preconditions: {...}
Detection: {log event / finding}
Remediation: {policy change, condition key, SCP}
```

### Completion Criteria
- [ ] Every path lists a detection and a remediation.
- [ ] No step-by-step exploitation against targets outside the user's authorization.

## Core Model
In cloud, an attacker's goal is credentials for a more privileged principal. Edges in the graph are IAM permissions that let one principal obtain, create, or modify credentials or policies of another. Tools such as PMapper (AWS) and BloodHound/AzureHound (Entra ID) model this graph for defenders.

## AWS Privilege-Escalation Edges

| Permission(s) held | Why it escalates | Remediation |
|---|---|---|
| `iam:PassRole` + `ec2:RunInstances` | Launch an instance with a more privileged instance profile, then use its role credentials | Scope `iam:PassRole` `Resource` to specific role ARNs and use the `iam:PassedToService` condition |
| `iam:PassRole` + `lambda:CreateFunction` + `lambda:InvokeFunction` | Function runs with the passed role | Same; restrict which roles Lambda may receive |
| `iam:CreatePolicyVersion` (with set-as-default) | Replace a policy attached to yourself with `*:*` | Never grant on policies attached to the holder; permission boundaries |
| `iam:PutUserPolicy` / `iam:AttachUserPolicy` on self | Grant yourself admin | Deny self-modification via `aws:username`/`${aws:PrincipalArn}` conditions |
| `iam:CreateAccessKey` / `iam:CreateLoginProfile` on other users | Take over another user | Eliminate IAM users; SSO only |
| `iam:UpdateAssumeRolePolicy` | Add yourself to a privileged role's trust policy | Restrict to platform team; alert on event |
| `sts:AssumeRole` on roles with `"Principal": {"AWS": "*"}` or weak external ID | Cross-account assumption | Require specific principals, `aws:PrincipalOrgID`, `sts:ExternalId` |
| `lambda:UpdateFunctionCode` on a privileged function | Code runs with the function's role | Separate deploy role, code signing |

Detection for all: CloudTrail management events for the listed API names, plus GuardDuty IAM anomaly findings.

## Instance Metadata Service (IMDS)
- Endpoint `169.254.169.254` serves temporary credentials for the attached role.
- **IMDSv1** answers simple GET requests, so a server-side request forgery (SSRF) bug in an app can read `.../iam/security-credentials/<role>`.
- **IMDSv2** requires a session token obtained with `PUT /latest/api/token` and header `X-aws-ec2-metadata-token-ttl-seconds`; most SSRF primitives cannot send a PUT with custom headers. Default hop limit 1 (set 2 for containers that need it) blocks forwarding through extra network hops.
- Remediation: `HttpTokens=required` everywhere (SCP `ec2:MetadataHttpTokens`), EKS Pod Identity or IRSA instead of node roles for pods, and the GuardDuty `InstanceCredentialExfiltration` findings for detection.

## Azure / Entra ID Edges
| Misconfiguration | Effect | Remediation |
|---|---|---|
| Managed identity with Owner/Contributor at subscription scope on an internet-facing VM/App Service | Code execution → token from IMDS (`169.254.169.254/metadata/identity/oauth2/token`) → subscription control | Scope roles to resource group/resource; minimal data-plane roles |
| `Microsoft.Authorization/roleAssignments/write` | Assign yourself any role | Restrict to PIM-eligible admins |
| Application owner of an app with high Graph permissions | Add a secret to the app, authenticate as it | Monitor "Add service principal credentials" audit events; restrict app ownership |
| Automation Account / Run Command rights | Execute code as the VM's identity | Treat as admin-equivalent |

## GCP Edges
- `iam.serviceAccounts.actAs` + compute create → run as a privileged service account.
- `iam.serviceAccountKeys.create` → mint a long-lived key; block with org policy `iam.disableServiceAccountKeyCreation`.
- `iam.serviceAccounts.getAccessToken` (Service Account Token Creator) → impersonation; audit and scope narrowly.

## Serverless and Workload Risks
- Function environment variables readable via injection or by anyone with `lambda:GetFunctionConfiguration` → keep secrets in Secrets Manager/Key Vault and fetch at runtime.
- Event-injection: untrusted event fields (S3 key names, queue messages) passed to shells or SQL.
- Over-privileged CI OIDC trust: a trust policy matching `repo:org/*` lets any repo's workflow assume the role → pin `sub` to repo + branch/environment.

## Assessment Workflow (authorized)
1. Enumerate principals and policies with read-only credentials (`iam:GetAccountAuthorizationDetails`).
2. Build the escalation graph (PMapper, Cloudsplaining, Prowler checks).
3. Rank paths by start-point exposure (internet-facing workload > developer laptop > CI).
4. Fix by removing the edge, not by adding detections only.
5. Re-run graph analysis in CI after IAM changes.

## Checklist
- [ ] No principal outside the platform team can modify IAM policies or trust policies.
- [ ] `iam:PassRole` always resource-scoped.
- [ ] IMDSv2 enforced; pod-level identities in Kubernetes.
- [ ] CI OIDC trust policies pinned to repository and ref/environment.
- [ ] Detections exist for every edge listed above.

## References
- Related skills: `skills/cloud-native/cloud-security-defensive/SKILL.md`, `skills/security/penetration-testing/SKILL.md`, `skills/security/iam-governance/SKILL.md`.
