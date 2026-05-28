---
name: enterprise-identity-provider
description: >
  Use this skill when implementing identity provider solutions: SSO, federation, directory sync, and access governance.
  This skill enforces: IdP selection, SSO configuration, directory synchronization, MFA enforcement.
  Do NOT use for: application-level auth, password policies, TLS configuration, network security.
version: "1.1.0"
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
{source} -> {SCIM/LDAP} -> {target} | Schedule: {interval}

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
Evaluate three categories: self-hosted (Keycloak -- full control, complex ops, open source), managed (Azure AD, Okta -- low ops, feature-rich, per-user cost), cloud-native (Cognito -- AWS integrated, limited federation). Choose based on team size, compliance needs, and existing cloud investment.

### Step 2: SSO Configuration
Configure OIDC for modern SPA/mobile apps (authorization code flow with PKCE). Configure SAML for legacy enterprise apps (SP-initiated, signed assertions). Implement federation between IdPs for acquisition/migration scenarios. Validate token exchange and attribute mapping per app.

### Step 3: Directory Sync
Connect to upstream directory (LDAP, Active Directory). Provision users via SCIM 2.0 (create, update, deactivate). Map groups from directory to application roles. Schedule incremental sync every 15 minutes, full sync nightly. Handle deprovisioning with soft-delete and grace period.

### Step 4: Security Configuration
Enforce MFA for all users (TOTP, WebAuthn, or SMS fallback). Configure conditional access policies (geo-fencing, device compliance, trusted networks). Set session policies (idle timeout 15min, max lifetime 8h). Implement brute force protection (account lockout after 5 failures, progressive delay).

### Step 5: Audit and Governance
Stream all IdP events to SIEM (logins, failures, role changes, MFA registration). Schedule quarterly access reviews with automated certification campaigns. Implement privilege escalation workflows with approval gates. Monitor for anomalous login patterns.

## Architecture / Decision Trees

### Deployment Model Decision Tree

| Model | Pros | Cons | Best For |
|---|---|---|---|
| Self-hosted (Keycloak) | Full control, no per-user cost, customizable | Operational overhead, HA required | Large orgs with ops team |
| Managed (Azure AD, Okta) | Low ops, SLA, feature-rich | Per-user cost, vendor lock-in | Most organizations |
| Cloud-native (Cognito) | AWS integration, low cost | Limited federation, AWS-only | AWS-native shops |

### Protocol Decision Tree
- Modern SPA/mobile: OIDC with PKCE (most secure for client-side)
- Legacy enterprise app: SAML (signed assertions, SP-initiated)
- Machine-to-machine: OAuth2 client credentials (no user context)
- API gateway auth: OAuth2 with opaque tokens
- Cross-org collaboration: Federation (SAML or OIDC federation)
- Social login: OIDC with Google/GitHub/Azure AD

### Federation Topology Options

| Topology | Description | Complexity |
|---|---|---|
| Star | Single IdP (hub) federates with multiple SPs | Simple |
| Mesh | Multiple IdPs federate with each other | Complex |
| Hub-and-Spoke | Central IdP + satellite IdPs | Medium |
| Bridge | Federation between two enterprise IdPs | Medium |

### MFA Method Comparison

| Method | Security | UX | Cost | Deployment Complexity |
|---|---|---|---|---|
| TOTP | High | Medium | Free | Low |
| WebAuthn (FIDO2) | Very High | High | Key cost per user | Medium |
| SMS | Low | High | Per message | Low |
| Push notification | High | Very High | Per user (premium IdP) | Low |
| Hardware key (YubiKey) | Very High | High | $20-50 per key | Medium |

## Common Pitfalls

### Pitfall 1: No High Availability for Self-Hosted IdP
IdP downtime = all applications inaccessible. Self-hosted IdP must be multi-node with load balancing. Deploy across AZs. Use external database with HA. Have DR plan with DNS failover. Test failover regularly.

### Pitfall 2: SSO Session Mismatch
Application session timeout longer than IdP session -> user still logged into app but IdP requires re-auth. Set application session <= IdP session. Use refresh tokens for seamless re-authentication. Implement session management with forced logout on IdP session expiry.

### Pitfall 3: SCIM Deprovisioning Gaps
Removing user from directory does not always deprovision from all apps. SCIM deprovisioning must trigger across all connected applications. Test deprovisioning scenarios: user offboarding, role change, group removal. Set grace period before hard delete.

### Pitfall 4: Weak Token Validation
Applications must validate tokens (signature, issuer, audience, expiry). Missing validation allows token forgery. Use well-known JWKS endpoint for signature verification. Validate all standard claims. Rotate signing keys regularly.

### Pitfall 5: Federated Identity Without Fallback
Federation between IdPs means one IdP's outage breaks access to all federated apps. Implement fallback authentication. Cache tokens locally where possible. Have break-glass emergency access procedure.

### Pitfall 6: Single MFA Method Deployed
SMS-only MFA is weak (SIM swapping). TOTP-only requires app installation. Deploy multiple MFA methods: WebAuthn primary, TOTP backup, recovery codes for emergencies. Enforce phishing-resistant MFA (WebAuthn) for privileged accounts.

