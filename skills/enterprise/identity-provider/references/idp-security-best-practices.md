# IdP Security Best Practices

## Overview

Identity Provider security is critical because the IdP is the gatekeeper to all applications and resources in the organization. A compromised IdP grants attackers access to everything. This reference covers token security, session management, cryptographic practices, threat detection, configuration hardening, and incident response for production IdP deployments.

## Token Security

### ID Token (OIDC) Security

**ID Token Structure**:
```json
{
  "iss": "https://idp.example.com/auth/realms/prod",
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "aud": "my-client-id",
  "exp": 1742000100,
  "iat": 1741996500,
  "auth_time": 1741996500,
  "nonce": "N-1a2b3c4d5e6f",
  "acr": "https://refeds.org/profile/mfa",
  "amr": ["mfa", "pwd"],
  "azp": "my-client-id",
  "at_hash": "x1y2z3a4b5c6",
  "c_hash": "d7e8f9g0h1i2",
  "email": "user@company.com",
  "email_verified": true,
  "name": "John Doe",
  "preferred_username": "jdoe"
}
```

**Validation Checklist**:

| Claim | Validation | Risk if Missing |
|---|---|---|
| `iss` (issuer) | Must match expected IdP issuer URL | Token from rogue IdP accepted |
| `aud` (audience) | Must match client_id | Token reused against different client |
| `exp` (expiration) | Must not be expired | Replay of old tokens |
| `iat` (issued at) | Must be in the past, within acceptable skew | Clock manipulation attacks |
| `nonce` | Must match value sent in auth request | Replay attack |
| `acr` (auth context) | Must meet minimum authentication level | Downgrade attack (no MFA) |
| `azp` (authorized party) | Must match client_id if present | Token issued to different client |
| `at_hash` | Must match access token hash | Access token substitution |
| `c_hash` | Must match authorization code hash | Authorization code substitution |
| `sub` (subject) | Must be pairwise when required | Cross-client user tracking |
| Signature | Must validate against JWKS | Token forgery |

**ID Token Validation Code**:
```python
import jwt
import requests
from datetime import datetime, timedelta

class IDTokenValidator:
    def __init__(self, issuer, client_id, jwks_uri):
        self.issuer = issuer
        self.client_id = client_id
        self.jwks = self._fetch_jwks(jwks_uri)

    def _fetch_jwks(self, jwks_uri):
        response = requests.get(jwks_uri, timeout=10)
        response.raise_for_status()
        return response.json()

    def validate(self, id_token, expected_nonce=None, max_skew=300):
        unverified_header = jwt.get_unverified_header(id_token)
        key = self._find_key(unverified_header["kid"])

        options = {
            "verify_signature": True,
            "verify_aud": False,
            "verify_iss": False,
            "verify_exp": True,
            "verify_iat": True,
            "require": ["exp", "iat", "iss", "sub", "aud"]
        }

        payload = jwt.decode(
            id_token,
            key=key,
            algorithms=["RS256", "ES256"],
            options=options,
            leeway=max_skew
        )

        if payload["iss"] != self.issuer:
            raise ValueError("Invalid issuer")
        if payload["aud"] != self.client_id:
            raise ValueError("Invalid audience")
        if "azp" in payload and payload["azp"] != self.client_id:
            raise ValueError("Invalid authorized party")
        if expected_nonce and payload.get("nonce") != expected_nonce:
            raise ValueError("Nonce mismatch")

        return payload

    def _find_key(self, kid):
        for key in self.jwks["keys"]:
            if key["kid"] == kid:
                return jwt.PyJWK(key)
        raise KeyError(f"Key with kid {kid} not found")
```

### Access Token Security

**Access Token Types**:

| Type | Format | Validation | Best For |
|---|---|---|---|
| Opaque | Random string | Introspection endpoint required | High-security, centralized validation |
| JWT (structured) | Signed JSON | Local validation via JWKS | Distributed systems, low latency |
| Reference token | Short opaque | Backend resolves to JWT | Token revocation, size efficiency |

**JWT Access Token Best Practices**:
- **Short expiry**: 15-60 minutes (1 hour max)
- **Minimal claims**: Only include non-sensitive, necessary claims
- **No personal data**: Avoid PII in access tokens
- **Audience validation**: Include `aud` and validate at resource server
- **Scope enforcement**: Token includes allowed scopes, resource server checks
- **Binding**: Access token bound to client (via `azp` or `client_id`)

**Opaque Token Introspection**:
```http
POST /protocol/openid-connect/token/introspect HTTP/1.1
Host: idp.example.com
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

token=opaque-access-token&token_type_hint=access_token
```

Response:
```json
{
  "active": true,
  "sub": "a1b2c3d4",
  "client_id": "resource-server-1",
  "scope": "read write",
  "exp": 1742000100,
  "iat": 1741996500,
  "token_type": "Bearer",
  "username": "jdoe"
}
```

### Refresh Token Security

**Refresh Token Characteristics**:

| Property | Value | Rationale |
|---|---|---|
| Maximum lifetime | 24 hours (configurable) | Limit exposure window |
| Rotation | Every refresh | Old token invalidated |
| Reuse detection | Immediate revocation on reuse | Detect token theft |
| Single-use per client | Each client gets unique token | Prevent cross-client use |
| Scope binding | Cannot be used for elevated scopes | Privilege escalation prevention |

