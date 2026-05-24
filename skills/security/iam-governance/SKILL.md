---
name: iam-governance
description: >
  IAM Governance — identity lifecycle management, access certification, privileged access
  management, single sign-on federation, and IAM policy as code. Use when the user asks about
  IAM, identity governance, access certification, PAM, privileged access, SSO, Okta, Keycloak,
  SCIM provisioning, joiner/mover/leaver, or identity lifecycle.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, iam, governance, access-management, phase-8]
---

# IAM Governance

## Purpose
Design and implement identity governance programs covering the full identity lifecycle (joiner/mover/leaver), access certifications, privileged access management, SSO federation, and IAM-as-code for automated policy enforcement.

## Agent Protocol

### Trigger
- "IAM", "identity governance", "identity lifecycle", "joiner mover leaver"
- "access certification", "access review", "manager attestation"
- "PAM", "privileged access", "just-in-time access", "session recording", "credential vault"
- "SSO", "federation", "SAML", "OIDC", "OAuth", "Okta", "Keycloak", "Azure AD", "Entra ID"
- "SCIM provisioning", "HR integration", "identity federation"
- "IAM policy as code", "Terraform IAM", "least privilege analysis", "permission boundary"

### Input Context
- Current identity provider(s) and directories (AD, Azure AD, Okta, etc.)
- HR system for identity lifecycle integration
- Application portfolio for SSO/SCIM enablement
- Compliance requirements (SOX, SOC 2, PCI DSS, HIPAA)
- Number of users and roles to manage

### Output Artifact
- Identity lifecycle workflows, access certification campaign templates, PAM architecture, SSO integration guides, IAM-as-code policies

### Response Format
```
## Identity Lifecycle
{Provisioning flow, HR integration, deprovisioning process}

## Access Certification
{Campaign structure, reviewer assignments, remediation workflow}

## PAM Architecture
{Vaulting, JIT elevation, session recording, break glass}
```

### Completion Criteria
- [ ] Identity lifecycle automated with HR integration and SCIM
- [ ] Access certification campaigns designed with manager attestation
- [ ] PAM solution deployed with JIT access and session recording
- [ ] SSO federation established with SAML/OIDC for all applications
- [ ] IAM-as-code templates created for AWS/Azure/GCP
- [ ] Least privilege analysis completed with permission boundaries

## Workflow

1. **Assess identity maturity** — Evaluate current IdP, directories, provisioning
2. **Design identity lifecycle** — Define joiner/mover/leaver workflows with HR triggers
3. **Implement SCIM provisioning** — Automate user provisioning/deprovisioning across apps
4. **Configure SSO federation** — Deploy SAML/OIDC identity federation for app portfolio
5. **Deploy PAM** — Implement credential vaulting, JIT elevation, session recording
6. **Design access certifications** — Create certification campaigns with risk-based review
7. **Enforce IAM-as-code** — Write Terraform IAM policies with least privilege and boundaries
8. **Continuous governance** — Monthly certifications, quarterly privilege reviews, automated reporting

## Rules
- Every identity must be tied to a real person or service account with an owner
- Deprovisioning must occur within SLA (24h for terminations, 72h for transfers)
- Privileged access must be JIT with expiration, never standing
- Access certifications must occur at least quarterly for privileged roles
- IAM policies must be version-controlled and reviewed as code
- Break glass credentials must be vaulted with approval workflow

## References
- `references/identity-lifecycle.md` — Identity lifecycle: joiner/mover/leaver, SCIM, HR integration
- `references/access-certification.md` — Access certification campaigns and attestation
- `references/privileged-access.md` — PAM: JIT access, vaulting, session recording
- `references/sso-federation.md` — SSO federation: SAML, OIDC, OAuth, LDAP, Keycloak, Okta
- `references/iam-policy-as-code.md` — IAM as code: Terraform, policy simulation, least privilege

## Handoff
IAM governance outputs can be handed to devops for Terraform IAM module consumption, IT for SCIM provisioning configuration, and compliance for audit reporting.