### Pitfall 7: Neglecting Service Account Security
Machine accounts and service principals bypass MFA. They become the weakest link. Use short-lived tokens. Rotate client secrets frequently. Audit service account usage. Use managed identities (Azure) or IAM roles (AWS) over static credentials.

## Best Practices

### IdP Selection Criteria
- Evaluate total cost: license + ops + migration
- Check protocol support: OIDC, SAML, SCIM, LDAP
- Review compliance: SOC2, HIPAA, FedRAMP, GDPR
- Assess directory integration: AD, LDAP, HR systems
- Plan for growth: user count increase, application onboarding
- Test HA and DR capabilities

### SSO Implementation
- OIDC for all new integrations
- SAML for legacy apps that don't support OIDC
- PKCE for all public clients (SPA, mobile)
- Use authorization code flow, never implicit
- Validate tokens at application level
- Rotate client secrets every 90 days
- Use refresh token rotation

### Directory Sync Best Practices
- SCIM 2.0 for provisioning and deprovisioning
- Incremental sync every 15 minutes
- Full sync nightly for reconciliation
- Grace period for deprovisioning (30 days soft-delete)
- Map all groups to application roles
- Handle user attribute changes (name, email, manager)

### Security Hardening
- Enforce MFA for ALL users, not just admins
- Use conditional access policies (geo, device, network)
- Set session limits (15 min idle, 8h max)
- Implement brute force protection with progressive delay
- Monitor for account takeover indicators
- Regular security audit of IdP configuration

## Compared With

### Self-Hosted Keycloak vs Azure AD vs Okta
Keycloak: full control, no per-user cost, complex ops. Azure AD: deep Office 365 integration, conditional access, per-user cost. Okta: best workflow engine, broadest app catalog, premium pricing. Keycloak for cost-conscious with ops team. Azure AD for Microsoft-centric orgs. Okta for complex identity workflows.

### OIDC vs SAML
OIDC: modern (REST/JSON), simpler, native mobile/web support, better for OAuth2 integration. SAML: enterprise legacy (XML), complex, old but proven, broad enterprise app support. OIDC preferred for new integrations. SAML only when OIDC unsupported.

### SCIM vs Manual Provisioning
SCIM: automated, standardized, real-time, reduces errors. Manual provisioning: error-prone, no real-time deprovisioning, audit gap. SCIM mandatory for compliance (SOC2, SOX). No reason to use manual provisioning in modern environment.

## Operations & Maintenance

### IdP Operations Tasks
- Daily: review failed login attempts, monitor sync health
- Weekly: review application access, check session compliance
- Monthly: review audit logs, update client secrets
- Quarterly: access certifications, policy review, disaster recovery test
- Annually: penetration test, compliance audit, IdP version upgrade

### Incident Response for IdP
1. Detect: users unable to login, monitoring alert, SIEM alert
2. Assess: is this a provider outage or account compromise?
3. For provider outage: failover to DR instance
4. For account compromise: disable accounts, force password reset, revoke sessions
5. Investigate scope: which accounts affected, what accessed
6. Remediate: patch, rotate keys, update policies
7. Document: incident report, post-mortem

### Access Certification Process
1. Define certification campaign scope (applications, roles, users)
2. Send certification to data owner with access list
3. Owner reviews and certifies or revokes access
4. Automatically revoke uncertified access after deadline
5. Log certification results for audit
6. Schedule next certification (quarterly for critical apps)

### Migration Between IdPs
1. Run both IdPs in parallel during migration
2. Configure federation between old and new IdP
3. Migrate applications one at a time
4. Keep SCIM sync running to both IdPs
5. Test each application after migration
6. Retire old IdP when all apps migrated
7. Document migration lessons

## Rules
- Never store passwords in application code or config files
- OIDC is preferred over SAML for all new integrations
- MFA must be enforced for all privileged accounts
- Session tokens must be short-lived (15min idle, 8h absolute)
- SCIM deprovisioning must trigger within 5 minutes of directory change
- IdP must be highly available (multi-region for self-hosted)
- Federation metadata must be signed and verified
- Audit events must be immutable and retained per compliance requirements
- Client secrets rotated every 90 days minimum
- Access certification conducted quarterly for critical applications
- Service accounts must use short-lived tokens with minimal permissions
- Brute force protection must be enabled for all login endpoints
- Token validation (signature, issuer, audience, expiry) mandatory for all apps
- Emergency break-glass access procedure documented and tested

## References
- references/identity-provider-fundamentals.md -- Identity Provider Fundamentals
- references/identity-provider-advanced.md -- Identity Provider Advanced Topics
- references/federation-sso.md -- Federation and SSO Patterns
- references/saml-oidc.md -- SAML vs OIDC
- references/idp-setup.md -- Identity Provider Setup
- references/idp-migration.md -- Identity Provider Migration
- references/idp-federation-scenarios.md -- Federation Scenarios
- references/idp-security-best-practices.md -- IdP Security Best Practices

## Handoff
For compliance requirements on identity governance, hand off to `enterprise-compliance-audit`. For cost tracking of IdP licensing, hand off to `enterprise-cost-governance`.
