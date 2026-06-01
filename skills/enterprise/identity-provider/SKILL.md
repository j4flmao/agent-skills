---
name: enterprise-identity-provider
description: >
  Use this skill when implementing identity provider solutions: SSO, federation, directory sync, and access governance.
  This skill enforces: IdP selection, SSO configuration, directory synchronization, MFA enforcement.
  Do NOT use for: application-level auth, password policies, TLS configuration, network security.
version: "2.0.0"
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

## Framework/Methodology

### IDENTITY-ACCESS Framework
A six-phase approach to enterprise identity management:

Phase 1 - Discover: Catalog all applications, their auth requirements (OIDC/SAML/LDAP), user populations, and identity sources. Identify compliance obligations (SOC2, HIPAA, FedRAMP).

Phase 2 - Design: Select IdP model (self-hosted/managed/cloud-native). Design SSO flow, federation topology, and directory sync architecture. Define security policies (MFA, session, conditional access).

Phase 3 - Integrate: Configure SSO for all applications. Establish directory synchronization with SCIM. Set up federation between IdPs for acquisitions or multi-org scenarios.

Phase 4 - Secure: Enforce MFA, configure conditional access policies, implement session management. Set up brute force protection and anomaly detection.

Phase 5 - Govern: Implement access certifications, entitlement reviews, and privilege escalation workflows. Stream audit events to SIEM.

Phase 6 - Operate: Monitor IdP health, rotate secrets, review logs, test DR failover. Conduct periodic access reviews and policy updates.

### OIDC/OAuth 2.0 Flow Patterns

Authorization Code Flow (recommended for web apps):
```
  User -> App -> IdP Auth Endpoint -> User Login -> Auth Code -> App Backend
    -> Token Exchange (code + client_secret) -> ID Token + Access Token -> API Call
```

Authorization Code Flow with PKCE (recommended for SPAs/mobile):
```
  User -> App -> IdP Auth Endpoint (with code_challenge) -> User Login -> Auth Code
    -> Token Exchange (code + code_verifier) -> ID Token + Access Token -> API Call
```

Client Credentials Flow (machine-to-machine):
```
  Service -> IdP Token Endpoint (with client_id + client_secret)
    -> Access Token (no user context) -> API Call
```

### SAML 2.0 Flow
```
  User -> SP -> AuthnRequest (signed) -> IdP -> User Login -> SAML Response (signed + encrypted)
    -> SP validates assertion -> Session created -> User authenticated
```

## Architecture / Decision Trees

### Deployment Model Decision Tree
```
Do you have an operations team to run HA infrastructure?
├── Yes → Do you need full control over identity data?
│   ├── Yes → Self-hosted (Keycloak, Authentik)
│   └── No → Managed (Azure AD, Okta, Auth0)
└── No → Are you fully on a single cloud provider?
    ├── Yes → Cloud-native (Cognito, Firebase Auth)
    └── No → Managed (Azure AD, Okta, Auth0)
```

### Protocol Selection Decision Tree
```
Is the client a modern SPA or mobile app?
├── Yes → OIDC with PKCE
└── No → Is it a legacy enterprise app?
    ├── Yes → SAML 2.0
    └── No → Is it machine-to-machine?
        ├── Yes → OAuth 2.0 Client Credentials
        └── No → OIDC Authorization Code Flow
```

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

OIDC configuration example:
```yaml
# Keycloak client config for OIDC
clientId: my-app
clientAuthenticatorType: client-secret
standardFlowEnabled: true
redirectUris:
  - "https://app.example.com/*"
webOrigins:
  - "https://app.example.com"
publicClient: false
protocolMappers:
  - name: email
    protocol: openid-connect
    protocolMapper: oidc-usermodel-property-mapper
    config:
      user.attribute: email
      claim.name: email
      access.token.claim: true
```

SAML configuration example:
```xml
<!-- Keycloak SAML client config -->
<entityDescriptor entityID="https://app.example.com/saml">
  <SPSSODescriptor AuthnRequestsSigned="true"
    WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService index="1" isDefault="true"
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://app.example.com/saml/callback"/>
  </SPSSODescriptor>
</entityDescriptor>
```

### Step 3: Directory Sync
Connect to upstream directory (LDAP, Active Directory). Provision users via SCIM 2.0 (create, update, deactivate). Map groups from directory to application roles. Schedule incremental sync every 15 minutes, full sync nightly. Handle deprovisioning with soft-delete and grace period.

### Step 4: Security Configuration
Enforce MFA for all users (TOTP, WebAuthn, or SMS fallback). Configure conditional access policies (geo-fencing, device compliance, trusted networks). Set session policies (idle timeout 15min, max lifetime 8h). Implement brute force protection (account lockout after 5 failures, progressive delay).

### Step 5: Audit and Governance
Stream all IdP events to SIEM (logins, failures, role changes, MFA registration). Schedule quarterly access reviews with automated certification campaigns. Implement privilege escalation workflows with approval gates. Monitor for anomalous login patterns.

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

## Standards Alignment

| Standard | Identity Requirement | Mapping |
|----------|---------------------|---------|
| SOC2 CC6.1 | Logical access controls | SSO, MFA, access reviews |
| SOC2 CC6.3 | Role-based access | RBAC, directory groups |
| HIPAA 164.312 | Unique user identification | IdP as identity source |
| GDPR Art. 32 | Security of processing | MFA, session management |
| FedRAMP | Identity and access management | FIPS 140-2, PIV/CAC support |
| NIST 800-63 | Digital identity guidelines | IAL/AAL levels mapping |

## Code Examples