**Refresh Token Rotation Implementation**:
```python
class RefreshTokenService:
    def __init__(self, token_store):
        self.token_store = token_store

    def rotate(self, old_refresh_token, client_id):
        stored = self.token_store.get(old_refresh_token)

        if stored is None:
            raise InvalidTokenError("Token not found")

        if stored.consumed:
            # Token reuse detected!
            self.token_store.revoke_all_for_user(stored.user_id)
            raise SecurityAlert("Refresh token replay detected")

        # Mark old token as consumed
        stored.consumed = True
        self.token_store.save(stored)

        # Generate new refresh token
        new_token = self._generate_token()
        self.token_store.save(TokenEntry(
            token=new_token,
            user_id=stored.user_id,
            client_id=client_id,
            scopes=stored.scopes,
            created_at=datetime.utcnow(),
            consumed=False,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        ))

        return new_token

    def _generate_token(self):
        return secrets.token_urlsafe(64)

    def revoke_all_for_user(self, user_id):
        tokens = self.token_store.find_by_user(user_id)
        for token in tokens:
            token.consumed = True
            self.token_store.save(token)
```

## Session Management

### IdP Session Architecture

```
[Browser] ---- IdP Session Cookie ----> [IdP]
                                              |
                                     (session store: Redis/DB)
                                              |
     +--------+--------+--------+
     | SSO    | App 1  | App 2  |
     | Ticket | Token  | Token  |
     +--------+--------+--------+
```

**Session Cookie Configuration**:
```yaml
session_cookie:
  name: "__Host-idp-session"
  http_only: true
  secure: true
  same_site: "lax"  # or "strict" for higher security
  path: "/"
  domain: "idp.example.com"
  max_age: 28800  # 8 hours
  partitioned: true  # CHIPS support for third-party cookie deprecation
```

**Session Storage**:
```python
session_record = {
    "id": "session-abc123",
    "user_id": "a1b2c3d4",
    "session_start": "2025-03-15T10:00:00Z",
    "last_activity": "2025-03-15T11:30:00Z",
    "auth_level": "aal2",
    "auth_method": ["password", "totp"],
    "ip_address": "203.0.113.42",
    "user_agent": "Mozilla/5.0 ...",
    "client_id": "internal-web-app",
    "mfa_verified": True,
    "device_id": "device-f1a2b3c4"
}
```

### Session Policies

**Standard Session Policy Configuration**:
```yaml
session_policy:
  # Idle timeout
  idle_timeout: 900  # 15 minutes
  idle_timeout_action: "reauth"
  
  # Absolute session lifetime
  absolute_max_lifetime: 28800  # 8 hours
  absolute_max_action: "reauth_reauth"
  
  # Remember me (longer session)
  remember_me:
    enabled: true
    idle_timeout: 86400  # 24 hours
    absolute_max: 604800  # 7 days
    require_mfa: true
    device_bound: true
    
  # Re-authentication triggers
  reauth_triggers:
    - ip_address_change
    - device_change
    - sensitive_operation
    - privilege_escalation
    - payment_action
    
  # Concurrent sessions
  max_concurrent_sessions: 5
  concurrent_session_policy: "deny_new"  # or "terminate_oldest"
```

**Step-Up Authentication**:
```yaml
step_up_auth:
  policies:
    - action: "view_profile"
      required_level: "aal1"  # password only okay
    - action: "change_password"
      required_level: "aal2"  # MFA required
    - action: "admin_operation"
      required_level: "aal3"  # phishing-resistant MFA
    - action: "payment"
      required_level: "aal2"
      reauth_age: 300  # re-authenticate if last auth more than 5 min ago
  acr_values:
    "0": "urn:ietf:params:oauth:acr:silent"
    "1": "urn:ietf:params:oauth:acr:phr"
    "2": "https://refeds.org/profile/mfa"
    "3": "https://refeds.org/profile/phishing-resistant-mfa"
```

### Session Revocation

**Revocation Sources**:
```
Password change         -> Revoke ALL sessions for user
MFA reset               -> Revoke ALL sessions for user
Administrative lockout  -> Revoke ALL sessions for user
Device reported stolen  -> Revoke sessions for that device
Account deactivated     -> Revoke ALL sessions for user
Suspicious activity     -> Revoke sessions, force re-auth
Employee offboarding    -> Revoke ALL sessions, disable account
```

**Revocation Implementation (Keycloak)**:
```bash
# Revoke all sessions for a user via Keycloak Admin API
curl -X POST "https://idp.example.com/auth/admin/realms/prod/users/\
a1b2c3d4-e5f6-7890-abcd-ef1234567890/logout" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Push session revocation to all Keycloak nodes
curl -X POST "https://idp.example.com/auth/admin/realms/prod/push-revocation" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Revoke specific session
curl -X DELETE "https://idp.example.com/auth/admin/realms/prod/sessions/\
session-abc123" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Cryptographic Practices

### Signing Key Management

**Key Hierarchy**:
```
Root of Trust (Offline HSM)
    |
    v
IdP Master Key (HSM)
    |
    +--- Signing Key (active)      -- signs tokens (rotated monthly)
    +--- Signing Key (previous)    -- validates old tokens (72h overlap)
    +--- Encryption Key (active)   -- encrypts assertions
    +--- Encryption Key (previous) -- decrypts old assertions
