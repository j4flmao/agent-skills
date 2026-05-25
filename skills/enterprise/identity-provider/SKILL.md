---
name: enterprise-identity-provider
description: >
  Use this skill when implementing identity provider solutions: SSO, federation, directory sync, and access governance.
  This skill enforces: IdP selection, SSO configuration, directory synchronization, MFA enforcement.
  Do NOT use for: application-level auth, password policies, TLS configuration, network security.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, identity, phase-8]
---

# Identity Provider Agent

## Purpose
Designs and implements identity provider solutions including SSO, federation, directory sync, and access governance.

## Agent Protocol

### Trigger
Exact user phrases: identity provider, IdP, SSO, SAML, OIDC, Keycloak, Azure AD, Okta, federation, SCIM, user provisioning, identity federation.

### Input Context
- What IdP options are available (Keycloak self-hosted, Azure AD/Okta managed, Cognito)?
- What applications need SSO integration (OIDC vs SAML)?
- What directory services exist (LDAP, Active Directory)?
- What compliance requirements apply (SOC2, HIPAA, FedRAMP)?
- What is the current identity architecture and user count?

### Output Artifact
IdP architecture document with SSO configuration, directory sync plan, security policy, and audit framework.

### Response Format
```
## Identity Provider Architecture
### Provider: {name} | Model: {self-hosted/managed}
### SSO Protocol: {OIDC/SAML/federation}

### Directory Sync
{source} → {SCIM/LDAP} → {target} | Schedule: {interval}

### Security Policy
MFA: {enforcement scope}
Session: {timeout / max lifetime}
Conditional Access: {rules}

### Audit & Governance
{logging, review cadence, certification}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] IdP selected with justification
- [ ] SSO configured for all applications
- [ ] Directory sync operational with SCIM
- [ ] MFA enforced for all user groups
- [ ] Session policies defined
- [ ] Brute force protection configured
- [ ] Audit logging enabled and monitored
- [ ] Access certification schedule established

### Max Response Length
7000 tokens

## Workflow

### Step 1: IdP Selection
Evaluate three categories: self-hosted (Keycloak — full control, complex ops, open source), managed (Azure AD, Okta — low ops, feature-rich, per-user cost), cloud-native (Cognito — AWS integrated, limited federation). Choose based on team size, compliance needs, and existing cloud investment.

### Step 2: SSO Configuration
Configure OIDC for modern SPA/mobile apps (authorization code flow with PKCE). Configure SAML for legacy enterprise apps (SP-initiated, signed assertions). Implement federation between IdPs for acquisition/migration scenarios. Validate token exchange and attribute mapping per app.

### Step 3: Directory Sync
Connect to upstream directory (LDAP, Active Directory). Provision users via SCIM 2.0 (create, update, deactivate). Map groups from directory to application roles. Schedule incremental sync every 15 minutes, full sync nightly. Handle deprovisioning with soft-delete and grace period.

### Step 4: Security Configuration
Enforce MFA for all users (TOTP, WebAuthn, or SMS fallback). Configure conditional access policies (geo-fencing, device compliance, trusted networks). Set session policies (idle timeout 15min, max lifetime 8h). Implement brute force protection (account lockout after 5 failures, progressive delay).

### Step 5: Audit and Governance
Stream all IdP events to SIEM (logins, failures, role changes, MFA registration). Schedule quarterly access reviews with automated certification campaigns. Implement privilege escalation workflows with approval gates. Monitor for anomalous login patterns.

## Rules
- Never store passwords in application code or config files.
- OIDC is preferred over SAML for all new integrations.
- MFA must be enforced for all privileged accounts.
- Session tokens must be short-lived (15min idle, 8h absolute).
- SCIM deprovisioning must trigger within 5 minutes of directory change.
- IdP must be highly available (multi-region for self-hosted).
- Federation metadata must be signed and verified.
- Audit events must be immutable and retained per compliance requirements.

## References
- `references/idp-setup.md` — IdP installation and configuration
- `references/federation-sso.md` — SSO integration and federation patterns
- `references/idp-migration.md` — Identity provider migration strategies and cutover planning
- `references/saml-oidc.md` — SAML vs OIDC protocol comparison and integration patterns

## Handoff
For compliance requirements on identity governance, hand off to `enterprise-compliance-audit`. For cost tracking of IdP licensing, hand off to `enterprise-cost-governance`.
