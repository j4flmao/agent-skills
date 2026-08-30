# Zero Trust: OAuth2 & OIDC Schemas

## 1. Identity as the Perimeter
Zero Trust replaces network segments with identity-aware access proxies. OAuth2 provides the authorization framework, while OpenID Connect (OIDC) sits on top to provide authentication (identity).

## 2. Standard OAuth2 Flows in ZTA

### Authorization Code Flow (with PKCE)
Used for single-page applications (SPAs) and mobile apps to securely acquire access tokens without exposing client secrets.
- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception attacks by requiring the client to generate a random secret (code verifier) and send its hash (code challenge) during the initial request.

### Client Credentials Flow
Used for Machine-to-Machine (M2M) communication where no human user is involved.
- Service A sends its `client_id` and `client_secret` to the IdP.
- The IdP responds with a short-lived Access Token.
- Service A uses the token to call Service B.

## 3. Claims Schema Design
A Zero Trust architecture requires robust claims inside the JWT to make granular access decisions.

### Standard Claims
- `sub`: The unique identifier of the user or machine.
- `iss`: The issuer URL (e.g., `https://auth.internal.corp`).
- `groups` or `roles`: RBAC identifiers (e.g., `["admin", "finance-read"]`).

### Custom ZTA Claims
- `device_compliance`: Boolean indicating if the requesting device passed MDM posture checks (CrowdStrike/Intune).
- `auth_time`: When the user last authenticated (useful for enforcing step-up MFA for sensitive actions).
- `amr`: Authentication Methods References (verifies if MFA was actually used).