```

**Key Rotation Procedure**:
```yaml
key_rotation:
  signing_keys:
    rotation_period: 90  # days
    generation_lead_time: 7  # days before activation
    overlap_period: 72  # hours where old key still accepted
    algorithm: "ES256"
    key_size: "P-256"
    hsm_required: true
    
  encryption_keys:
    rotation_period: 365  # days
    overlap_period: 168  # hours (7 days)
    algorithm: "RSA-OAEP-256"
    key_size: 4096
    
  client_secrets:
    rotation_period: 90  # days
    rotation_type: "client_initiated"
    secret_length: 64
    secret_characters: "alphanumeric+special"
```

**JWKS Rotation Event**:
```python
class KeyRotationService:
    def __init__(self, jwks_store, signing_key_generator):
        self.jwks_store = jwks_store
        self.signing_key_generator = signing_key_generator

    def rotate(self, new_kid):
        current_keys = self.jwks_store.get()

        # Mark all current signing keys as inactive
        for key in current_keys["keys"]:
            if key["use"] == "sig":
                key["inactive_since"] = datetime.utcnow().isoformat()

        # Generate and add new key
        new_key = self.signing_key_generator.generate(kid=new_kid)
        current_keys["keys"].insert(0, new_key)

        self.jwks_store.save(current_keys)
        return current_keys

    def cleanup_old_keys(self, max_age_days=30):
        current_keys = self.jwks_store.get()
        cutoff = datetime.utcnow() - timedelta(days=max_age_days)

        current_keys["keys"] = [
            k for k in current_keys["keys"]
            if "inactive_since" not in k
            or datetime.fromisoformat(k["inactive_since"]) > cutoff
        ]

        self.jwks_store.save(current_keys)
```

### Certificate Management for Federation

**Certificate Profile**:
```yaml
idp_certificates:
  signing:
    type: "X.509 v3"
    key_algorithm: "ecdsa-with-SHA256"
    curve: "P-256"
    validity: 365  # days
    key_usage: ["digitalSignature"]
    extended_key_usage: ["serverAuth"]
    
  encryption:
    type: "X.509 v3"
    key_algorithm: "rsaEncryption"
    key_size: 4096
    validity: 365  # days
    key_usage: ["keyEncipherment", "dataEncipherment"]
    
  tls:
    type: "X.509 v3"
    key_algorithm: "ecdsa-with-SHA256"
    curve: "P-384"
    validity: 365  # days
    key_usage: ["digitalSignature", "keyEncipherment"]
    extended_key_usage: ["serverAuth", "clientAuth"]
    subject: "CN=idp.example.com"
    sans:
      - "idp.example.com"
      - "login.example.com"
      - "auth.example.com"
```

## Client Registration and Management

### Confidential Clients

**Client Credential Types**:
```yaml
client_authentication:
  client_secret_basic:
    mechanism: "HTTP Basic Auth (client_id:client_secret)"
    security: "Medium"
    best_for: "Server-side apps, backend services"
    
  client_secret_post:
    mechanism: "Form-encoded body parameter"
    security: "Medium"
    best_for: "Legacy clients, simple integrations"
    
  private_key_jwt:
    mechanism: "JWT signed with client's private key"
    security: "High"
    best_for: "High-security apps, no shared secret"
    
  tls_client_auth:
    mechanism: "Mutual TLS with client certificate"
    security: "Very High"
    best_for: "Machine-to-machine, regulated environments"
    
  client_secret_jwt:
    mechanism: "JWT signed with client secret (HMAC)"
    security: "Medium-High"
    best_for: "Clients that cannot use mTLS"
```

**Private Key JWT Authentication**:
```python
import jwt
from datetime import datetime, timedelta

