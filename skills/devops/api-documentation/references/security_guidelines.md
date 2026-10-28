# Security Guidelines for API Documentation

API docs both describe security (auth schemes, scopes, rate limits) and can create risk (leaked internal endpoints, real credentials in examples, exposed "Try it out" consoles). This reference covers documenting security correctly and publishing docs safely.

## Document Security Accurately

```yaml
components:
  securitySchemes:
    oauth2:
      type: oauth2
      description: |
        OAuth 2.0 authorization code flow with PKCE for user-facing apps;
        client credentials for server-to-server. Access tokens expire after 15 minutes.
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth2/authorize
          tokenUrl: https://auth.example.com/oauth2/token
          refreshUrl: https://auth.example.com/oauth2/token
          scopes:
            orders:read: Read orders
            orders:write: Create and cancel orders
        clientCredentials:
          tokenUrl: https://auth.example.com/oauth2/token
          scopes:
            orders:read: Read orders
security:
  - oauth2: [orders:read]
paths:
  /orders:
    post:
      security:
        - oauth2: [orders:write]
  /health:
    get:
      security: []        # explicitly public
```

Rules:
- Every operation has an explicit effective `security` requirement; lint with `security-defined` (Redocly) or a Spectral rule.
- List minimum scopes per operation; docs drive client least-privilege.
- Document 401 vs 403 semantics and the error body for each.
- Document token lifetimes, refresh behavior and revocation.
- Do not recommend the OAuth implicit or password grants; OAuth 2.0 Security BCP (RFC 9700) deprecates them. Use authorization code with PKCE.

## Document Abuse Controls

| Topic | What to state |
|-------|---------------|
| Rate limits | Limits per key/user, headers returned, 429 behavior, `Retry-After` |
| Payload limits | Max body size, max array lengths, max page size |
| Idempotency | Which operations accept `Idempotency-Key` and retention period |
| Webhooks | Signature header, algorithm (e.g. HMAC-SHA256), timestamp tolerance, how to verify with constant-time comparison |
| Data sensitivity | Fields containing PII; retention; masking in responses |

Encode limits in schemas too (`maxLength`, `maxItems`, `maximum`); this documents and enables validation.

## Webhook Verification Example to Publish

```python
import hmac, hashlib, time

def verify(payload: bytes, header_sig: str, header_ts: str, secret: bytes, tolerance_s: int = 300) -> bool:
    if abs(time.time() - int(header_ts)) > tolerance_s:
        return False
    expected = hmac.new(secret, f"{header_ts}.".encode() + payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_sig)
```

## Do Not Leak Through Docs

| Leak | Prevention |
|------|-----------|
| Internal/admin endpoints in public spec | Mark `x-internal: true`; filter at bundle time; test the public bundle for absence |
| Internal hostnames, IPs in `servers` | Separate server lists per audience via overlays |
| Real API keys, tokens, customer data in examples | Use obviously fake values; secret scanning (gitleaks, GitHub secret scanning) on spec repos |
| Verbose error examples with stack traces | Examples use the public problem format only |
| Debug parameters (`?debug=true`) | Remove from public spec and from production code |

Also remember: hiding an endpoint from docs is not access control. Undocumented endpoints must still enforce authorization; attackers enumerate them.

## Interactive Consoles ("Try it out")

- Point consoles at sandbox environments by default, not production.
- Use OAuth with PKCE in the console; never embed a shared API key in the page.
- Set `persistAuthorization: false` (Swagger UI) on shared machines; tokens otherwise stay in browser storage.
- Configure CORS on the sandbox for the docs origin only.
- Disable the external validator badge (`validatorUrl: null`) so private specs are not sent to third-party services.

## Serving Docs from the API

Framework-generated `/docs`, `/swagger-ui`, `/v3/api-docs`, `/openapi.json` endpoints:
- Disable in production or put behind authentication.
- If kept public intentionally, ensure the spec is the filtered public variant.
- Scanners routinely probe these paths to map attack surface.

## Hosting and Supply Chain

- Pin renderer versions and self-host JS/CSS, or use Subresource Integrity for CDN assets.
- Set a Content Security Policy on the docs site restricting script sources.
- Serve over HTTPS with HSTS.
- Restrict who can publish (protected branches, required reviews, CI-only deploy credentials via OIDC).

## Security Linting

```yaml
# .spectral.yaml
extends:
  - spectral:oas
  - https://unpkg.com/@stoplight/spectral-owasp-ruleset/dist/ruleset.mjs
```

The OWASP ruleset flags issues such as missing security on operations, HTTP (non-TLS) servers, unbounded strings/arrays, missing rate-limit headers, and API keys in query strings. Pin the ruleset version in production pipelines.

## Security-Relevant Spec Patterns

- API keys in headers, not query strings (query strings end up in logs).
- `writeOnly: true` for secrets in request bodies; never echo secrets in responses.
- Use `format: uuid` or opaque IDs rather than sequential IDs where enumeration is a concern, and document that IDs are opaque.

## Checklist

- [ ] Every operation has explicit security and minimal scopes
- [ ] 401/403 and rate-limit behavior documented
- [ ] Public bundle tested to exclude `x-internal` operations and internal servers
- [ ] Examples free of real secrets/PII; secret scanning on spec repos
- [ ] Consoles target sandbox, use PKCE, do not persist tokens
- [ ] Production `/docs` endpoints disabled or protected
- [ ] OWASP Spectral ruleset in CI
- [ ] Docs site CSP, HTTPS, pinned assets
