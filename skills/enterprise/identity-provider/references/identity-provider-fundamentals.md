# Identity Provider Fundamentals

## Overview
Identity providers centralize authentication and authorization across applications. This covers IdP selection, SSO protocols (OIDC, SAML), directory sync (SCIM), MFA, and session management — the foundation of enterprise identity.

## Core Concepts

### IdP Deployment Models
| Model | Examples | Ops Cost | Control | Best For |
|-------|----------|----------|---------|----------|
| Self-hosted | Keycloak, Authentik | High | Full | Teams with ops capability, cost-sensitive |
| Managed | Azure AD, Okta, Auth0 | Low | Medium | Most organizations |
| Cloud-native | Cognito, Firebase Auth | Low | Low | Single-cloud, simpler needs |

### SSO Protocol Comparison
| Feature | OIDC/OAuth 2.0 | SAML 2.0 |
|---------|---------------|-----------|
| Format | JSON/REST | XML/SOAP |
| Complexity | Simple | Complex |
| Mobile support | Native | Limited |
| SPA support | PKCE | Poor |
| Enterprise support | Growing | Broad |
| Token format | JWT | SAML assertion |
| Session management | Refresh tokens | Session index |

Recommendation: OIDC for all new integrations. SAML only when OIDC is not supported by the application.

### OIDC Flow Types
| Flow | Use Case | Security |
|------|----------|----------|
| Authorization Code | Server-side web apps | High (secret on server) |
| Authorization Code + PKCE | SPAs, mobile apps | High (code verifier) |
| Client Credentials | Machine-to-machine | Medium (no user context) |
| Resource Owner Password | Legacy (avoid) | Low (credentials exposed) |

Never use the Implicit flow (deprecated by OAuth 2.1). Always use Authorization Code with PKCE for public clients.

### Authentication vs Authorization
Authentication (AuthN): "Who are you?" Verifies identity. IdP provides ID token with user claims.

Authorization (AuthZ): "What can you do?" Determines permissions. IdP provides access token with scopes/roles. Application-level authorization may use the IdP as policy decision point (PDP) or manage permissions internally.

### Directory Sync with SCIM
SCIM 2.0 (System for Cross-domain Identity Management) automates user provisioning and deprovisioning. Standard REST API for create, read, update, deactivate operations.

Sync frequency: incremental every 15 minutes, full sync nightly for reconciliation. Handle deprovisioning: soft-delete with 30-day grace period, then hard delete. Map directory groups to application roles.

## MFA Methods

| Method | Security | UX | Cost |
|--------|----------|----|------|
| TOTP (authenticator app) | High | Medium | Free |
| WebAuthn (FIDO2/passkeys) | Very High | High | Key cost per user |
| Push notification | High | Very High | Per-user IdP cost |
| SMS/voice | Low | High | Per-message cost |
| Hardware key (YubiKey) | Very High | High | $20-50 per key |

Recommended: WebAuthn primary, TOTP backup, recovery codes for emergencies. Enforce phishing-resistant MFA (WebAuthn) for privileged accounts.

## Security Policies

### Session Management
- Idle timeout: 15 minutes
- Max session lifetime: 8 hours
- Refresh token rotation: enabled
- Refresh token reuse detection: enabled (revoke on stolen token)
- Session revocation on password change: enforce

### Brute Force Protection
- Account lockout: 5 consecutive failures
- Lockout duration: 15 minutes (increasing with each lockout)
- Progressive delay: 1s -> 5s -> 30s after 3, 4, 5 failures
- CAPTCHA after 2 failures
- Alert on brute force pattern detection

## Common Pitfalls

### No HA for Self-Hosted IdP
IdP downtime = all applications inaccessible. Self-hosted IdP must be multi-node with load balancing, external HA database, cross-AZ deployment, and DR failover. Test failover quarterly.

### Session Mismatch
Application session timeout longer than IdP session timeout. User logged into app but IdP silently fails re-auth. Set application session <= IdP session. Use silent authentication (prompt=none) with refresh tokens.

### Weak Token Validation
Applications must validate token signature (JWKS endpoint), issuer (iss), audience (aud), and expiry (exp). Missing validation allows token forgery. Rotate signing keys regularly.

## Key Points
- OIDC is preferred over SAML for all new integrations
- Authorization Code + PKCE is the standard for all public clients
- SCIM automation is mandatory for compliance (SOC2, SOX)
- MFA must be enforced for all users, not just admins
- Self-hosted IdP requires HA architecture — don't skimp
- Token validation (signature, issuer, audience, expiry) is mandatory for all apps
- Session timeout must be <= IdP session timeout
- Deprovisioning is as important as provisioning — test the offboarding flow