### OIDC Token Validation (Python)
```python
import jwt, requests
from datetime import datetime

class OIDCTokenValidator:
    def __init__(self, issuer, client_id, jwks_url):
        self.issuer = issuer
        self.client_id = client_id
        self.jwks_url = jwks_url
        self.jwks_client = jwt.PyJWKClient(jwks_url)

    def validate_id_token(self, token):
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "RS384", "RS512"],
                audience=self.client_id,
                issuer=self.issuer,
                options={
                    "verify_exp": True,
                    "verify_iat": True,
                    "require": ["exp", "iat", "iss", "aud", "sub"]
                }
            )
            return {"valid": True, "claims": payload}
        except jwt.ExpiredSignatureError:
            return {"valid": False, "reason": "Token expired"}
        except jwt.InvalidIssuerError:
            return {"valid": False, "reason": "Invalid issuer"}
        except jwt.InvalidAudienceError:
            return {"valid": False, "reason": "Invalid audience"}
        except Exception as e:
            return {"valid": False, "reason": str(e)}

    def validate_access_token(self, token, required_scopes=None):
        result = self.validate_id_token(token)
        if not result["valid"]:
            return result
        if required_scopes:
            token_scopes = result["claims"].get("scope", "").split()
            missing = set(required_scopes) - set(token_scopes)
            if missing:
                return {"valid": False, "reason": f"Missing scopes: {missing}"}
        return result

validator = OIDCTokenValidator(
    issuer="https://auth.example.com",
    client_id="my-app",
    jwks_url="https://auth.example.com/.well-known/jwks.json"
)
# Example usage: validator.validate_id_token(id_token)
```

### SCIM 2.0 Provisioning Script (Python)
```python
import requests, json

class SCIMProvisioner:
    def __init__(self, base_url, api_token):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/scim+json"
        }

    def create_user(self, username, email, first_name, last_name, active=True):
        payload = {
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
            "userName": username,
            "name": {"givenName": first_name, "familyName": last_name},
            "emails": [{"value": email, "primary": True}],
            "active": active
        }
        response = requests.post(f"{self.base_url}/Users", json=payload, headers=self.headers)
        return response.json()

    def deactivate_user(self, user_id):
        payload = {"schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"], "active": False}
        response = requests.patch(f"{self.base_url}/Users/{user_id}", json=payload, headers=self.headers)
        return response.json()

    def sync_group_membership(self, group_id, member_ids):
        payload = {
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
            "members": [{"value": uid} for uid in member_ids]
        }
        response = requests.put(f"{self.base_url}/Groups/{group_id}", json=payload, headers=self.headers)
        return response.json()

    def incremental_sync(self, users_from_directory):
        for user in users_from_directory:
            if user["action"] == "add":
                self.create_user(user["username"], user["email"], user["firstName"], user["lastName"])
            elif user["action"] == "deactivate":
                self.deactivate_user(user["id"])
```

### Keycloak Realm Configuration (JSON)
```json
{
  "realm": "enterprise",
  "enabled": true,
  "sslRequired": "all",
  "loginTheme": "keycloak",
  "passwordPolicy": "length(12) and digits(1) and upperCase(1) and specialChars(1) and notUsername",
  "bruteForceProtected": true,
  "maxFailureWaitSeconds": 900,
  "minimumQuickLoginWaitSeconds": 60,
  "waitIncrementSeconds": 60,
  "failureFactor": 5,
  "defaultSignatureAlgorithm": "RS256",
  "revokeRefreshToken": true,
  "refreshTokenMaxReuse": 0,
  "ssoSessionMaxLifespan": 28800,
  "ssoSessionIdleTimeout": 900,
  "offlineSessionMaxLifespan": 5184000,
  "accessTokenLifespan": 300,
  "accessCodeLifespan": 60,
  "actionTokenGeneratedByAdminLifespan": 7200,
  "requiredActions": ["CONFIGURE_TOTP", "UPDATE_PASSWORD"],
  "clients": [
    {
      "clientId": "my-app",
      "enabled": true,
      "protocol": "openid-connect",
      "standardFlowEnabled": true,
      "publicClient": false,
      "redirectUris": ["https://app.example.com/*"],
      "webOrigins": ["https://app.example.com"],
      "defaultClientScopes": ["openid", "profile", "email", "roles"]
    }
  ]
}
```

## Anti-Patterns

### Anti-Pattern 1: IdP as a Single Point of Failure
Deploying a single-node Keycloak instance because "it's just auth." When the IdP goes down, every application becomes inaccessible — SSO becomes single point of outage. Self-hosted IdP requires multi-node HA with external database, load balancing, and DR failover.

### Anti-Pattern 2: Over-Federation
Federating every IdP with every other IdP creates a mesh of trust relationships that becomes unmanageable. Each federation link is an attack surface. Use star topology with a single source of truth where possible.

### Anti-Pattern 3: Session Mismatch
Application session timeout (24h) longer than IdP session timeout (8h). Users appear logged into the app but IdP re-authentication fails silently. Set application session <= IdP session. Use silent authentication (prompt=none) or refresh tokens for seamless re-auth.

### Anti-Pattern 4: Shared Service Accounts
Using a single service account with static credentials across multiple services. Rotating the credential breaks all consumers. Each service should have its own service account with minimal scoped permissions and short-lived tokens.

### Anti-Pattern 5: Ignoring SCIM Deprovisioning
SCIM sync configured for user creation but not deactivation. When an employee leaves, their access persists in downstream apps until manually removed. Test the full deprovisioning flow: offboarding -> SCIM deactivate -> verify app access revoked.

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
  - references/conditional-access-zero-trust.md -- Conditional Access and Zero-Trust Identity

## Handoff
For compliance requirements on identity governance, hand off to `enterprise-compliance-audit`. For cost tracking of IdP licensing, hand off to `enterprise-cost-governance`.