class PrivateKeyJWTClient:
    def __init__(self, client_id, private_key, token_endpoint, kid):
        self.client_id = client_id
        self.private_key = private_key
        self.token_endpoint = token_endpoint
        self.kid = kid

    def _create_assertion(self):
        now = datetime.utcnow()
        payload = {
            "iss": self.client_id,
            "sub": self.client_id,
            "aud": self.token_endpoint,
            "jti": secrets.token_hex(16),
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=5)).timestamp()),
        }
        headers = {
            "alg": "ES256",
            "kid": self.kid,
            "typ": "client-auth+jwt"
        }
        return jwt.encode(payload, self.private_key, algorithm="ES256", headers=headers)

    def get_token(self, scopes):
        assertion = self._create_assertion()
        data = {
            "grant_type": "client_credentials",
            "scope": " ".join(scopes),
            "client_assertion_type":
                "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": assertion,
        }
        response = requests.post(
            self.token_endpoint,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        response.raise_for_status()
        return response.json()
```

### Public Clients (SPAs, Mobile)

**PKCE (Proof Key for Code Exchange) Configuration**:
```yaml
pkce_configuration:
  required: true
  challenge_method: "S256"  # SHA-256 hash, plain text rejected
  code_challenge_length: 64  # bytes (128 hex chars)
  authorization_code_lifetime: 60  # seconds
  code_verifier_length: 64  # bytes
```

**PKCE Flow Implementation**:
```javascript
// Client-side PKCE generation
class PKCEGenerator {
  async generate() {
    const verifier = this._base64urlEncode(
      crypto.getRandomValues(new Uint8Array(64))
    );
    const challenge = await this._sha256(verifier);
    return {
      code_verifier: verifier,
      code_challenge: challenge,
      code_challenge_method: "S256"
    };
  }

  async _sha256(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return this._base64urlEncode(new Uint8Array(hash));
  }

  _base64urlEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
```

**SPA Security Recommendations**:
```yaml
spa_security:
  grant_type: "authorization_code with PKCE"
  token_storage: "memory only (not localStorage)"
  refresh_tokens: "rotating, bound to device/instance"
  logout: "RP-initiated logout with iframe-based session management"
  cors: "Restrict to specific origins, not wildcard"
  iframe_protection: "X-Frame-Options: DENY"
  client_registration:
    type: "public"
    redirect_uris: "exact match, no wildcards"
    post_logout_redirect_uris: "exact match"
```

## Security Headers and Endpoint Protection

### IdP Endpoint Security Headers

```yaml
security_headers:
  idp_login_page:
    X-Frame-Options: "DENY"
    X-Content-Type-Options: "nosniff"
    Referrer-Policy: "strict-origin-when-cross-origin"
    Permissions-Policy: "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy: |
      default-src 'self';
      script-src 'self' 'strict-dynamic' 'nonce-{random}';
      style-src 'self' 'sha256-{hash}';
      img-src 'self' data:;
      font-src 'self';
      connect-src 'self';
      form-action 'self';
      frame-ancestors 'none';
      base-uri 'self';
      block-all-mixed-content;
    Strict-Transport-Security: "max-age=31536000; includeSubDomains; preload"
    Cache-Control: "no-store, no-cache, must-revalidate"
    Pragma: "no-cache"
    
  api_endpoints:
    X-Content-Type-Options: "nosniff"
    Cache-Control: "no-store"
    Strict-Transport-Security: "max-age=31536000; includeSubDomains"
    X-Frame-Options: "DENY"
```

### Brute Force Protection

**Configuration**:
```yaml
brute_force_protection:
  # Login attempt limits
  per_ip:
    max_attempts: 20
    window: 300  # 5 minutes
    action: "temp_block"
    block_duration: 900  # 15 minutes
    
  per_user:
    max_attempts: 5
    window: 300  # 5 minutes
    action: "account_lockout"
    lockout_duration: 1800  # 30 minutes
    permanent_lockout_after: 20  # consecutive lockouts
    
  per_client:
    max_attempts: 100
    window: 600  # 10 minutes
    action: "client_block"
    
  # Progressive delay
  progressive_delay:
    enabled: true
    attempts_before_delay: 3
    initial_delay: 1000  # 1 second
    multiplier: 2
    max_delay: 30000  # 30 seconds
    
  # CAPTCHA trigger
  captcha:
    enabled: true
    trigger_after: 3  # failed attempts
    provider: "recaptcha_v3"
    threshold: 0.5
```

**Failed Login Tracking**:
```sql
CREATE TABLE login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    client_id VARCHAR(255),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    user_agent TEXT,
    geo_country VARCHAR(2),
    INDEX idx_username (username, attempted_at),
    INDEX idx_ip (ip_address, attempted_at)
);

-- Partition by month for performance
CREATE TABLE login_attempts_2025_03
    PARTITION OF login_attempts
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
```

### Account Lockout Policy

```yaml
account_lockout:
  lockout_on_failure: true
  failure_count_threshold: 5
  failure_window: 300  # 5 minutes
  lockout_duration: 1800  # 30 minutes
  lockout_duration_increment: true  # double on each lockout
  lockout_max_duration: 86400  # 24 hours max
  
  unlock_methods:
    - "wait_for_timeout"
    - "self_service_unlock_with_email"
    - "admin_unlock"
    
  account_closure:
    permanent_lockout_after: 20  # consecutive lockout events
    notify_on_closure: true
    notify_to: "security@company.com"
```

## Threat Detection and Response

### Authentication Anomaly Detection

**Anomaly Signals**:

| Signal | Description | Severity |
|---|---|---|
| Impossible travel | Login from geographically distant locations within short time | Critical |
| Unusual IP | Login from IP not in user's history | Medium |
| New device | Login from unrecognized device | Low |
| Off-hours login | Login outside user's typical hours | Medium |
| Rapid successive logins | Multiple failed followed by successful login | High |
| Tor exit node | Login from known Tor exit node | Medium |
| Known malicious IP | Login from known malicious IP range | Critical |
| Credential stuffing pattern | Same credentials used from multiple IPs | Critical |
| Anomalous MFA prompt | User receiving unexpected MFA prompts | High |
| Token replay | Same token used from different IPs | Critical |

**Detection Implementation**:
```python
class AnomalyDetector:
    def __init__(self, session_history, geo_service, ip_reputation):
        self.session_history = session_history
        self.geo_service = geo_service
        self.ip_reputation = ip_reputation

    def analyze_login(self, user_id, ip_address, user_agent, timestamp):
        risks = []

        # Check impossible travel
        previous = self.session_history.get_last_login(user_id)
        if previous:
            distance = self.geo_service.distance(
                previous.ip_address, ip_address
            )
            time_diff = (timestamp - previous.timestamp).total_seconds()
            if self._is_impossible_travel(distance, time_diff):
                risks.append(Risk("IMPOSSIBLE_TRAVEL", severity=1.0))

        # IP reputation check
        reputation = self.ip_reputation.check(ip_address)
        if reputation.score < 0.3:
            risks.append(Risk("MALICIOUS_IP", severity=reputation.score))

        # Rate analysis
        recent_count = self.session_history.count_recent(
            user_id, minutes=5
        )
        if recent_count > 10:
            risks.append(Risk("RAPID_LOGIN", severity=0.8))

        # Off-hours detection
        if not self._is_business_hours(timestamp):
            risks.append(Risk("OFF_HOURS", severity=0.3))

        return RiskAssessment(
            user_id=user_id,
            risk_score=max(r.severity for r in risks) if risks else 0,
            risks=risks
        )

    def _is_impossible_travel(self, distance_km, time_seconds):
        # >500km in <60 minutes is suspicious
        # >1000km in <120 minutes is high risk
        if distance_km > 500 and time_seconds < 3600:
            return True
        if distance_km > 1000 and time_seconds < 7200:
            return True
        return False

    def _is_business_hours(self, timestamp):
        hour = timestamp.hour
        return 8 <= hour <= 18
```

### Account Takeover Response

**Automated Response Actions**:

| Risk Score | Action |
|---|---|
| 0.0-0.3 | No action (log only) |
| 0.3-0.5 | Log, add session risk tag, step-up auth for sensitive ops |
| 0.5-0.7 | Require step-up authentication (MFA re-verification) |
| 0.7-0.9 | Block login, send alert to user, require manual verification |
| 0.9-1.0 | Block login, revoke all sessions, disable account, alert security team |

**Incident Response Flow**:
```
1. Alert triggered by risk score > 0.7

2. Immediate actions (automated):
   - Block current login attempt
   - Revoke all active sessions
   - Force password reset
   - Notify user via email and SMS
   - Log full details for investigation

3. Security investigation:
   - Review login attempts from affected IP ranges
   - Check for similar patterns across other accounts
   - Identify affected applications and data accessed
   - Determine attack vector (phishing, credential stuffing, MFA fatigue)

4. Remediation:
   - Reset all credentials
   - Review and update MFA methods
   - Audit application access and permissions
   - Implement additional controls (geo-fencing, allowlist IPs)
   - Update detection rules based on new intelligence

5. Post-incident:
   - Document timeline and actions
   - Update incident response playbooks
   - Deploy additional monitoring if needed
   - Report to compliance/regulatory bodies if required
```

## Token Binding and Advanced Protections

### DPoP (Demonstration of Proof-of-Possession)

DPoP binds tokens to a specific client by requiring proof of possession of a private key.

**DPoP Flow**:
```
1. Client generates a DPoP key pair
2. Client includes DPoP proof JWT in authorization request
3. Authorization server binds issued tokens to client's public key
4. Client includes DPoP proof with every token usage
5. Resource server validates DPoP proof against bound public key
```

**DPoP Proof JWT**:
```json
{
  "header": {
    "typ": "dpop+jwt",
    "alg": "ES256",
    "jwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "base64url-x-coordinate",
      "y": "base64url-y-coordinate"
    }
  },
  "payload": {
    "jti": "unique-proof-id",
    "htm": "POST",
    "htu": "https://idp.example.com/token",
    "iat": 1741996500,
    "ath": "access-token-hash"  // present in subsequent requests
  }
}
```

**DPoP Validation**:
```python
class DPoPValidator:
    def __init__(self, max_clock_skew=60):
        self.max_clock_skew = max_clock_skew
        self.used_nonces = set()

    def validate_proof(self, proof_jwt, http_method, http_uri):
        # Parse DPoP proof without verification first
        headers = jwt.get_unverified_header(proof_jwt)

        if headers["typ"] != "dpop+jwt":
            raise InvalidDPoPError("Wrong typ header")

        if "jwk" not in headers:
            raise InvalidDPoPError("Missing jwk in header")

        # Verify the proof signature using embedded JWK
        client_public_key = jwt.PyJWK(headers["jwk"])
        payload = jwt.decode(
            proof_jwt,
            key=client_public_key,
            algorithms=["ES256", "RS256"],
            options={"verify_exp": True}
        )

        # Validate claims
        if payload["htm"] != http_method:
            raise InvalidDPoPError("HTTP method mismatch")

        if payload["htu"] != http_uri:
            raise InvalidDPoPError("HTTP URI mismatch")

        # Replay protection
        if payload["jti"] in self.used_nonces:
            raise InvalidDPoPError("Reused jti")
        self.used_nonces.add(payload["jti"])

        # Return the client public key for token binding
        return ClientPublicKey(
            kty=headers["jwk"]["kty"],
            crv=headers["jwk"].get("crv"),
            x=headers["jwk"].get("x"),
            y=headers["jwk"].get("y"),
            n=headers["jwk"].get("n"),
            e=headers["jwk"].get("e")
        )
