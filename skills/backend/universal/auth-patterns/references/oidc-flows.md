# OIDC Flows

## Standard OIDC Flows

| Flow | Use Case | Tokens |
|------|----------|--------|
| Authorization Code | Web apps with backend | Code + Access + ID + Refresh |
| Authorization Code + PKCE | SPAs, mobile apps | Code + Access + ID + Refresh |
| Client Credentials | M2M / server-to-server | Access only |
| Resource Owner Password | Legacy / trusted apps | Access + Refresh |
| Implicit (deprecated) | Legacy SPAs | Access + ID |

## Authorization Code + PKCE Flow

```
1. Client generates code_verifier (random) + code_challenge (SHA256(verifier))
2. Client → Authorization Server: /authorize?response_type=code&code_challenge=...
3. User authenticates and consents
4. Authorization Server → Client: authorization code (via redirect)
5. Client → Authorization Server: /token?code=...&code_verifier=...
6. Authorization Server verifies code_verifier matches code_challenge
7. Authorization Server → Client: access_token + id_token + refresh_token
```

## Token Validation

ID Token validation:
- Verify `iss` matches expected issuer.
- Verify `aud` includes your client_id.
- Verify `azp` if multiple audiences.
- Verify signature using JWKS endpoint.
- Verify `exp` is not expired.
- Verify `nonce` matches original request.

Access Token validation:
- If opaque: call introspection endpoint.
- If JWT: verify signature, issuer, audience, expiry, scopes.

## Common OIDC Providers

- **Auth0**: `https://{tenant}.auth0.com`
- **Keycloak**: `https://{host}/realms/{realm}`
- **Azure AD**: `https://login.microsoftonline.com/{tenant}/v2.0`
- **Google**: `https://accounts.google.com`
- **AWS Cognito**: `https://cognito-idp.{region}.amazonaws.com/{pool}`
- **Okta**: `https://{org}.okta.com`
