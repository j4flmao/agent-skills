# SAML vs OIDC

## Protocol Comparison

| Feature | SAML 2.0 | OIDC (OpenID Connect) |
|---------|----------|----------------------|
| Protocol | XML-based | JSON-based |
| Transport | Browser redirects + HTTP POST | REST API + JWT |
| Token Format | Assertion (XML) | JWT (JSON) |
| Identity | Subject + attributes | sub claim + claims |
| Session | IdP session | Session or token |
| Mobile Support | Poor | Native |
| API Integration | Poor | Native |
| Complexity | High | Low |
| Maturity | Enterprise standard (20+ years) | Modern standard (10+ years) |

## When to Use SAML

### Good for SAML
- Enterprise B2B SSO (Okta, Azure AD, OneLogin)
- Legacy applications (on-prem, intranet)
- Government and regulated industries
- Complex attribute requirements (multiple IdPs)
- WS-Federation migration path

### SAML Flow
```
1. User accesses SP (Service Provider)
2. SP redirects to IdP with AuthnRequest (XML)
3. User authenticates at IdP
4. IdP returns SAML Response (assertion XML) via POST
5. SP validates assertion (signature, audience, timestamps)
6. SP grants access based on attributes
```

### SAML Assertion Example
```xml
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
  <saml:Issuer>https://idp.company.com/metadata</saml:Issuer>
  <saml:Subject>
    <saml:NameID>user@company.com</saml:NameID>
  </saml:Subject>
  <saml:Conditions NotBefore="2026-03-15T10:00:00Z"
                   NotOnOrAfter="2026-03-15T10:10:00Z"/>
  <saml:AttributeStatement>
    <saml:Attribute Name="email">user@company.com</saml:Attribute>
    <saml:Attribute Name="role">admin</saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

## When to Use OIDC

### Good for OIDC
- Modern web and mobile applications
- Single Page Applications (SPAs)
- API authentication (machine-to-machine)
- Microservices and cloud-native apps
- Consumer-facing authentication (Google, GitHub login)

### OIDC Flow (Authorization Code + PKCE)
```
1. User clicks "Login with IdP"
2. App generates code_verifier + code_challenge
3. App redirects to IdP: /authorize?response_type=code&code_challenge=...
4. User authenticates, grants consent
5. IdP redirects to app with ?code=... 
6. App sends code + code_verifier to IdP: /token
7. IdP returns access_token + id_token (JWT)
8. App validates id_token signature
9. App uses access_token for API calls
```

## Migration Path: SAML → OIDC

### Phased Migration
```
Phase 1: Support both protocols
  - IdP handles both SAML and OIDC
  - New apps use OIDC
  - Existing SAML apps continue

Phase 2: Migrate SAML apps
  - One application at a time
  - Update SP metadata to OIDC
  - Test with subset of users

Phase 3: Deprecate SAML
  - Verify no SAML-only apps remain
  - Remove SAML endpoints from IdP
  - Archive SAML metadata
```

## Configuration Examples

### SAML Service Provider
```xml
<md:EntityDescriptor entityID="https://app.company.com/saml/metadata">
  <md:SPSSODescriptor>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://app.company.com/saml/acs"
      index="0"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>
```

### OIDC Client Configuration
```json
{
  "client_id": "app-123",
  "client_name": "Customer Dashboard",
  "redirect_uris": ["https://app.company.com/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "client_secret_basic",
  "scopes": ["openid", "profile", "email", "offline_access"]
}
```

## Testing Checklist

- [ ] Both SP-initiated and IdP-initiated SSO
- [ ] Token/session expiration and refresh
- [ ] Single Logout (SLO) for SAML
- [ ] Logout + token revocation for OIDC
- [ ] Attribute/claim mapping correctness
- [ ] Error scenarios: expired assertions, invalid signatures
- [ ] Clock skew tolerance (max 5 minutes)
- [ ] Cross-domain cookie handling