```

### mTLS Token Binding

Binds tokens to a specific TLS client certificate.

**Configuration**:
```yaml
mtls_token_binding:
  enabled: true
  certificate_validation:
    trusted_cas:
      - "/etc/idp/ca/internal-ca.crt"
      - "/etc/idp/ca/partner-ca.crt"
    revocation_check:
      enabled: true
      method: "ocsp"  # or crl
      timeout: 5  # seconds
  
  token_binding:
    method: "x5t#S256"  # SHA-256 thumbprint of client cert
    claim_name: "cnf"   # confirmation claim
    
  endpoints:
    token: "https://idp.example.com/mtls/token"
    userinfo: "https://idp.example.com/mtls/userinfo"
    introspection: "https://idp.example.com/mtls/introspect"
```

**Token Confirmation Claim**:
```json
{
  "iss": "https://idp.example.com",
  "sub": "a1b2c3d4",
  "aud": "my-client-id",
  "exp": 1742000100,
  "cnf": {
    "x5t#S256": "base64url-sha256-thumbprint-of-client-cert"
  }
}
```

**mTLS Validation**:
```python
class MTLSValidator:
    def __init__(self, trusted_cas_path):
        self.trusted_cas = self._load_cas(trusted_cas_path)

    def validate_certificate(self, client_cert_der):
        cert = x509.load_der_x509_certificate(client_cert_der)
        issuer = cert.issuer

        # Check against trusted CAs
        for ca_path in self.trusted_cas:
            ca = x509.load_pem_x509_certificate(open(ca_path, "rb").read())
            try:
                ca.public_key().verify(
                    cert.signature,
                    cert.tbs_certificate_bytes,
                    cert.signature_algorithm_oid
                )
                return True
            except Exception:
                continue

        raise CertificateValidationError("No matching CA found")

    def compute_thumbprint(self, cert_der):
        sha256 = hashlib.sha256()
        sha256.update(cert_der)
        return base64url_encode(sha256.digest())

    def verify_token_binding(self, token, client_cert_der):
        decoded = jwt.decode(token, options={"verify_signature": False})
        cnf = decoded.get("cnf", {})
        expected_thumbprint = cnf.get("x5t#S256")

        if not expected_thumbprint:
            raise TokenBindingError("No confirmation claim in token")

        actual_thumbprint = self.compute_thumbprint(client_cert_der)
        if not hmac.compare_digest(expected_thumbprint, actual_thumbprint):
            raise TokenBindingError("Certificate thumbprint mismatch")
