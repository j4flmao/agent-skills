# API Authentication Patterns

## Auth Flow Comparison
| Flow | Use Case | Security Level |
|------|----------|----------------|
| API Key | Simple, server-to-server | Low — no identity binding |
| Basic Auth | Legacy, internal tools | Low — sends password with every request |
| Bearer Token | Stateless, mobile/web | Medium — token can be stolen |
| JWT | Distributed systems | Medium — verify offline, short-lived |
| OAuth2 (Authorization Code) | Third-party access | High — industry standard |
| OAuth2 (Client Credentials) | Server-to-server | High — no user context |
| Mutual TLS (mTLS) | Zero-trust, B2B | Highest — certificate-based |

## JWT Best Practices
- Short expiry: 15 minutes for access tokens
- Refresh tokens: longer-lived, stored securely
- Signing: RS256 or ES256 (asymmetric)
- Don't store secrets in JWT payload
- Validate: signature, expiry, issuer, audience
- Rotation: revoke compromised tokens immediately
