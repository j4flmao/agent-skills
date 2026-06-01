# Identity Provider Advanced Topics

## Introduction
Advanced identity covers federation topologies, zero-trust architecture, identity governance, privileged access management, passkeys, and IdP migration strategies.

## Federation Topologies

### Star Topology
Single IdP (hub) federates with multiple service providers (spokes). Simple configuration, single source of truth, single point of failure. Best for most organizations: one IdP, all apps connected to it.

### Hub-and-Spoke Federation
Central IdP + satellite IdPs for acquisitions or multi-org scenarios. Central IdP federates with satellite IdPs. Users authenticate at their home IdP. Central IdP provides cross-org access policies.

### Federation Trust Configuration
SAML metadata exchange: SP and IdP exchange metadata XML containing certificates, endpoints, and binding configurations. Metadata is signed for integrity. Verify metadata signatures before importing.

OIDC federation: Use `.well-known/openid-configuration` discovery URL. Trust is established through client registration and JWKS URI verification.

## Zero-Trust Identity Architecture

### BeyondCorp / Zero Trust Principles
Never trust, always verify. Access decisions based on: user identity, device health, location, data sensitivity, and risk score. No implicit trust based on network location.

### Continuous Authentication
Not just login-time verification. Monitor session risk indicators: impossible travel (login from NYC then Tokyo in 30min), device posture change, anomalous resource access pattern. Step-up authentication when risk increases.

### Conditional Access Policies
| Policy | Criteria | Action |
|--------|----------|--------|
| Geo-fencing | Login from restricted country | Block |
| Device compliance | Non-compliant device | Require device remediation |
| Trusted network | Corporate IP range | Allow with reduced MFA |
| Risky sign-in | Anomalous pattern detected | Require step-up auth |
| Sensitive app | Admin console access | Require hardware key MFA |

## Identity Governance and Administration (IGA)

### Access Certification
Quarterly campaigns: data owner reviews list of users with access to their application. Owner certifies (approve) or revokes each user. Automatic revocation for uncertified access after deadline. Log all certifications for audit.

### Entitlement Management
Define roles with specific permissions. Map roles to directory groups. Provision group membership via SCIM. Role mining: analyze existing access patterns to define optimal role structure.

### Privileged Access Management (PAM)
Just-in-time (JIT) privilege escalation: approve temporary admin access, auto-revoke after task completion. Privileged session recording. Credential vaulting with automatic rotation. Break-glass emergency access with multi-person approval.

## Passkeys and Passwordless

### FIDO2/WebAuthn
Passkeys are FIDO2 credentials backed by platform authenticators (Apple iCloud Keychain, Google Password Manager, Windows Hello). Benefits: phishing resistant, no shared secrets, cross-device sync, better UX than passwords.

### Passkey Deployment
Registration: prompt user to create passkey on login, store credential ID in IdP, associate with user account. Authentication: user selects passkey, device performs biometric/PIN verification, signed assertion sent to IdP, IdP verifies assertion signature.

### Migration Path
1. Add passkey as optional MFA method alongside TOTP
2. Make passkey the primary MFA for privileged users
3. Enforce passkey-only for admin accounts
4. Gradually phase out SMS/TOTP for all users

## Service Account Security

### Machine Identity Challenges
Service accounts bypass MFA, cannot use passkeys, often have static credentials, frequently over-provisioned. They are the weakest link in identity security.

### Best Practices
- One service account per service — no shared credentials
- Short-lived tokens (1 hour max, use token exchange for long-running jobs)
- Managed identities (Azure) or IAM roles (AWS) instead of static credentials
- Regular access review for all service accounts
- Automated credential rotation (90 days max)
- Monitor for anomalous service account usage

## IdP Migration Strategy

### Parallel Run Migration
Run old and new IdP simultaneously. Federation between old and new: old IdP federates new IdP as an identity provider. Users authenticate via old IdP, which can route to new IdP for migrated apps.

### App-by-App Migration
Migrate applications one at a time. For each app: configure new IdP as identity source, validate SSO flow works, migrate user base to new IdP, monitor error rates for 48 hours, move to next app.

### Data Migration
User profiles and group memberships exported from old IdP, imported to new IdP via SCIM or bulk API. Password hashes may not be exportable — users may need to reset passwords on first login to new IdP.

## Operations

### IdP Monitoring
Monitor: authentication success rate, MFA enrollment rate, SCIM sync health (last sync time, error count), federation metadata expiry, certificate expiration dates, token signing key rotation schedule.

### DR for IdP
Self-hosted: multi-region active-passive with DNS failover, external database with cross-region replication, regular failover testing. Managed: configure secondary IdP as identity provider, document failover procedure, test quarterly.

## Key Points
- Federation topology should be simple (star) unless acquisition or multi-org requirements dictate otherwise
- Zero trust means continuous verification, not just login-time auth
- IGA automates access certification and entitlement management
- Passkeys are the future of phishing-resistant authentication — deploy them now
- Service accounts need security controls as stringent as user accounts
- IdP migration requires parallel run and app-by-app approach
- Monitor IdP health metrics and rotate signing keys regularly
- DR for IdP must be tested — IdP failure blocks all application access