```

### Refresh Token Rotation and Reuse Detection

```python
class RefreshTokenRotationService:
    def __init__(self, redis_client, max_family_size=5):
        self.redis = redis_client
        self.max_family_size = max_family_size

    def issue_refresh_token(self, user_id, client_id, scopes):
        token_family_id = str(uuid.uuid4())
        token = secrets.token_urlsafe(64)

        self.redis.hset(
            f"refresh_token:{token}",
            mapping={
                "family_id": token_family_id,
                "user_id": user_id,
                "client_id": client_id,
                "scopes": " ".join(scopes),
                "issued_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                "token_number": 1,
                "status": "active"
            }
        )
        self.redis.expire(f"refresh_token:{token}", 86400)
        return token

    def rotate(self, old_token, client_id):
        old_data = self.redis.hgetall(f"refresh_token:{old_token}")

        if not old_data:
            raise InvalidTokenError("Token not found")

        if old_data.get("status") == "consumed":
            # Token reuse detected - this is a security incident
            self._handle_token_reuse(old_data)
            raise TokenReuseError("Refresh token reuse detected")

        if old_data.get("status") == "revoked":
            raise TokenRevokedError("Token already revoked")

        # Mark old token as consumed
        self.redis.hset(f"refresh_token:{old_token}", "status", "consumed")
        self.redis.expire(f"refresh_token:{old_token}", 3600)

        # Issue new token in same family
        family_id = old_data["family_id"]
        token_number = int(old_data.get("token_number", 0)) + 1

        if token_number > self.max_family_size:
            raise TokenFamilyExhaustedError(
                "Token family exhausted, re-authentication required"
            )

        new_token = secrets.token_urlsafe(64)
        self.redis.hset(
            f"refresh_token:{new_token}",
            mapping={
                "family_id": family_id,
                "user_id": old_data["user_id"],
                "client_id": client_id,
                "scopes": old_data["scopes"],
                "issued_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                "token_number": token_number,
                "status": "active"
            }
        )
        self.redis.expire(f"refresh_token:{new_token}", 86400)
        return new_token

    def _handle_token_reuse(self, old_data):
        # Token was reused - revoke ALL tokens in this family
        family_id = old_data["family_id"]
        pattern = f"refresh_token:*"
        cursor = 0

        while True:
            cursor, keys = self.redis.scan(cursor, match=pattern)
            for key in keys:
                data = self.redis.hgetall(key)
                if data.get("family_id") == family_id:
                    self.redis.hset(key, "status", "revoked")
            if cursor == 0:
                break

        # Alert security team
        self._alert_token_reuse(old_data)

    def _alert_token_reuse(self, old_data):
        logger.warning(
            "Refresh token reuse detected",
            extra={
                "user_id": old_data["user_id"],
                "client_id": old_data["client_id"],
                "family_id": old_data["family_id"]
            }
        )
