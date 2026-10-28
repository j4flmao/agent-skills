# Authentication and Authorization at the API Gateway

Patterns for verifying callers at the gateway — JWT/OIDC, OAuth 2.0 token introspection, API keys, mTLS, and external authorization — and for passing a trusted identity to backends. Defensive guidance; maps to OWASP API Security Top 10 (broken authentication, broken function-level authorization).

## What the Gateway Should and Should Not Do

| Gateway | Backend service |
|---------|-----------------|
| Verify credentials (signature, expiry, issuer, audience) | Object-level authorization (does this user own order 42?) |
| Coarse authorization (scope/role per route) | Business rules and data filtering |
| Reject unauthenticated requests early | Re-verify identity if network is not zero-trust |
| Strip spoofable headers, inject verified identity | Trust only gateway-injected identity over mTLS/private network |

Never rely solely on the gateway for authorization; BOLA (broken object-level authorization) must be solved in services.

## Mechanisms Compared

| Mechanism | Best for | Notes |
|-----------|----------|-------|
| JWT access tokens (OIDC/OAuth 2.0) | User and service APIs | Validated locally with JWKS; revocation delayed until expiry |
| Opaque tokens + introspection (RFC 7662) | Need immediate revocation | Network call per request; cache briefly |
| API keys | Server-to-server partner access, usage metering | Identify clients, weak authentication; hash at rest, rotate |
| mTLS (client certificates) | Service-to-service, B2B | Strong; certificate lifecycle management required |
| HMAC request signing | Webhooks, partner APIs | Protects integrity; include timestamp + nonce against replay |

## JWT Validation Rules

1. Accept only expected algorithms (e.g. `RS256`, `ES256`); reject `none` and HS/RS confusion.
2. Fetch keys from the issuer's JWKS URL; cache with refresh on unknown `kid`.
3. Validate `iss`, `aud`, `exp`, `nbf` with small clock skew (≤60s).
4. Check required scopes/roles per route.
5. Keep access tokens short-lived (minutes); refresh tokens never reach APIs.

### Envoy `jwt_authn`

```yaml
- name: envoy.filters.http.jwt_authn
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
    providers:
      idp:
        issuer: https://login.example.com/
        audiences: ["orders-api"]
        remote_jwks:
          http_uri: { uri: https://login.example.com/.well-known/jwks.json, cluster: idp_jwks, timeout: 2s }
          cache_duration: 600s
        forward: false
        claim_to_headers:
          - { header_name: x-user-id, claim_name: sub }
    rules:
      - match: { prefix: /healthz }
      - match: { prefix: / }
        requires: { provider_name: idp }
```

### NGINX (auth_request to a verifier)

Open-source NGINX has no built-in JWT validation (NGINX Plus has `auth_jwt`). Delegate with `auth_request`:

```nginx
location = /_auth {
    internal;
    proxy_pass http://auth-verifier/verify;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Authorization $http_authorization;
}
location /v1/ {
    auth_request /_auth;
    auth_request_set $user_id $upstream_http_x_user_id;
    proxy_set_header X-User-Id $user_id;
    proxy_pass http://api;
}
```

### Kong

`jwt` plugin (consumer-based keys) or `openid-connect` (Enterprise) for full OIDC; `key-auth` for API keys with `hide_credentials: true` so keys are not forwarded upstream.

## External Authorization

For policies beyond scopes (tenant rules, ABAC), call a policy decision point:

```yaml
- name: envoy.filters.http.ext_authz
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
    grpc_service: { envoy_grpc: { cluster_name: opa }, timeout: 0.2s }
    failure_mode_allow: false
    transport_api_version: V3
```

OPA (with the Envoy plugin), Authorino, or a custom service evaluate the request. Keep decision latency low (local sidecar or cached policies) and set `failure_mode_allow: false` for protected APIs.

## Header Hygiene (Identity Spoofing Prevention)

- Remove any client-supplied identity headers (`X-User-Id`, `X-Tenant-Id`, `X-Forwarded-User`) before setting verified values.
- Overwrite `X-Forwarded-For`/`Forwarded` according to trusted proxy configuration.
- Backends accept identity headers only from the gateway: enforce with mTLS between gateway and services or network policy.
- Alternatively forward the original validated JWT (or a gateway-minted internal token) so services can verify cryptographically.

## mTLS

```nginx
server {
    listen 443 ssl;
    ssl_certificate     /etc/tls/server.crt;
    ssl_certificate_key /etc/tls/server.key;
    ssl_client_certificate /etc/tls/partners-ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    location /partner/ {
        proxy_set_header X-Client-Cert-Subject $ssl_client_s_dn;
        proxy_pass http://partner-api;
    }
}
```

- Use a dedicated CA per trust domain; check revocation (CRL/OCSP) or use short-lived certs.
- Map certificate subject/SAN to a client identity explicitly; do not authorize on "has any valid cert".

## API Key Management

- Generate with a CSPRNG (≥128 bits), show once, store a hash (SHA-256 is fine for high-entropy keys).
- Prefix keys (`acme_live_…`) to enable secret scanning.
- Support multiple active keys per client for rotation; log last-used time; revoke unused keys.
- Send keys in a header (`Authorization` or `X-API-Key`), never in query strings (they end up in logs).

## CORS and Browser Clients

- Explicit allowed origins; no `*` with credentials.
- Handle preflight at the gateway consistently; cache with `Access-Control-Max-Age`.
- For SPAs, prefer the BFF pattern: cookies (HttpOnly, Secure, SameSite) to a backend-for-frontend that holds tokens.

## Logging and Detection

- Log auth failures with reason code (expired, bad signature, missing scope), client ID, and source IP — never the token itself.
- Alert on spikes in 401/403, many keys from one IP, or one key from many countries.
- Apply strict rate limits on token and login endpoints.

## Pitfalls

- Validating JWT signature but not `aud`, so tokens for another API are accepted.
- Forwarding API keys or bearer tokens to third-party upstreams.
- Trusting identity headers on services reachable without the gateway.
- `failure_mode_allow: true` on ext_authz for sensitive routes.
- Long-lived JWTs with no revocation strategy.

## Checklist

- [ ] Algorithms pinned; `iss`, `aud`, `exp` validated; JWKS cached
- [ ] Per-route scope requirements; object-level checks in services
- [ ] Spoofable headers stripped; identity injected only by gateway
- [ ] Gateway-to-service channel protected (mTLS or network policy)
- [ ] API keys hashed, rotatable, never in URLs
- [ ] ext_authz fails closed for protected routes
- [ ] Auth failures logged without secrets and alerted on