```

## IdP Configuration Hardening

### Keycloak Hardening Checklist

```yaml
keycloak_hardening:
  # Authentication
  default_signatures_required: true
  action_token_max_lifespan: 300  # 5 minutes
  login_brute_force_protection: true
  max_failures: 5
  failure_reset_time: 300  # seconds
  wait_increment: 30  # seconds
  quick_login_check_milli_seconds: 1000
  
  # Token settings
  default_signing_algorithm: "RS256"
  default_signature_key_size: 2048
  access_token_lifespan: 300  # 5 minutes
  client_session_idle_timeout: 900  # 15 minutes
  client_session_max_lifespan: 28800  # 8 hours
  sso_session_idle_timeout: 1800  # 30 minutes
  sso_session_max_lifespan: 28800  # 8 hours
  offline_session_idle_timeout: 86400  # 24 hours
  offline_session_max_lifespan: 604800  # 7 days
  
  # Security
  ssl_required: "all"
  hsts_enabled: true
  hsts_max_age: 31536000
  hsts_include_subdomains: true
  content_security_policy: "default-src 'self'"
  x_content_type_options_header: "nosniff"
  x_frame_options_header: "DENY"
  x_robots_tag_header: "none"
  strict_transport_security_header: "max-age=31536000; includeSubDomains; preload"
  allowed_origins: "https://*.company.com"
  web_origins: "https://*.company.com"
  
  # Administration
  admin_cache_lifespan: 60  # seconds
  admin_token_lifespan: 300  # 5 minutes
  admin_events_enabled: true
  events_enabled: true
  events_expiration: 7776000  # 90 days
  admin_events_expiration: 7776000  # 90 days
```

### Azure AD Hardening Checklist

```yaml
azure_ad_hardening:
  # Conditional Access
  block_legacy_authentication: true
  require_mfa_for_all_users: true
  require_mfa_for_admin_roles: true
  require_passwordless_for_admins: true
  risk_policy:
    sign_in_risk_medium_or_above: "block"
    user_risk_high: "block"
    risky_sign_in_alert_threshold: "medium"
    
  # Identity Protection
  mfa_registration_policy: true
  risky_user_remediation: true
  user_risk_remediation_policy: true
  
  # Security defaults
  security_defaults_enabled: false  # Use Conditional Access instead
  
  # Authentication methods
  phishing_resistant_mfa:
    enabled: true
    preferred_method: "FIDO2"
    backup_method: "TOTP"
    disable_sms: true
    disable_voice: true
    
  # Session management
  sign_in_frequency: 8  # hours
  persistence_single_sign_on: "token_lifetime"
  
  # Monitoring
  audit_log_retention: 365  # days
  sign_in_log_retention: 365  # days
  risky_sign_in_alert: true
  user_risk_alert: true
```

### Okta Hardening Checklist

```yaml
okta_hardening:
  # Authentication
  passwordless_auth: true
  mfa_enrollment_policy: "require_every_sign_in"
  phishing_resistant_mfa:
    enabled: true
    methods:
      - "webauthn"
      - "okta_verify"
    disable_sms_mfa: true
    
  # Session
  session_idle_timeout_minutes: 15
  session_max_lifetime_hours: 8
  session_primary_factor_timeout_minutes: 480
  
  # Network
  allowed_ip_zones: []
  blocked_ip_zones: ["tor", "proxy", "vpn"]
  geo_fencing_enabled: true
  
  # Threat Insights
  threat_insights_enabled: true
  threat_insights_action: "block"
  
  # API security
  api_token_lifetime_hours: 8
  api_token_rotation_required: true
  private_key_jwt_required: true
```

## Logging and Monitoring

### Security Events Logging

**Events to Log**:
```yaml
security_events:
  authentication:
    - LOGIN_SUCCESS
    - LOGIN_FAILED
    - LOGIN_FAILED_REASON (bad_password, user_locked, mfa_failed)
    - MFA_CHALLENGE
    - MFA_SUCCESS
    - MFA_FAILED
    - STEP_UP_AUTH_REQUESTED
    - STEP_UP_AUTH_COMPLETED
    
  session:
    - SESSION_CREATED
    - SESSION_EXPIRED
    - SESSION_REVOKED
    - SESSION_TERMINATED
    - CONCURRENT_SESSION_LIMIT_REACHED
    
  token:
    - TOKEN_ISSUED
    - TOKEN_REFRESHED
    - TOKEN_REVOKED
    - TOKEN_REUSE_DETECTED
    
  admin:
    - ADMIN_LOGIN
    - ADMIN_ACTION
    - CONFIG_CHANGE
    - POLICY_CHANGE
    - USER_CREATED
    - USER_DISABLED
    - USER_DELETED
    
  account:
    - PASSWORD_CHANGED
    - PASSWORD_RESET_REQUESTED
    - PASSWORD_RESET_COMPLETED
    - MFA_ENROLLED
    - MFA_REMOVED
    - DEVICE_REGISTERED
    - DEVICE_REMOVED
```

**Log Format**:
```json
{
  "event": "LOGIN_FAILED",
  "timestamp": "2025-03-15T10:00:00.123Z",
  "severity": "warning",
  "details": {
    "username": "jdoe",
    "ip_address": "203.0.113.42",
    "client_id": "web-app",
    "failure_reason": "bad_password",
    "attempt_number": 3,
    "user_agent": "Mozilla/5.0 ...",
    "geo_country": "US",
    "session_id": null
  },
  "correlation_id": "corr-abc-123-def",
  "source": "idp.example.com",
  "environment": "production"
}
```

### SIEM Integration

**Log Forwarding Configuration (Fluentd)**:
```yaml
<source>
  @type tail
  path /var/log/idp/audit.log
  pos_file /var/log/td-agent/idp-audit.log.pos
  tag idp.audit
  <parse>
    @type json
    time_key timestamp
    time_type string
    time_format %iso8601
  </parse>
</source>

<filter idp.audit>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    env production
  </record>
</filter>

<match idp.audit>
  @type elasticsearch
  host elasticsearch.internal
  port 9200
  index_name idp-audit-%Y.%m.%d
  <buffer>
    @type file
    path /var/log/td-agent/buffer/idp
    flush_interval 5s
  </buffer>
</match>
```

**Security Alert Rules (Elasticsearch)**:
```yaml
security_alerts:
  - name: "multiple_login_failures"
    description: "5+ failed logins for same user in 5 minutes"
    query: |
      event: LOGIN_FAILED
      | stats count by username, timestamp window=5m
      | where count >= 5
    severity: "high"
    action: "notify_security_team"
    
  - name: "impossible_travel"
    description: "Logins from distant locations in short time"
    query: |
      event: LOGIN_SUCCESS
      | sort username, timestamp
      | foreach username by prev_ip, prev_time
      | geodist prev_ip, ip_address > 500km
      | timediff prev_time, timestamp < 1h
    severity: "critical"
    action: "block_user"
    
  - name: "token_reuse"
    description: "Refresh token reuse detected"
    query: |
      event: TOKEN_REUSE_DETECTED
    severity: "critical"
    action: "revoke_all_sessions"
    
  - name: "admin_config_change"
    description: "Sensitive configuration change"
    query: |
      event: CONFIG_CHANGE
      AND details.config_category IN (token_policy, auth_policy, mfa_policy)
    severity: "medium"
    action: "notify_admin"
```

## Disaster Recovery for IdP

### Backup and Restore

**Backup Strategy**:
```yaml
backup_strategy:
  components:
    - idp_database:
        type: "postgresql"
        backup_frequency: "hourly"
        retention: "7 days hourly, 30 days daily, 12 months monthly"
        method: "pg_dump with compression"
        
    - configuration:
        type: "realm export"
        backup_frequency: "on change + daily"
        retention: "90 days"
        method: "Keycloak export, Terraform state"
        
    - user_store:
        type: "LDAP/AD"
        backup_frequency: "daily"
        retention: "30 days"
        method: "native AD backup or ldapsearch dump"
        
  encryption:
    at_rest: "AES-256-GCM"
    in_transit: "TLS 1.3"
    key_management: "HSM or cloud KMS"
```

**Restore Procedure**:
```yaml
restore_procedure:
  total_outage:
    steps:
      - 1: "Provision new IdP infrastructure (Terraform)"
      - 2: "Restore database from latest backup"
      - 3: "Import realm configuration"
      - 4: "Verify signing keys and certificates"
      - 5: "Update DNS to point to recovery instance"
      - 6: "Verify user authentication against backup"
      - 7: "Test federation metadata endpoints"
      - 8: "Validate SCIM sync from backup directory"
    rto: "2 hours"
    rpo: "1 hour"
    
  partial_outage:
    steps:
      - 1: "Identify failed component (database, cache, node)"
      - 2: "Failover to standby node/database replica"
      - 3: "Verify session continuity from cache"
      - 4: "Monitor for error rate normalization"
      - 5: "Repair failed component"
    rto: "5 minutes"
    rpo: "0 (near-zero)"
```

## Security Testing

### Penetration Testing Focus Areas

```yaml
penetration_test_areas:
  authentication:
    - Credential stuffing
    - Password spraying
    - MFA bypass (MFA fatigue, SMS interception, backup code abuse)
    - Session fixation
    - Session hijacking (XSS, CSRF)
    - OAuth2 implicit grant attack
    
  token_security:
    - Token forgery (weak keys, algorithm confusion)
    - Token replay
    - Token injection
    - JWT none algorithm attack
    - JWKS injection
    - Refresh token prediction
    
  configuration:
    - Default credentials
    - Weak cipher suites
    - Missing security headers
    - Permissive CORS
    - Open redirect on login pages
    - Information disclosure in error messages
    
  federation:
    - SAML assertion injection
    - SAML signature wrapping
    - XML External Entity (XXE) injection
    - Metadata poisoning
    - Federation trust bypass
    - NameID mapping attacks
```

### Automated Security Scanning

```yaml
automated_scanning:
  frequency: "daily"
  tools:
    - owasp_zap:
        target: "https://idp.example.com"
        scan_policy: "API scan + full web scan"
        alert_threshold: "MEDIUM"
        
    - custom_scripts:
        - "validate-jwks-endpoint.py"
        - "check-certificate-expiry.py"
        - "validate-token-signatures.py"
        - "test-oidc-discovery.py"
        - "check-ssl-config.py"
        
    - compliance_checkers:
        - "oauth2-security-assessment"
        - "saml-security-assessment"
        - "fapi-security-assessment"
        
  alert_on:
    - Certificate expiry within 30 days
    - Expired certificates
    - Missing security headers
    - Weak cipher suites
    - Open redirect vulnerabilities
    - Known CVEs in IdP software
```

## References

- `idp-federation-scenarios.md` -- Federation Scenarios
- `idp-setup.md` -- Identity Provider Setup
- `saml-oidc.md` -- SAML vs OIDC
- `identity-provider-fundamentals.md` -- Identity Provider Fundamentals
